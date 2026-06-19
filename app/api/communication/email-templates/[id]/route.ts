import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import EmailTemplate from "@/models/EmailTemplate"
export { dynamic } from "@/lib/api-dynamic"


export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, subject, content, category, variables, linkedStatus } = body

    await connectDB()

    const template = await EmailTemplate.findOne({
      _id: params.id,
      createdBy: session.userId,
      isDefault: false,
    })

    if (!template) {
      return NextResponse.json({ message: "Template not found or cannot be edited" }, { status: 404 })
    }

    if (name) template.name = name
    if (subject) template.subject = subject
    if (content) template.content = content
    if (category) template.category = category
    if (variables) template.variables = variables
    if (linkedStatus !== undefined) template.linkedStatus = linkedStatus || null

    await template.save()

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Error updating email template:", error)
    return NextResponse.json({ message: "Failed to update template" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const result = await EmailTemplate.deleteOne({
      _id: params.id,
      createdBy: session.userId,
      isDefault: false,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Template not found or cannot be deleted" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting email template:", error)
    return NextResponse.json({ message: "Failed to delete template" }, { status: 500 })
  }
}
