export const MEETING_SIGNAL_TOPIC = "hireai-meeting"

export type MeetingSignal =
  | { type: "raise_hand"; identity: string; name: string; raised: boolean }
  | { type: "reaction"; identity: string; name: string; emoji: string }
  | { type: "mute_all" }
  | { type: "file"; identity: string; name: string; fileName: string; dataUrl?: string; mime?: string }
  | { type: "qa"; id: string; identity: string; name: string; question: string }
  | { type: "qa_answer"; id: string; answer: string }
  | { type: "whiteboard"; stroke: WhiteboardStroke }

export type WhiteboardStroke = {
  color: string
  size: number
  points: number[]
}

export type RaisedHandState = { identity: string; name: string }
export type SharedFile = {
  id: string
  fileName: string
  dataUrl?: string
  mime?: string
  from: string
  at: number
}
export type QaItem = {
  id: string
  question: string
  name: string
  identity: string
  answer?: string
}

export function encodeMeetingSignal(signal: MeetingSignal): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(signal))
}

export function decodeMeetingSignal(payload: Uint8Array): MeetingSignal | null {
  try {
    return JSON.parse(new TextDecoder().decode(payload)) as MeetingSignal
  } catch {
    return null
  }
}

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "👏", "🎉", "🔥", "✋", "💡"]
