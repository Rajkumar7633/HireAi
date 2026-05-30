const SecurityEvent = require("../models/SecurityEvent")

// Log security events
async function logSecurityEvent(req, eventType, severity = "info", details = {}) {
  try {
    const event = new SecurityEvent({
      userId: req.user?.id || null,
      eventType,
      severity,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      url: req.originalUrl,
      method: req.method,
      details,
      timestamp: new Date()
    })

    await event.save()
  } catch (error) {
    console.error("Failed to log security event:", error)
  }
}

// Security middleware
const securityMiddleware = async (req, res, next) => {
  // Log suspicious activity
  const suspiciousPatterns = [
    /union.*select/i,
    /<script>/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i
  ]

  const bodyString = JSON.stringify(req.body)
  const queryString = req.url

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(bodyString) || pattern.test(queryString)) {
      await logSecurityEvent(req, "SQL_INJECTION_ATTEMPT", "critical", {
        pattern: pattern.toString(),
        url: req.url
      })
      return res.status(403).json({ msg: "Suspicious activity detected" })
    }
  }

  // Check for suspicious headers
  const suspiciousHeaders = ["x-forwarded-for", "x-real-ip"]
  suspiciousHeaders.forEach(header => {
    const headerValue = req.get(header)
    if (headerValue && headerValue.includes(",")) {
      // Multiple IPs in header - could be proxy chain
      // Log but don't block
      logSecurityEvent(req, "MULTIPLE_IP_DETECTED", "warning", {
        header,
        value: headerValue
      })
    }
  })

  next()
}

// IP blocking middleware
const blockedIPs = new Set()

function blockIP(ip) {
  blockedIPs.add(ip)
}

function unblockIP(ip) {
  blockedIPs.delete(ip)
}

const ipBlockMiddleware = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress
  if (blockedIPs.has(ip)) {
    return res.status(403).json({ msg: "IP address blocked" })
  }
  next()
}

// Session validation middleware
const sessionValidationMiddleware = async (req, res, next) => {
  if (!req.user) {
    return next()
  }

  // Check if session is still valid
  const sessionAge = Date.now() - new Date(req.user.lastLogin).getTime()
  const maxSessionAge = 24 * 60 * 60 * 1000 // 24 hours

  if (sessionAge > maxSessionAge) {
    await logSecurityEvent(req, "SESSION_EXPIRED", "warning", {
      sessionAge,
      maxSessionAge
    })
    return res.status(401).json({ msg: "Session expired, please login again" })
  }

  // Check for concurrent sessions
  // This would require session tracking in database
  // For now, just log
  next()
}

// Input sanitization middleware
const inputSanitizationMiddleware = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === "string") {
      return obj
        .replace(/[<>]/g, "")
        .trim()
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize)
    } else if (obj && typeof obj === "object") {
      const sanitized = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key])
        }
      }
      return sanitized
    }
    return obj
  }

  if (req.body) {
    req.body = sanitize(req.body)
  }

  if (req.query) {
    req.query = sanitize(req.query)
  }

  next()
}

module.exports = {
  logSecurityEvent,
  securityMiddleware,
  ipBlockMiddleware,
  blockIP,
  unblockIP,
  sessionValidationMiddleware,
  inputSanitizationMiddleware
}
