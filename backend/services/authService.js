/**
 * backend/services/authService.js
 *
 * Pure business logic for authentication.
 * No Express (req/res) here — only data in, data out.
 * Controllers call these functions and handle HTTP responses.
 */

const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const User = require("../models/User")
const sendEmail = require("../utils/emailService")
const { buildPasswordResetEmail, buildPasswordChangedEmail } = require("../utils/password-reset-email")
const { getAppUrl } = require("../utils/app-url")

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidEmail = (v) => typeof v === "string" && /.+@.+\..+/.test(v.trim())
const isValidPassword = (v) => typeof v === "string" && v.trim().length >= 6 && v.trim().length <= 200
const isValidOtp = (v) => /^[0-9]{6}$/.test(String(v || "").trim())
const isValidCollegeEmail = (v) => typeof v === "string" && v.trim().toLowerCase().endsWith("@mmumullana.org")

// Block personal email providers for recruiters - require company domain
const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", 
  "icloud.com", "mail.com", "protonmail.com", "yandex.com", "zoho.com",
  "live.com", "msn.com", "comcast.net", "verizon.net", "att.net",
  "sbcglobal.net", "bellsouth.net", "charter.net", "cox.net"
]

const isValidCompanyEmail = (v) => {
  if (!v || typeof v !== "string") return false
  const email = v.trim().toLowerCase()
  const domain = email.split("@")[1]
  if (!domain) return false
  // Block personal email domains
  if (PERSONAL_EMAIL_DOMAINS.includes(domain)) return false
  // Ensure it's a valid email format
  return /.+@.+\..+/.test(email)
}

function buildTokenPayload(user) {
  return { userId: user.id, email: user.email, name: user.name, role: user.role }
}

function signAccessToken(payload) {
  return jwt.sign({ ...payload, type: "access" }, process.env.JWT_SECRET, { expiresIn: "20m" })
}

function signRefreshToken(payload) {
  return jwt.sign({ ...payload, type: "refresh" }, process.env.JWT_SECRET, { expiresIn: "14d" })
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Register a new user.
 * @returns {{ token: string, user: object }}
 */
async function register({ email, password, role, name }) {
  if (!isValidEmail(email) || !isValidPassword(password || "")) {
    const err = new Error("Invalid email or password format")
    err.statusCode = 400
    throw err
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() })
  if (existing) {
    const err = new Error("User already exists")
    err.statusCode = 400
    throw err
  }

  const requestedRole = role || "job_seeker"

  // Validate college email for college/college_admin role
  if (requestedRole === "college_admin" || requestedRole === "college") {
    if (!isValidCollegeEmail(email)) {
      const err = new Error("College accounts must use @mmumullana.org email address")
      err.statusCode = 400
      throw err
    }
  }

  // Validate company email for recruiter role (block personal email providers)
  if (requestedRole === "recruiter") {
    if (!isValidCompanyEmail(email)) {
      const err = new Error("Recruiters must use a company domain email (not @gmail.com, @yahoo.com, etc.)")
      err.statusCode = 400
      throw err
    }
  }

  if (requestedRole === "admin") {
    const adminCount = await User.countDocuments({ role: "admin" })
    const allow = process.env.ADMIN_ALLOW_SELF_SIGNUP === "1" || adminCount === 0
    if (!allow) {
      const err = new Error("Admin signup disabled. Ask an admin to invite you.")
      err.statusCode = 403
      throw err
    }
  }

  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(password, salt)

  const user = new User({
    email: email.toLowerCase().trim(),
    password: hash,
    passwordHash: hash,
    role: requestedRole,
    name,
  })
  await user.save()

  const token = jwt.sign(
    { user: { id: user.id, role: user.role, email: user.email } },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  )

  return { token, user: { id: user.id, role: user.role, email: user.email } }
}

/**
 * Step 1 of login: validate credentials and send OTP.
 * @returns {{ status: "otp_sent" }}
 */
async function initiateLogin({ email, password }) {
  const cleanEmail = (email || "").toLowerCase().trim()

  if (!isValidEmail(cleanEmail) || !isValidPassword(password || "")) {
    const err = new Error("Invalid email or password")
    err.statusCode = 400
    throw err
  }

  const user = await User.findOne({ email: cleanEmail })
  if (!user) {
    const err = new Error("No account found for this email. Please sign up.")
    err.statusCode = 404
    throw err
  }

  // Validate company email for recruiter login (block personal email providers)
  if (user.role === "recruiter") {
    if (!isValidCompanyEmail(cleanEmail)) {
      const err = new Error("Recruiters must use a company domain email (not @gmail.com, @yahoo.com, etc.)")
      err.statusCode = 400
      throw err
    }
  }

  const storedHash = user.password || user.passwordHash
  if (!storedHash) {
    const err = new Error("Invalid credentials")
    err.statusCode = 400
    throw err
  }

  const isMatch = await bcrypt.compare(password, storedHash)
  if (!isMatch) {
    const err = new Error("Invalid credentials")
    err.statusCode = 400
    throw err
  }

  // Generate OTP
  const otp = ("000000" + Math.floor(Math.random() * 1_000_000)).slice(-6)
  const otpHash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  user.loginOtp = {
    codeHash: otpHash,
    expiresAt,
    attempts: 0,
    devPlain: process.env.NODE_ENV !== "production" ? otp : undefined,
  }
  await user.save()

  if (process.env.NODE_ENV !== "production") {
    console.log(`[otp] login code for ${user.email}: ${otp}`)
  }

  await sendEmail({
    to: user.email,
    subject: "Your HireAI Login Code",
    html: `<p>Your verification code is <b>${otp}</b>. It expires in 10 minutes.</p>`,
  })

  return { status: "otp_sent", message: "Verification code sent to email" }
}

/**
 * Step 2 of login: verify OTP and return tokens.
 * @returns {{ accessToken, refreshToken, user }}
 */
async function verifyOtp({ email, code }) {
  const cleanEmail = (email || "").toLowerCase().trim()
  const cleanCode = String(code || "").trim()

  if (!isValidEmail(cleanEmail) || !isValidOtp(cleanCode)) {
    const err = new Error("Invalid email or code format")
    err.statusCode = 400
    throw err
  }

  const user = await User.findOne({ email: cleanEmail })
  if (!user?.loginOtp?.codeHash || !user?.loginOtp?.expiresAt) {
    const err = new Error("Invalid or expired code")
    err.statusCode = 400
    throw err
  }

  if (new Date(user.loginOtp.expiresAt).getTime() < Date.now()) {
    const err = new Error("Code expired")
    err.statusCode = 400
    throw err
  }

  if ((user.loginOtp.attempts || 0) >= 5) {
    const err = new Error("Too many attempts. Please request a new code.")
    err.statusCode = 429
    throw err
  }

  let ok = false
  if (process.env.NODE_ENV !== "production" && user.loginOtp.devPlain && cleanCode === String(user.loginOtp.devPlain)) {
    ok = true
  } else {
    ok = await bcrypt.compare(cleanCode, user.loginOtp.codeHash)
  }

  if (!ok) {
    user.loginOtp.attempts = (user.loginOtp.attempts || 0) + 1
    await user.save()
    const err = new Error("Invalid code")
    err.statusCode = 400
    throw err
  }

  // Clear OTP and mark email verified
  user.loginOtp = { codeHash: undefined, expiresAt: undefined, attempts: 0 }
  user.emailVerified = true

  const payload = buildTokenPayload(user)
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  if (!Array.isArray(user.refreshTokens)) user.refreshTokens = []
  user.refreshTokens.push(refreshToken)
  await user.save()

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, role: user.role, email: user.email },
  }
}

/**
 * Rotate refresh token and return new access + refresh tokens.
 */
async function refreshTokens({ refreshToken }) {
  if (!refreshToken) {
    const err = new Error("No refresh token provided")
    err.statusCode = 401
    throw err
  }

  let decoded
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_SECRET)
  } catch {
    const err = new Error("Invalid or expired refresh token")
    err.statusCode = 401
    throw err
  }

  if (!decoded || decoded.type !== "refresh" || !decoded.userId) {
    const err = new Error("Invalid refresh token")
    err.statusCode = 401
    throw err
  }

  const user = await User.findById(decoded.userId)
  if (!user) {
    const err = new Error("User not found")
    err.statusCode = 401
    throw err
  }

  if (!Array.isArray(user.refreshTokens) || !user.refreshTokens.includes(refreshToken)) {
    const err = new Error("Refresh token no longer valid")
    err.statusCode = 401
    throw err
  }

  const payload = buildTokenPayload(user)
  const newAccessToken = signAccessToken(payload)
  const newRefreshToken = signRefreshToken(payload)

  // Rotate: remove old, add new
  user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken)
  user.refreshTokens.push(newRefreshToken)
  await user.save()

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

/**
 * Logout — remove specific refresh token from DB.
 */
async function logout({ userId, refreshToken }) {
  if (refreshToken) {
    const user = await User.findById(userId)
    if (user) {
      user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== refreshToken)
      await user.save()
    }
  }
}

/**
 * Logout from all devices — clear all refresh tokens.
 */
async function logoutAll({ userId }) {
  const user = await User.findById(userId)
  if (!user) {
    const err = new Error("User not found")
    err.statusCode = 404
    throw err
  }
  user.refreshTokens = []
  await user.save()
}

/**
 * Send password reset email with secure link + OTP code.
 */
async function forgotPassword({ email }) {
  const cleanEmail = (email || "").toLowerCase().trim()
  if (!isValidEmail(cleanEmail)) {
    const err = new Error("Valid email is required")
    err.statusCode = 400
    throw err
  }

  const user = await User.findOne({ email: cleanEmail })
  // Always return success to prevent email enumeration
  if (!user) return { message: "If an account exists, a reset link and verification code have been sent." }

  const rawToken = crypto.randomBytes(32).toString("hex")
  const otp = ("000000" + Math.floor(Math.random() * 1_000_000)).slice(-6)
  const tokenHash = await bcrypt.hash(rawToken, 10)
  const otpHash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

  user.passwordReset = {
    tokenHash,
    otpHash,
    expiresAt,
    attempts: 0,
    devPlain: process.env.NODE_ENV !== "production" ? otp : undefined,
    devToken: process.env.NODE_ENV !== "production" ? rawToken : undefined,
  }
  await user.save()

  const appUrl = getAppUrl()
  const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}`

  if (process.env.NODE_ENV !== "production") {
    console.log(`[password-reset] email=${cleanEmail} otp=${otp}`)
    console.log(`[password-reset] link=${resetUrl}`)
  }

  await sendEmail({
    to: user.email,
    subject: `Reset your HireAI password — code ${otp}`,
    html: buildPasswordResetEmail({
      name: user.name,
      email: cleanEmail,
      resetUrl,
      otp,
      expiresMinutes: 15,
    }),
  })

  return { message: "If an account exists, a reset link and verification code have been sent." }
}

/**
 * Reset password using emailed token or OTP code.
 */
async function resetPassword({ token, code, email, newPassword }) {
  const cleanEmail = (email || "").toLowerCase().trim()
  const cleanCode = String(code || "").trim()
  const cleanToken = String(token || "").trim()

  if (!isValidEmail(cleanEmail) || !isValidPassword(newPassword || "")) {
    const err = new Error("Valid email and new password (6+ chars) are required")
    err.statusCode = 400
    throw err
  }

  if (!cleanToken && !isValidOtp(cleanCode)) {
    const err = new Error("Reset link or 6-digit verification code is required")
    err.statusCode = 400
    throw err
  }

  const user = await User.findOne({ email: cleanEmail })
  if (!user?.passwordReset?.expiresAt) {
    const err = new Error("Invalid or expired reset request. Please request a new one.")
    err.statusCode = 400
    throw err
  }

  if (new Date(user.passwordReset.expiresAt).getTime() < Date.now()) {
    const err = new Error("Reset link has expired. Please request a new one.")
    err.statusCode = 400
    throw err
  }

  if ((user.passwordReset.attempts || 0) >= 5) {
    const err = new Error("Too many attempts. Please request a new reset code.")
    err.statusCode = 429
    throw err
  }

  let verified = false

  if (cleanToken) {
    if (!user.passwordReset.tokenHash) {
      const err = new Error("Invalid reset link")
      err.statusCode = 400
      throw err
    }
    if (process.env.NODE_ENV !== "production" && user.passwordReset.devToken && cleanToken === user.passwordReset.devToken) {
      verified = true
    } else {
      verified = await bcrypt.compare(cleanToken, user.passwordReset.tokenHash)
    }
  } else if (isValidOtp(cleanCode)) {
    if (!user.passwordReset.otpHash) {
      const err = new Error("Invalid verification code")
      err.statusCode = 400
      throw err
    }
    if (process.env.NODE_ENV !== "production" && user.passwordReset.devPlain && cleanCode === String(user.passwordReset.devPlain)) {
      verified = true
    } else {
      verified = await bcrypt.compare(cleanCode, user.passwordReset.otpHash)
    }
  }

  if (!verified) {
    user.passwordReset.attempts = (user.passwordReset.attempts || 0) + 1
    await user.save()
    const err = new Error(cleanToken ? "Invalid reset link" : "Invalid verification code")
    err.statusCode = 400
    throw err
  }

  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(newPassword, salt)
  user.password = hash
  user.passwordHash = hash
  user.passwordReset = {}
  user.refreshTokens = []

  await user.save()

  await sendEmail({
    to: user.email,
    subject: "Your HireAI password was changed",
    html: buildPasswordChangedEmail({ name: user.name }),
  })

  return { message: "Password reset successfully. Please log in." }
}

module.exports = {
  register, initiateLogin, verifyOtp,
  refreshTokens, logout, logoutAll,
  forgotPassword, resetPassword,
  // exported for testing
  _helpers: { isValidEmail, isValidPassword, isValidOtp },
}
