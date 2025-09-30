import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import EmailTemplate from "@/models/EmailTemplate"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const templates = await EmailTemplate.find({
      $or: [{ createdBy: session.userId }, { isDefault: true }],
    }).sort({ createdAt: -1 })

    return NextResponse.json({ templates })
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

    const { name, subject, content, category, variables } = await request.json()

    await connectDB()

    const template = new EmailTemplate({
      name,
      subject,
      content,
      category,
      variables: variables || [],
      createdBy: session.userId,
      isDefault: false,
      createdAt: new Date(),
    })

    await template.save()

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error("Error creating email template:", error)
    return NextResponse.json({ message: "Failed to create template" }, { status: 500 })
  }
}
