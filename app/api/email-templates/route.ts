import { NextResponse, type NextRequest } from "next/server"
import { connectDB } from "@/lib/mongodb"
import EmailTemplate from "@/models/EmailTemplate"
import { getSession } from "@/lib/auth"

import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email-default-templates"
export { dynamic } from "@/lib/api-dynamic"


const defaultTemplates = DEFAULT_EMAIL_TEMPLATES.map((t) => ({
  name: t.name,
  subject: t.subject,
  category: t.category,
  content: t.content,
  variables: [...t.variables],
  linkedStatus: t.linkedStatus,
  isDefault: true,
}))

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    await connectDB()

    const count = await EmailTemplate.countDocuments()
    if (count === 0) {
      await EmailTemplate.insertMany(defaultTemplates.map((t) => ({ ...t, createdBy: session.userId })))
    }

    const templates = await EmailTemplate.find().sort({ isDefault: -1, createdAt: -1 }).lean()
    return NextResponse.json({ templates })
  } catch (e) {
    console.error("email templates list error", e)
    return NextResponse.json({ message: "Failed to load templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    await connectDB()
    const { name, subject, content, category = "application_update", variables = [], isDefault = false } = await request.json()
    if (!name || !subject || !content) return NextResponse.json({ message: "name, subject, content required" }, { status: 400 })
    const tpl = await EmailTemplate.create({ name, subject, content, category, variables, isDefault, createdBy: session.userId })
    return NextResponse.json({ template: tpl })
  } catch (e) {
    console.error("email template create error", e)
    return NextResponse.json({ message: "Failed to create template" }, { status: 500 })
  }
}
