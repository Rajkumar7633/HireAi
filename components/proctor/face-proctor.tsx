"use client";

import React, { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Proctoring component using FaceDetector API and MediaPipe FaceMesh (CDN) fallback for landmarks.
// Features
// - Detects: no-face, multi-face, off-screen/occluded (low face size), excessive movement
// - Landmark overlay (eyes/nose/chin) with small live preview
// - Captures evidence snapshots (canvas) and POSTs to /api/proctoring/event
// - Graceful degradation when neither API is supported

// Notes
// - Designed to be mounted on secure assessment pages. Minimal UI footprint.
// - Does NOT record or store video; only captures still snapshots on violations.
// - You should disclose monitoring to candidates (see your legal requirements).

export type FaceProctorProps = {
  assessmentId: string;
  candidateId: string;
  minFaceSizeRatio?: number; // fraction of frame width (e.g., 0.12)
  maxFaces?: number; // default 1
  movementThreshold?: number; // pixel delta threshold for movement warnings
  checkIntervalMs?: number; // analysis cadence
  evidence?: boolean; // capture base64 snapshot on violations
  enableAudioMonitoring?: boolean; // detect conversations/background noise
  blockClipboard?: boolean; // prevent copy/paste/context menu
  maxWarningsBeforePause?: number; // auto-pause after N warnings
  onViolation?: (payload: { type: string; message: string }) => void; // callback to parent
  className?: string;
};

// Basic type guard for navigator.mediaDevices
const canGetUserMedia = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

export function FaceProctor({
  assessmentId,
  candidateId,
  minFaceSizeRatio = 0.12,
  maxFaces = 1,
  movementThreshold = 28,
  checkIntervalMs = 1200,
  evidence = true,
  enableAudioMonitoring = false,
  blockClipboard = false,
  maxWarningsBeforePause = 3,
  onViolation,
  className,
}: FaceProctorProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [warnings, setWarnings] = useState(0);
  const [paused, setPaused] = useState(false);
  const lastCenterRef = useRef<{ x: number; y: number } | null>(null);
  const detectorRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const [usingMesh, setUsingMesh] = useState(false);
  const meshRef = useRef<any>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSrcRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    // Check FaceDetector support
    // @ts-ignore
    const FaceDetectorCtor = typeof window !== "undefined" ? (window as any).FaceDetector : undefined;
    setSupported(!!FaceDetectorCtor);
    if (FaceDetectorCtor) {
      // @ts-ignore
      detectorRef.current = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 5 });
    }
  }, []);

  // Tab/visibility & clipboard security
  useEffect(() => {
    const onVisibility = async () => {
      if (document.hidden) {
        await warn("tab_switch", "Tab switch detected. Please stay on the assessment tab.");
      }
    };
    const onBlur = async () => {
      await warn("window_blur", "Window focus lost. Please remain focused on the assessment.");
    };
    const prevent = (e: Event) => { e.preventDefault(); };
    if (blockClipboard) {
      document.addEventListener("copy", prevent);
      document.addEventListener("cut", prevent);
      document.addEventListener("paste", prevent);
      document.addEventListener("contextmenu", prevent);
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      if (blockClipboard) {
        document.removeEventListener("copy", prevent);
        document.removeEventListener("cut", prevent);
        document.removeEventListener("paste", prevent);
        document.removeEventListener("contextmenu", prevent);
      }
    };
  }, [blockClipboard]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | undefined;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    if (!canGetUserMedia()) {
      toast({ title: "Camera Access", description: "Your browser does not support camera access.", variant: "destructive" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: !!enableAudioMonitoring });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setEnabled(true);
      // Try to load FaceMesh for robust landmark detection
      await tryInitFaceMesh();
      if (enableAudioMonitoring) initAudio(stream);
      scheduleChecks();
      toast({ title: "Proctoring Enabled", description: "Webcam monitoring is active (face recognition & movement)." });
    } catch (e) {
      toast({ title: "Camera Error", description: "Cannot access camera. Please allow permission and refresh.", variant: "destructive" });
    }
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const stream = videoRef.current?.srcObject as MediaStream | undefined;
    stream?.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
    }
    setEnabled(false);
  };

  const scheduleChecks = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(analyzeFrame, checkIntervalMs);
  };

  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
      if (existing) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Script load error"));
      document.body.appendChild(s);
    });

  const tryInitFaceMesh = async () => {
    try {
      // Load MediaPipe FaceMesh from CDN only on demand (no bundler deps)
      // @ts-ignore
      if (!(window as any).FaceMesh) {
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js");
      }
      // @ts-ignore
      const FaceMeshCtor = (window as any).FaceMesh;
      if (!FaceMeshCtor) return;
      meshRef.current = new FaceMeshCtor({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
      meshRef.current.setOptions({ maxNumFaces: 2, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      setUsingMesh(true);
    } catch {
      // Ignore if CDN blocked
    }
  };

  const captureSnapshot = (): string | null => {
    if (!evidence) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    try {
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch {
      return null;
    }
  };

  const postEvent = async (type: string, message: string) => {
    const payload: any = {
      assessmentId,
      candidateId,
      type,
      message,
      at: new Date().toISOString(),
    };
    const snap = captureSnapshot();
    if (snap) payload.snapshot = snap;
    try {
      await fetch("/api/proctoring/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch {}
  };

  const warn = async (type: string, message: string) => {
    setWarnings((w) => w + 1);
    toast({ title: "Proctoring Warning", description: message, variant: "destructive" });
    await postEvent(type, message);
    onViolation?.({ type, message });
    if (maxWarningsBeforePause && warnings + 1 >= maxWarningsBeforePause && !paused) {
      setPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      toast({ title: "Assessment Paused", description: "Too many violations. Please acknowledge and resume." });
    }
  };

  const initAudio = (stream: MediaStream) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      audioCtxRef.current = ctx; analyserRef.current = analyser; audioSrcRef.current = source;
    } catch {}
  };

  const checkAudioLevel = () => {
    const analyser = analyserRef.current;
    if (!analyser) return false;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    // Rough energy estimate
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    return rms > 0.08; // tweak threshold for speaking/background noise
  };

  const analyzeFrame = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    // Optional audio spike detection
    if (enableAudioMonitoring && checkAudioLevel()) {
      await warn("audio_noise", "Significant audio detected. Please ensure a quiet environment.");
    }

    // If FaceMesh is available, prefer it for robust detection and overlay
    if (usingMesh && meshRef.current) {
      try {
        const canvas = overlayRef.current;
        const ctx = canvas?.getContext("2d") || null;
        if (canvas && ctx) {
          canvas.width = vw; canvas.height = vh;
          ctx.clearRect(0, 0, vw, vh);
        }
        const results = await meshRef.current.send({ image: video });
        // Some versions use callbacks, but recent builds support promises; if not, this will noop.
      } catch {}
      // Fallback: draw and check landmarks via FaceMesh solution API callbacks
      // @ts-ignore
      if (meshRef.current && typeof meshRef.current.onResults === "function") {
        const canvas = overlayRef.current;
        const ctx = canvas?.getContext("2d") || null;
        meshRef.current.onResults(async (res: any) => {
          const multi = res.multiFaceLandmarks || [];
          const count = multi.length;
          if (ctx && canvas) { ctx.clearRect(0, 0, canvas.width, canvas.height); }
          if (count === 0) {
            await warn("no_face", "No face detected. Please stay in view of the camera.");
            return;
          }
          if (count > maxFaces) {
            await warn("multi_face", "Multiple faces detected. Please ensure only you are in frame.");
          }
          const face = multi[0];
          // Landmarks are normalized [0..1]; compute bbox and draw key points
          const xs = face.map((p: any) => p.x * vw);
          const ys = face.map((p: any) => p.y * vh);
          const minX = Math.max(0, Math.min(...xs));
          const maxX = Math.min(vw, Math.max(...xs));
          const minY = Math.max(0, Math.min(...ys));
          const maxY = Math.min(vh, Math.max(...ys));
          const faceW = maxX - minX;
          const faceRatio = faceW / vw;

          if (faceRatio < minFaceSizeRatio) {
            await warn("off_screen", "You appear far from camera or partially out of frame. Please stay centered.");
          }

          // Draw overlay: bbox and a subset of landmarks (eyes, nose tip, chin)
          if (ctx && canvas) {
            ctx.strokeStyle = "rgba(16,185,129,0.7)"; // emerald
            ctx.lineWidth = 2;
            ctx.strokeRect(minX, minY, faceW, maxY - minY);
            ctx.fillStyle = "rgba(59,130,246,0.9)"; // blue
            const keyIdx = [1, 33, 263, 168, 199]; // nose tip, left eye, right eye, forehead, chin-ish
            keyIdx.forEach((i) => {
              const p = face[i];
              if (!p) return;
              const x = p.x * vw, y = p.y * vh;
              ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
            });
          }

          // Movement detection based on bbox center drift
          const center = { x: minX + faceW / 2, y: minY + (maxY - minY) / 2 };
          if (lastCenterRef.current) {
            const dx = center.x - lastCenterRef.current.x;
            const dy = center.y - lastCenterRef.current.y;
            const dist = Math.hypot(dx, dy);
            if (dist > movementThreshold) {
              await warn("movement", "Excessive movement detected. Please remain steady during the assessment.");
            }
          }
          lastCenterRef.current = center;
        });
        // Kick one frame through the graph via HTMLVideoElement
        try { await meshRef.current.send({ image: video }); } catch {}
        return;
      }
    }

    if (detectorRef.current) {
      try {
        const faces = await detectorRef.current.detect(video);
        const count = Array.isArray(faces) ? faces.length : 0;
        if (count === 0) {
          await warn("no_face", "No face detected. Please stay in view of the camera.");
          return;
        }
        if (count > maxFaces) {
          await warn("multi_face", "Multiple faces detected. Please ensure only you are in frame.");
        }
        // Use the largest face as primary
        const largest = faces.reduce((m: any, f: any) => {
          const area = f.boundingBox?.width * f.boundingBox?.height;
          const mArea = m ? m.boundingBox?.width * m.boundingBox?.height : -1;
          return area > mArea ? f : m;
        }, null);
        if (largest?.boundingBox) {
          const bb = largest.boundingBox as DOMRectReadOnly;
          const faceRatio = bb.width / vw;
          if (faceRatio < minFaceSizeRatio) {
            await warn("off_screen", "You appear far from camera or partially out of frame. Please stay centered.");
          }
          // Movement detection based on face center drift
          const center = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
          if (lastCenterRef.current) {
            const dx = center.x - lastCenterRef.current.x;
            const dy = center.y - lastCenterRef.current.y;
            const dist = Math.hypot(dx, dy);
            if (dist > movementThreshold) {
              await warn("movement", "Excessive movement detected. Please remain steady during the assessment.");
            }
          }
          lastCenterRef.current = center;
          // Draw basic bbox overlay if FaceMesh not used
          const canvas = overlayRef.current;
          const ctx = canvas?.getContext("2d") || null;
          if (canvas && ctx) {
            canvas.width = vw; canvas.height = vh;
            ctx.clearRect(0, 0, vw, vh);
            ctx.strokeStyle = "rgba(16,185,129,0.7)";
            ctx.lineWidth = 2;
            ctx.strokeRect(bb.x, bb.y, bb.width, bb.height);
          }
        }
      } catch (e) {
        // Detection failed this frame; ignore
      }
    } else {
      // Fallback: no face APIs, emit periodic soft warning once
      await postEvent("no_face_api", "Face detection not supported. Limited proctoring active.");
      setSupported(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div className={"fixed z-40 right-4 bottom-4 w-[280px] select-none " + (className || "") }>
      <div className="rounded-lg border bg-background shadow-md p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">AI Proctoring</div>
          <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "On" : "Off"}</Badge>
        </div>
        {supported === false && (
          <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
            Limited monitoring: browser lacks FaceDetector.
          </div>
        )}
        {/* Live preview with overlay */}
        <div className="relative rounded overflow-hidden bg-black mb-2">
          <video ref={videoRef} playsInline muted className="w-full h-auto opacity-70" />
          <canvas ref={overlayRef} className="absolute inset-0 w-full h-full" />
          {/* Hidden evidence canvas */}
          <canvas ref={canvasRef} className="hidden" />
          {paused && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-center p-3">
              <div>
                <div className="text-white font-semibold mb-2">Assessment Paused</div>
                <div className="text-white/80 text-xs mb-3">Too many violations detected. Please ensure proper conditions and resume.</div>
                <Button size="sm" onClick={() => { setPaused(false); scheduleChecks(); }}>I Understand, Resume</Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Warnings</span>
          <span className="font-medium text-foreground">{warnings}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {!enabled ? (
            <Button size="sm" className="w-full" onClick={start}>Enable Camera</Button>
          ) : (
            <Button size="sm" variant="outline" className="w-full" onClick={stop}>Stop</Button>
          )}
        </div>
      </div>
    </div>
  );
}
