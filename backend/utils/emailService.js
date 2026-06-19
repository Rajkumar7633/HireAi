const nodemailer = require("nodemailer")

function getSmtpSettings() {
  return {
    host: process.env.EMAIL_SERVICE_HOST || process.env.SMTP_HOST,
    port: Number(process.env.EMAIL_SERVICE_PORT || process.env.SMTP_PORT || 587),
    user: process.env.EMAIL_SERVICE_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_SERVICE_PASS || process.env.SMTP_PASS,
  }
}

function hasSmtpConfig() {
  const { host, user, pass } = getSmtpSettings()
  return !!(host && user && pass)
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
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
}

let transporter = null
if (hasSmtpConfig()) {
  transporter = createTransporter()
  transporter.verify().then(() => {
    console.log("✅ SMTP ready:", getSmtpSettings().host)
  }).catch((err) => {
    console.error("❌ SMTP verification failed:", err.message)
  })
} else {
  console.warn("⚠️  SMTP not configured — set EMAIL_SERVICE_* or SMTP_* on Render")
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
    throw new Error(data?.message || `Resend error ${res.status}`)
  }
  console.log("[email] Resend sent to %s — id: %s", to, data.id)
  return data
}

const sendEmail = async ({ to, subject, html }) => {
  if (process.env.RESEND_API_KEY) {
    try {
      return await sendViaResend({ to, subject, html })
    } catch (err) {
      console.error("[email] Resend failed:", err.message)
      if (!transporter) throw err
    }
  }

  if (!transporter) {
    console.warn("[email] SMTP not configured. Logging email instead of sending.")
    console.log("[email] To:", to, "| Subject:", subject)
    const otpMatch = String(html).match(/>(\d{6})</)
    if (otpMatch) console.log("[email] OTP (dev log):", otpMatch[1])
    return { messageId: "mock-dev-message-id", mocked: true }
  }

  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    `"HireAI" <${getSmtpSettings().user}>`

  const info = await transporter.sendMail({ from, to, subject, html })
  console.log("[email] Sent to %s — messageId: %s", to, info.messageId)
  return info
}

module.exports = sendEmail
