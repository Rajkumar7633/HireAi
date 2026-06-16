"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FaceProctor } from "@/components/proctor/face-proctor"
import { Badge } from "@/components/ui/badge"
import { Shield, ShieldAlert, Maximize } from "lucide-react"
import {
  CODING_SECURITY_LAYERS,
  type SecurityActivityLog,
  type MotionSample,
  type TestSecuritySettings,
  mergeTestSecurity,
  isFullscreenActive,
  requestTestFullscreen,
} from "@/lib/coding-test-security"
import { getTestSocket } from "@/lib/test-socket-client"
import { authFetch } from "@/lib/client-auth"

type CodingTestProctorProps = {
  testId: string
  applicationId: string
  candidateId: string
  candidateName?: string
  settings?: Partial<TestSecuritySettings> | null
  onTerminate?: (reason: string) => void
  onActivity?: (log: SecurityActivityLog) => void
  onTabSwitch?: (count: number) => void
}

export function CodingTestProctor({
  testId,
  applicationId,
  candidateId,
  candidateName,
  settings: rawSettings,
  onTerminate,
  onActivity,
  onTabSwitch: onTabSwitchParent,
}: CodingTestProctorProps) {
  const settings = mergeTestSecurity(rawSettings)
  const [tabSwitches, setTabSwitches] = useState(0)
  const tabSwitchesRef = useRef(0)
  const fullscreenExitsRef = useRef(0)
  const [violations, setViolations] = useState<SecurityActivityLog[]>([])
  const [motionSamples, setMotionSamples] = useState<MotionSample[]>([])
  const [layerStatus, setLayerStatus] = useState<Record<string, "ok" | "warn" | "fail">>({})
  const [snapshotCount, setSnapshotCount] = useState(0)
  const [inFullscreen, setInFullscreen] = useState(true)
  const terminatedRef = useRef(false)

  const pushActivity = useCallback((type: string, message: string, layer?: string) => {
    const entry: SecurityActivityLog = { type, message, at: new Date().toISOString(), layer: layer as SecurityActivityLog["layer"] }
    setViolations(prev => [...prev, entry])
    onActivity?.(entry)
    setLayerStatus(prev => ({ ...prev, [layer || type]: "warn" }))

    const socket = getTestSocket()
    socket.emit("test:proctor-event", {
      testId,
      applicationId,
      candidateId,
      candidateName,
      type,
      message,
      at: entry.at,
    })

    authFetch("/api/proctoring/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessmentId: applicationId,
        candidateId,
        type,
        message,
        at: entry.at,
        meta: { testId, layer },
      }),
    }).catch(() => {})
  }, [applicationId, candidateId, candidateName, onActivity, testId])

  const handleTerminate = useCallback((reason: string) => {
    if (terminatedRef.current) return
    terminatedRef.current = true
    pushActivity("test_terminated", reason, "tab")
    onTerminate?.(reason)
  }, [onTerminate, pushActivity])

  const handleTabSwitch = useCallback((count: number) => {
    tabSwitchesRef.current = count
    setTabSwitches(count)
    onTabSwitchParent?.(count)
    pushActivity("tab_switch", `Tab switch #${count} detected`, "tab")
    if (settings.detectTabSwitch && count >= settings.maxTabSwitches!) {
      handleTerminate(`Test ended: ${count} tab switches (limit: ${settings.maxTabSwitches})`)
    }
  }, [handleTerminate, onTabSwitchParent, pushActivity, settings.detectTabSwitch, settings.maxTabSwitches])

  const handleViolation = useCallback((payload: { type: string; message: string }) => {
    if (payload.type === "tab_switch" || payload.type === "window_blur" || payload.type === "periodic_snapshot") {
      if (payload.type === "periodic_snapshot") return
      if (payload.type === "tab_switch") return
    }
    const layerMap: Record<string, string> = {
      no_face: "face",
      multi_face: "multi_face",
      off_screen: "camera",
      movement: "motion",
      audio_noise: "audio",
      tab_switch: "tab",
      window_blur: "tab",
      camera_blocked: "camera",
      phone_detected: "object",
      book_detected: "object",
      suspicious_device: "object",
      extra_person: "multi_face",
      suspicious_object: "object",
      fullscreen_exit: "fullscreen",
    }
    const layer = layerMap[payload.type] || payload.type

    if (payload.type === "movement") {
      const sample: MotionSample = {
        at: new Date().toISOString(),
        delta: 1,
        severity: violations.filter(v => v.type === "movement").length >= 2 ? "high" : "medium",
      }
      setMotionSamples(prev => [...prev.slice(-4), sample])
    }

    pushActivity(payload.type, payload.message, layer)
  }, [pushActivity, violations])

  const handleSnapshot = useCallback(() => {
    setSnapshotCount((c) => c + 1)
    setLayerStatus((prev) => ({ ...prev, snapshots: "ok" }))
  }, [])

  useEffect(() => {
    const socket = getTestSocket()
    const join = () => {
      socket.emit("test:monitor-join", { testId, role: "candidate", applicationId, candidateId })
    }
    if (socket.connected) join()
    else socket.on("connect", join)
    return () => {
      socket.off("connect", join)
      socket.emit("test:monitor-leave", { testId, applicationId })
    }
  }, [applicationId, candidateId, testId])

  useEffect(() => {
    if (!settings.restrictCopyPaste) return
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      pushActivity("copy_paste", "Copy blocked", "clipboard")
    }
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault()
      pushActivity("copy_paste", "Paste blocked", "clipboard")
    }
    const onCut = (e: ClipboardEvent) => {
      e.preventDefault()
      pushActivity("copy_paste", "Cut blocked", "clipboard")
    }
    const onCtx = (e: MouseEvent) => {
      e.preventDefault()
      pushActivity("context_menu", "Right-click blocked", "clipboard")
    }
    document.addEventListener("copy", onCopy)
    document.addEventListener("paste", onPaste)
    document.addEventListener("cut", onCut)
    document.addEventListener("contextmenu", onCtx)
    return () => {
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("paste", onPaste)
      document.removeEventListener("cut", onCut)
      document.removeEventListener("contextmenu", onCtx)
    }
  }, [pushActivity, settings.restrictCopyPaste])

  useEffect(() => {
    if (!settings.detectTabSwitch) return
    const onVisibility = () => {
      if (document.hidden) {
        const next = tabSwitchesRef.current + 1
        handleTabSwitch(next)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [handleTabSwitch, settings.detectTabSwitch])

  useEffect(() => {
    if (settings.requireFullscreen === false) return

    const onFullscreen = () => {
      const active = isFullscreenActive()
      setInFullscreen(active)
      if (!active) {
        fullscreenExitsRef.current += 1
        pushActivity(
          "fullscreen_exit",
          `Exited fullscreen (${fullscreenExitsRef.current}x). Return to fullscreen immediately.`,
          "fullscreen",
        )
        if (fullscreenExitsRef.current >= 3) {
          handleTerminate("Test ended: repeated fullscreen exits")
        }
      }
    }

    document.addEventListener("fullscreenchange", onFullscreen)
    if (!isFullscreenActive()) {
      requestTestFullscreen().catch(() => {})
    }
    return () => document.removeEventListener("fullscreenchange", onFullscreen)
  }, [handleTerminate, pushActivity, settings.requireFullscreen])

  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase()))) {
        e.preventDefault()
        pushActivity("devtools_attempt", "Developer tools shortcut blocked", "tab")
      }
    }
    window.addEventListener("keydown", blockKeys)
    return () => window.removeEventListener("keydown", blockKeys)
  }, [pushActivity])

  if (!settings.enableProctoring) return null

  const activeLayers = CODING_SECURITY_LAYERS.filter((l) => {
    if (l.id === "fullscreen") return settings.requireFullscreen !== false
    if (l.id === "object") return settings.enableObjectDetection
    if (l.id === "audio") return settings.enableAudioMonitoring !== false
    if (l.id === "snapshots") return settings.enablePeriodicSnapshots !== false
    if (l.id === "clipboard") return settings.restrictCopyPaste
    if (l.id === "tab") return settings.detectTabSwitch
    return true
  })

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[320px]">
      <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-3 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Shield className="h-3.5 w-3.5 text-purple-400" />
            Security monitor
          </div>
          <div className="flex gap-1">
            {settings.requireFullscreen !== false && (
              <Badge variant="outline" className={`text-[9px] ${inFullscreen ? "border-emerald-700 text-emerald-300" : "border-red-700 text-red-300"}`}>
                <Maximize className="h-2.5 w-2.5 mr-0.5" />
                {inFullscreen ? "FS" : "!"}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] border-purple-700 text-purple-300">
              {tabSwitches}/{settings.maxTabSwitches} tabs
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {activeLayers.slice(0, 8).map(layer => {
            const status = layerStatus[layer.id] || "ok"
            return (
              <div
                key={layer.id}
                className={`text-[9px] px-1.5 py-1 rounded border ${
                  status === "fail" ? "border-red-700/50 bg-red-950/30 text-red-300" :
                  status === "warn" ? "border-amber-700/50 bg-amber-950/30 text-amber-300" :
                  "border-[#30363d] text-[#8b949e]"
                }`}
              >
                {layer.label}
              </div>
            )
          })}
        </div>
        {settings.enablePeriodicSnapshots !== false && (
          <p className="text-[9px] text-[#8b949e] mt-2">Snapshots captured: {snapshotCount}</p>
        )}
        {violations.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400">
            <ShieldAlert className="h-3 w-3" />
            {violations.length} security event(s)
          </div>
        )}
      </div>

      {settings.webcamRequired && (
        <FaceProctor
          assessmentId={applicationId}
          candidateId={candidateId}
          testId={testId}
          blockClipboard={settings.restrictCopyPaste}
          enableAudioMonitoring={settings.enableAudioMonitoring !== false}
          enableObjectDetection={settings.enableObjectDetection ?? true}
          enablePeriodicSnapshots={settings.enablePeriodicSnapshots !== false}
          snapshotIntervalSec={settings.snapshotIntervalSec ?? 20}
          evidence
          autoStart
          maxWarningsBeforePause={10}
          onViolation={handleViolation}
          onTabSwitch={handleTabSwitch}
          maxTabSwitches={settings.maxTabSwitches}
          onTerminate={handleTerminate}
          onSnapshot={handleSnapshot}
          className="!relative !bottom-0 !right-0 !w-full"
        />
      )}
    </div>
  )
}

export function useSecurityAudit(
  tabSwitches: number,
  violations: SecurityActivityLog[],
  maxTabSwitches = 2,
) {
  const score = Math.max(0, 100 - Math.min(tabSwitches * 15, 40) - Math.min(violations.length * 6, 50))
  return {
    score,
    summary: violations.length === 0 ? "Clean session" : `${violations.length} security events recorded`,
    flags: violations.map(v => v.type),
    logs: violations,
    tabSwitches,
    maxTabSwitches,
  }
}
