import { NextResponse, type NextRequest } from "next/server"
import { connectDB } from "@/lib/mongodb"
import EmailTemplate from "@/models/EmailTemplate"
import { getSession } from "@/lib/auth"

const defaultTemplates = [
  {
    name: "Application Received",
    subject: "Application Received - {{jobTitle}}",
    category: "application_update",
    content:
      `Dear {{candidateName}},\n\nThank you for applying to the {{jobTitle}} position at {{companyName}}. We have received your application and will review it carefully. We will contact you if your profile matches our requirements.\n\nBest regards,\n{{companyName}} Recruiting Team`,
    variables: ["candidateName", "jobTitle", "companyName"],
    isDefault: true,
  },
  {
    name: "Interview Invitation",
    subject: "Interview Invitation - {{jobTitle}}",
    category: "interview",
    content:
      `Dear {{candidateName}},\n\nWe are pleased to invite you for an interview for the {{jobTitle}} position at {{companyName}}.\n\nDate: {{interviewDate}}\nTime: {{interviewTime}}\nMode: {{interviewMode}}\n\nPlease reply to confirm your availability.\n\nRegards,\n{{companyName}} Recruiting Team`,
    variables: ["candidateName", "jobTitle", "companyName", "interviewDate", "interviewTime", "interviewMode"],
    isDefault: true,
  },
  {
    name: "Application Rejection",
    subject: "Update on your application - {{jobTitle}}",
    category: "rejection",
    content:
      `Dear {{candidateName}},\n\nThank you for your interest in the {{jobTitle}} position at {{companyName}} and for taking the time to apply. After careful consideration, we have decided not to move forward with your application at this time.\n\nWe will keep your profile on file for future opportunities.\n\nWe wish you the best in your job search.\n\nSincerely,\n{{companyName}} Recruiting Team`,
    variables: ["candidateName", "jobTitle", "companyName"],
    isDefault: true,
  },
  {
    name: "Shortlisted for Next Round",
    subject: "Shortlisted - {{jobTitle}}",
    category: "application_update",
    content:
      `Hi {{candidateName}},\n\nGood news! You have been shortlisted for the next round for the {{jobTitle}} role at {{companyName}}. Our team will reach out with next steps.\n\nBest,\n{{companyName}} Recruiting Team`,
    variables: ["candidateName", "jobTitle", "companyName"],
    isDefault: true,
  },
]

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
