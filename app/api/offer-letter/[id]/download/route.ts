import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import OfferLetter from "@/models/OfferLetter"
import "@/models/JobDescription"
import "@/models/User"
import "@/models/Company"
import { buildOfferLetterPdfBuffer } from "@/lib/offer-letter-pdf"
import {
  loadLogoBuffer,
  resolveOfferCompanyBranding,
} from "@/lib/offer-letter-company"

export const dynamic = "force-dynamic"

// GET /api/offer-letter/[id]/download — professional branded PDF
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession(req)
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    await connectDB()
    const letter = await OfferLetter.findById(params.id)
      .populate("candidateId", "name email")
      .populate("recruiterId", "name email")
      .populate("jobId", "title companyId")

    if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })

    const isRecruiter = session.role === "recruiter" || session.role === "admin"
    const candidate =
      letter.candidateId as { _id?: { toString(): string }; name?: string } | null
    const candidateId = candidate?._id?.toString() ?? String(letter.candidateId)
    const isCandidate = candidateId === session.userId

    if (!isRecruiter && !isCandidate) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }
    if (!isRecruiter && ["Draft", "Pending Approval"].includes(letter.status)) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    const recruiterId = String(
      typeof letter.recruiterId === "object" && letter.recruiterId !== null
        ? (letter.recruiterId as { _id?: unknown })._id
        : letter.recruiterId,
    )
    const jobId = String(
      typeof letter.jobId === "object" && letter.jobId !== null
        ? (letter.jobId as { _id?: unknown })._id
        : letter.jobId || "",
    )

    const branding = await resolveOfferCompanyBranding(recruiterId, jobId || undefined)
    const logoBuffer = await loadLogoBuffer(branding.logoUrl)
    const pdfBuffer = await buildOfferLetterPdfBuffer(letter, branding, logoBuffer)

    const safeCompany = branding.companyName.replace(/[^\w.-]+/g, "_").slice(0, 40)
    const filename = `${safeCompany}-offer-letter.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Offer letter PDF error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
