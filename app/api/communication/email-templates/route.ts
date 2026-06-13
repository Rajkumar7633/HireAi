import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import EmailTemplate from "@/models/EmailTemplate"
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email-default-templates"

async function seedDefaultsIfNeeded(userId: string) {
  const count = await EmailTemplate.countDocuments({ isDefault: true })
  if (count > 0) return

  await EmailTemplate.insertMany(
    DEFAULT_EMAIL_TEMPLATES.map((t) => ({
      ...t,
      createdBy: userId,
    })),
  )
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    await seedDefaultsIfNeeded(session.userId)

    const templates = await EmailTemplate.find({
      $or: [{ createdBy: session.userId }, { isDefault: true }],
    }).sort({ isDefault: -1, createdAt: -1 })

    return NextResponse.json({ templates, autoSendEnabled: process.env.EMAIL_AUTOSEND !== "false" })
  } catch (error) {
    console.error("Error fetching email templates:", error)
    return NextResponse.json({ message: "Failed to fetch templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { name, subject, content, category, variables, linkedStatus } = await request.json()

    if (!name || !subject || !content) {
      return NextResponse.json({ message: "name, subject, and content are required" }, { status: 400 })
    }

    await connectDB()

    const template = new EmailTemplate({
      name,
      subject,
      content,
      category: category || "application_update",
      variables: variables || [],
      linkedStatus: linkedStatus || null,
      createdBy: session.userId,
      isDefault: false,
      createdAt: new Date(),
    })

    await template.save()

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error("Error creating email template:", error)
    return NextResponse.json({ message: "Failed to create template" }, { status: 400 })
  }
}
