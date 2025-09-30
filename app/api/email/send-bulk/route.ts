import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { sendEmail, renderTemplate } from "@/lib/email-service"
import EmailTemplate from "@/models/EmailTemplate"
import User from "@/models/User"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { templateId, subject, html, candidates, variables = {} } = await request.json()
    if ((!templateId && (!subject || !html)) || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ message: "templateId or subject+html and candidates[] are required" }, { status: 400 })
    }

    await connectDB()

    let tpl: any = null
    if (templateId) {
      tpl = await EmailTemplate.findById(templateId).lean()
      if (!tpl) return NextResponse.json({ message: "Template not found" }, { status: 404 })
    }

    const results: any[] = []

    for (const c of candidates) {
      let to = c.email as string | undefined
      if (!to) {
        const u = await User.findById(c.userId || c.jobSeekerId).select("email name").lean()
        to = u?.email
        if (!to) continue
        variables.candidateName = variables.candidateName || u?.name || "Candidate"
      }

      const vars = {
        companyName: process.env.COMPANY_NAME || "Our Company",
        ...variables,
        ...c.variables,
      }

      const finalSubject = tpl ? renderTemplate(tpl.subject, vars) : renderTemplate(subject || "", vars)
      const finalHtmlRaw = tpl ? renderTemplate(tpl.content, vars) : renderTemplate(html || "", vars)
      const finalHtml = finalHtmlRaw.includes("<") ? finalHtmlRaw : finalHtmlRaw.replaceAll("\n", "<br/>")

      try {
        await sendEmail({ to, subject: finalSubject, html: finalHtml })
        results.push({ to, ok: true })
      } catch (e: any) {
        console.error("bulk email error", e)
        results.push({ to, ok: false, error: e?.message })
      }
    }

    return NextResponse.json({ sent: results.filter(r => r.ok).length, total: results.length, results })
  } catch (e) {
    console.error("send-bulk error", e)
    return NextResponse.json({ message: "Failed to send emails" }, { status: 500 })
  }
}
