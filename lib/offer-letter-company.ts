import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import Company from "@/models/Company"
import JobDescription from "@/models/JobDescription"
import type { IOfferLetter } from "@/models/OfferLetter"

export interface OfferCompanyBranding {
  companyName: string
  logoUrl?: string
  website?: string
  address?: string
  description?: string
  recruiterName?: string
  recruiterEmail?: string
  recruiterPhone?: string
}

export interface OfferCompanyRecord {
  name?: string
  logoUrl?: string
  website?: string
  description?: string
}

export async function resolveOfferCompanyBranding(
  recruiterId: string,
  jobId?: string,
): Promise<OfferCompanyBranding> {
  await connectDB()

  const recruiter = (await User.findById(recruiterId)
    .select(
      "name email companyName companyLogo companyDescription website businessLocation address phone",
    )
    .lean()) as {
    name?: string
    email?: string
    companyName?: string
    companyLogo?: string
    companyDescription?: string
    website?: string
    businessLocation?: string
    address?: string
    phone?: string
  } | null

  let companyFromJob: OfferCompanyRecord | null = null

  if (jobId) {
    const job = (await JobDescription.findById(jobId).select("companyId title").lean()) as {
      companyId?: string
      title?: string
    } | null
    if (job?.companyId) {
      companyFromJob = (await Company.findById(job.companyId)
        .select("name logoUrl website description")
        .lean()) as OfferCompanyRecord | null
    }
  }

  const companyByOwner = (await Company.findOne({ ownerId: recruiterId })
    .select("name logoUrl website description")
    .lean()) as OfferCompanyRecord | null

  const branding: OfferCompanyBranding = {
    companyName:
      recruiter?.companyName ||
      companyFromJob?.name ||
      companyByOwner?.name ||
      "HireAI Partner Company",
    logoUrl: recruiter?.companyLogo || companyFromJob?.logoUrl || companyByOwner?.logoUrl,
    website: recruiter?.website || companyFromJob?.website || companyByOwner?.website,
    address: recruiter?.businessLocation || recruiter?.address,
    description:
      recruiter?.companyDescription ||
      companyFromJob?.description ||
      companyByOwner?.description,
    recruiterName: recruiter?.name,
    recruiterEmail: recruiter?.email,
    recruiterPhone: recruiter?.phone,
  }

  return branding
}

export function parseImageDataUrl(dataUrl: string): Buffer | null {
  const match = dataUrl.match(/^data:image\/[\w+.-]+;base64,(.+)$/i)
  if (!match) return null
  try {
    return Buffer.from(match[1], "base64")
  } catch {
    return null
  }
}

export async function loadLogoBuffer(logoUrl?: string): Promise<Buffer | null> {
  if (!logoUrl?.trim()) return null

  if (logoUrl.startsWith("data:image")) {
    return parseImageDataUrl(logoUrl)
  }

  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000"
    const resolved = logoUrl.startsWith("http")
      ? logoUrl
      : `${base.replace(/\/$/, "")}${logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}`

    const res = await fetch(resolved, { cache: "no-store" })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

export function formatOfferDate(date?: Date | string | null): string {
  if (!date) return "To be determined"
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return "To be determined"
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatOfferMoney(
  amount?: number,
  currency = "USD",
  period?: string,
): string {
  if (!amount) return "—"
  try {
    const formatted = new Intl.NumberFormat(
      currency === "INR" ? "en-IN" : "en-US",
      { style: "currency", currency, maximumFractionDigits: 0 },
    ).format(amount)
    return period ? `${formatted} (${period})` : formatted
  } catch {
    return `${currency} ${amount.toLocaleString()}${period ? ` (${period})` : ""}`
  }
}

export type OfferLetterPdfInput = IOfferLetter & {
  candidateId?: { name?: string; email?: string } | string
  recruiterId?: { name?: string; email?: string } | string
  jobId?: { title?: string } | string
}
