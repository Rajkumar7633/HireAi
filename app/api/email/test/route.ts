import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email-service"
import { buildProfessionalTemplate } from "@/lib/email-templates"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { to, subject, html, name, ctaUrl, ctaLabel } = await request.json().catch(() => ({}))
    const target = to || process.env.EMAIL_TEST_TO || session.email

    if (!target) return NextResponse.json({ message: "Missing recipient email (to)" }, { status: 400 })

    const subj = subject || `Test email from HireAI`
    const recipientName = name || session.name || "there"
    const body =
      html ||
      buildProfessionalTemplate({
        recipientName,
        heading: "Hello",
        messageHtml: `This is a test email from <strong>HireAI</strong> to verify SMTP settings. If you received this, your email configuration is working.`,
        ctaUrl: ctaUrl || "https://hireai.example.com",
        ctaLabel: ctaLabel || "Open HireAI",
        footerNote: "You are receiving this one-time test because someone initiated a configuration check.",
      })

    const result = await sendEmail({ to: target, subject: subj, html: body })
    return NextResponse.json({ ok: true, to: target, result })
  } catch (e: any) {
    console.error("email test error", e)
    return NextResponse.json({ ok: false, message: e?.message || "Failed to send test email" }, { status: 500 })
  }
}
