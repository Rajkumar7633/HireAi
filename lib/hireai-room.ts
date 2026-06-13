export function generateHireAiRoomId(prefix = "meet"): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  let id = ""
  for (let i = 0; i < 12; i++) {
    id += alphabet[(Math.random() * alphabet.length) | 0]
  }
  return `${prefix}-${id}`
}

export function buildCollegeMeetingJoinPath(
  roomId: string,
  meetingId: string,
  isHost: boolean,
  participantName: string,
): string {
  const params = new URLSearchParams({
    meetingId,
    isHost: String(isHost),
    name: participantName,
    kind: "college_meeting",
  })
  return `/video-call/${roomId}?${params.toString()}`
}
