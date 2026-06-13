import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Notification from "@/models/Notification"
import BackgroundVerification, { VERIFICATION_COMPONENTS } from "@/models/BackgroundVerification"
import {
  computeOverallFromComponents,
  formatVerificationRow,
  initiateVerification,
  listVerificationsForRecruiter,
} from "@/lib/background-verification"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const applicationId = new URL(req.url).searchParams.get("applicationId")
    if (applicationId) {
      const verification = await BackgroundVerification.findOne({ applicationId })
        .populate("candidateId", "name email")
        .lean()
      if (!verification) {
        return NextResponse.json({ message: "Not found" }, { status: 404 })
      }
      if (
        String(verification.recruiterId) !== session.userId &&
        session.role !== "admin"
      ) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
      return NextResponse.json({
        success: true,
        verification: formatVerificationRow(verification),
      })
    }

    const verifications = await listVerificationsForRecruiter(session.userId)
    return NextResponse.json({ success: true, verifications })
  } catch (error) {
    console.error("[background-verification GET]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const action = body.action || "initiate"

    if (action === "bulk") {
      const applicationIds: string[] = body.applicationIds || []
      const provider = (body.provider || "Manual") as string
      const components = body.components

      if (!applicationIds.length) {
        return NextResponse.json({ message: "No applications selected" }, { status: 400 })
      }

      const results: { applicationId: string; success: boolean; message?: string }[] = []
      for (const applicationId of applicationIds) {
        const result = await initiateVerification({
          recruiterId: session.userId,
          applicationId,
          provider,
          components,
          notes: body.notes,
        })
        if ("error" in result) {
          results.push({ applicationId, success: false, message: result.error })
          continue
        }
        const { verification, resolved } = result
        await Notification.create({
          userId: resolved.candidateId,
          type: "application_status_update",
          message: `Background verification has been initiated for your application (${resolved.jobTitle || "position"}).`,
          relatedEntity: { id: verification._id, type: "application" },
        }).catch(() => {})
        results.push({ applicationId, success: true })
      }

      const verifications = await listVerificationsForRecruiter(session.userId)
      return NextResponse.json({
        success: true,
        results,
        verifications,
        msg: `Processed ${results.filter(r => r.success).length}/${applicationIds.length} checks`,
      })
    }

    const applicationId = body.applicationId
    if (!applicationId) {
      return NextResponse.json({ message: "Application ID is required" }, { status: 400 })
    }

    const result = await initiateVerification({
      recruiterId: session.userId,
      applicationId,
      provider: (body.provider || "Manual") as string,
      components: body.components,
      notes: body.notes,
    })

    if ("error" in result) {
      return NextResponse.json({ message: result.error }, { status: result.status })
    }

    const { verification, resolved } = result

    await Notification.create({
      userId: resolved.candidateId,
      type: "application_status_update",
      message: `Background verification has been initiated for your application (${resolved.jobTitle || "position"}).`,
      relatedEntity: { id: verification._id, type: "application" },
    }).catch(() => {})

    const row = formatVerificationRow(verification.toObject())
    row.candidateName = resolved.candidateName
    row.candidateEmail = resolved.candidateEmail
    row.jobTitle = resolved.jobTitle

    return NextResponse.json({
      success: true,
      verification: row,
      msg: "Background verification initiated successfully",
    })
  } catch (error) {
    console.error("[background-verification POST]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const verificationId = body.verificationId
    const action = body.action

    if (!verificationId) {
      return NextResponse.json({ message: "verificationId required" }, { status: 400 })
    }

    const verification = await BackgroundVerification.findById(verificationId)
    if (!verification) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }
    if (verification.recruiterId.toString() !== session.userId && session.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    if (action === "update-component") {
      const { component, status, notes } = body
      if (!component || !status) {
        return NextResponse.json({ message: "Component and status required" }, { status: 400 })
      }
      if (!VERIFICATION_COMPONENTS.includes(component)) {
        return NextResponse.json({ message: "Invalid component" }, { status: 400 })
      }

      verification.components[component] = {
        status,
        verifiedAt: status === "Verified" ? new Date() : undefined,
        notes,
      }
      verification.history.push({
        action: "Component Updated",
        performedBy: session.userId as unknown as import("mongoose").Types.ObjectId,
        timestamp: new Date(),
        details: { component, status, notes },
      })

      const { overallResult, riskLevel } = computeOverallFromComponents(verification.components)
      const allDone = VERIFICATION_COMPONENTS.every(
        c =>
          verification.components[c].status === "Verified" ||
          verification.components[c].status === "Failed" ||
          verification.components[c].status === "Not Required",
      )
      if (allDone) {
        verification.status = "Completed"
        verification.completedAt = new Date()
        verification.overallResult = overallResult
        verification.riskLevel = riskLevel
      } else {
        verification.status = "In Progress"
      }

      await verification.save()
      return NextResponse.json({
        success: true,
        verification: formatVerificationRow(verification.toObject()),
      })
    }

    if (action === "finalize") {
      verification.status = "Completed"
      verification.completedAt = new Date()
      verification.overallResult = body.overallResult || verification.overallResult || "Clear"
      verification.riskLevel = body.riskLevel || verification.riskLevel || "Low"
      if (body.reportUrl) {
        verification.reportUrl = body.reportUrl
        verification.reportGeneratedAt = new Date()
      }
      verification.history.push({
        action: "Finalized",
        performedBy: session.userId as unknown as import("mongoose").Types.ObjectId,
        timestamp: new Date(),
        details: {
          overallResult: verification.overallResult,
          riskLevel: verification.riskLevel,
        },
      })
      await verification.save()
      return NextResponse.json({
        success: true,
        verification: formatVerificationRow(verification.toObject()),
      })
    }

    if (action === "cancel") {
      verification.status = "Cancelled"
      verification.history.push({
        action: "Cancelled",
        performedBy: session.userId as unknown as import("mongoose").Types.ObjectId,
        timestamp: new Date(),
        details: { reason: body.reason },
      })
      await verification.save()
      return NextResponse.json({
        success: true,
        verification: formatVerificationRow(verification.toObject()),
      })
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[background-verification PUT]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
