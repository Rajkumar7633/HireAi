import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import ProctorEvent from "@/models/ProctorEvent"
import { getIO } from "@/lib/socket-server"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { assessmentId, candidateId, type, message, at, snapshot, meta } = body

    if (!assessmentId || !candidateId || !type) {
      return NextResponse.json({ message: "assessmentId, candidateId, and type are required" }, { status: 400 })
    }

    await connectDB()

    // Strip snapshot from DB if too large (>500KB base64 string)
    const snapshotToStore = snapshot && snapshot.length < 500_000 ? snapshot : undefined

    await ProctorEvent.create({
      assessmentId,
      candidateId,
      type,
      message: message || type,
      snapshot: snapshotToStore,
      meta: meta || {},
      createdAt: at ? new Date(at) : new Date(),
    })

    const io = getIO()
    const testId = meta?.testId as string | undefined
    if (io && testId) {
      io.to(`test:${testId}:recruiters`).emit("test:proctor-event", {
        testId,
        applicationId: assessmentId,
        candidateId,
        type,
        message: message || type,
        at: at || new Date().toISOString(),
      })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    console.error("Proctoring event error", e)
    return NextResponse.json({ message: "Failed to record proctoring event" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const assessmentId = searchParams.get("assessmentId")
    const candidateId = searchParams.get("candidateId")

    if (!assessmentId) {
      return NextResponse.json({ message: "assessmentId is required" }, { status: 400 })
    }

    await connectDB()

    const query: Record<string, any> = { assessmentId }
    if (candidateId) query.candidateId = candidateId

    const events = await ProctorEvent.find(query)
      .select("-snapshot")
      .sort({ createdAt: 1 })
      .limit(500)
      .lean()

    return NextResponse.json({ events })
  } catch (e) {
    console.error("Proctoring GET error", e)
    return NextResponse.json({ message: "Failed to fetch proctoring events" }, { status: 500 })
  }
}
