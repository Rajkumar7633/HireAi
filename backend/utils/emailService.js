const nodemailer = require("nodemailer")

// SMTP_* wins over EMAIL_SERVICE_* so Brevo on Render is not overridden by old Gmail vars
function getSmtpSettings() {
  return {
    host: process.env.SMTP_HOST || process.env.EMAIL_SERVICE_HOST,
    port: Number(process.env.SMTP_PORT || process.env.EMAIL_SERVICE_PORT || 587),
    user: process.env.SMTP_USER || process.env.EMAIL_SERVICE_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_SERVICE_PASS,
  }
}

function hasSmtpConfig() {
  const { host, user, pass } = getSmtpSettings()
  return !!(host && user && pass)
}

function shouldUseSmtpOnly() {
  if (process.env.EMAIL_PROVIDER === "smtp") return true
  if (process.env.SMTP_HOST) return true
  const host = (getSmtpSettings().host || "").toLowerCase()
  return host.includes("brevo") || host.includes("sendgrid") || host.includes("mailgun")
}

function createTransporter() {
  const { host, port, user, pass } = getSmtpSettings()
  const secure = port === 465

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 45000,
  })
}

let transporter = null
if (hasSmtpConfig()) {
  transporter = createTransporter()
  const { host } = getSmtpSettings()
  if (shouldUseSmtpOnly() || !process.env.RESEND_API_KEY) {
    setTimeout(() => {
      transporter.verify().then(() => {
        console.log("✅ SMTP ready:", host)
      }).catch((err) => {
        console.warn("⚠️  SMTP verify failed:", err.message)
      })
    }, 2000)
  }
}

if (shouldUseSmtpOnly() && transporter) {
  console.log("✅ Email via SMTP only:", getSmtpSettings().host)
} else if (process.env.RESEND_API_KEY) {
  console.log("✅ Email: Resend API primary" + (transporter ? ", SMTP fallback" : ""))
} else if (transporter) {
  console.log("✅ Email via SMTP:", getSmtpSettings().host)
} else {
  console.warn("⚠️  Email not configured — set Brevo SMTP_* on Render")
}

async function sendViaResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null

  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    "HireAI <onboarding@resend.dev>"

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.message || `Resend error ${res.status}`
    throw new Error(msg)
  }
  console.log("[email] Resend sent to %s — id: %s", to, data.id)
  return data
}

async function sendViaSmtp({ to, subject, html }) {
  if (!transporter) {
    throw new Error("SMTP not configured")
  }

  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    `"HireAI" <${getSmtpSettings().user}>`

  const info = await transporter.sendMail({ from, to, subject, html })
  console.log("[email] SMTP sent to %s via %s — messageId: %s", to, getSmtpSettings().host, info.messageId)
  return info
}

const sendEmail = async ({ to, subject, html }) => {
  // Brevo / explicit SMTP_HOST — skip Resend (avoids gmail.com domain errors + double attempts)
  if (shouldUseSmtpOnly() && transporter) {
    return sendViaSmtp({ to, subject, html })
  }

  if (process.env.RESEND_API_KEY) {
    try {
      return await sendViaResend({ to, subject, html })
    } catch (err) {
      console.error("[email] Resend failed:", err.message)
      if (transporter) {
        console.log("[email] Falling back to SMTP for", to)
        return sendViaSmtp({ to, subject, html })
      }
      throw err
    }
  }

  if (transporter) {
    return sendViaSmtp({ to, subject, html })
  }

  console.warn("[email] SMTP not configured. Logging email instead of sending.")
  console.log("[email] To:", to, "| Subject:", subject)
  const otpMatch = String(html).match(/>(\d{6})</)
  if (otpMatch) console.log("[email] OTP (dev log):", otpMatch[1])
  return { messageId: "mock-dev-message-id", mocked: true }
}

module.exports = sendEmail
