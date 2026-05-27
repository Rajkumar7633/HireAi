/**
 * backend/__tests__/authService.test.js
 * Unit tests for authService — all DB/email calls are mocked.
 */

// ─── Mock dependencies before imports ────────────────────────────────────────
jest.mock("../models/User")
jest.mock("../utils/emailService")
jest.mock("bcryptjs")
jest.mock("jsonwebtoken")

const User = require("../models/User")
const sendEmail = require("../utils/emailService")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const authService = require("../services/authService")

// ─── Shared test helpers ──────────────────────────────────────────────────────
const mockUser = (overrides = {}) => ({
  id: "user123",
  _id: "user123",
  email: "test@example.com",
  name: "Test User",
  role: "job_seeker",
  password: "hashedpass",
  passwordHash: "hashedpass",
  emailVerified: false,
  refreshTokens: [],
  loginOtp: {},
  passwordReset: {},
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
  process.env.JWT_SECRET = "test-secret"
  process.env.NODE_ENV = "test"
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
  sendEmail.mockResolvedValue({ messageId: "mock-id" })
  bcrypt.genSalt.mockResolvedValue("salt")
  bcrypt.hash.mockResolvedValue("hashed-value")
  bcrypt.compare.mockResolvedValue(true)
  jwt.sign.mockReturnValue("mock-token")
  jwt.verify.mockReturnValue({ userId: "user123", type: "refresh", email: "test@example.com", role: "job_seeker" })
})

// ─── register ─────────────────────────────────────────────────────────────────
describe("authService.register", () => {
  test("throws 400 for invalid email", async () => {
    await expect(authService.register({ email: "bad", password: "pass123" }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test("throws 400 for short password", async () => {
    await expect(authService.register({ email: "a@b.com", password: "123" }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test("throws 400 if user already exists", async () => {
    User.findOne.mockResolvedValue(mockUser())
    await expect(authService.register({ email: "test@example.com", password: "pass123" }))
      .rejects.toMatchObject({ statusCode: 400, message: "User already exists" })
  })

  test("creates user and returns token on success", async () => {
    User.findOne.mockResolvedValue(null)
    User.countDocuments.mockResolvedValue(0)

    const savedUser = mockUser({ email: "new@example.com" })
    User.mockImplementation(() => savedUser)

    const result = await authService.register({ email: "new@example.com", password: "pass123", role: "job_seeker", name: "New User" })

    expect(result).toHaveProperty("token")
    expect(result).toHaveProperty("user")
    expect(result.user).toBeDefined()
  })

  test("throws 403 if admin signup is disabled", async () => {
    User.findOne.mockResolvedValue(null)
    User.countDocuments.mockResolvedValue(1) // admin already exists
    process.env.ADMIN_ALLOW_SELF_SIGNUP = "0"

    await expect(authService.register({ email: "a@b.com", password: "pass123", role: "admin" }))
      .rejects.toMatchObject({ statusCode: 403 })

    delete process.env.ADMIN_ALLOW_SELF_SIGNUP
  })
})

// ─── initiateLogin ────────────────────────────────────────────────────────────
describe("authService.initiateLogin", () => {
  test("throws 404 if user not found", async () => {
    User.findOne.mockResolvedValue(null)
    await expect(authService.initiateLogin({ email: "no@example.com", password: "pass123" }))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  test("throws 400 for wrong password", async () => {
    User.findOne.mockResolvedValue(mockUser())
    bcrypt.compare.mockResolvedValue(false)
    await expect(authService.initiateLogin({ email: "test@example.com", password: "wrong" }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test("sends OTP email and returns otp_sent on valid credentials", async () => {
    const user = mockUser()
    User.findOne.mockResolvedValue(user)
    bcrypt.compare.mockResolvedValue(true)

    const result = await authService.initiateLogin({ email: "test@example.com", password: "pass123" })

    expect(result.status).toBe("otp_sent")
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(user.save).toHaveBeenCalled()
  })
})

// ─── verifyOtp ────────────────────────────────────────────────────────────────
describe("authService.verifyOtp", () => {
  test("throws 400 for invalid code format", async () => {
    await expect(authService.verifyOtp({ email: "test@example.com", code: "abc" }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test("throws 400 if no OTP found on user", async () => {
    User.findOne.mockResolvedValue(mockUser({ loginOtp: {} }))
    await expect(authService.verifyOtp({ email: "test@example.com", code: "123456" }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test("throws 400 if OTP is expired", async () => {
    const user = mockUser({
      loginOtp: { codeHash: "hash", expiresAt: new Date(Date.now() - 1000), attempts: 0 },
    })
    User.findOne.mockResolvedValue(user)
    await expect(authService.verifyOtp({ email: "test@example.com", code: "123456" }))
      .rejects.toMatchObject({ statusCode: 400, message: "Code expired" })
  })

  test("throws 429 after 5 failed attempts", async () => {
    const user = mockUser({
      loginOtp: { codeHash: "hash", expiresAt: new Date(Date.now() + 60000), attempts: 5 },
    })
    User.findOne.mockResolvedValue(user)
    await expect(authService.verifyOtp({ email: "test@example.com", code: "123456" }))
      .rejects.toMatchObject({ statusCode: 429 })
  })

  test("returns tokens on valid OTP", async () => {
    const user = mockUser({
      loginOtp: { codeHash: "hash", expiresAt: new Date(Date.now() + 60000), attempts: 0 },
    })
    User.findOne.mockResolvedValue(user)
    bcrypt.compare.mockResolvedValue(true)

    const result = await authService.verifyOtp({ email: "test@example.com", code: "123456" })

    expect(result).toHaveProperty("accessToken")
    expect(result).toHaveProperty("refreshToken")
    expect(result.user.email).toBe("test@example.com")
    expect(user.emailVerified).toBe(true)
    expect(user.save).toHaveBeenCalled()
  })
})

// ─── forgotPassword ───────────────────────────────────────────────────────────
describe("authService.forgotPassword", () => {
  test("throws 400 for invalid email", async () => {
    await expect(authService.forgotPassword({ email: "notanemail" }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test("returns success message even if user not found (prevents enumeration)", async () => {
    User.findOne.mockResolvedValue(null)
    const result = await authService.forgotPassword({ email: "no@one.com" })
    expect(result.message).toContain("If an account exists")
    expect(sendEmail).not.toHaveBeenCalled()
  })

  test("sends reset email and saves token if user found", async () => {
    const user = mockUser()
    User.findOne.mockResolvedValue(user)

    const result = await authService.forgotPassword({ email: "test@example.com" })

    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(user.save).toHaveBeenCalled()
    expect(user.passwordReset).toHaveProperty("tokenHash")
    expect(user.passwordReset).toHaveProperty("expiresAt")
    expect(result.message).toContain("If an account exists")
  })
})

// ─── resetPassword ────────────────────────────────────────────────────────────
describe("authService.resetPassword", () => {
  test("throws 400 if token or email missing", async () => {
    await expect(authService.resetPassword({ token: "", email: "a@b.com", newPassword: "pass123" }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test("throws 400 if reset token expired", async () => {
    const user = mockUser({
      passwordReset: { tokenHash: "hash", expiresAt: new Date(Date.now() - 1000) },
    })
    User.findOne.mockResolvedValue(user)
    await expect(authService.resetPassword({ token: "tok", email: "test@example.com", newPassword: "newpass" }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test("throws 400 if token does not match", async () => {
    const user = mockUser({
      passwordReset: { tokenHash: "hash", expiresAt: new Date(Date.now() + 60000) },
    })
    User.findOne.mockResolvedValue(user)
    bcrypt.compare.mockResolvedValue(false)
    await expect(authService.resetPassword({ token: "bad", email: "test@example.com", newPassword: "newpass" }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test("resets password, clears refresh tokens, sends confirmation email", async () => {
    const user = mockUser({
      refreshTokens: ["token1", "token2"],
      passwordReset: { tokenHash: "hash", expiresAt: new Date(Date.now() + 60000) },
    })
    User.findOne.mockResolvedValue(user)
    bcrypt.compare.mockResolvedValue(true)

    const result = await authService.resetPassword({ token: "valid", email: "test@example.com", newPassword: "newpass123" })

    expect(user.refreshTokens).toEqual([]) // all sessions invalidated
    expect(user.save).toHaveBeenCalled()
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(result.message).toContain("Password reset successfully")
  })
})

// ─── _helpers ─────────────────────────────────────────────────────────────────
describe("authService._helpers", () => {
  const { isValidEmail, isValidPassword, isValidOtp } = authService._helpers

  test("isValidEmail", () => {
    expect(isValidEmail("user@example.com")).toBe(true)
    expect(isValidEmail("bad")).toBe(false)
    expect(isValidEmail("")).toBe(false)
    expect(isValidEmail(null)).toBe(false)
  })

  test("isValidPassword", () => {
    expect(isValidPassword("pass123")).toBe(true)
    expect(isValidPassword("abc")).toBe(false)
    expect(isValidPassword("")).toBe(false)
  })

  test("isValidOtp", () => {
    expect(isValidOtp("123456")).toBe(true)
    expect(isValidOtp("12345")).toBe(false)
    expect(isValidOtp("abcdef")).toBe(false)
    expect(isValidOtp("1234567")).toBe(false)
  })
})
