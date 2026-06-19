const nodemailer = require("nodemailer")

function getSmtpSettings() {
  return {
    host: process.env.SMTP_HOST || process.env.EMAIL_SERVICE_HOST,
    port: Number(process.env.SMTP_PORT || process.env.EMAIL_SERVICE_PORT || 587),
    user: process.env.SMTP_USER || process.env.EMAIL_SERVICE_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_SERVICE_PASS,
  }
}

function getBrevoApiKey() {
  return process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || null
}

function hasBrevoApiConfig() {
  return !!getBrevoApiKey()
}

function hasSmtpConfig() {
  const { host, user, pass } = getSmtpSettings()
  return !!(host && user && pass)
}

function isRenderOrServerless() {
  return (
    process.env.RENDER === "true" ||
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1"
  )
}

function parseFromAddress(fromStr) {
  const raw = (fromStr || "").trim()
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() }
  if (raw.includes("@")) return { name: "HireAI", email: raw }
  const user = getSmtpSettings().user
  return { name: "HireAI", email: user || "noreply@example.com" }
}

function getFromAddress() {
  return (
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    (getSmtpSettings().user ? `HireAI <${getSmtpSettings().user}>` : "HireAI <onboarding@resend.dev>")
  )
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
if (hasSmtpConfig() && !isRenderOrServerless()) {
  transporter = createTransporter()
  setTimeout(() => {
    transporter.verify().then(() => {
      console.log("✅ SMTP ready (local):", getSmtpSettings().host)
    }).catch((err) => {
      console.warn("⚠️  SMTP verify failed:", err.message)
    })
  }, 2000)
}

if (hasBrevoApiConfig()) {
  console.log("✅ Email via Brevo HTTP API (works on Render free tier)")
} else if (isRenderOrServerless() && hasSmtpConfig()) {
  console.warn(
    "⚠️  Render blocks SMTP port 587 on free tier. Set BREVO_API_KEY (Brevo → SMTP & API → API Keys)."
  )
} else if (transporter) {
  console.log("✅ Email via SMTP:", getSmtpSettings().host)
} else if (process.env.RESEND_API_KEY) {
  console.log("✅ Email via Resend API")
} else {
  console.warn("⚠️  Email not configured — set BREVO_API_KEY on Render")
}

async function sendViaBrevoApi({ to, subject, html }) {
  const apiKey = getBrevoApiKey()
  if (!apiKey) throw new Error("BREVO_API_KEY not set")

  const sender = parseFromAddress(getFromAddress())

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || `Brevo API error ${res.status}`)
  }
  console.log("[email] Brevo API sent to %s — messageId: %s", to, data.messageId)
  return data
}

async function sendViaResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null

  const from = getFromAddress()

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

async function sendViaSmtp({ to, subject, html }) {
  if (!transporter) {
    throw new Error("SMTP not available (blocked on Render free tier — use BREVO_API_KEY)")
  }

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
  })
  console.log("[email] SMTP sent to %s — messageId: %s", to, info.messageId)
  return info
}

const sendEmail = async ({ to, subject, html }) => {
  // Brevo HTTP API — works on Render (SMTP port 587 is blocked on free tier)
  if (hasBrevoApiConfig()) {
    return sendViaBrevoApi({ to, subject, html })
  }

  if (process.env.RESEND_API_KEY) {
    try {
      return await sendViaResend({ to, subject, html })
    } catch (err) {
      console.error("[email] Resend failed:", err.message)
      if (transporter) return sendViaSmtp({ to, subject, html })
      throw err
    }
  }

  if (transporter) {
    return sendViaSmtp({ to, subject, html })
  }

  console.warn("[email] Not configured. Logging instead of sending.")
  console.log("[email] To:", to, "| Subject:", subject)
  const otpMatch = String(html).match(/>(\d{6})</)
  if (otpMatch) console.log("[email] OTP (dev log):", otpMatch[1])
  return { messageId: "mock-dev-message-id", mocked: true }
}

module.exports = sendEmail
