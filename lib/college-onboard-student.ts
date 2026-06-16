import bcrypt from "bcryptjs"
import crypto from "crypto"
import User from "@/models/User"
import Notification from "@/models/Notification"
import { sendEmail } from "@/lib/email-service"
import { buildProfessionalTemplate } from "@/lib/email-templates"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export function generateTemporaryPassword(name: string) {
  const prefix = (name.split(" ")[0] || "student").toLowerCase().replace(/[^a-z]/g, "") || "student"
  const suffix = crypto.randomBytes(2).toString("hex")
  return `${prefix}@${suffix}`
}

export interface OnboardStudentInput {
  collegeId: string
  collegeName: string
  name: string
  email: string
  phone?: string
  department?: string
  batch?: string
  rollNumber?: string
  skills?: string[] | string
  cgpa?: number
  marks10th?: number
  marks12th?: number
  backlogs?: number
  linkedinUrl?: string
  githubUrl?: string
  customPassword?: string
}

export async function createCollegeStudentAccount(input: OnboardStudentInput) {
  const email = input.email.toLowerCase().trim()
  const existing = await User.findOne({ email })
  if (existing) {
    throw new Error("A user with this email already exists on the platform")
  }

  const rawPassword = input.customPassword?.trim() || generateTemporaryPassword(input.name)
  const passwordHash = await bcrypt.hash(rawPassword, 12)

  const skills = Array.isArray(input.skills)
    ? input.skills
    : (input.skills ? String(input.skills).split(",").map((s) => s.trim()).filter(Boolean) : [])

  const student = await User.create({
    name: input.name.trim(),
    email,
    passwordHash,
    role: "job_seeker",
    phone: input.phone?.trim(),
    skills,
    collegeName: input.collegeName,
    onboardedByCollege: input.collegeId,
    department: input.department?.trim(),
    batch: input.batch?.trim(),
    cgpa: input.cgpa != null ? Number(input.cgpa) : undefined,
    marks10th: input.marks10th != null ? Number(input.marks10th) : undefined,
    marks12th: input.marks12th != null ? Number(input.marks12th) : undefined,
    backlogs: input.backlogs != null ? Number(input.backlogs) : 0,
    linkedinUrl: input.linkedinUrl?.trim(),
    placementStatus: "unplaced",
    onboardingCompleted: false,
  })

  await Notification.create({
    userId: student._id,
    type: "application_status_update",
    message: `Welcome to HireAI! Your account was approved by ${input.collegeName}. Check your email for login details.`,
    relatedEntity: { id: student._id, type: "job_application" },
  }).catch(() => null)

  return { student, temporaryPassword: rawPassword }
}

export async function sendCollegeStudentWelcomeEmail(opts: {
  to: string
  name: string
  collegeName: string
  email: string
  temporaryPassword: string
}) {
  const loginUrl = `${APP_URL}/login`
  const html = buildProfessionalTemplate({
    recipientName: opts.name,
    heading: "Your HireAI account is ready",
    badge: "Approved",
    messageHtml: `
      <p>Great news! <strong>${opts.collegeName}</strong> placement cell has approved your registration on <strong>HireAI</strong>.</p>
      <p>You can now sign in as a <strong>Job Seeker</strong> linked to your college and access placements, tests, and your profile.</p>
      <p style="margin:16px 0;padding:14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
        <strong>Login email:</strong> ${opts.email}<br/>
        <strong>Temporary password:</strong> <code style="font-size:15px;color:#7c3aed;">${opts.temporaryPassword}</code>
      </p>
      <p style="font-size:13px;color:#64748b;">Please change your password after your first login for security.</p>
    `,
    ctaUrl: loginUrl,
    ctaLabel: "Sign in to HireAI",
    preheader: `${opts.collegeName} approved your HireAI account`,
    details: {
      College: opts.collegeName,
      "Your email": opts.email,
      Role: "Job Seeker (College linked)",
    },
    footerNote: "If you did not register with your college placement cell, contact them immediately.",
  })

  try {
    await sendEmail({
      to: opts.to,
      subject: `${opts.collegeName} — Your HireAI login is ready`,
      html,
    })
    return true
  } catch (err) {
    console.error("[college welcome email]", err)
    return false
  }
}
