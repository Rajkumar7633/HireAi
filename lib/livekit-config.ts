import { COLLEGE_MEETING_MAX_PARTICIPANTS } from "@/lib/college-meeting-shared"

export function getLiveKitConfig() {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const serverUrl =
    process.env.LIVEKIT_URL ||
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    ""

  return {
    apiKey,
    apiSecret,
    serverUrl,
    configured: Boolean(apiKey && apiSecret && serverUrl),
  }
}

export function getJitsiDomain() {
  return process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si"
}

export { COLLEGE_MEETING_MAX_PARTICIPANTS }
