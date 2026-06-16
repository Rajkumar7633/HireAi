"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { authFetch } from "@/lib/client-auth"
import { ProctorObjectDetector, drawObjectOverlay, type SuspiciousObjectHit } from "@/lib/proctor-object-detection"
import { ProctorFaceDetector, drawFaceBoxes } from "@/lib/proctor-face-detection"

export type FaceProctorProps = {
  assessmentId: string
  candidateId: string
  testId?: string
  minFaceSizeRatio?: number
  maxFaces?: number
  movementThreshold?: number
  checkIntervalMs?: number
  evidence?: boolean
  enableAudioMonitoring?: boolean
  enableObjectDetection?: boolean
  enablePeriodicSnapshots?: boolean
  snapshotIntervalSec?: number
  blockClipboard?: boolean
  maxWarningsBeforePause?: number
  onViolation?: (payload: { type: string; message: string }) => void
  onTabSwitch?: (count: number) => void
  maxTabSwitches?: number
  onTerminate?: (reason: string) => void
  onSnapshot?: (payload: { type: string; at: string }) => void
  autoStart?: boolean
  className?: string
}

const canGetUserMedia = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia

const WARN_COOLDOWN_MS: Record<string, number> = {
  no_face: 5000,
  multi_face: 8000,
  off_screen: 6000,
  movement: 7000,
  audio_noise: 12000,
  camera_blocked: 6000,
  periodic_snapshot: 1000,
  tab_switch: 2000,
  window_blur: 3000,
}

export function FaceProctor({
  assessmentId,
  candidateId,
  testId,
  minFaceSizeRatio = 0.1,
  maxFaces = 1,
  movementThreshold = 35,
  checkIntervalMs = 800,
  evidence = true,
  enableAudioMonitoring = true,
  enableObjectDetection = true,
  enablePeriodicSnapshots = true,
  snapshotIntervalSec = 20,
  blockClipboard = false,
  maxWarningsBeforePause = 8,
  onViolation,
  onTabSwitch,
  maxTabSwitches = 2,
  onTerminate,
  onSnapshot,
  autoStart = false,
  className,
}: FaceProctorProps) {
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [warnings, setWarnings] = useState(0)
  const warningsRef = useRef(0)
  const [paused, setPaused] = useState(false)
  const [faceAiReady, setFaceAiReady] = useState(false)
  const [objectAiReady, setObjectAiReady] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [lastEvent, setLastEvent] = useState("")

  const lastCenterRef = useRef<{ x: number; y: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const snapshotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const tabSwitchCountRef = useRef(0)
  const hadFaceRef = useRef(false)
  const noFaceStreakRef = useRef(0)
  const audioSpikeStreakRef = useRef(0)
  const lastWarnAtRef = useRef<Record<string, number>>({})
  const faceDetectorRef = useRef(new ProctorFaceDetector())
  const objectDetectorRef = useRef(new ProctorObjectDetector())
  const lastObjectHitsRef = useRef<SuspiciousObjectHit[]>([])
  const objectFrameCounterRef = useRef(0)
  const legacyDetectorRef = useRef<any>(null)

  useEffect(() => {
    const FaceDetectorCtor = typeof window !== "undefined" ? (window as any).FaceDetector : undefined
    if (FaceDetectorCtor) {
      legacyDetectorRef.current = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 5 })
    }
  }, [])

  const captureSnapshot = useCallback((): string | null => {
    if (!evidence) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, w, h)
    try {
      return canvas.toDataURL("image/jpeg", 0.65)
    } catch {
      return null
    }
  }, [evidence])

  const postEvent = useCallback(async (type: string, message: string, includeSnapshot = true) => {
    const payload: Record<string, unknown> = {
      assessmentId,
      candidateId,
      type,
      message,
      at: new Date().toISOString(),
      meta: { testId },
    }
    if (includeSnapshot) {
      const snap = captureSnapshot()
      if (snap) payload.snapshot = snap
    }
    try {
      await authFetch("/api/proctoring/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } catch {}
  }, [assessmentId, candidateId, captureSnapshot, testId])

  const warn = useCallback(async (type: string, message: string, silent = false) => {
    const now = Date.now()
    const cooldown = WARN_COOLDOWN_MS[type] ?? 5000
    if (now - (lastWarnAtRef.current[type] || 0) < cooldown) return
    lastWarnAtRef.current[type] = now

    warningsRef.current += 1
    setWarnings(warningsRef.current)
    setLastEvent(type)
    if (!silent) {
      toast({ title: "Security alert", description: message, variant: "destructive" })
    }
    await postEvent(type, message)
    onViolation?.({ type, message })

    if (maxWarningsBeforePause && warningsRef.current >= maxWarningsBeforePause && !paused) {
      setPaused(true)
      if (timerRef.current) clearInterval(timerRef.current)
      toast({
        title: "Assessment paused",
        description: "Too many security violations. Acknowledge and resume when ready.",
        variant: "destructive",
      })
    }
  }, [maxWarningsBeforePause, onViolation, paused, postEvent, toast])

  const initAudio = (stream: MediaStream) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
    } catch {}
  }

  const measureAudioRms = () => {
    const analyser = analyserRef.current
    if (!analyser) return 0
    const data = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    return Math.sqrt(sum / data.length)
  }

  const runObjectDetection = async (video: HTMLVideoElement) => {
    if (!enableObjectDetection || !objectDetectorRef.current.ready) return
    objectFrameCounterRef.current += 1
    if (objectFrameCounterRef.current % 3 !== 0) return

    const hits = await objectDetectorRef.current.detect(video)
    lastObjectHitsRef.current = hits
    for (const hit of hits) {
      if (!objectDetectorRef.current.shouldWarn(hit.kind)) continue
      const violation = objectDetectorRef.current.violationMessage(hit)
      await warn(violation.type, violation.message)
    }
  }

  const detectFacesLegacy = async (video: HTMLVideoElement) => {
    if (!legacyDetectorRef.current) return null
    try {
      const faces = await legacyDetectorRef.current.detect(video)
      return Array.isArray(faces) ? faces : []
    } catch {
      return null
    }
  }

  const analyzeFrame = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.readyState < 2 || paused) return

    const vw = video.videoWidth || 640
    const vh = video.videoHeight || 480
    const canvas = overlayRef.current
    const ctx = canvas?.getContext("2d") || null
    if (canvas && ctx) {
      canvas.width = vw
      canvas.height = vh
      ctx.clearRect(0, 0, vw, vh)
    }

    if (enableAudioMonitoring) {
      const rms = measureAudioRms()
      setAudioLevel(rms)
      if (rms > 0.055) {
        audioSpikeStreakRef.current += 1
        if (audioSpikeStreakRef.current >= 4) {
          await warn("audio_noise", "Voice or background noise detected. Remain silent during the test.")
          audioSpikeStreakRef.current = 0
        }
      } else {
        audioSpikeStreakRef.current = Math.max(0, audioSpikeStreakRef.current - 1)
      }
    }

    await runObjectDetection(video)

    let faceCount = 0
    let primaryFaceW = 0
    let center: { x: number; y: number } | null = null

    if (faceDetectorRef.current.ready) {
      const faces = await faceDetectorRef.current.detect(video)
      faceCount = faces.length
      if (ctx) drawFaceBoxes(ctx, faces)
      if (faces.length > 0) {
        const f = faces.reduce((a, b) => (a.width > b.width ? a : b))
        primaryFaceW = f.width
        center = { x: f.x + f.width / 2, y: f.y + f.height / 2 }
      }
    } else {
      const legacy = await detectFacesLegacy(video)
      if (legacy) {
        faceCount = legacy.length
        if (legacy.length > 0) {
          const largest = legacy.reduce((m: any, f: any) => {
            const area = (f.boundingBox?.width || 0) * (f.boundingBox?.height || 0)
            const mArea = m ? (m.boundingBox?.width || 0) * (m.boundingBox?.height || 0) : -1
            return area > mArea ? f : m
          }, null)
          if (largest?.boundingBox) {
            const bb = largest.boundingBox
            primaryFaceW = bb.width
            center = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }
            if (ctx) {
              ctx.strokeStyle = "rgba(16,185,129,0.85)"
              ctx.strokeRect(bb.x, bb.y, bb.width, bb.height)
            }
          }
        }
      }
    }

    if (ctx && lastObjectHitsRef.current.length) {
      drawObjectOverlay(ctx, lastObjectHitsRef.current)
    }

    if (faceCount === 0 && !faceDetectorRef.current.ready && !legacyDetectorRef.current) {
      await warn("no_face_api", "Face AI loading… limited monitoring until model is ready.", true)
      return
    }

    if (faceCount === 0) {
      noFaceStreakRef.current += 1
      if (hadFaceRef.current && noFaceStreakRef.current >= 2) {
        await warn("camera_blocked", "Camera blocked or covered. Uncover your camera immediately.")
      } else if (noFaceStreakRef.current >= 3) {
        await warn("no_face", "No face detected. Stay centered in front of the camera.")
      }
      return
    }

    hadFaceRef.current = true
    noFaceStreakRef.current = 0

    if (faceCount > maxFaces) {
      await warn("multi_face", "Multiple people detected. Only you may be in the frame.")
    }

    const faceRatio = primaryFaceW / vw
    if (faceRatio > 0 && faceRatio < minFaceSizeRatio) {
      await warn("off_screen", "You are too far or partially out of frame. Move closer to the camera.")
    }

    if (center && lastCenterRef.current) {
      const dist = Math.hypot(center.x - lastCenterRef.current.x, center.y - lastCenterRef.current.y)
      if (dist > movementThreshold) {
        await warn("movement", "Excessive movement detected. Keep your head steady.")
      }
    }
    if (center) lastCenterRef.current = center
  }, [
    enableAudioMonitoring,
    enableObjectDetection,
    maxFaces,
    minFaceSizeRatio,
    movementThreshold,
    paused,
    warn,
  ])

  const start = async () => {
    if (!canGetUserMedia()) {
      toast({ title: "Camera required", description: "Your browser does not support webcam access.", variant: "destructive" })
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: enableAudioMonitoring,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setEnabled(true)

      const faceOk = await faceDetectorRef.current.init()
      setFaceAiReady(faceOk)

      if (enableObjectDetection) {
        const objOk = await objectDetectorRef.current.init()
        setObjectAiReady(objOk)
      }

      if (enableAudioMonitoring) initAudio(stream)

      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => { analyzeFrame().catch(() => {}) }, checkIntervalMs)

      if (enablePeriodicSnapshots) {
        const intervalMs = Math.max(10, snapshotIntervalSec) * 1000
        if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current)
        snapshotTimerRef.current = setInterval(async () => {
          const at = new Date().toISOString()
          await postEvent("periodic_snapshot", "Routine proctoring snapshot", true)
          onSnapshot?.({ type: "periodic_snapshot", at })
        }, intervalMs)
      }

      await postEvent("proctor_started", "Live proctoring session started", true)
      toast({
        title: "Proctoring active",
        description: [
          faceOk ? "Face AI" : null,
          objectDetectorRef.current.ready ? "Object AI" : null,
          enableAudioMonitoring ? "Audio" : null,
        ].filter(Boolean).join(" · ") || "Monitoring enabled",
      })
    } catch {
      toast({ title: "Camera error", description: "Allow camera and microphone permissions, then retry.", variant: "destructive" })
    }
  }

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current)
    const stream = videoRef.current?.srcObject as MediaStream | undefined
    stream?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close().catch(() => {})
    setEnabled(false)
  }

  useEffect(() => {
    const onVisibility = async () => {
      if (document.hidden) {
        tabSwitchCountRef.current += 1
        onTabSwitch?.(tabSwitchCountRef.current)
        if (tabSwitchCountRef.current >= maxTabSwitches) {
          onTerminate?.(`Tab switch limit reached (${maxTabSwitches})`)
        }
        await warn("tab_switch", `Tab switch #${tabSwitchCountRef.current} — stay on the test window.`)
      }
    }
    const onBlur = async () => {
      await warn("window_blur", "Window focus lost. Return to the test immediately.")
    }
    const prevent = (e: Event) => e.preventDefault()

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", onBlur)
    if (blockClipboard) {
      document.addEventListener("copy", prevent)
      document.addEventListener("cut", prevent)
      document.addEventListener("paste", prevent)
      document.addEventListener("contextmenu", prevent)
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", onBlur)
      if (blockClipboard) {
        document.removeEventListener("copy", prevent)
        document.removeEventListener("cut", prevent)
        document.removeEventListener("paste", prevent)
        document.removeEventListener("contextmenu", prevent)
      }
    }
  }, [blockClipboard, maxTabSwitches, onTabSwitch, onTerminate, warn])

  useEffect(() => {
    if (autoStart && !enabled) start()
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  return (
    <div className={"fixed z-40 right-4 bottom-4 w-[300px] select-none " + (className || "")}>
      <div className="rounded-lg border border-[#30363d] bg-[#161b22] shadow-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-white">Live Proctor</div>
          <div className="flex items-center gap-1">
            {faceAiReady && <Badge variant="outline" className="text-[9px] px-1 border-emerald-700 text-emerald-300">Face</Badge>}
            {objectAiReady && <Badge variant="outline" className="text-[9px] px-1 border-amber-700 text-amber-300">Object</Badge>}
            {enableAudioMonitoring && <Badge variant="outline" className="text-[9px] px-1 border-blue-700 text-blue-300">Audio</Badge>}
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "ON" : "OFF"}</Badge>
          </div>
        </div>

        <div className="relative rounded overflow-hidden bg-black mb-2 border border-[#30363d]">
          <video ref={videoRef} playsInline muted className="w-full h-auto scale-x-[-1]" />
          <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]" />
          <canvas ref={canvasRef} className="hidden" />
          {paused && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-3 text-center">
              <div>
                <p className="text-white font-semibold text-sm mb-2">Paused — violations</p>
                <Button size="sm" onClick={() => { setPaused(false); timerRef.current = setInterval(() => analyzeFrame().catch(() => {}), checkIntervalMs) }}>
                  Resume
                </Button>
              </div>
            </div>
          )}
        </div>

        {enableAudioMonitoring && enabled && (
          <div className="mb-2">
            <div className="flex justify-between text-[10px] text-[#8b949e] mb-1">
              <span>Mic level</span>
              <span>{audioLevel > 0.055 ? "Voice detected" : "Quiet"}</span>
            </div>
            <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${audioLevel > 0.055 ? "bg-red-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(100, audioLevel * 400)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-between text-xs text-[#8b949e]">
          <span>Warnings: <strong className="text-white">{warnings}</strong></span>
          {lastEvent && <span className="truncate max-w-[140px] text-amber-400">{lastEvent}</span>}
        </div>

        <div className="mt-2">
          {!enabled ? (
            <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-500" onClick={start}>Start monitoring</Button>
          ) : (
            <Button size="sm" variant="outline" className="w-full border-[#30363d]" onClick={stop}>Stop</Button>
          )}
        </div>
      </div>
    </div>
  )
}
