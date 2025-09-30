const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVICE_HOST,
  port: process.env.EMAIL_SERVICE_PORT,
  secure: process.env.EMAIL_SERVICE_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVICE_USER,
    pass: process.env.EMAIL_SERVICE_PASS,
  },
})

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"HireAI" <${process.env.EMAIL_SERVICE_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      html, // html body
    })
    console.log("Message sent: %s", info.messageId)
    // Preview only available when sending through an Ethereal account
    if (process.env.EMAIL_SERVICE_HOST === "smtp.ethereal.email") {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info))
    }
    return info
  } catch (error) {
    console.error("Error sending email:", error)
    throw new Error("Failed to send email")
  }
}

module.exports = sendEmail
