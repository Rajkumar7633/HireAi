import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import OfferLetter from "@/models/OfferLetter"
import Application from "@/models/Application"
import Notification from "@/models/Notification"
import { autoInitiateBackgroundForOffer } from "@/lib/background-verification"
import { normalizeOfferCompensation } from "@/lib/offer-letter-normalize"
import { resolveOfferCompanyBranding } from "@/lib/offer-letter-company"
import { sendStatusChangeEmail } from "@/lib/status-change-email"

// ── POST: create / send / withdraw ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const { action, ...data } = body

    // ── CREATE ──────────────────────────────────────────────────────────
    if (action === "create" || !action) {
      const {
        applicationId,
        candidateId,
        jobId,
        offerDetails,
        compensation,
        terms,
        customContent,
        expiresAt,
        approvalRequired,
        internalNotes,
        templateId,
      } = data

      // Resolve candidateId from application if not supplied
      let resolvedCandidateId = candidateId
      let resolvedJobId = jobId
      if (applicationId && !resolvedCandidateId) {
        const app = await Application.findById(applicationId).select("jobSeekerId jobDescriptionId")
        if (!app) return NextResponse.json({ message: "Application not found" }, { status: 404 })
        resolvedCandidateId = app.jobSeekerId
        resolvedJobId = resolvedJobId ?? app.jobDescriptionId
      }

      if (!resolvedCandidateId) {
        return NextResponse.json({ message: "candidateId is required" }, { status: 400 })
      }

      const normalizedCompensation = normalizeOfferCompensation(compensation)

      const offerLetter = await OfferLetter.create({
        applicationId: applicationId || undefined,
        candidateId: resolvedCandidateId,
        recruiterId: session.userId,
        jobId: resolvedJobId,
        templateId,
        offerDetails,
        compensation: normalizedCompensation,
        terms,
        customContent,
        expiresAt: expiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        approvalRequired: approvalRequired ?? false,
        approvalStatus: approvalRequired ? "Pending" : undefined,
        status: approvalRequired ? "Pending Approval" : "Draft",
        internalNotes,
        history: [
          {
            action: approvalRequired ? "Submitted for Approval" : "Created",
            performedBy: session.userId,
            timestamp: new Date(),
            details: {
              message: approvalRequired
                ? "Offer submitted for manager approval"
                : "Offer letter created",
            },
          },
        ],
      })

      // Mark application as Offer and optionally auto-start background verification
      if (applicationId) {
        await Application.updateOne(
          { _id: applicationId },
          { $set: { status: "Offer" } },
        ).catch(() => {})

        const shouldRunBg = terms?.backgroundCheckRequired === true

        if (shouldRunBg) {
          const bg = await autoInitiateBackgroundForOffer({
            recruiterId: session.userId,
            applicationId: String(applicationId),
            notes: `Linked to offer letter ${offerLetter._id}`,
          })

          if (!bg.skipped && bg.verification) {
            await Notification.create({
              userId: resolvedCandidateId,
              type: "application_status_update",
              message: "A background verification check has been initiated for your application following your job offer.",
              relatedEntity: { id: bg.verification._id, type: "application" },
            }).catch(() => {})
          }
        }
      }

      return NextResponse.json({ success: true, offerLetter })
    }

    // ── APPROVE (manager / hiring lead) ─────────────────────────────────
    if (action === "approve") {
      const letter = await OfferLetter.findById(data.offerLetterId)
      if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })
      if (letter.status !== "Pending Approval") {
        return NextResponse.json({ message: "Only pending offers can be approved" }, { status: 400 })
      }
      if (letter.approvalStatus === "Approved") {
        return NextResponse.json({ message: "Already approved" }, { status: 400 })
      }

      letter.approvalStatus = "Approved"
      letter.approvedBy = session.userId as any
      letter.approvedAt = new Date()
      letter.history.push({
        action: "Approved",
        performedBy: session.userId as any,
        timestamp: new Date(),
        details: { message: data.notes || "Offer approved for sending" },
      })
      await letter.save()

      if (letter.recruiterId.toString() !== session.userId) {
        await Notification.create({
          userId: letter.recruiterId,
          type: "application_status_update",
          message: `Your offer letter was approved. You can now send it to the candidate.`,
          relatedEntity: { id: letter._id, type: "offer" },
        }).catch(() => {})
      }

      return NextResponse.json({ success: true, offerLetter: letter })
    }

    // ── REJECT APPROVAL ─────────────────────────────────────────────────
    if (action === "reject-approval") {
      const letter = await OfferLetter.findById(data.offerLetterId)
      if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })
      if (letter.status !== "Pending Approval") {
        return NextResponse.json({ message: "Only pending offers can be rejected" }, { status: 400 })
      }

      letter.approvalStatus = "Rejected"
      letter.status = "Draft"
      letter.history.push({
        action: "Approval Rejected",
        performedBy: session.userId as any,
        timestamp: new Date(),
        details: { reason: data.reason || "Changes requested" },
      })
      await letter.save()

      await Notification.create({
        userId: letter.recruiterId,
        type: "application_status_update",
        message: `Offer letter approval was rejected. Revise and resubmit if needed.`,
        relatedEntity: { id: letter._id, type: "offer" },
      }).catch(() => {})

      return NextResponse.json({ success: true, offerLetter: letter })
    }

    // ── SEND ────────────────────────────────────────────────────────────
    if (action === "send") {
      const letter = await OfferLetter.findById(data.offerLetterId)
      if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })
      if (letter.recruiterId.toString() !== session.userId)
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      if (!["Draft", "Pending Approval"].includes(letter.status))
        return NextResponse.json({ message: "This offer cannot be sent" }, { status: 400 })

      if (letter.approvalRequired && letter.approvalStatus !== "Approved") {
        return NextResponse.json({
          message: "Manager approval required before sending. Approve the offer on the Offer Letters page first.",
        }, { status: 400 })
      }

      letter.status = "Sent"
      letter.sentAt = new Date()
      letter.history.push({
        action: "Sent",
        performedBy: session.userId as any,
        timestamp: new Date(),
        details: { message: "Offer letter sent to candidate" },
      })
      await letter.save()

      if (letter.applicationId) {
        await Application.updateOne(
          { _id: letter.applicationId },
          { $set: { status: "Offer" } },
        ).catch(() => {})
      }

      const position = letter.offerDetails?.position || "a position"
      await Notification.create({
        userId: letter.candidateId,
        type: "application_status_update",
        message: `You received a job offer for ${position}. View and respond in My Offers.`,
        relatedEntity: {
          id: letter.applicationId || letter._id,
          type: "application",
        },
      }).catch(() => {})

      if (letter.applicationId && letter.candidateId) {
        await sendStatusChangeEmail({
          applicationId: String(letter.applicationId),
          jobSeekerId: String(letter.candidateId),
          jobDescriptionId: String(letter.jobId || ""),
          recruiterId: session.userId,
          newStatus: "Offer",
        }).catch((e) => console.error("offer auto-email failed", e))
      }

      return NextResponse.json({ success: true, offerLetter: letter })
    }

    // ── WITHDRAW ─────────────────────────────────────────────────────────
    if (action === "withdraw") {
      const letter = await OfferLetter.findById(data.offerLetterId)
      if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })
      if (letter.recruiterId.toString() !== session.userId)
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })

      letter.status = "Withdrawn"
      letter.history.push({
        action: "Withdrawn",
        performedBy: session.userId as any,
        timestamp: new Date(),
        details: { reason: data.reason || "Withdrawn by recruiter" },
      })
      await letter.save()
      return NextResponse.json({ success: true, offerLetter: letter })
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  } catch (error: unknown) {
    console.error("Offer letter POST error:", error)
    const err = error as { name?: string; message?: string }
    if (err?.name === "ValidationError") {
      return NextResponse.json({ message: err.message || "Validation failed" }, { status: 400 })
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// ── GET: single letter or list / candidate search ───────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const applicationId = searchParams.get("applicationId")
    const candidateSearch = searchParams.get("candidateSearch")
    const listMode = searchParams.get("list")

    // ── Candidate search for offer letter picker ──────────────────────
    if (candidateSearch !== null) {
      const OFFER_READY = ["hired", "Hired", "Shortlisted", "interview", "Interview Scheduled", "Assessment Completed", "Test Passed", "Reviewed", "Offer"]
      const query: Record<string, unknown> = { status: { $in: OFFER_READY } }

      if (session.role === "recruiter") {
        // Only apps for this recruiter's jobs
        const apps = await Application.find(query)
          .populate({ path: "jobDescriptionId", match: { recruiterId: session.userId }, select: "title recruiterId" })
          .populate("jobSeekerId", "name email")
          .select("jobSeekerId jobDescriptionId status score")
          .limit(50)

        const filtered = apps.filter((a) => a.jobDescriptionId !== null).map((a: any) => ({
          applicationId: String(a._id),
          candidateId: String(a.jobSeekerId?._id),
          name: a.jobSeekerId?.name || "Unknown",
          email: a.jobSeekerId?.email || "",
          jobTitle: (a.jobDescriptionId as any)?.title || "Unknown",
          status: a.status,
          score: a.score,
        }))

        // Filter by name/email if search term provided
        const term = candidateSearch.toLowerCase()
        const results = term
          ? filtered.filter(
              (c) =>
                c.name.toLowerCase().includes(term) ||
                c.email.toLowerCase().includes(term) ||
                c.jobTitle.toLowerCase().includes(term)
            )
          : filtered

        return NextResponse.json({ candidates: results })
      }
      return NextResponse.json({ candidates: [] })
    }

    // ── Single letter ──────────────────────────────────────────────────
    if (id) {
      const letter = await OfferLetter.findById(id)
        .populate("candidateId", "name email")
        .populate("recruiterId", "name email")
        .populate("jobId", "title companyId")
      if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })

      const isRecruiter =
        session.role === "recruiter" || session.role === "admin"
      const candidateRef = letter.candidateId as { _id?: { toString(): string } } | string | null
      const candidateId =
        candidateRef && typeof candidateRef === "object"
          ? String(candidateRef._id)
          : String(candidateRef)
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
      return NextResponse.json({ success: true, offerLetter: payload })
    }

    if (applicationId) {
      const letter = await OfferLetter.findOne({ applicationId })
        .populate("candidateId", "name email")
        .populate("recruiterId", "name email")
        .populate("jobId", "title companyId")
      if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })

      const isRecruiter =
        session.role === "recruiter" || session.role === "admin"
      const candidateRef = letter.candidateId as { _id?: { toString(): string } } | string | null
      const candidateId =
        candidateRef && typeof candidateRef === "object"
          ? String(candidateRef._id)
          : String(candidateRef)
      const isCandidate = candidateId === session.userId
      if (!isRecruiter && !isCandidate) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }

      const payload = letter.toObject()
      if (!isRecruiter) delete payload.internalNotes
      return NextResponse.json({ success: true, offerLetter: payload })
    }

    // ── List ────────────────────────────────────────────────────────────
    const filter =
      session.role === "recruiter" || session.role === "admin"
        ? { recruiterId: session.userId }
        : {
            candidateId: session.userId,
            status: {
              $in: ["Sent", "Viewed", "Accepted", "Rejected", "Expired", "Withdrawn"],
            },
          }
    const letters = await OfferLetter.find(filter)
      .populate("candidateId", "name email")
        .populate("jobId", "title companyId")
        .populate("recruiterId", "name email companyName companyLogo website businessLocation phone")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    const sanitized =
      session.role === "recruiter" || session.role === "admin"
        ? letters
        : letters.map((l) => {
            const { internalNotes: _, ...rest } = l as typeof l & { internalNotes?: string }
            return rest
          })

    let responseLetters = sanitized
    if (session.role === "job_seeker") {
      responseLetters = await Promise.all(
        sanitized.map(async (letter) => {
          const recruiterRef = letter.recruiterId as { _id?: unknown } | string | null
          const jobRef = letter.jobId as { _id?: unknown } | string | null
          const recruiterId =
            recruiterRef && typeof recruiterRef === "object"
              ? String(recruiterRef._id)
              : String(recruiterRef || "")
          const jobId =
            jobRef && typeof jobRef === "object" ? String(jobRef._id) : String(jobRef || "")
          const companyBranding = recruiterId
            ? await resolveOfferCompanyBranding(recruiterId, jobId || undefined)
            : undefined
          return { ...letter, companyBranding }
        }),
      )
    }

    return NextResponse.json({
      success: true,
      offerLetters: responseLetters,
      count: responseLetters.length,
    })
  } catch (error) {
    console.error("Offer letter GET error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// ── PUT: update draft ────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { offerLetterId, compensation, ...updates } = await req.json()
    const letter = await OfferLetter.findById(offerLetterId)
    if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })
    if (letter.recruiterId.toString() !== session.userId)
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    if (!["Draft", "Pending Approval"].includes(letter.status))
      return NextResponse.json({ message: "Cannot update a sent letter" }, { status: 400 })

    if (compensation) {
      letter.compensation = normalizeOfferCompensation(compensation) as typeof letter.compensation
    }
    Object.assign(letter, updates)
    letter.history.push({
      action: "Updated",
      performedBy: session.userId as any,
      timestamp: new Date(),
      details: { message: "Offer letter updated" },
    })
    await letter.save()
    return NextResponse.json({ success: true, offerLetter: letter })
  } catch (error: unknown) {
    console.error("Offer letter PUT error:", error)
    const err = error as { name?: string; message?: string }
    if (err?.name === "ValidationError") {
      return NextResponse.json({ message: err.message || "Validation failed" }, { status: 400 })
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// ── DELETE: delete draft ─────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 })

    const letter = await OfferLetter.findById(id)
    if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })
    if (letter.recruiterId.toString() !== session.userId)
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    if (letter.status !== "Draft")
      return NextResponse.json({ message: "Only drafts can be deleted" }, { status: 400 })

    await letter.deleteOne()
    return NextResponse.json({ success: true, message: "Deleted" })
  } catch (error) {
    console.error("Offer letter DELETE error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
