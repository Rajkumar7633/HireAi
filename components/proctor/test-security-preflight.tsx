"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  Mic,
  Maximize,
  Shield,
  Play,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import {
  CODING_SECURITY_LAYERS,
  requestTestFullscreen,
  isFullscreenActive,
  type TestSecuritySettings,
} from "@/lib/coding-test-security"
import { ProctorFaceDetector } from "@/lib/proctor-face-detection"

type Step = 1 | 2 | 3 | 4

type Props = {
  testTitle: string
  settings: TestSecuritySettings
  onReady: () => void
}

export function TestSecurityPreflight({ testTitle, settings, onReady }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [fullscreenOk, setFullscreenOk] = useState(!settings.requireFullscreen)
  const [cameraOk, setCameraOk] = useState(false)
  const [faceVerified, setFaceVerified] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState("")
  const [audioLevel, setAudioLevel] = useState(0)
  const [faceStreak, setFaceStreak] = useState(0)
  const [loadingFace, setLoadingFace] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceDetectorRef = useRef(new ProctorFaceDetector())
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const faceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const stopMedia = useCallback(() => {
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current)
    if (faceIntervalRef.current) clearInterval(faceIntervalRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (settings.requireFullscreen === false) {
      setFullscreenOk(true)
      setStep(2)
    }
  }, [settings.requireFullscreen])

  useEffect(() => {
    const onFs = () => setFullscreenOk(isFullscreenActive() || !settings.requireFullscreen)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [settings.requireFullscreen])

  useEffect(() => () => stopMedia(), [stopMedia])

  useEffect(() => {
    const video = videoRef.current
    const stream = streamRef.current
    if (video && stream && cameraOk) {
      video.srcObject = stream
      video.play().catch(() => {})
    }
  }, [cameraOk, faceVerified])

  const enterFullscreen = async () => {
    setError("")
    const ok = await requestTestFullscreen()
    if (ok || isFullscreenActive()) {
      setFullscreenOk(true)
      setStep(2)
    } else {
      setError("Fullscreen was blocked. Click the button again and allow fullscreen in your browser.")
    }
  }

  const enableCamera = async () => {
    setError("")
    stopMedia()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: settings.enableAudioMonitoring !== false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOk(true)

      if (settings.enableAudioMonitoring !== false) {
        const ctx = new AudioContext()
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 1024
        src.connect(analyser)
        analyserRef.current = analyser
        audioIntervalRef.current = setInterval(() => {
          const data = new Uint8Array(analyser.fftSize)
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128
            sum += v * v
          }
          setAudioLevel(Math.sqrt(sum / data.length))
        }, 200)
      }

      setLoadingFace(true)
      await faceDetectorRef.current.init()
      setLoadingFace(false)

      let streak = 0
      faceIntervalRef.current = setInterval(async () => {
        const video = videoRef.current
        if (!video || video.readyState < 2) return
        const faces = await faceDetectorRef.current.detect(video)
        if (faces.length >= 1) {
          streak += 1
          setFaceStreak(streak)
          if (streak >= 3) {
            setFaceVerified(true)
            if (faceIntervalRef.current) clearInterval(faceIntervalRef.current)
          }
        } else {
          streak = 0
          setFaceStreak(0)
        }
      }, 700)
    } catch {
      setCameraOk(false)
      setError("Camera and microphone access is required. Allow permissions and try again.")
    }
  }

  const steps = [
    { n: 1 as Step, label: "Fullscreen", done: fullscreenOk },
    { n: 2 as Step, label: "Camera & mic", done: cameraOk },
    { n: 3 as Step, label: "Face verify", done: faceVerified },
    { n: 4 as Step, label: "Consent", done: agreed },
  ]

  const canBegin =
    (fullscreenOk || !settings.requireFullscreen) &&
    cameraOk &&
    faceVerified &&
    agreed

  const handleBegin = () => {
    if (!canBegin) return
    stopMedia()
    onReady()
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-[#30363d] bg-gradient-to-r from-purple-900/40 to-[#161b22]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Secure Test Environment</h1>
              <p className="text-xs text-[#8b949e]">{testTitle}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {steps.map((s) => (
              <div key={s.n} className="flex-1">
                <div className={`h-1 rounded-full ${s.done ? "bg-emerald-500" : step === s.n ? "bg-purple-500" : "bg-[#30363d]"}`} />
                <p className="text-[9px] text-[#8b949e] mt-1 truncate">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-3 py-2 text-xs text-red-300 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && settings.requireFullscreen !== false && (
            <div className="space-y-4 text-center">
              <Maximize className="h-12 w-12 mx-auto text-purple-400" />
              <div>
                <h2 className="text-white font-semibold">Step 1 — Enter fullscreen</h2>
                <p className="text-sm text-[#8b949e] mt-1">
                  The test must run in fullscreen. Exiting fullscreen during the test is logged as a violation.
                </p>
              </div>
              <Button className="w-full bg-purple-600 hover:bg-purple-500" onClick={enterFullscreen}>
                <Maximize className="h-4 w-4 mr-2" /> Enter fullscreen
              </Button>
              {fullscreenOk && (
                <Button variant="outline" className="w-full border-[#30363d]" onClick={() => setStep(2)}>
                  Continue to camera check
                </Button>
              )}
            </div>
          )}

          {(step === 2 || (step === 1 && settings.requireFullscreen === false)) && !cameraOk && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-400" />
                  Step 2 — Camera &amp; microphone
                </h2>
                {settings.requireFullscreen === false && step === 1 && (
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => setStep(2)}>Skip fullscreen</Button>
                )}
              </div>
              <div className="aspect-video rounded-lg overflow-hidden bg-black border border-[#30363d] flex items-center justify-center">
                {cameraOk ? (
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                ) : (
                  <p className="text-[#8b949e] text-sm">Preview will appear here</p>
                )}
              </div>
              <Button className="w-full bg-purple-600 hover:bg-purple-500" onClick={enableCamera}>
                <Camera className="h-4 w-4 mr-2" />
                Enable camera {settings.enableAudioMonitoring !== false && "& microphone"}
              </Button>
            </div>
          )}

          {cameraOk && !faceVerified && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold">Step 3 — Identity verification</h2>
              <div className="aspect-video rounded-lg overflow-hidden bg-black border border-[#30363d]">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                {loadingFace ? (
                  <><Loader2 className="h-4 w-4 animate-spin text-purple-400" /> Loading face AI…</>
                ) : (
                  <>
                    <Badge variant="outline" className={faceStreak > 0 ? "border-emerald-600 text-emerald-400" : "border-[#30363d] text-[#8b949e]"}>
                      Face detected: {faceStreak}/3
                    </Badge>
                    {settings.enableAudioMonitoring !== false && (
                      <Badge variant="outline" className="border-blue-700 text-blue-300">
                        <Mic className="h-3 w-3 mr-1" />
                        Mic {audioLevel > 0.03 ? "active" : "ready"}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-[#8b949e]">Look at the camera and stay still until verification completes.</p>
            </div>
          )}

          {faceVerified && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 className="h-5 w-5" />
                Identity verified — face and camera OK
              </div>

              <ul className="text-xs text-[#8b949e] space-y-2 max-h-40 overflow-y-auto">
                {CODING_SECURITY_LAYERS.slice(0, 10).map((layer) => (
                  <li key={layer.id} className="flex items-start gap-2">
                    <Shield className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
                    <span><strong className="text-[#c9d1d9]">{layer.label}</strong> — {layer.description}</span>
                  </li>
                ))}
              </ul>

              <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-[#30363d] p-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setStep(4) }}
                  className="mt-0.5 accent-purple-600"
                />
                <span className="text-xs text-[#c9d1d9]">
                  I agree to AI proctoring: fullscreen lock, webcam monitoring, voice detection,
                  periodic snapshots, tab-switch logging, and anti-cheat measures.
                </span>
              </label>

              <Button
                className="w-full bg-purple-600 hover:bg-purple-500 font-semibold"
                disabled={!canBegin}
                onClick={handleBegin}
              >
                <Play className="h-4 w-4 mr-2" /> Begin test
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
