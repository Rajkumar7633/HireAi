const rateLimit = require("express-rate-limit")

const limiterDefaults = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
}

// General API rate limiting
const apiLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
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
    ...limiterDefaults,
    windowMs,
    max,
    message: { error: "Too many authentication attempts, please try again later." },
  })
}

const authLimiter = makeAuthLimiter()

// File upload rate limiting
const uploadLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many file uploads, please try again later.",
  },
})

const billingLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many billing requests, please try again later." },
})

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  billingLimiter,
}
