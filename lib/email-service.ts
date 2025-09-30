import nodemailer from "nodemailer"

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{ filename: string; content?: Buffer | string; path?: string; contentType?: string; cid?: string }>
}

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter
  const host = process.env.SMTP_HOST || process.env.EMAIL_SERVICE_HOST
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_SERVICE_PORT || 587)
  const user = process.env.SMTP_USER || process.env.EMAIL_SERVICE_USER
  const pass = process.env.SMTP_PASS || process.env.EMAIL_SERVICE_PASS

  if (!host || !user || !pass) {
    return null
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // robustness
    pool: true,
    connectionTimeout: 20_000,
    socketTimeout: 20_000,
    greetingTimeout: 10_000,
  })
  return transporter
}

export async function sendEmail({ to, subject, html, text, attachments }: SendEmailOptions) {
  const from = process.env.SMTP_FROM || process.env.EMAIL_SERVICE_FROM || process.env.SMTP_USER || process.env.EMAIL_SERVICE_USER || "no-reply@example.com"
  const tx = getTransporter()
  if (!tx) {
    // Fallback: log only
    console.info("[email-fallback]", { to, subject })
    // eslint-disable-next-line no-console
    console.debug(html)
    return { queued: true, transport: "fallback" }
  }
  const info = await tx.sendMail({ from, to, subject, html, text, attachments })
  return { queued: true, messageId: info.messageId }
}

export function renderTemplate(template: string, variables: Record<string, any>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = variables[key]
    return v == null ? "" : String(v)
  })
}

export async function verifyTransport() {
  const tx = getTransporter()
  if (!tx) return { ok: false, reason: "missing_smtp_env" as const }
  try {
    await tx.verify()
    return { ok: true as const }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || String(e) }
  }
}
