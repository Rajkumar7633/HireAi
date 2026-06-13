import { type NextRequest, NextResponse } from "next/server"
import { AccessToken } from "livekit-server-sdk"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { CollegeMeeting } from "@/models/CollegeMeeting"
import { getLiveKitConfig } from "@/lib/livekit-config"
import { COLLEGE_MEETING_MAX_PARTICIPANTS } from "@/lib/college-meeting-shared"

async function authorizeMeetingAccess(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  meetingId: string,
  requestedHost: boolean,
) {
  await connectDB()
  const meeting = await CollegeMeeting.findById(meetingId).lean()
  if (!meeting) {
    return { error: "Meeting not found", status: 404 as const }
  }

  const isCollegeAdmin =
    session.role === "college" || session.role === "college_admin"
  const isCollegeOwner =
    isCollegeAdmin && String(meeting.collegeId) === session.userId

  const isStudent =
    session.role === "job_seeker" &&
    (meeting.invitedStudentIds || []).some((id: string) => String(id) === session.userId)

  if (!isCollegeOwner && !isStudent) {
    return { error: "Forbidden", status: 403 as const }
  }

  if (meeting.status === "cancelled") {
    return { error: "Meeting was cancelled", status: 400 as const }
  }

  const isPresenter = isCollegeOwner && requestedHost

  return { meeting, isPresenter, isStudent, isCollegeOwner }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const livekit = getLiveKitConfig()
  if (!livekit.configured) {
    return NextResponse.json(
      { error: "LiveKit not configured", useJitsi: true },
      { status: 503 },
    )
  }

  let body: {
    roomId?: string
    meetingId?: string
    isHost?: boolean
    participantName?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const roomId = body.roomId?.trim()
  const meetingId = body.meetingId?.trim()
  if (!roomId || !meetingId) {
    return NextResponse.json({ error: "roomId and meetingId required" }, { status: 400 })
  }

  const auth = await authorizeMeetingAccess(session, meetingId, Boolean(body.isHost))
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const displayName =
    body.participantName?.trim() ||
    session.name ||
    session.email?.split("@")[0] ||
    "Participant"

  const at = new AccessToken(livekit.apiKey!, livekit.apiSecret!, {
    identity: session.userId,
    name: displayName,
    ttl: "4h",
  })

  at.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish: auth.isPresenter,
    canSubscribe: true,
    canPublishData: true,
  })

  const token = await at.toJwt()

  return NextResponse.json({
    token,
    serverUrl: livekit.serverUrl,
    isPresenter: auth.isPresenter,
    maxParticipants: COLLEGE_MEETING_MAX_PARTICIPANTS,
  })
}
