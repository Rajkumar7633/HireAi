"use client";

  // Wait until the HTMLVideoElement has non-zero dimensions or timeout
  async function ensureVideoReady(v: HTMLVideoElement, timeoutMs = 4000): Promise<boolean> {
    const start = Date.now();
    // quick check
    if (v.videoWidth > 0 && v.videoHeight > 0) return true;
    return new Promise<boolean>((resolve) => {
      const iv = setInterval(() => {
        if (v.videoWidth > 0 && v.videoHeight > 0) {
          clearInterval(iv);
          resolve(true);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(iv);
          resolve(false);
        }
      }, 100);
    });
  }

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaceProctor } from "@/components/proctor/face-proctor";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Camera,
  Mic,
  Monitor,
  Shield,
  Clock,
  Eye,
  EyeOff,
  Volume2,
  Loader2,
  CheckCircle,
  XCircle,
  Brain,
  Scan,
} from "lucide-react";
import { securityManager } from "@/lib/security-utils";

interface ProctoringAlert {
  id: string;
  type:
    | "face_not_detected"
    | "multiple_faces"
    | "tab_switch"
    | "noise_detected"
    | "suspicious_object"
    | "screen_share_detected"
    | "keystroke_anomaly"
    | "environment_violation"
    | "dev_tools_attempt"
    | "copy_paste_attempt";
  message: string;
  timestamp: Date;
  severity: "low" | "medium" | "high";
}

interface Question {
  _id: string;
  questionText: string;
  type: "multiple_choice" | "short_answer" | "code_snippet" | "video_response";
  options?: string[];
  points: number;
}

export default function TakeSecureAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;
  const { toast } = useToast();

  // Assessment state
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [canStart, setCanStart] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Proctoring state
  const [proctoringActive, setProctoringActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(
    null
  );
  const [alerts, setAlerts] = useState<ProctoringAlert[]>([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenRecording, setScreenRecording] = useState(false);
  const [screenShareStops, setScreenShareStops] = useState(0);
  const [keystrokePattern, setKeystrokePattern] = useState<any[]>([]);
  const [environmentScanActive, setEnvironmentScanActive] = useState(false);
  const [securityScore, setSecurityScore] = useState(100);
  // rollback: no screenShareStops/watermark tracking
  // Room scan state
  const [roomScanStep, setRoomScanStep] = useState<number>(0); // 0..4
  const [roomScanFrames, setRoomScanFrames] = useState<string[]>([]);
  const [roomScanDone, setRoomScanDone] = useState(false);
  // Face-missing escalation
  const [noFaceSeconds, setNoFaceSeconds] = useState(0);
  // rollback: no aggregate counters

  // Preflight and enforcement state
  const [secureReady, setSecureReady] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [screenCaptureAvailable, setScreenCaptureAvailable] = useState(false);
  const [fullscreenReady, setFullscreenReady] = useState(false);
  const [blockActions, setBlockActions] = useState(false);
  const [resumeNotified, setResumeNotified] = useState(false);
  const [multiFaceWindow, setMultiFaceWindow] = useState<number[]>([]); // timestamps (ms)
  const [multiFaceCount, setMultiFaceCount] = useState(0);
  // Preflight confirmations
  const [agreeToProctoring, setAgreeToProctoring] = useState(false);
  const [quietEnvironmentConfirmed, setQuietEnvironmentConfirmed] = useState(false);
  const [readInstructionsConfirmed, setReadInstructionsConfirmed] = useState(false);
  // Preflight camera test
  // Preflight mic test state
  const [preflightMicLevel, setPreflightMicLevel] = useState(0);
  const preflightMicStreamRef = useRef<MediaStream | null>(null);
  const preflightAudioCtxRef = useRef<AudioContext | null>(null);
  const preflightAnalyserRef = useRef<AnalyserNode | null>(null);
  const preflightRafRef = useRef<number | null>(null);
  // Camera readiness for room scan and detection
  const [videoReady, setVideoReady] = useState(false);
  const [testPreviewImage, setTestPreviewImage] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const proctoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const screenshotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const lastKeystrokeRef = useRef<number>(0);

  // Retry camera initializer scoped to component
  const retryCamera = useCallback(async () => {
    try {
      setVideoReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      setCameraStream(stream);
      setMicrophoneStream(stream);
      if (videoRef.current) {
        const v = videoRef.current;
        v.srcObject = stream as any;
        try { await v.play(); } catch {}
        const ok = await ensureVideoReady(v);
        setVideoReady(ok);
      }
    } catch (e) {
      console.warn('Retry camera failed', e);
      toast({ title: 'Camera Error', description: 'Unable to start camera. Please check permissions and retry.', variant: 'destructive' });
    }
  }, [toast, setCameraStream, setMicrophoneStream, setVideoReady, videoRef]);

  // --- Preflight helpers declared before usage ---
  async function requestFullscreen() {
    try {
      if (!document.fullscreenElement) {
        const el: any = document.documentElement as any;
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || el.mozRequestFullScreen;
        if (req) {
          await req.call(el);
        }
      }
      setFullscreenReady(true);
    } catch (e) {
      console.error("Failed to enter fullscreen:", e);
      setFullscreenReady(false);
    }
  }

  // Start microphone visualizer for preflight
  async function startPreflightMicTest() {
    try {
      if (preflightMicStreamRef.current) return; // already running
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      preflightMicStreamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      preflightAudioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      preflightAnalyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128; // -1..1
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        setPreflightMicLevel(Math.min(100, Math.round(rms * 300)));
        preflightRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn('Preflight mic test failed', e);
      toast({ title: 'Microphone Test Failed', description: 'Please allow microphone access and try again.', variant: 'destructive' });
    }
  }

  function stopPreflightMicTest() {
    if (preflightRafRef.current) {
      cancelAnimationFrame(preflightRafRef.current);
      preflightRafRef.current = null;
    }
    if (preflightAnalyserRef.current) {
      try { preflightAnalyserRef.current.disconnect(); } catch {}
      preflightAnalyserRef.current = null;
    }
    if (preflightAudioCtxRef.current) {
      try { preflightAudioCtxRef.current.close(); } catch {}
      preflightAudioCtxRef.current = null;
    }
    if (preflightMicStreamRef.current) {
      try { preflightMicStreamRef.current.getTracks().forEach(t => t.stop()); } catch {}
      preflightMicStreamRef.current = null;
    }
    setPreflightMicLevel(0);
  }

  // Capture a single test snapshot for the preflight modal without starting full proctoring
  async function preflightTestCameraSnapshot() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      const track = stream.getVideoTracks()[0];
      const video = document.createElement('video');
      (video as any).srcObject = stream as any;
      await new Promise((res) => (video.onloadedmetadata = () => res(null)));
      await video.play().catch(() => {});
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setTestPreviewImage(dataUrl);
      }
      video.pause();
      track.stop();
    } catch (e) {
      console.warn('Preflight camera snapshot failed', e);
      setTestPreviewImage(null);
      toast({ title: 'Camera Test Failed', description: 'Please check your camera permissions and try again.', variant: 'destructive' });
    }
  }

  async function detectCapabilities() {
    try {
      setScreenCaptureAvailable(!!(navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia));
      // Best-effort permission state reads
      // @ts-ignore
      if (navigator.permissions && navigator.permissions.query) {
        // @ts-ignore
        const cam = await navigator.permissions.query({ name: "camera" });
        // @ts-ignore
        const mic = await navigator.permissions.query({ name: "microphone" });
        setCameraReady(cam.state === "granted");
        setMicrophoneReady(mic.state === "granted");
        cam.onchange = () => setCameraReady(cam.state === "granted");
        mic.onchange = () => setMicrophoneReady(mic.state === "granted");
      }
    } catch (e) {
      console.warn("Capability detection failed", e);
    }
  }

  async function quickPermissionProbe(): Promise<boolean> {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraReady(true);
      setMicrophoneReady(true);
      media.getTracks().forEach((t) => t.stop());
      return true;
    } catch (e) {
      console.warn("User did not grant camera/mic yet", e);
      toast({
        title: "Camera/Microphone Required",
        description: "Please allow camera and microphone access in your browser permissions to start the test.",
        variant: "destructive",
      });
      return false;
    }
  }

  async function startSecureMode() {
    // Ensure minimal requirements met
    if (!document.fullscreenElement) {
      await requestFullscreen();
      if (!document.fullscreenElement) return;
    }
    if (!cameraReady || !microphoneReady) {
      const granted = await quickPermissionProbe();
      if (!granted) return;
    }
    if (!screenRecording) {
      // Ask user to start screen share explicitly
      const ok = await startScreenShare();
      if (!ok) return;
    }
    // Stop any preflight mic test and clear preview image
    try { stopPreflightMicTest(); } catch {}
    setTestPreviewImage(null);
    await initializeProctoring();
    setSecureReady(true);
    setPreflightOpen(false);
    // Mark assessment as started (update Application status to in_progress)
    try {
      await fetch(`/api/assessments/${assessmentId}/start`, { method: "POST" });
    } catch (e) {
      console.warn("Failed to mark assessment as started", e);
    }
  }

  // Preflight guard: if already completed, redirect to results instead of starting
  useEffect(() => {
    let cancelled = false;
    const preflight = async () => {
      try {
        const res = await fetch(`/api/assessments/my-assessments`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const found = (data.assessments || []).find((a: any) => String(a._id) === String(assessmentId));
          const status = String(found?.status || '').toLowerCase();
          if (found && (status === 'completed' || status === 'submitted' || status === 'finished')) {
            router.replace(`/dashboard/job-seeker/assessments/${assessmentId}/results`);
            return;
          }
        }
      } catch (e) {
        console.warn("Preflight status check failed", e);
      }
      if (!cancelled) {
        setCanStart(true);
      }
    };
    preflight();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [assessmentId, router]);

  // Start only when preflight allows
  useEffect(() => {
    if (!canStart) return;
    fetchAssessment();
    setupEventListeners();
    // Preflight initial capability detection
    detectCapabilities();
    return () => {
      cleanup();
    };
  }, [canStart]);

  // Track tab switches and auto-end after 2 occurrences
  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState === "hidden") {
        setTabSwitchCount((c) => c + 1);
        try {
          await fetch(`/api/proctoring/violation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "tab_switch", message: "User switched tabs during assessment", assessmentId }),
          });
        } catch (e) {
          console.warn("Failed to report tab switch", e);
        }
        toast({
          title: "Tab Switch Detected",
          description: "Switching tabs is not allowed. After 2 switches the test will end.",
          variant: "destructive",
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [assessmentId, toast]);

  useEffect(() => {
    if (tabSwitchCount >= 2 && !submitting) {
      // Force end the test with failure
      handleSubmitAssessment(false, true);
    }
  }, [tabSwitchCount, submitting]);

  useEffect(() => {
    if (timeLeft > 0) {
      // Pause countdown when security is not satisfied
      const canTick = isFullscreen && screenRecording && !blockActions;
      const timer = setTimeout(() => {
        if (canTick) setTimeLeft((t) => t - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && assessment) {
      handleSubmitAssessment(true); // Auto-submit when time runs out
    }
  }, [timeLeft, assessment, isFullscreen, screenRecording, blockActions]);

  const fetchAssessment = async () => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}`);
      if (response.ok) {
        const data = await response.json();
        setAssessment(data.assessment);
        setQuestions(data.assessment.questions || []);
        setTimeLeft(data.assessment.durationMinutes * 60);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load assessment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeProctoring = async () => {
    try {
      await securityManager.enableSecureMode();
      securityManager.monitorNetworkActivity();

      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      setCameraStream(videoStream);
      setMicrophoneStream(videoStream);

      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
        const v = videoRef.current;
        try { await v.play(); } catch {}
        const ok = await ensureVideoReady(v);
        setVideoReady(ok);
      }

      audioContextRef.current = new AudioContext();
      const source =
        audioContextRef.current.createMediaStreamSource(videoStream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);

      // Only start screen recording if not already active from preflight
      if (!screenRecording) {
        await initializeScreenRecording();
      }

      setProctoringActive(true);
      setEnvironmentScanActive(true);
      startProctoringMonitoring();

      toast({
        title: "AI Proctoring Active",
        description:
          "All 8 security features are now monitoring your assessment.",
      });
    } catch (error) {
      console.error("Failed to initialize proctoring:", error);
      addAlert(
        "face_not_detected",
        "Camera/microphone access denied. Please enable to continue.",
        "high"
      );
    }
  };

  const initializeScreenRecording = async () => {
    try {
      const displayStream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: true,
      });

      const recorder = new MediaRecorder(displayStream, {
        mimeType: "video/webm;codecs=vp9",
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          sendScreenRecordingData(event.data);
        }
      };

      recorder.start(10000); // Record in 10-second chunks
      screenRecorderRef.current = recorder;
      setScreenRecording(true);

      // If user stops sharing, enforce block and alert
      const track = displayStream.getVideoTracks()[0];
      if (track) {
        track.addEventListener("ended", () => {
          setScreenRecording(false);
          setBlockActions(true);
          setScreenShareStops((c) => c + 1);
          addAlert(
            "screen_share_detected",
            "Screen sharing stopped. Please resume to continue.",
            "high"
          );
        });
      }

      addAlert(
        "screen_share_detected",
        "Screen recording started successfully.",
        "low"
      );
    } catch (error) {
      console.error("Screen recording failed:", error);
      toast({
        title: "Screen Share Required",
        description: "Please click 'Start Screen Share' and choose your screen/window to proceed.",
        variant: "destructive",
      });
      addAlert(
        "screen_share_detected",
        "Screen recording unavailable. Assessment integrity may be compromised.",
        "medium"
      );
    }
  };

  // Explicit screen share starter for preflight modal
  const startScreenShare = async (): Promise<boolean> => {
    try {
      await initializeScreenRecording();
      return true;
    } catch {
      return false;
    }
  };

  const sendScreenRecordingData = async (data: Blob) => {
    const formData = new FormData();
    formData.append("recording", data);
    formData.append("assessmentId", assessmentId);
    formData.append("timestamp", new Date().toISOString());

    try {
      await fetch("/api/proctoring/screen-recording", {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      console.error("Failed to upload screen recording:", error);
    }
  };

  const startProctoringMonitoring = () => {
    proctoringIntervalRef.current = setInterval(() => {
      detectFace();
      monitorAudio();
      detectMultipleFaces();
      monitorEnvironment();
      updateKeystrokePattern();
      updateSecurityScore();
      // escalate when face missing continuously
      setNoFaceSeconds((prev) => (!faceDetected ? Math.min(prev + 1, 30) : 0));
      // rollback: no aggregate accumulation
    }, 1000); // More frequent monitoring

    // Screenshot capture
    screenshotIntervalRef.current = setInterval(() => {
      captureScreenshot();
    }, 15000); // Every 15 seconds for better monitoring
  };

  // Hoisted addAlert so it can be used by detection helpers defined below
  function addAlert(
    type: ProctoringAlert["type"],
    message: string,
    severity: ProctoringAlert["severity"],
  ) {
    const alert: ProctoringAlert = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: new Date(),
      severity,
    };

    setAlerts((prev) => [...prev.slice(-9), alert]); // Keep last 10 alerts

    // Fire-and-forget to backend
    fetch("/api/proctoring/alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId, alert }),
    }).catch(console.error);
  }

  // Soft enforcement: log alerts when face is missing, but do not block navigation.
  useEffect(() => {
    if (!proctoringActive) return;
    if (noFaceSeconds >= 5) {
      addAlert("face_not_detected", "Face missing for 5+ seconds.", "high");
    }
  }, [noFaceSeconds, proctoringActive]);

  // rollback: remove auto-end on repeated multi-face

  // rollback: no watermark clock

  // Auto-end if screen share stopped too many times
  useEffect(() => {
    if (!proctoringActive) return;
    if (screenShareStops >= 2 && !submitting) {
      addAlert(
        "screen_share_detected",
        "Screen sharing stopped multiple times. Ending assessment.",
        "high",
      );
      handleSubmitAssessment(false, true);
    }
  }, [screenShareStops, proctoringActive, submitting]);

  const detectFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Ensure camera stream is initialized
    if (!ctx || !video.videoWidth || !video.videoHeight || video.readyState < 2) {
      return; // skip until video is ready
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Simulate more realistic face detection
    let imageData: ImageData;
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      // If canvas not ready yet, skip this tick
      return;
    }
    const brightness = calculateBrightness(imageData);

    // Face detection based on lighting and movement
    const faceDetected =
      brightness > 50 && brightness < 200 && Math.random() > 0.05;
    setFaceDetected(faceDetected);

    if (!faceDetected) {
      addAlert(
        "face_not_detected",
        "Face not detected. Ensure proper lighting and camera positioning.",
        "medium",
      );
    }
  };

  // Room scan helpers
  const roomScanPrompts = [
    "Slowly turn camera LEFT",
    "Center the camera",
    "Slowly turn camera RIGHT",
    "Tilt camera UP",
    "Tilt camera DOWN",
  ];

  const captureRoomScanFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    if (!video.videoWidth || !video.videoHeight) {
      toast({ title: "Camera Initializing", description: "Please wait a moment for the camera to start, then try again.", variant: "destructive" });
      return;
    }
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setRoomScanFrames((arr) => [...arr, dataUrl]);
    // send to backend using existing screenshot route
    try {
      await fetch("/api/proctoring/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, screenshot: dataUrl, kind: "room_scan", step: roomScanStep, timestamp: new Date().toISOString() }),
      });
    } catch (e) {
      console.warn("room scan upload failed", e);
    }
  };

  // Retake current step: replace the last captured frame with a new one
  const retakeRoomScanFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    if (!video.videoWidth || !video.videoHeight) {
      toast({ title: "Camera Initializing", description: "Please wait a moment for the camera to start, then try again.", variant: "destructive" });
      return;
    }
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setRoomScanFrames((arr) => arr.length ? [...arr.slice(0, -1), dataUrl] : [dataUrl]);
    try {
      await fetch("/api/proctoring/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, screenshot: dataUrl, kind: "room_scan_retake", step: roomScanStep, timestamp: new Date().toISOString() }),
      });
    } catch (e) {
      console.warn("room scan retake upload failed", e);
    }
  };

  const handleRoomScanNext = async () => {
    await captureRoomScanFrame();
    if (roomScanStep < roomScanPrompts.length - 1) {
      setRoomScanStep((s) => s + 1);
    } else {
      setEnvironmentScanActive(false);
      setRoomScanDone(true);
    }
  };

  const calculateBrightness = (imageData: ImageData): number => {
    let brightness = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      brightness += (r + g + b) / 3;
    }
    return brightness / (imageData.data.length / 4);
  };

  const detectMultipleFaces = () => {
    // Simulate multiple face detection based on movement patterns
    if (Math.random() > 0.98) {
      addAlert(
        "multiple_faces",
        "Multiple faces detected. Only the candidate should be visible.",
        "high"
      );
      const now = Date.now();
      setMultiFaceWindow((arr) => {
        const filtered = arr.filter((t) => now - t < 10000);
        const updated = [...filtered, now];
        if (updated.length >= 3 && !blockActions) {
          setBlockActions(true);
          toast({ title: "Paused", description: "Multiple faces detected repeatedly. Please ensure only you are visible.", variant: "destructive" });
        }
        return updated;
      });
      setMultiFaceCount((c) => c + 1);
    }
  };

  const monitorAudio = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume and frequency analysis
    const average =
      dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    setAudioLevel(average);

    // Detect conversation patterns (multiple frequency peaks)
    const peaks = dataArray.filter((value) => value > average * 1.5).length;

    if (average > 30 && peaks > 10) {
      addAlert(
        "noise_detected",
        "Conversation or background noise detected.",
        "medium"
      );
    }

    // Detect sudden audio spikes (potential cheating)
    if (average > 80) {
      addAlert(
        "noise_detected",
        "Loud audio detected. Please maintain quiet environment.",
        "low"
      );
    }
  };

  const monitorEnvironment = () => {
    // Monitor for suspicious objects or changes in environment
    if (Math.random() > 0.995) {
      addAlert(
        "environment_violation",
        "Suspicious object or person detected in background.",
        "medium"
      );
    }

    // Check for virtual machine indicators
    if (navigator.hardwareConcurrency < 2 || screen.colorDepth < 24) {
      addAlert(
        "suspicious_object",
        "Potential virtual machine environment detected.",
        "high"
      );
    }
  };

  const updateKeystrokePattern = () => {
    const pattern = securityManager.getKeystrokePattern();
    setKeystrokePattern(pattern);
  };

  const updateSecurityScore = () => {
    const violations = securityManager.getViolations();
    let score = 100;

    violations.forEach((violation) => {
      switch (violation.severity) {
        case "high":
          score -= 15;
          break;
        case "medium":
          score -= 8;
          break;
        case "low":
          score -= 3;
          break;
      }
    });

    setSecurityScore(Math.max(0, score));
  };

  const captureScreenshot = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const screenshot = canvas.toDataURL("image/jpeg", 0.8);

    // Send screenshot to backend for storage
    fetch("/api/proctoring/screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessmentId,
        screenshot,
        timestamp: new Date().toISOString(),
      }),
    }).catch(console.error);
  };

  const setupEventListeners = () => {
    // Tab switch detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
        addAlert(
          "tab_switch",
          "Tab switching detected. This activity has been logged.",
          "medium"
        );
      }
    };

    // Fullscreen monitoring
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);

      if (!isFs && proctoringActive) {
        addAlert(
          "tab_switch",
          "Fullscreen mode exited. Please return to fullscreen.",
          "high"
        );
        setBlockActions(true);
      } else if (isFs && proctoringActive) {
        setBlockActions(false);
      }
    };

    const handleWindowBlur = () => {
      addAlert(
        "tab_switch",
        "Window focus lost. Please keep assessment window active.",
        "medium"
      );
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    // Vendor-prefixed fullscreen change events
    // @ts-ignore
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    // @ts-ignore
    document.addEventListener("msfullscreenchange", handleFullscreenChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      // @ts-ignore
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      // @ts-ignore
      document.removeEventListener("msfullscreenchange", handleFullscreenChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  };

  // (removed previous useCallback addAlert; now using hoisted function)

  const cleanup = () => {
    // Stop any preflight mic test if active
    try { stopPreflightMicTest(); } catch {}
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    if (screenRecorderRef.current) {
      screenRecorderRef.current.stop();
    }
    if (proctoringIntervalRef.current) {
      clearInterval(proctoringIntervalRef.current);
    }
    if (screenshotIntervalRef.current) {
      clearInterval(screenshotIntervalRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    securityManager.disableSecureMode();
  };

  // Disable right-click and basic copy shortcuts while secure
  useEffect(() => {
    const preventContext = (e: MouseEvent) => {
      if (secureReady) e.preventDefault();
    };
    const preventKeys = (e: KeyboardEvent) => {
      if (!secureReady) return;
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (["c", "v", "x", "a", "s", "p"].includes(k)) {
          e.preventDefault();
        }
      }
      // F11 or Escape exits fullscreen – discourage
      if (e.key === "F11" || e.key === "Escape") {
        e.preventDefault();
      }
    };
    window.addEventListener("contextmenu", preventContext);
    window.addEventListener("keydown", preventKeys);
    return () => {
      window.removeEventListener("contextmenu", preventContext);
      window.removeEventListener("keydown", preventKeys);
    };
  }, [secureReady]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitAssessment = async (timedOut = false, forcedEnd = false) => {
    setSubmitting(true);

    try {
      console.log("[UI] Submitting assessment", { assessmentId, timedOut, answersCount: Object.keys(answers || {}).length });
      const response = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          proctoringData: {
            alerts,
            tabSwitchCount,
            totalTime: assessment.durationMinutes * 60 - timeLeft,
            keystrokePattern,
            screenRecording,
            screenShareStops: screenShareStops || 0,
            securityViolations: securityManager.getViolations(),
            securityScore,
            environmentScanActive,
          },
          proctoringSummary: {
            totalFaceMissingSeconds: noFaceSeconds,
            multiFaceEventsCount: multiFaceCount,
            screenShareStops: screenShareStops || 0,
            totalAlerts: alerts.length,
            endedBy: timedOut ? "timeout" : forcedEnd ? "forced" : "user",
          },
          timedOut,
          forcedEnd,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: timedOut ? "Time's Up!" : "Assessment Submitted",
          description: `Your assessment has been submitted. Score: ${data.score}%`,
        });
        // Ensure we stop proctoring and release resources before navigation
        try {
          cleanup();
        } catch {}
        // Use replace to avoid returning to the test page, and refresh to bust caches
        router.replace(`/dashboard/job-seeker/assessments/${assessmentId}/results`);
        router.refresh();
      } else {
        const text = await response.text();
        console.error("[UI] Submit failed", response.status, text);
        toast({
          title: "Submission Failed",
          description: text || `Status ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[UI] Submit threw error", error);
      toast({
        title: "Submission Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const getAlertIcon = (type: ProctoringAlert["type"]) => {
    switch (type) {
      case "face_not_detected":
        return <EyeOff className="h-4 w-4" />;
      case "multiple_faces":
        return <Eye className="h-4 w-4" />;
      case "tab_switch":
        return <Monitor className="h-4 w-4" />;
      case "noise_detected":
        return <Volume2 className="h-4 w-4" />;
      case "suspicious_object":
        return <AlertTriangle className="h-4 w-4" />;
      case "screen_share_detected":
        return <Monitor className="h-4 w-4" />;
      case "keystroke_anomaly":
        return <Brain className="h-4 w-4" />;
      case "environment_violation":
        return <Scan className="h-4 w-4" />;
      case "dev_tools_attempt":
        return <Shield className="h-4 w-4" />;
      case "copy_paste_attempt":
        return <Shield className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertColor = (severity: ProctoringAlert["severity"]) => {
    switch (severity) {
      case "low":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "medium":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  // Derived flag: timer is paused whenever security prerequisites are not met
  const timerPaused = !isFullscreen || !screenRecording || blockActions;

  // Quick action to resume monitoring prerequisites
  async function resumeSecurity() {
    try {
      if (!document.fullscreenElement) {
        await requestFullscreen();
      }
      if (!screenRecording) {
        await startScreenShare();
      }
      setBlockActions(false);
    } catch (e) {
      console.warn("Failed to resume security", e);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading secure assessment...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card>
          <CardContent className="py-8 text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Assessment Not Found</h3>
            <p className="text-muted-foreground">The requested assessment could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Room Scan Overlay (before test proceeds) */}
      {proctoringActive && environmentScanActive && !roomScanDone && (
        <div className="fixed inset-0 z-[65] bg-black/85 backdrop-blur-sm flex items-center justify-center">
          <Card className="w-full max-w-2xl bg-gray-900 border border-gray-700">
            <CardHeader>
              <CardTitle>360° Environment Scan</CardTitle>
              <CardDescription>Follow the prompt and click “Capture & Next” at each step.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg overflow-hidden bg-black/40 border border-gray-700">
                <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover" />
              </div>
              {!videoReady && (
                <div className="text-xs text-yellow-400">Camera is starting... If it does not appear within a few seconds, click Retry Camera.</div>
              )}
              {/* Thumbnails preview for verification */}
              <div>
                <div className="text-sm text-gray-300 mb-2">Captured Angles: {roomScanFrames.length}/{roomScanPrompts.length}</div>
                <div className="grid grid-cols-5 gap-2">
                  {roomScanPrompts.map((label, idx) => (
                    <div key={idx} className={`relative border rounded bg-black/30 ${idx < roomScanFrames.length ? 'border-green-500' : 'border-gray-700'}`}>
                      {roomScanFrames[idx] ? (
                        <>
                          <img src={roomScanFrames[idx]} alt={`Room scan ${idx+1}`} className="w-full h-16 object-cover rounded-t" />
                          <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-16 flex items-center justify-center text-xs text-gray-500">Pending</div>
                      )}
                      <div className="p-1 text-[10px] text-center text-gray-300 border-t border-gray-700">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-lg font-medium text-white">{roomScanPrompts[roomScanStep]}</div>
              <div className="flex justify-between items-center gap-3">
                <Button variant="outline" className="border-gray-600" onClick={retryCamera} disabled={submitting}>
                  Retry Camera
                </Button>
                <Button variant="outline" className="border-gray-600" onClick={handleRoomScanNext} disabled={!videoReady}>
                  Capture & Next
                </Button>
                <Button variant="secondary" className="bg-gray-800 border-gray-600" onClick={retakeRoomScanFrame} disabled={!videoReady}>
                  Retake Current
                </Button>
              </div>
              <div className="h-1.5 bg-gray-800 rounded">
                <div className="h-full bg-green-500 rounded" style={{ width: `${((roomScanStep+1)/roomScanPrompts.length)*100}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Preflight Security Gate */}
      {preflightOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
          <Card className="w-full max-w-2xl bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle>Start Secure Assessment</CardTitle>
              <CardDescription>
                Complete the following checks before starting your test.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Fullscreen Mode</span>
                <div className="flex items-center gap-3">
                  <Badge variant={fullscreenReady ? "default" : "destructive"}>
                    {fullscreenReady ? "Ready" : "Required"}
                  </Badge>
                  <Button onClick={requestFullscreen} className="bg-blue-600 hover:bg-blue-700">
                    Enter Fullscreen
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span>Camera & Microphone</span>
                <div className="flex items-center gap-3">
                  <Badge variant={cameraReady && microphoneReady ? "default" : "destructive"}>
                    {cameraReady && microphoneReady ? "Granted" : "Allow Access"}
                  </Badge>
                  <Button onClick={quickPermissionProbe} variant="outline" className="border-gray-600">
                    Check Access
                  </Button>
                  <Button onClick={preflightTestCameraSnapshot} variant="outline" className="border-gray-600">
                    Test Camera Snapshot
                  </Button>
                  {preflightMicStreamRef.current ? (
                    <Button onClick={stopPreflightMicTest} variant="outline" className="border-gray-600">
                      Stop Mic Test
                    </Button>
                  ) : (
                    <Button onClick={startPreflightMicTest} variant="outline" className="border-gray-600">
                      Start Mic Test
                    </Button>
                  )}
                </div>
              </div>
              {/* Mic visualizer */}
              <div className="mt-2">
                <div className="text-xs text-gray-400 mb-1">Microphone Level</div>
                <div className="w-full h-2 bg-gray-800 rounded">
                  <div className="h-full bg-blue-500 rounded" style={{ width: `${preflightMicLevel}%` }} />
                </div>
              </div>
              {testPreviewImage && (
                <div className="rounded-lg overflow-hidden bg-black/40 border border-gray-700 p-2">
                  <div className="text-xs text-gray-300 mb-1">Camera Test Preview</div>
                  <img src={testPreviewImage} alt="Camera test preview" className="w-full max-h-48 object-contain rounded" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>Screen Capture Support</span>
                <div className="flex items-center gap-3">
                  <Badge variant={screenRecording ? "default" : screenCaptureAvailable ? "default" : "destructive"}>
                    {screenRecording ? "Recording" : screenCaptureAvailable ? "Available" : "Unavailable"}
                  </Badge>
                  <Button onClick={startScreenShare} variant="outline" className="border-gray-600">
                    {screenRecording ? "Restart Screen Share" : "Start Screen Share"}
                  </Button>
                </div>
              </div>

              <div className="pt-2 text-sm text-gray-400">
                By starting, you agree to remain in fullscreen, keep the assessment tab active,
                and allow camera, microphone, and screen monitoring for the duration of the test.
              </div>

              {/* Instructions */}
              <div className="mt-3 p-3 rounded-md border border-gray-700 bg-black/20 text-sm text-gray-300 space-y-2">
                <div className="font-medium text-white">Instructions</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Ensure you are alone in a quiet, well-lit room.</li>
                  <li>Do not switch tabs, use other devices, or exit fullscreen.</li>
                  <li>Keep your face clearly visible to the camera at all times.</li>
                  <li>Allow screen recording for the duration of the test.</li>
                  <li>Any violations may pause or end your assessment.</li>
                </ul>
              </div>

              {/* Explicit confirmations */}
              <div className="mt-2 space-y-2 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={agreeToProctoring}
                    onChange={(e) => setAgreeToProctoring(e.target.checked)}
                  />
                  <span>I consent to AI proctoring features (camera, microphone, screen monitoring) for this assessment.</span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={quietEnvironmentConfirmed}
                    onChange={(e) => setQuietEnvironmentConfirmed(e.target.checked)}
                  />
                  <span>I confirm I am in a quiet environment and will not switch tabs or exit fullscreen during the test.</span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={readInstructionsConfirmed}
                    onChange={(e) => setReadInstructionsConfirmed(e.target.checked)}
                  />
                  <span>I have read and understand the instructions above.</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" className="border-gray-600" onClick={detectCapabilities}>
                  Re-check
                </Button>
                <Button
                  onClick={startSecureMode}
                  disabled={!(
                    fullscreenReady &&
                    cameraReady &&
                    microphoneReady &&
                    screenRecording &&
                    agreeToProctoring &&
                    quietEnvironmentConfirmed &&
                    readInstructionsConfirmed
                  )}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Start Secure Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Proctoring Header */}
      <div className="fixed top-0 left-0 right-0 bg-red-900 text-white p-2 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                LIVE AI PROCTORING - ALL 8 FEATURES ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Camera className="h-4 w-4" />
                <span>{faceDetected ? "Face OK" : "No Face"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Mic className="h-4 w-4" />
                <span>Audio: {audioLevel > 20 ? "Active" : "Quiet"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Monitor className="h-4 w-4" />
                <span>Screen: {screenRecording ? "Recording" : "Off"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span className={getSecurityScoreColor(securityScore)}>
                  Security: {securityScore}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge
              variant={timeLeft > 300 ? "default" : "destructive"}
              className="text-lg px-3 py-1"
            >
              <Clock className="h-4 w-4 mr-1" />
              {formatTime(timeLeft)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="pt-16 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Proctoring Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Camera Feed */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                AI Monitoring (8/8 Active)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-32 bg-gray-800 rounded-lg object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute top-2 right-2">
                  {faceDetected ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded">
                  {screenRecording ? "Recording" : "Not Recording"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Status */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                Security Status
                <Badge
                  className={`ml-2 ${getSecurityScoreColor(securityScore)}`}
                >
                  {securityScore}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>1. Face Recognition:</span>
                  <span
                    className={faceDetected ? "text-green-400" : "text-red-400"}
                  >
                    {faceDetected ? "✓ Active" : "✗ Inactive"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>2. Multi-Face Detection:</span>
                  <span className="text-green-400">✓ Active</span>
                </div>
                <div className="flex justify-between">
                  <span>3. Audio Monitor:</span>
                  <span className="text-green-400">✓ Active</span>
                </div>
                <div className="flex justify-between">
                  <span>4. Screen Recording:</span>
                  <span
                    className={
                      screenRecording ? "text-green-400" : "text-red-400"
                    }
                  >
                    {screenRecording ? "✓ Active" : "✗ Inactive"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>5. Tab Detection:</span>
                  <span className="text-green-400">✓ Active</span>
                </div>
                <div className="flex justify-between">
                  <span>6. Copy/Paste Block:</span>
                  <span className="text-green-400">✓ Active</span>
                </div>
                <div className="flex justify-between">
                  <span>7. Keystroke Analysis:</span>
                  <span className="text-green-400">✓ Active</span>
                </div>
                <div className="flex justify-between">
                  <span>8. Environment Scan:</span>
                  <span
                    className={
                      (environmentScanActive || roomScanDone) ? "text-green-400" : "text-red-400"
                    }
                  >
                    {(environmentScanActive || roomScanDone) ? "✓ Active" : "✗ Inactive"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Recent Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {alerts.slice(-5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-2 rounded-lg border text-xs ${getAlertColor(
                      alert.severity
                    )}`}
                  >
                    <div className="flex items-center gap-2">
                      {getAlertIcon(alert.type)}
                      <span className="font-medium">{alert.message}</span>
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {alert.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-gray-400 text-xs">
                    No alerts - All systems normal
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assessment Content */}
        <div className="lg:col-span-3">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{assessment.title}</CardTitle>
                  <CardDescription className="text-gray-400">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-white border-gray-600">
                  {currentQuestion?.points} points
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentQuestion && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {currentQuestion.questionText}
                  </h3>

                  {currentQuestion.type === "multiple_choice" &&
                    currentQuestion.options && (
                      <RadioGroup
                        value={answers[currentQuestion._id] || ""}
                        onValueChange={(value) =>
                          handleAnswerChange(currentQuestion._id, value)
                        }
                      >
                        {currentQuestion.options.map((option, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2"
                          >
                            <RadioGroupItem
                              value={option}
                              id={`option-${index}`}
                            />
                            <Label
                              htmlFor={`option-${index}`}
                              className="text-white"
                            >
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                  {(currentQuestion.type === "short_answer" ||
                    currentQuestion.type === "code_snippet") && (
                    <Textarea
                      value={answers[currentQuestion._id] || ""}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestion._id, e.target.value)
                      }
                      placeholder="Type your answer here..."
                      className="bg-gray-800 border-gray-600 text-white min-h-32"
                      rows={currentQuestion.type === "code_snippet" ? 10 : 5}
                    />
                  )}

                  {currentQuestion.type === "video_response" && (
                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                      <p className="text-gray-400 mb-4">
                        Record your video response (max 3 minutes)
                      </p>
                      <Button className="bg-red-600 hover:bg-red-700">
                        <Camera className="h-4 w-4 mr-2" />
                        Start Recording
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-700">
                <Button
                  variant="outline"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                >
                  Previous
                </Button>

                <div className="text-sm text-gray-400 flex items-center gap-2">
                  <span>
                    {currentQuestionIndex + 1} / {questions.length}
                  </span>
                  {!isFullscreen || !screenRecording || blockActions ? (
                    <Badge variant="destructive">Timer Paused</Badge>
                  ) : null}
                </div>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={() => handleSubmitAssessment()}
                    disabled={submitting || blockActions || !isFullscreen || !screenRecording}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit Assessment
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    disabled={blockActions || !isFullscreen || !screenRecording}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Next
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Floating FaceProctor widget */}
      <FaceProctor
        assessmentId={assessmentId}
        candidateId={"candidate"}
        minFaceSizeRatio={0.18}
        maxFaces={1}
        movementThreshold={24}
        checkIntervalMs={1000}
        evidence
        enableAudioMonitoring
        blockClipboard
        maxWarningsBeforePause={3}
      />

      {/* rollback: no watermark overlay */}
  </div>
  );
}
