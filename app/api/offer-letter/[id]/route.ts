import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import OfferLetter from "@/models/OfferLetter"
import Application from "@/models/Application"
import Notification from "@/models/Notification"
import { resolveOfferCompanyBranding } from "@/lib/offer-letter-company"

export const dynamic = "force-dynamic"

function canRespond(status: string) {
  return status === "Sent" || status === "Viewed"
}

// GET /api/offer-letter/[id] — job seeker detail (marks Viewed)
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
      .populate("recruiterId", "name email companyName companyLogo website businessLocation phone")
      .populate("jobId", "title companyId")

    if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })

    const isRecruiter = session.role === "recruiter" || session.role === "admin"
    const candidateId =
      letter.candidateId && typeof letter.candidateId === "object"
        ? String((letter.candidateId as { _id?: unknown })._id ?? letter.candidateId)
        : String(letter.candidateId)
    const isCandidate = candidateId === session.userId

    if (!isRecruiter && !isCandidate) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }
    if (!isRecruiter && ["Draft", "Pending Approval"].includes(letter.status)) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    if (isCandidate && letter.status === "Sent") {
      letter.status = "Viewed"
      letter.viewedAt = new Date()
      letter.history.push({
        action: "Viewed",
        performedBy: session.userId as any,
        timestamp: new Date(),
        details: { message: "Candidate viewed the offer letter" },
      })
      await letter.save()
    }

    const payload = letter.toObject()
    if (!isRecruiter) delete payload.internalNotes

    if (isCandidate) {
      const recruiterId = String(letter.recruiterId?._id ?? letter.recruiterId)
      const jobId = letter.jobId?._id ? String(letter.jobId._id) : undefined
      const companyBranding = await resolveOfferCompanyBranding(recruiterId, jobId)
      return NextResponse.json({
        success: true,
        offerLetter: { ...payload, companyBranding },
      })
    }

    return NextResponse.json({ success: true, offerLetter: payload })
  } catch (error) {
    console.error("Offer letter GET [id] error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// POST /api/offer-letter/[id] — accept or reject (job seeker)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const { action, signature, reason } = body

    const letter = await OfferLetter.findById(params.id)
    if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })

    if (letter.candidateId.toString() !== session.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    if (!canRespond(letter.status)) {
      return NextResponse.json(
        { message: "This offer can no longer be accepted or rejected" },
        { status: 400 },
      )
    }

    if (letter.expiresAt && new Date(letter.expiresAt) < new Date()) {
      letter.status = "Expired"
      await letter.save()
      return NextResponse.json({ message: "This offer has expired" }, { status: 400 })
    }

    if (action === "accept") {
      letter.status = "Accepted"
      letter.signature.candidateSigned = true
      letter.signature.candidateSignature = signature || session.userId
      letter.signature.candidateSignedAt = new Date()
      letter.respondedAt = new Date()
      letter.history.push({
        action: "Accepted",
        performedBy: session.userId as any,
        timestamp: new Date(),
        details: { message: "Candidate accepted the offer letter" },
      })
      await letter.save()

      if (letter.applicationId) {
        await Application.updateOne(
          { _id: letter.applicationId },
          { $set: { status: "Hired" } },
        ).catch(() => {})
      }

      await Notification.create({
        userId: letter.recruiterId,
        type: "application_status_update",
        message: `A candidate accepted the offer for ${letter.offerDetails?.position || "a position"}.`,
        relatedEntity: { id: letter._id, type: "application" },
      }).catch(() => {})

      return NextResponse.json({ success: true, offerLetter: letter })
    }

    if (action === "reject") {
      letter.status = "Rejected"
      letter.respondedAt = new Date()
      letter.history.push({
        action: "Rejected",
        performedBy: session.userId as any,
        timestamp: new Date(),
        details: { message: "Candidate rejected the offer letter", reason },
      })
      await letter.save()

      await Notification.create({
        userId: letter.recruiterId,
        type: "application_status_update",
        message: `A candidate declined the offer for ${letter.offerDetails?.position || "a position"}.`,
        relatedEntity: { id: letter._id, type: "application" },
      }).catch(() => {})

      return NextResponse.json({ success: true, offerLetter: letter })
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Offer letter POST [id] error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
