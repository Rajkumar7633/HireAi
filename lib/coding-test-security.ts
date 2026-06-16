export const CODING_SECURITY_LAYERS = [
  { id: "fullscreen", label: "Fullscreen lock", description: "Test runs in fullscreen; exiting is logged" },
  { id: "face", label: "Face detection", description: "AI verifies your face stays in frame (BlazeFace)" },
  { id: "motion", label: "Motion sensing", description: "Excessive head movement is flagged" },
  { id: "multi_face", label: "Person detection", description: "Only one person allowed in frame" },
  { id: "object", label: "Phone/object AI", description: "COCO-SSD flags phones, books, and devices" },
  { id: "camera", label: "Camera integrity", description: "Blocking or covering camera is detected" },
  { id: "audio", label: "Voice monitoring", description: "Speech and background noise detection via microphone" },
  { id: "clipboard", label: "Copy-paste block", description: "Clipboard actions are blocked and logged" },
  { id: "tab", label: "Tab switch guard", description: "Leaving the tab is logged; limit ends the test" },
  { id: "snapshots", label: "Evidence capture", description: "Periodic webcam snapshots stored for review" },
  { id: "hidden_cases", label: "Hidden test cases", description: "Code must pass all hidden cases to submit" },
] as const

export type CodingSecurityLayerId = typeof CODING_SECURITY_LAYERS[number]["id"]

export type TestSecuritySettings = {
  enableProctoring?: boolean
  enableObjectDetection?: boolean
  restrictCopyPaste?: boolean
  detectTabSwitch?: boolean
  webcamRequired?: boolean
  requireFullscreen?: boolean
  enableAudioMonitoring?: boolean
  enablePeriodicSnapshots?: boolean
  snapshotIntervalSec?: number
  shuffleProblems?: boolean
  maxTabSwitches?: number
  restrictLanguages?: boolean
  allowedLanguages?: string[]
}

export const DEFAULT_TEST_SECURITY: TestSecuritySettings = {
  enableProctoring: true,
  enableObjectDetection: true,
  restrictCopyPaste: true,
  detectTabSwitch: true,
  webcamRequired: true,
  requireFullscreen: true,
  enableAudioMonitoring: true,
  enablePeriodicSnapshots: true,
  snapshotIntervalSec: 20,
  shuffleProblems: false,
  maxTabSwitches: 2,
  restrictLanguages: false,
  allowedLanguages: [],
}

export function mergeTestSecurity(settings?: Partial<TestSecuritySettings> | null): TestSecuritySettings {
  return { ...DEFAULT_TEST_SECURITY, ...(settings || {}) }
}

export type SecurityActivityLog = {
  type: string
  message: string
  at: string
  layer?: CodingSecurityLayerId
  snapshot?: string
}

export type MotionSample = {
  at: string
  delta: number
  severity: "low" | "medium" | "high"
}

export function computeIntegrityScore(
  tabSwitches: number,
  violations: SecurityActivityLog[],
  maxTabSwitches = 2,
): number {
  let score = 100
  score -= Math.min(tabSwitches * 15, 40)
  score -= Math.min(violations.filter(v => v.type !== "movement" && v.type !== "periodic_snapshot").length * 8, 40)
  if (tabSwitches >= maxTabSwitches) score = Math.min(score, 20)
  return Math.max(0, score)
}

export async function requestTestFullscreen(): Promise<boolean> {
  try {
    const el = document.documentElement
    if (document.fullscreenElement) return true
    await el.requestFullscreen()
    return !!document.fullscreenElement
  } catch {
    return false
  }
}

export function isFullscreenActive(): boolean {
  return !!document.fullscreenElement
}
