export const CODING_SECURITY_LAYERS = [
  { id: "face", label: "Face detection", description: "Webcam must show your face at all times" },
  { id: "motion", label: "Motion sensing", description: "Excessive head movement is flagged" },
  { id: "multi_face", label: "Person detection", description: "Only one person allowed in frame" },
  { id: "object", label: "Phone/object AI", description: "COCO-SSD vision model flags phones, books, and devices in view" },
  { id: "camera", label: "Camera integrity", description: "Blocking or covering camera is detected" },
  { id: "audio", label: "Audio monitoring", description: "Background noise and speech detection" },
  { id: "clipboard", label: "Copy-paste block", description: "Clipboard actions are blocked and logged" },
  { id: "tab", label: "Tab switch guard", description: "Leaving the tab is logged; 2 switches end the test" },
  { id: "hidden_cases", label: "Hidden test cases", description: "Code must pass all hidden cases to submit" },
] as const

export type CodingSecurityLayerId = typeof CODING_SECURITY_LAYERS[number]["id"]

export type TestSecuritySettings = {
  enableProctoring?: boolean
  enableObjectDetection?: boolean
  restrictCopyPaste?: boolean
  detectTabSwitch?: boolean
  webcamRequired?: boolean
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
  score -= Math.min(violations.filter(v => v.type !== "movement").length * 8, 40)
  if (tabSwitches >= maxTabSwitches) score = Math.min(score, 20)
  return Math.max(0, score)
}
