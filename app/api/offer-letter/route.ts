import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import OfferLetter from "@/models/OfferLetter"
import Application from "@/models/Application"
import User from "@/models/User"

// ── POST: create / send / withdraw ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "recruiter") {
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

      const offerLetter = await OfferLetter.create({
        applicationId: applicationId || undefined,
        candidateId: resolvedCandidateId,
        recruiterId: session.userId,
        jobId: resolvedJobId,
        templateId,
        offerDetails,
        compensation,
        terms,
        customContent,
        expiresAt: expiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        approvalRequired: approvalRequired ?? false,
        status: approvalRequired ? "Pending Approval" : "Draft",
        internalNotes,
        history: [
          {
            action: "Created",
            performedBy: session.userId,
            timestamp: new Date(),
            details: { message: "Offer letter created" },
          },
        ],
      })

      return NextResponse.json({ success: true, offerLetter })
    }

    // ── SEND ────────────────────────────────────────────────────────────
    if (action === "send") {
      const letter = await OfferLetter.findById(data.offerLetterId)
      if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })
      if (letter.recruiterId.toString() !== session.userId)
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      if (!["Draft", "Pending Approval"].includes(letter.status))
        return NextResponse.json({ message: "Only Draft or Approved letters can be sent" }, { status: 400 })

      letter.status = "Sent"
      letter.sentAt = new Date()
      letter.history.push({
        action: "Sent",
        performedBy: session.userId as any,
        timestamp: new Date(),
        details: { message: "Offer letter sent to candidate" },
      })
      await letter.save()
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
  } catch (error) {
    console.error("Offer letter POST error:", error)
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
      const OFFER_READY = ["hired", "Hired", "Shortlisted", "interview", "Interview Scheduled", "Assessment Completed", "Test Passed", "Reviewed"]
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
      if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })
      return NextResponse.json({ success: true, offerLetter: letter })
    }

    if (applicationId) {
      const letter = await OfferLetter.findOne({ applicationId })
        .populate("candidateId", "name email")
        .populate("recruiterId", "name email")
      if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })
      return NextResponse.json({ success: true, offerLetter: letter })
    }

    // ── List ────────────────────────────────────────────────────────────
    const filter = session.role === "recruiter" ? { recruiterId: session.userId } : { candidateId: session.userId }
    const letters = await OfferLetter.find(filter)
      .populate("candidateId", "name email")
      .sort({ createdAt: -1 })
      .limit(100)
    return NextResponse.json({ success: true, offerLetters: letters, count: letters.length })
  } catch (error) {
    console.error("Offer letter GET error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// ── PUT: update draft ────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { offerLetterId, ...updates } = await req.json()
    const letter = await OfferLetter.findById(offerLetterId)
    if (!letter) return NextResponse.json({ message: "Not found" }, { status: 404 })
    if (letter.recruiterId.toString() !== session.userId)
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    if (!["Draft", "Pending Approval"].includes(letter.status))
      return NextResponse.json({ message: "Cannot update a sent letter" }, { status: 400 })

    Object.assign(letter, updates)
    letter.history.push({
      action: "Updated",
      performedBy: session.userId as any,
      timestamp: new Date(),
      details: { message: "Offer letter updated" },
    })
    await letter.save()
    return NextResponse.json({ success: true, offerLetter: letter })
  } catch (error) {
    console.error("Offer letter PUT error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// ── DELETE: delete draft ─────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "recruiter") {
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
