/**
 * backend/routes/auth.js
 * Thin router — only wires middleware + controller. Zero business logic.
 */
const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const { authLimiter } = require("../middleware/rateLimiter")
const c = require("../controllers/authController")

router.post("/register",        c.register)
router.post("/login",           authLimiter, c.login)
router.post("/verify-otp",      authLimiter, c.verifyOtp)
router.get ("/session",         auth, c.getSession)
router.post("/logout",          auth, c.logout)
router.post("/logout-all",      auth, c.logoutAll)
router.post("/refresh",         c.refresh)
router.post("/forgot-password", authLimiter, c.forgotPassword)
router.post("/reset-password",  authLimiter, c.resetPassword)

module.exports = router
