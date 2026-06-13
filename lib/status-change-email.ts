import EmailTemplate from "@/models/EmailTemplate"
import EmailLog from "@/models/EmailLog"
import User from "@/models/User"
import JobDescription from "@/models/JobDescription"
import { sendEmail } from "@/lib/email-service"
import { renderTemplate } from "@/lib/template-render"
import { buildProfessionalTemplate } from "@/lib/email-templates"
import { resolveOfferCompanyBranding } from "@/lib/offer-letter-company"
import { STATUS_TEMPLATE_NAME_FALLBACK } from "@/lib/email-default-templates"

export function isAutoEmailEnabled(): boolean {
  return process.env.EMAIL_AUTOSEND !== "false"
}

interface StatusChangeEmailOptions {
  applicationId: string
  jobSeekerId: string
  jobDescriptionId: string
  recruiterId: string
  newStatus: string
  previousStatus?: string
}

type TemplateDoc = {
  _id: unknown
  name?: string
  subject?: string
  content?: string
  category?: string
}

function contentToHtml(raw: string): string {
  if (raw.includes("<")) return raw
  return raw.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
}

function badgeForCategory(category?: string, status?: string): string | undefined {
  if (category === "interview" || status === "Interview Scheduled") return "Interview"
  if (category === "offer" || status === "Offer" || status === "Hired") return "Offer"
  if (category === "rejection" || status === "Rejected") return "Update"
  return "Application Update"
}

async function findTemplateForStatus(
  status: string,
  recruiterId: string,
): Promise<TemplateDoc | null> {
  const byLink = await EmailTemplate.findOne({
    linkedStatus: status,
    $or: [{ createdBy: recruiterId }, { isDefault: true }],
  }).lean()

  if (byLink) return byLink as TemplateDoc

  const fallbackName = STATUS_TEMPLATE_NAME_FALLBACK[status]
  if (!fallbackName) return null

  const byName = await EmailTemplate.findOne({
    name: fallbackName,
    $or: [{ createdBy: recruiterId }, { isDefault: true }],
  }).lean()

  return (byName as TemplateDoc) || null
}

export async function sendStatusChangeEmail(
  options: StatusChangeEmailOptions,
): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  if (!isAutoEmailEnabled()) {
    return { sent: false, skipped: "auto-email disabled" }
  }

  const { applicationId, jobSeekerId, jobDescriptionId, recruiterId, newStatus, previousStatus } =
    options

  if (previousStatus === newStatus) {
    return { sent: false, skipped: "status unchanged" }
  }

  const template = await findTemplateForStatus(newStatus, recruiterId)
  if (!template?.subject || !template?.content) {
    return { sent: false, skipped: `no template for status: ${newStatus}` }
  }

  const candidate = (await User.findById(jobSeekerId).select("email name").lean()) as {
    email?: string
    name?: string
  } | null

  if (!candidate?.email) {
    return { sent: false, skipped: "candidate email missing" }
  }

  const job = (await JobDescription.findById(jobDescriptionId).select("title").lean()) as {
    title?: string
  } | null

  const branding = await resolveOfferCompanyBranding(recruiterId, jobDescriptionId)
  const recruiter = (await User.findById(recruiterId).select("name").lean()) as { name?: string } | null

  const vars: Record<string, string> = {
    candidateName: candidate.name || "Candidate",
    jobTitle: job?.title || "the role",
    companyName: branding.companyName || "Our Company",
    recruiterName: recruiter?.name || branding.recruiterName || "Recruiting Team",
    dashboardUrl:
      process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/job-seeker/applications`
        : "https://hireai.example.com/dashboard/job-seeker/applications",
  }

  const subject = renderTemplate(template.subject, vars)
  const rawContent = renderTemplate(template.content, vars)
  const messageHtml = contentToHtml(rawContent)
  const contentHasGreeting = /^\s*(hello|dear|hi)\b/i.test(rawContent)

  const html = buildProfessionalTemplate({
    recipientName: vars.candidateName,
    heading: "Hello",
    messageHtml,
    ctaUrl: vars.dashboardUrl,
    ctaLabel: "View Application",
    companyName: branding.companyName,
    companyWebsite: branding.website,
    logoUrl: branding.logoUrl,
    badge: badgeForCategory(template.category, newStatus),
    preheader: subject,
    includeGreeting: !contentHasGreeting,
    signatureHtml: vars.recruiterName
      ? `<p style="margin:0"><strong>${vars.recruiterName}</strong><br/><span style="color:#6b7280">${vars.companyName}</span></p>`
      : undefined,
  })

  try {
    await sendEmail({ to: candidate.email, subject, html })

    await EmailLog.create({
      to: candidate.email,
      subject,
      html,
      templateId: template._id,
      variables: vars,
      applicationId,
      jobDescriptionId,
      jobSeekerId,
      recruiterId,
      category: template.category || "application_update",
      sentAt: new Date(),
    }).catch(() => {})

    return { sent: true }
  } catch (error) {
    console.error("status-change email failed:", error)
    return { sent: false, error: String(error) }
  }
}
