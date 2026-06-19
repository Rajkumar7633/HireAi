const nodemailer = require("nodemailer")

function hasSmtpConfig() {
  return (
    !!process.env.EMAIL_SERVICE_HOST &&
    !!process.env.EMAIL_SERVICE_PORT &&
    !!process.env.EMAIL_SERVICE_USER &&
    !!process.env.EMAIL_SERVICE_PASS
  )
}

function createTransporter() {
  const port = Number(process.env.EMAIL_SERVICE_PORT)
  const secure = port === 465

  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVICE_HOST,
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user: process.env.EMAIL_SERVICE_USER,
      pass: process.env.EMAIL_SERVICE_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
}

let transporter = null
if (hasSmtpConfig()) {
  transporter = createTransporter()
  transporter.verify().then(() => {
    console.log("✅ SMTP ready:", process.env.EMAIL_SERVICE_HOST)
  }).catch((err) => {
    console.error("❌ SMTP verification failed:", err.message)
  })
} else {
  console.warn("⚠️  SMTP not configured — set EMAIL_SERVICE_HOST/PORT/USER/PASS on Render")
}

const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!transporter) {
      console.warn("[email] SMTP not configured. Logging email instead of sending.")
      console.log("[email] To:", to)
      console.log("[email] Subject:", subject)
      console.log("[email] Body preview:", String(html).slice(0, 200))
      return { messageId: "mock-dev-message-id", mocked: true }
    }

    const from =
      process.env.SMTP_FROM ||
      process.env.EMAIL_FROM ||
      `"HireAI" <${process.env.EMAIL_SERVICE_USER}>`

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    })
    console.log("[email] Sent to %s — messageId: %s", to, info.messageId)
    return info
  } catch (error) {
    console.error("[email] Send failed to", to, "—", error.message)
    if (process.env.STRICT_EMAIL === "1") {
      throw new Error("Failed to send email: " + error.message)
    }
    throw error
  }
}

module.exports = sendEmail
