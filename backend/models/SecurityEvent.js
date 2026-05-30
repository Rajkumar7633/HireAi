const mongoose = require("mongoose")

const securityEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      "LOGIN_SUCCESS",
      "LOGIN_FAILURE",
      "PASSWORD_CHANGE",
      "PASSWORD_RESET",
      "ACCOUNT_LOCKED",
      "ACCOUNT_UNLOCKED",
      "SESSION_EXPIRED",
      "MULTIPLE_LOGIN_ATTEMPTS",
      "SQL_INJECTION_ATTEMPT",
      "XSS_ATTEMPT",
      "CSRF_ATTEMPT",
      "RATE_LIMIT_EXCEEDED",
      "MULTIPLE_IP_DETECTED",
      "SUSPICIOUS_ACTIVITY",
      "DATA_ACCESS",
      "UNAUTHORIZED_ACCESS",
      "PERMISSION_DENIED",
      "API_ABUSE",
      "MALICIOUS_REQUEST"
    ]
  },
  severity: {
    type: String,
    enum: ["info", "warning", "critical"],
    default: "info"
  },
  ipAddress: String,
  userAgent: String,
  url: String,
  method: String,
  details: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
})

securityEventSchema.index({ eventType: 1, timestamp: -1 })
securityEventSchema.index({ userId: 1, timestamp: -1 })
securityEventSchema.index({ severity: 1, timestamp: -1 })

module.exports = mongoose.model("SecurityEvent", securityEventSchema)
