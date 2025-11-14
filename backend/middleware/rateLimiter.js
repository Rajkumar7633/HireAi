const rateLimit = require("express-rate-limit")

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Strict rate limiting for auth endpoints (configurable)
function makeAuthLimiter() {
  // In development, disable limiter to avoid blocking local tests
  const isDev = process.env.NODE_ENV !== 'production'
  if (isDev) {
    return (req, res, next) => next()
  }
  const windowMs = Number(process.env.AUTH_LIMIT_WINDOW_MS || 5 * 60 * 1000) // default 5 minutes
  const max = Number(process.env.AUTH_LIMIT_MAX || 20) // default 20 attempts per window
  return rateLimit({
    windowMs,
    max,
    message: { error: "Too many authentication attempts, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  })
}

const authLimiter = makeAuthLimiter()

// File upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: {
    error: "Too many file uploads, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Strict limiter for billing endpoints to prevent abuse
const billingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // generous but protective
  message: { error: "Too many billing requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  billingLimiter,
}
