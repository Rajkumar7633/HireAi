const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const User = require("../models/User")
const sendEmail = require("../utils/emailService")
const { authLimiter } = require("../middleware/rateLimiter")

// Simple validators to harden auth endpoints without adding new deps
const isValidEmail = (value) => {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (!v) return false
  // Basic RFC5322-ish check; keep permissive
  return /.+@.+\..+/.test(v)
}

const isValidPassword = (value) => {
  if (typeof value !== 'string') return false
  const v = value.trim()
  // Keep bounds generous to avoid breaking existing users
  return v.length >= 6 && v.length <= 200
}

const isValidOtpCode = (value) => {
  if (value === undefined || value === null) return false
  const v = String(value).trim()
  return v.length === 6 && /^[0-9]+$/.test(v)
}

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post("/register", async (req, res) => {
  const { email, password, role, name } = req.body

  if (!isValidEmail(email) || !isValidPassword(password || "")) {
    return res.status(400).json({ message: "Invalid email or password" })
  }

  try {
    let user = await User.findOne({ email })
    if (user) {
      return res.status(400).json({ msg: "User already exists" })
    }

    // Determine target role
    const requestedRole = role || "job_seeker"

    // Admin signup policy: allow first admin; otherwise require ADMIN_ALLOW_SELF_SIGNUP=1
    if (requestedRole === "admin") {
      const existingAdmins = await User.countDocuments({ role: "admin" })
      const allow = process.env.ADMIN_ALLOW_SELF_SIGNUP === "1" || existingAdmins === 0
      if (!allow) {
        return res.status(403).json({ msg: "Admin signup disabled. Ask an admin to invite/promote." })
      }
    }

    user = new User({
      email,
      password,
      role: requestedRole,
      name,
    })

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    // Store in both fields for compatibility with frontend login route which expects passwordHash
    user.password = hash
    user.passwordHash = hash

    await user.save()

    const payload = {
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
      },
    }

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }, (err, token) => {
      if (err) throw err
      res.json({ token, user: payload.user })
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", authLimiter, async (req, res) => {
  let { email, password } = req.body
  email = (email || "").toLowerCase().trim()

   if (!isValidEmail(email) || !isValidPassword(password || "")) {
     return res.status(400).json({ message: "Invalid email or password" })
   }

  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "No account found for this email. Please sign up." })
    }

    const storedHash = user.password || user.passwordHash
    if (!storedHash) {
      return res.status(400).json({ message: "Invalid credentials" })
    }
    const isMatch = await bcrypt.compare(password, storedHash)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Step 1: generate and send OTP (6 digits), store hash+expiry and require verification
    const otp = ("000000" + Math.floor(Math.random() * 1000000)).slice(-6)
    const otpHash = await bcrypt.hash(otp, 10)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    user.loginOtp = {
      codeHash: otpHash,
      expiresAt,
      attempts: 0,
      devPlain: process.env.NODE_ENV !== 'production' ? otp : undefined,
    }
    await user.save()

    try {
      // Dev helper: log OTP to console for local testing
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[otp] login code for ${user.email}: ${otp}`)
      }
      await sendEmail({
        to: user.email,
        subject: "Your HireAI login code",
        html: `<p>Your verification code is <b>${otp}</b>. It expires in 10 minutes.</p>`,
      })
    } catch (e) {
      console.error("Failed to send OTP email:", e?.message || e)
      return res.status(500).json({ message: "Failed to send verification code" })
    }

    return res.json({ status: "otp_sent", message: "Verification code sent to email" })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and issue JWT
// @access  Public (rate limited)
router.post("/verify-otp", authLimiter, async (req, res) => {
  let { email, code } = req.body
  email = (email || "").toLowerCase().trim()
  code = String(code || "").trim()
  if (!email || !code) return res.status(400).json({ message: "Email and code are required" })
  if (!isValidEmail(email) || !isValidOtpCode(code)) {
    return res.status(400).json({ message: "Invalid email or code" })
  }

  try {
    const user = await User.findOne({ email })
    if (!user || !user.loginOtp || !user.loginOtp.codeHash || !user.loginOtp.expiresAt) {
      return res.status(400).json({ message: "Invalid or expired code" })
    }

    if (new Date(user.loginOtp.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: "Code expired" })
    }

    const attempts = user.loginOtp.attempts || 0
    if (attempts >= 5) {
      return res.status(429).json({ message: "Too many attempts. Please request a new code." })
    }

    // In dev, accept direct match against stored devPlain to rule out hashing/format issues
    let ok = false
    if (process.env.NODE_ENV !== 'production' && user.loginOtp.devPlain && code === String(user.loginOtp.devPlain)) {
      ok = true
    } else {
      ok = await bcrypt.compare(String(code), user.loginOtp.codeHash)
    }
    if (!ok) {
      user.loginOtp.attempts = attempts + 1
      await user.save()
      return res.status(400).json({ message: "Invalid code" })
    }

    // Success: clear OTP and set emailVerified
    user.loginOtp = { codeHash: undefined, expiresAt: undefined, attempts: 0 }
    user.emailVerified = true

    const basePayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }

    const accessToken = jwt.sign(
      { ...basePayload, type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: "20m" }
    )

    const refreshToken = jwt.sign(
      { ...basePayload, type: "refresh" },
      process.env.JWT_SECRET,
      { expiresIn: "14d" }
    )

    if (!Array.isArray(user.refreshTokens)) {
      user.refreshTokens = []
    }
    user.refreshTokens.push(refreshToken)
    await user.save()

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, role: user.role, email: user.email },
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/auth/session
// @desc    Get authenticated user session (for frontend to verify token)
// @access  Private (via token in header)
router.get("/session", require("../middleware/auth"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password")
    res.json(user)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token invalidation)
// @access  Private
router.post("/logout", require("../middleware/auth"), (req, res) => {
  // For JWT, logout is typically handled client-side by deleting the token.
  // This endpoint can be used to clear any server-side session data if applicable,
  // or simply confirm logout.
  res.json({ msg: "Logged out successfully" })
})

// @route   POST /api/auth/logout-all
// @desc    Logout user from all devices (clear all refresh tokens)
// @access  Private
router.post("/logout-all", require("../middleware/auth"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: "User not found" })
    user.refreshTokens = []
    await user.save()
    res.json({ message: "Logged out from all devices" })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   POST /api/auth/refresh
// @desc    Issue a new access token from a valid refresh token
// @access  Public (token-based)
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body || {}
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" })
    }

    let decoded
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET)
    } catch (e) {
      return res.status(401).json({ message: "Invalid or expired refresh token" })
    }

    if (!decoded || decoded.type !== "refresh" || !decoded.userId) {
      return res.status(401).json({ message: "Invalid refresh token" })
    }

    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({ message: "User not found" })
    }

    if (!Array.isArray(user.refreshTokens) || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: "Refresh token no longer valid" })
    }

    const basePayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }

    const accessToken = jwt.sign(
      { ...basePayload, type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: "20m" }
    )

    const newRefreshToken = jwt.sign(
      { ...basePayload, type: "refresh" },
      process.env.JWT_SECRET,
      { expiresIn: "14d" }
    )

    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken)
    user.refreshTokens.push(newRefreshToken)
    await user.save()

    res.json({ accessToken, refreshToken: newRefreshToken })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
