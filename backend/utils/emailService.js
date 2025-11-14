const nodemailer = require("nodemailer")

function hasSmtpConfig() {
  return (
    !!process.env.EMAIL_SERVICE_HOST &&
    !!process.env.EMAIL_SERVICE_PORT &&
    !!process.env.EMAIL_SERVICE_USER &&
    !!process.env.EMAIL_SERVICE_PASS
  )
}

let transporter = null
if (hasSmtpConfig()) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVICE_HOST,
    port: Number(process.env.EMAIL_SERVICE_PORT),
    secure: String(process.env.EMAIL_SERVICE_PORT) === "465",
    auth: {
      user: process.env.EMAIL_SERVICE_USER,
      pass: process.env.EMAIL_SERVICE_PASS,
    },
  })
}

const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!transporter) {
      // Dev fallback: no SMTP configured. Log the email and pretend success.
      console.warn("[email] SMTP not configured. Logging email instead of sending.")
      console.log("[email] To:", to)
      console.log("[email] Subject:", subject)
      console.log("[email] HTML:\n", html)
      return { messageId: "mock-dev-message-id", mocked: true }
    }

    const info = await transporter.sendMail({
      from: `"HireAI" <${process.env.EMAIL_SERVICE_USER}>`,
      to,
      subject,
      html,
    })
    console.log("Message sent: %s", info.messageId)
    if (process.env.EMAIL_SERVICE_HOST === "smtp.ethereal.email") {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info))
    }
    return info
  } catch (error) {
    console.error("Error sending email:", error)
    if (process.env.STRICT_EMAIL === "1") {
      throw new Error("Failed to send email")
    }
    // Dev fallback: treat as sent to avoid blocking flows when SMTP rejects
    console.warn("[email] Treating send failure as success (dev fallback). Set STRICT_EMAIL=1 to enforce.")
    return { messageId: "mock-dev-on-failure", mocked: true, error: String(error?.message || error) }
  }
}

module.exports = sendEmail
