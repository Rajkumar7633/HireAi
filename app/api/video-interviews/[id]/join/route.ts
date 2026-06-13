import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import VideoInterview from "@/models/VideoInterview"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const interviewId = params.id
    if (!interviewId || interviewId === "undefined") {
      return NextResponse.json({ message: "Invalid interview id" }, { status: 400 })
    }

    await connectDB()

    const interview: any = await VideoInterview.findById(interviewId)
    if (!interview) {
      return NextResponse.json({ message: "Interview not found" }, { status: 404 })
    }

    // Authorization: recruiter assigned or candidate only
    const isRecruiter = session.role === "recruiter" && String(interview.recruiterId) === session.userId
    const isCandidate = session.role === "job_seeker" && String(interview.candidateId) === session.userId
    if (!isRecruiter && !isCandidate) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Determine join URL — use a relative path for in-app rooms so the
    // client router.push() works regardless of which port the app runs on.
    let joinUrl = ""
    const name = encodeURIComponent(session.name || session.email?.split("@")[0] || "User")
    const isHost = isRecruiter
    if (interview.roomId) {
      // Relative path — no hardcoded origin/port
      joinUrl = `/video-call/${interview.roomId}?interviewId=${interviewId}&isHost=${isHost}&name=${name}`
    } else if (interview.meetingLink) {
      // For external meeting links (Zoom, Google Meet, etc.) return as-is
      joinUrl = interview.meetingLink
    } else {
      return NextResponse.json({ message: "Interview has no room or link" }, { status: 400 })
    }

    // Mark in-progress on first join
    if (interview.status === "scheduled") {
      interview.status = "in-progress"
      await interview.save()
    }

    return NextResponse.json({ success: true, joinUrl })
  } catch (error) {
    console.error("[video-interviews][join] error", error)
    return NextResponse.json({ success: false, message: "Failed to prepare join" }, { status: 500 })
  }
}
