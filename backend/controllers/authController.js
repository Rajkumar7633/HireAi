/**
 * backend/controllers/authController.js
 *
 * HTTP layer for auth routes.
 * Handles req/res — all business logic delegated to authService.
 */

const authService = require("../services/authService")
const User = require("../models/User")

/**
 * Shared error handler — reads statusCode attached to service errors.
 */
function handleError(res, err) {
  const status = err.statusCode || 500
  const message = err.message || "Internal server error"
  if (status >= 500) console.error("[authController]", err)
  return res.status(status).json({ message })
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const result = await authService.register(req.body)
    res.status(201).json(result)
  } catch (err) {
    handleError(res, err)
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const result = await authService.initiateLogin(req.body)
    res.json(result)
  } catch (err) {
    handleError(res, err)
  }
}

// POST /api/auth/verify-otp
async function verifyOtp(req, res) {
  try {
    const result = await authService.verifyOtp(req.body)
    res.json(result)
  } catch (err) {
    handleError(res, err)
  }
}

// GET /api/auth/session
async function getSession(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-password -passwordHash -loginOtp -refreshTokens -passwordReset")
    if (!user) return res.status(404).json({ message: "User not found" })
    res.json(user)
  } catch (err) {
    handleError(res, err)
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  try {
    await authService.logout({ userId: req.user.id, refreshToken: req.body?.refreshToken })
    res.json({ msg: "Logged out successfully" })
  } catch (err) {
    handleError(res, err)
  }
}

// POST /api/auth/logout-all
async function logoutAll(req, res) {
  try {
    await authService.logoutAll({ userId: req.user.id })
    res.json({ message: "Logged out from all devices" })
  } catch (err) {
    handleError(res, err)
  }
}

// POST /api/auth/refresh
async function refresh(req, res) {
  try {
    const result = await authService.refreshTokens(req.body)
    res.json(result)
  } catch (err) {
    handleError(res, err)
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  try {
    const result = await authService.forgotPassword(req.body)
    res.json(result)
  } catch (err) {
    handleError(res, err)
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const result = await authService.resetPassword(req.body)
    res.json(result)
  } catch (err) {
    handleError(res, err)
  }
}

module.exports = {
  register, login, verifyOtp, getSession,
  logout, logoutAll, refresh,
  forgotPassword, resetPassword,
}
