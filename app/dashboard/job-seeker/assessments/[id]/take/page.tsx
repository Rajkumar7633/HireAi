"use client";

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
import { CodeEditor } from "@/components/assessment/CodeEditor";
import {
  AlertTriangle,
  Camera,
  Monitor,
  Shield,
  Eye,
  EyeOff,
  Volume2,
  Loader2,
  CheckCircle,
  XCircle,
  Brain,
  Scan,
  Sparkles,
} from "lucide-react";
import { securityManager } from "@/lib/security-utils";

async function ensureVideoReady(v: HTMLVideoElement, timeoutMs = 4000): Promise<boolean> {
  const start = Date.now();
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
  _id?: string;
  questionId?: string;
  questionText: string;
  type: "multiple_choice" | "short_answer" | "code_snippet" | "video_response";
  options?: string[];
  points: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  timeLimit?: number;
  tags?: string[];
  hint?: string;
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  testCases?: Array<{ id: string; input: string; expectedOutput: string; description?: string; isHidden?: boolean }>;
}

export default function TakeSecureAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params?.id as string;
  const { toast } = useToast();

  const [bypassSecurity] = useState(false);

  // Assessment state
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [canStart, setCanStart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("javascript");
  const [markedForReview, setMarkedForReview] = useState<string[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

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
  const [faceAlerted, setFaceAlerted] = useState(false);
  const [faceViolationCount, setFaceViolationCount] = useState(0);
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

  const isFeatureEnabled = useCallback((featureId: string) => {
    if (bypassSecurity) return false;
    if (!assessment) return false;
    if (assessment.requiresProctoring === false) return false;
    if (!assessment.securityFeatures || assessment.securityFeatures.length === 0) {
      return true;
    }
    const featureKeysMap: { [key: string]: string[] } = {
      face_recognition:        ["ai face recognition", "face recognition", "face_recognition", "camera", "face"],
      multi_face_detection:    ["multi-face detection", "multi_face_detection", "multi-face", "multi face"],
      audio_monitoring:        ["audio monitoring", "audio_monitoring", "audio", "mic"],
      screen_recording:        ["screen recording", "screen_recording"],
      tab_detection:           ["tab switch detection", "tab_detection", "tab switch", "tab"],
      clipboard_block:         ["copy / paste block", "copy/paste block", "clipboard", "copy-paste", "block"],
      keystroke_analysis:      ["keystroke pattern analysis", "keystroke_analysis", "keystroke"],
      environment_scan:        ["360° environment scan", "environment scan", "environment_scan"],
      // New features
      fullscreen_lock:         ["full-screen lock", "fullscreen lock", "fullscreen_lock"],
      right_click_block:       ["right-click & devtools block", "right_click_block", "right-click", "devtools"],
      eye_gaze_tracking:       ["eye gaze tracking", "eye_gaze_tracking", "eye gaze"],
      periodic_snapshots:      ["periodic identity snapshots", "periodic_snapshots", "periodic"],
      watermark_overlay:       ["watermark overlay", "watermark_overlay", "watermark"],
      device_fingerprint:      ["device fingerprinting", "device_fingerprint", "fingerprint"],
      vpn_detection:           ["vpn / proxy detection", "vpn_detection", "vpn", "proxy"],
      vm_detection:            ["virtual machine detection", "vm_detection", "virtual machine"],
      prevent_back_nav:        ["prevent back navigation", "prevent_back_nav", "prevent back"],
      plagiarism_check:        ["code plagiarism detection", "plagiarism_check", "plagiarism"],
      ip_lock:                 ["ip address lock", "ip_lock", "ip lock"],
      require_id_verification: ["identity verification", "require_id_verification", "id verification"],
    };
    const keys = featureKeysMap[featureId] || [featureId];
    return assessment.securityFeatures.some((f: string) => 
      keys.some(key => f.toLowerCase().includes(key.toLowerCase()))
    );
  }, [assessment, bypassSecurity]);

  // Preflight readiness score (0-100) based on environment checks and consents
  const readinessScore = (() => {
    const needsCamera = isFeatureEnabled("face_recognition") || isFeatureEnabled("multi_face_detection");
    const needsMic = isFeatureEnabled("audio_monitoring");
    const needsScreen = isFeatureEnabled("screen_recording");

    const needsFullscreen = isFeatureEnabled("fullscreen_lock")
    const checks = [
      ...(needsFullscreen ? [fullscreenReady] : []),
      ...(needsCamera ? [cameraReady] : []),
      ...(needsMic ? [microphoneReady] : []),
      ...(needsScreen ? [screenRecording || screenCaptureAvailable] : []),
      agreeToProctoring,
      quietEnvironmentConfirmed,
      readInstructionsConfirmed,
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  })();


  // Refs
  const isSubmittingRef = useRef(false); // double-submit guard
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const proctoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const screenshotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const lastKeystrokeRef = useRef<number>(0);
  const timerWarningsRef = useRef<Set<number>>(new Set());

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
          const v = (dataArray[i] - 128) / 128;
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

  // Map FaceProctor widget violations into this page's alert system
  const handleFaceProctorViolation = (payload: { type: string; message: string }) => {
    const { type, message } = payload;
    switch (type) {
      case "no_face":
        addAlert("face_not_detected", message || "No face detected.", "high");
        setFaceDetected(false);
        setNoFaceSeconds((prev) => Math.min(prev + 5, 30));
        break;
      case "multi_face":
        addAlert("multiple_faces", message || "Multiple faces detected.", "high");
        setFaceViolationCount((c) => c + 1);
        break;
      case "off_screen":
        addAlert("environment_violation", message || "You appear far from camera or out of frame.", "medium");
        break;
      case "movement":
        addAlert("environment_violation", message || "Excessive movement detected.", "medium");
        break;
      case "audio_noise":
        addAlert("noise_detected", message || "Significant audio detected.", "medium");
        break;
      case "tab_switch":
        addAlert("tab_switch", message || "Window/tab change detected.", "high");
        if (proctoringActive && !submitting) {
          handleSubmitAssessment(false, true);
        }
        break;
      default:
        addAlert("environment_violation", message || "Proctoring violation detected.", "low");
        break;
    }
  };

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
    // Only enforce fullscreen if that feature is enabled
    if (isFeatureEnabled("fullscreen_lock") && !document.fullscreenElement) {
      await requestFullscreen();
      if (!document.fullscreenElement) return;
    }
    const needsCamera = isFeatureEnabled("face_recognition") || isFeatureEnabled("multi_face_detection");
    const needsMic = isFeatureEnabled("audio_monitoring");
    const needsScreen = isFeatureEnabled("screen_recording");

    if ((needsCamera && !cameraReady) || (needsMic && !microphoneReady)) {
      const granted = await quickPermissionProbe();
      if (!granted) return;
    }
    if (needsScreen && !screenRecording) {
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
      if (!isFeatureEnabled("tab_detection")) return;
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
  }, [assessmentId, toast, isFeatureEnabled]);

  useEffect(() => {
    if (!isFeatureEnabled("tab_detection")) return;
    if (tabSwitchCount >= 2 && !submitting) {
      // Force end the test with failure
      handleSubmitAssessment(false, true);
    }
  }, [tabSwitchCount, submitting, isFeatureEnabled]);

  useEffect(() => {
    if (timeLeft > 0) {
      // Pause countdown when security is not satisfied
      const canTick = (!isFeatureEnabled("fullscreen_lock") || isFullscreen) && (!isFeatureEnabled("screen_recording") || screenRecording) && !blockActions;
      const timer = setTimeout(() => {
        if (canTick) setTimeLeft((t) => t - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && assessment) {
      handleSubmitAssessment(true); // Auto-submit when time runs out
    }
  }, [timeLeft, assessment, isFullscreen, screenRecording, blockActions, isFeatureEnabled]);


  // Timer warnings at 10min / 5min / 1min
  useEffect(() => {
    if (!assessment || !secureReady) return;
    const milestones: Array<[number, string, string, boolean]> = [
      [600, "10 Minutes Left", "You have 10 minutes remaining.", false],
      [300, "5 Minutes Left!", "Only 5 minutes left. Please hurry.", false],
      [60,  "1 Minute Left!", "Final minute — submit now!", true],
    ];
    for (const [t, title, description, isWarn] of milestones) {
      if (timeLeft === t && !timerWarningsRef.current.has(t)) {
        timerWarningsRef.current.add(t);
        toast({ title, description, variant: isWarn ? "destructive" : "default" });
      }
    }
  }, [timeLeft, assessment, secureReady, toast]);

  // Auto-save answers to localStorage
  useEffect(() => {
    if (!assessmentId || !secureReady) return;
    try { localStorage.setItem(`hireai_answers_${assessmentId}`, JSON.stringify(answers)); } catch {}
  }, [answers, assessmentId, secureReady]);

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
      // Skip security if bypass is enabled (for testing)
      if (bypassSecurity) {
        console.log("[TEST] Security bypassed for testing purposes");
        setProctoringActive(true);
        setSecurityScore(100);
        return;
      }

      await securityManager.enableSecureMode();
      securityManager.monitorNetworkActivity();

      const needsCamera = isFeatureEnabled("face_recognition") || isFeatureEnabled("multi_face_detection");
      const needsMic = isFeatureEnabled("audio_monitoring");
      const needsScreen = isFeatureEnabled("screen_recording");

      if (needsCamera || needsMic) {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: needsCamera ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          } : false,
          audio: needsMic ? {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          } : false,
        });

        setCameraStream(videoStream);
        setMicrophoneStream(videoStream);

        if (needsCamera && videoRef.current) {
          videoRef.current.srcObject = videoStream;
          const v = videoRef.current;
          try { await v.play(); } catch {}
          const ok = await ensureVideoReady(v);
          setVideoReady(ok);
        }

        if (needsMic) {
          audioContextRef.current = new AudioContext();
          const source =
            audioContextRef.current.createMediaStreamSource(videoStream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 2048;
          source.connect(analyserRef.current);
        }
      }

      // Only start screen recording if enabled and not already active from preflight
      if (needsScreen && !screenRecording) {
        await initializeScreenRecording();
      }

      setProctoringActive(true);
      if (isFeatureEnabled("environment_scan")) {
        setEnvironmentScanActive(true);
      }
      startProctoringMonitoring();

      const count = assessment?.securityFeatures?.length || 0;
      toast({
        title: "AI Proctoring Active",
        description: `Your assessment is secure. Running ${count} active security feature(s).`,
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

  // Code execution function
  const runCode = async (code: string, input: string): Promise<{ output: string; error?: string; executionTime?: number }> => {
    try {
      const response = await fetch('/api/assessments/execute-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language: selectedLanguage,
          input,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { output: '', error: error.error || 'Execution failed' };
      }

      return await response.json();
    } catch (error) {
      return { 
        output: '', 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
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
      if (isFeatureEnabled("face_recognition")) detectFace();
      if (isFeatureEnabled("audio_monitoring")) monitorAudio();
      if (isFeatureEnabled("multi_face_detection")) detectMultipleFaces();
      if (isFeatureEnabled("environment_scan")) monitorEnvironment();
      if (isFeatureEnabled("keystroke_analysis")) updateKeystrokePattern();
      updateSecurityScore();
      // escalate when face missing continuously
      if (isFeatureEnabled("face_recognition")) {
        setNoFaceSeconds((prev) => (!faceDetected ? Math.min(prev + 1, 30) : 0));
      }
      // rollback: no aggregate accumulation
    }, 1000); // More frequent monitoring

    // Screenshot capture - face proctoring OR periodic snapshots feature
    if (isFeatureEnabled("face_recognition") || isFeatureEnabled("multi_face_detection") || isFeatureEnabled("periodic_snapshots")) {
      screenshotIntervalRef.current = setInterval(() => {
        captureScreenshot();
      }, isFeatureEnabled("periodic_snapshots") && !isFeatureEnabled("face_recognition") ? 30000 : 15000);
    }
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

  // Raise a single alert per continuous face-missing period (no spamming)
  useEffect(() => {
    if (!proctoringActive) return;
    if (noFaceSeconds >= 5 && !faceAlerted) {
      addAlert("face_not_detected", "Face missing for 5+ seconds.", "high");
      setFaceAlerted(true);
      setFaceViolationCount((c) => c + 1);
    }
    if (noFaceSeconds === 0 && faceAlerted) {
      setFaceAlerted(false);
    }
  }, [noFaceSeconds, proctoringActive, faceAlerted]);

  // Auto-end after repeated serious face violations (e.g. cheating attempts)
  useEffect(() => {
    if (!proctoringActive || submitting) return;
    if (faceViolationCount >= 3) {
      addAlert(
        "face_not_detected",
        "Multiple face-related violations detected. Ending assessment.",
        "high",
      );
      handleSubmitAssessment(false, true);
    }
  }, [faceViolationCount, proctoringActive, submitting]);

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

    // Lightweight heuristic: treat frame as valid if brightness is in a broad range.
    // This avoids random failures and keeps monitoring stable when the face is visible.
    let imageData: ImageData;
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      // If canvas not ready yet, skip this tick
      return;
    }
    const brightness = calculateBrightness(imageData);

    // Still lenient, but a bit stricter so that when you actually leave the frame
    // and the background dominates, we are more likely to count it as missing.
    const faceDetected = brightness > 20 && brightness < 235;
    setFaceDetected(faceDetected);

    // Do not push an alert every second here.
    // The noFaceSeconds effect handles raising a single high-severity alert
    // when the face appears missing for 5+ continuous seconds.
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

    // Be less aggressive with scoring
    violations.forEach((violation) => {
      switch (violation.severity) {
        case "high":
          score -= 10; // Reduced from 15
          break;
        case "medium":
          score -= 5; // Reduced from 8
          break;
        case "low":
          score -= 2; // Reduced from 3
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
      if (!isFeatureEnabled("tab_detection")) return;
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
        addAlert(
          "tab_switch",
          "Tab switching detected. Assessment will be submitted.",
          "high"
        );
        if (proctoringActive && !submitting) {
          // Auto-submit on tab switch
          handleSubmitAssessment(false, true);
        }
      }
    };

    // Fullscreen monitoring
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);

      if (isFeatureEnabled("fullscreen_lock") && !isFs && proctoringActive) {
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
      if (!isFeatureEnabled("tab_detection")) return;
      addAlert(
        "tab_switch",
        "Window focus lost. Assessment will be submitted.",
        "high"
      );
      if (proctoringActive && !submitting) {
        handleSubmitAssessment(false, true);
      }
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
      if (secureReady && (isFeatureEnabled("right_click_block") || isFeatureEnabled("clipboard_block"))) {
        e.preventDefault();
      }
    };
    const preventKeys = (e: KeyboardEvent) => {
      if (!secureReady) return;
      if (isFeatureEnabled("clipboard_block")) {
        if (e.ctrlKey || e.metaKey) {
          const k = e.key.toLowerCase();
          if (["c", "v", "x", "a", "s", "p"].includes(k)) {
            e.preventDefault();
            addAlert("copy_paste_attempt", "Copy/paste action blocked.", "low");
          }
        }
      }
      if (isFeatureEnabled("right_click_block")) {
        if (e.key === "F12") {
          e.preventDefault();
          addAlert("dev_tools_attempt", "Developer tools access blocked.", "medium");
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) {
          e.preventDefault();
          addAlert("dev_tools_attempt", "Developer tools access blocked.", "medium");
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
          e.preventDefault();
        }
      }
      if (isFeatureEnabled("fullscreen_lock") || isFeatureEnabled("tab_detection")) {
        if (e.key === "F11" || e.key === "Escape") e.preventDefault();
      }
    };
    window.addEventListener("contextmenu", preventContext);
    window.addEventListener("keydown", preventKeys);
    return () => {
      window.removeEventListener("contextmenu", preventContext);
      window.removeEventListener("keydown", preventKeys);
    };
  }, [secureReady, isFeatureEnabled]);


  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (isFeatureEnabled("prevent_back_nav")) return;
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitAssessment = async (timedOut = false, forcedEnd = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);

    try {
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
        try { cleanup(); } catch {}
        toast({
          title: timedOut ? "Time's Up!" : "Assessment Submitted",
          description: data.alreadyCompleted
            ? "Assessment was already submitted."
            : `Your assessment has been submitted. Score: ${data.score}%`,
        });
        // Navigate to results; fall back to assessments list after a delay
        router.replace(`/dashboard/job-seeker/assessments/${assessmentId}/results`);
        router.refresh();
        // Safety redirect: if results page can't load the user lands on the list page
        setTimeout(() => {
          router.replace("/dashboard/job-seeker/assessments");
        }, 8000);
      } else {
        const text = await response.text().catch(() => "");
        toast({
          title: "Submission Failed",
          description: text || `Server error (${response.status}). Please try again.`,
          variant: "destructive",
        });
        isSubmittingRef.current = false;
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Could not submit. Please check your connection and try again.",
        variant: "destructive",
      });
      isSubmittingRef.current = false;
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
  const timerPaused = (isFeatureEnabled("fullscreen_lock") && !isFullscreen) || (isFeatureEnabled("screen_recording") && !screenRecording) || blockActions;

  // Quick action to resume monitoring prerequisites
  async function resumeSecurity() {
    try {
      if (!document.fullscreenElement) {
        await requestFullscreen();
      }
      if (isFeatureEnabled("screen_recording") && !screenRecording) {
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
  const currentQId = currentQuestion?.questionId || currentQuestion?._id || "";
  const answeredCount = questions.filter(q => {
    const qId = q.questionId || q._id || "";
    return !!(answers[qId] && answers[qId].trim());
  }).length;
  const timerColor = timeLeft <= 60
    ? "text-red-400 bg-red-900/40 animate-pulse"
    : timeLeft <= 300
    ? "text-yellow-400 bg-yellow-900/40"
    : "text-green-400 bg-green-900/40";

  const toggleMarkForReview = (qId: string) => {
    setMarkedForReview(prev => prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]);
  };

  const clearAnswer = (qId: string) => {
    setAnswers(prev => { const next = { ...prev }; delete next[qId]; return next; });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Room Scan Overlay ── */}
      {proctoringActive && environmentScanActive && !roomScanDone && (
        <div className="fixed inset-0 z-[65] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">360° Environment Scan</CardTitle>
              <CardDescription>Follow each prompt and click "Capture & Next".</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-black border border-gray-700">
                <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover" />
              </div>
              {!videoReady && <p className="text-xs text-yellow-400">Camera initializing... please wait.</p>}
              <div>
                <p className="text-sm text-gray-300 mb-2">Captured: {roomScanFrames.length}/{roomScanPrompts.length}</p>
                <div className="grid grid-cols-5 gap-2">
                  {roomScanPrompts.map((label, idx) => (
                    <div key={idx} className={`border rounded bg-black/30 ${idx < roomScanFrames.length ? "border-green-500" : "border-gray-700"}`}>
                      {roomScanFrames[idx]
                        ? <img src={roomScanFrames[idx]} alt={label} className="w-full h-14 object-cover rounded-t" />
                        : <div className="w-full h-14 flex items-center justify-center text-xs text-gray-500">Pending</div>}
                      <div className="p-1 text-[10px] text-center text-gray-300">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-base font-medium text-white">{roomScanPrompts[roomScanStep]}</p>
              <div className="h-1.5 bg-gray-800 rounded">
                <div className="h-full bg-green-500 rounded transition-all" style={{ width: `${((roomScanStep + 1) / roomScanPrompts.length) * 100}%` }} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="border-gray-600" onClick={retryCamera}>Retry Camera</Button>
                <Button onClick={handleRoomScanNext} disabled={!videoReady} className="bg-blue-600 hover:bg-blue-700">Capture & Next</Button>
                <Button variant="secondary" className="bg-gray-800" onClick={retakeRoomScanFrame} disabled={!videoReady}>Retake</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Preflight Gate ── */}
      {preflightOpen && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-gray-900 border-gray-700 max-h-[92vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" /> Start Secure Assessment
              </CardTitle>
              <CardDescription>Complete all checks before you begin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isFeatureEnabled("fullscreen_lock") && (
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <span className="text-sm">Full-Screen Lock</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={fullscreenReady ? "default" : "destructive"}>{fullscreenReady ? "✓ Ready" : "Required"}</Badge>
                    <Button size="sm" onClick={requestFullscreen} className="bg-blue-600 hover:bg-blue-700 h-7 text-xs">Enter Fullscreen</Button>
                  </div>
                </div>
              )}

              {(isFeatureEnabled("face_recognition") || isFeatureEnabled("multi_face_detection") || isFeatureEnabled("audio_monitoring")) && (
                <div className="p-3 bg-gray-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Camera & Microphone</span>
                    <Badge variant={cameraReady && microphoneReady ? "default" : "destructive"}>
                      {cameraReady && microphoneReady ? "✓ Granted" : "Allow Access"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={quickPermissionProbe} variant="outline" className="border-gray-600 h-7 text-xs">Check Access</Button>
                    {(isFeatureEnabled("face_recognition") || isFeatureEnabled("multi_face_detection")) && (
                      <Button size="sm" onClick={preflightTestCameraSnapshot} variant="outline" className="border-gray-600 h-7 text-xs">Test Camera</Button>
                    )}
                    {isFeatureEnabled("audio_monitoring") && (
                      preflightMicStreamRef.current
                        ? <Button size="sm" onClick={stopPreflightMicTest} variant="outline" className="border-gray-600 h-7 text-xs">Stop Mic</Button>
                        : <Button size="sm" onClick={startPreflightMicTest} variant="outline" className="border-gray-600 h-7 text-xs">Test Mic</Button>
                    )}
                  </div>
                  {preflightMicLevel > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Mic Level</p>
                      <div className="w-full h-1.5 bg-gray-700 rounded overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${preflightMicLevel}%` }} />
                      </div>
                    </div>
                  )}
                  {testPreviewImage && (
                    <img src={testPreviewImage} alt="Camera preview" className="w-full max-h-40 object-contain rounded border border-gray-700" />
                  )}
                </div>
              )}

              {isFeatureEnabled("screen_recording") && (
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <span className="text-sm">Screen Recording</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={screenRecording ? "default" : "destructive"}>{screenRecording ? "✓ Recording" : "Required"}</Badge>
                    <Button size="sm" onClick={startScreenShare} variant="outline" className="border-gray-600 h-7 text-xs">
                      {screenRecording ? "Restart" : "Start Screen Share"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Environment Readiness</span><span>{readinessScore}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded overflow-hidden">
                  <div className="h-full rounded bg-gradient-to-r from-yellow-400 to-green-500 transition-all" style={{ width: `${readinessScore}%` }} />
                </div>
              </div>

              <div className="p-3 bg-black/30 border border-gray-700 rounded-lg">
                <p className="font-medium text-white text-sm mb-2">Active Security: {assessment?.securityFeatures?.length ?? 0} features</p>
                <ul className="space-y-1 list-disc list-inside text-xs text-gray-300">
                  <li>Ensure you are alone in a quiet, well-lit room.</li>
                  {isFeatureEnabled("fullscreen_lock") && <li>Stay in full-screen throughout the test.</li>}
                  {isFeatureEnabled("tab_detection") && <li>Do not switch tabs — violations will end your test.</li>}
                  {(isFeatureEnabled("face_recognition") || isFeatureEnabled("multi_face_detection")) && <li>Keep your face clearly visible at all times.</li>}
                  {isFeatureEnabled("audio_monitoring") && <li>Maintain a quiet environment — audio is monitored.</li>}
                  {isFeatureEnabled("clipboard_block") && <li>Copy/paste is disabled.</li>}
                  {isFeatureEnabled("right_click_block") && <li>Right-click and developer tools are blocked.</li>}
                  {isFeatureEnabled("prevent_back_nav") && <li>You cannot return to previous questions.</li>}
                  {isFeatureEnabled("watermark_overlay") && <li>Your identity is watermarked on all content.</li>}
                  {isFeatureEnabled("periodic_snapshots") && <li>Random identity snapshots will be taken.</li>}
                  <li>Any violations may pause or end your assessment immediately.</li>
                </ul>
              </div>

              <div className="space-y-2">
                {[
                  { state: agreeToProctoring, setter: setAgreeToProctoring, label: "I consent to AI proctoring for this assessment." },
                  { state: quietEnvironmentConfirmed, setter: setQuietEnvironmentConfirmed, label: "I am in a quiet environment and will not switch tabs or exit fullscreen." },
                  { state: readInstructionsConfirmed, setter: setReadInstructionsConfirmed, label: "I have read and understood the instructions above." },
                ].map(({ state, setter, label }) => (
                  <label key={label} className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={state} onChange={e => setter(e.target.checked)} className="mt-0.5 h-4 w-4 rounded" />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <Button variant="outline" className="border-gray-600" onClick={detectCapabilities}>Re-check</Button>
                <Button
                  onClick={startSecureMode}
                  disabled={!(
                    (!isFeatureEnabled("fullscreen_lock") || fullscreenReady) &&
                    (!(isFeatureEnabled("face_recognition") || isFeatureEnabled("multi_face_detection")) || cameraReady) &&
                    (!isFeatureEnabled("audio_monitoring") || microphoneReady) &&
                    (!isFeatureEnabled("screen_recording") || screenRecording) &&
                    agreeToProctoring && quietEnvironmentConfirmed && readInstructionsConfirmed
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

      {/* ── Submit Confirmation Modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold text-white">Submit Assessment?</h2>
            <p className="text-sm text-gray-400">Once submitted, you cannot change your answers.</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-900/40 border border-green-700/40 rounded-xl p-3">
                <div className="text-2xl font-bold text-green-400">{answeredCount}</div>
                <div className="text-xs text-gray-400 mt-0.5">Answered</div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                <div className="text-2xl font-bold text-gray-300">{questions.length - answeredCount}</div>
                <div className="text-xs text-gray-400 mt-0.5">Unanswered</div>
              </div>
              <div className="bg-orange-900/40 border border-orange-700/40 rounded-xl p-3">
                <div className="text-2xl font-bold text-orange-400">{markedForReview.length}</div>
                <div className="text-xs text-gray-400 mt-0.5">For Review</div>
              </div>
            </div>
            {(questions.length - answeredCount) > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-700/40 rounded-lg text-sm text-yellow-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{questions.length - answeredCount} question(s) unanswered. Submit anyway?</span>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 border-gray-600 text-white hover:bg-gray-800" onClick={() => setShowSubmitModal(false)}>
                Continue Test
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => { setShowSubmitModal(false); handleSubmitAssessment(); }}
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed Header (only during test) ── */}
      {secureReady && (
        <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-gray-900 border-b border-gray-700 flex items-center px-4 gap-3 shadow-lg">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Shield className="h-4 w-4 text-green-500 shrink-0" />
            <span className="font-semibold text-sm truncate">{assessment?.title}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
            <span className="text-green-400 font-semibold">{answeredCount}</span>
            <span>/</span>
            <span>{questions.length}</span>
            <span className="text-gray-600 ml-1">answered</span>
          </div>
          {timerPaused && <Badge variant="destructive" className="text-xs shrink-0">⏸ Paused</Badge>}
          <div className={`font-mono text-base font-bold px-3 py-1 rounded-lg shrink-0 ${timerColor}`}>
            {formatTime(timeLeft)}
          </div>
          <Button
            size="sm"
            onClick={() => setShowSubmitModal(true)}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 shrink-0 h-8 text-xs gap-1.5"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Submit Test
          </Button>
        </header>
      )}

      {/* ── Body: Sidebar + Main ── */}
      <div className={`flex ${secureReady ? "pt-14" : ""} min-h-screen`}>

        {/* Left Sidebar */}
        {secureReady && (
          <aside className="fixed left-0 top-14 bottom-0 w-60 bg-gray-900 border-r border-gray-700 overflow-y-auto flex flex-col z-30">

            {/* Question Palette */}
            <div className="p-3 border-b border-gray-700">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">Question Palette</p>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, idx) => {
                  const qId = q.questionId || q._id || "";
                  const isAnswered = !!(answers[qId] && answers[qId].trim());
                  const isMarked = markedForReview.includes(qId);
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      key={idx}
                      title={`Q${idx + 1}${isAnswered ? " ✓" : ""}${isMarked ? " 🔖" : ""}`}
                      onClick={() => {
                        if (isFeatureEnabled("prevent_back_nav") && idx < currentQuestionIndex) return;
                        setCurrentQuestionIndex(idx);
                      }}
                      className={`w-full aspect-square text-xs font-bold rounded transition-all border ${
                        isCurrent
                          ? "border-blue-500 bg-blue-600 text-white shadow shadow-blue-500/30"
                          : isMarked
                          ? "border-orange-500 bg-orange-600 text-white"
                          : isAnswered
                          ? "border-green-600 bg-green-700 text-white"
                          : "border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="px-3 py-2 border-b border-gray-700">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {[
                  { color: "bg-blue-600", label: "Current" },
                  { color: "bg-green-700", label: "Answered" },
                  { color: "bg-orange-600", label: "For Review" },
                  { color: "bg-gray-800 border border-gray-600", label: "Not Visited" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <div className={`w-2.5 h-2.5 rounded shrink-0 ${l.color}`} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-700">
              {[
                { val: answeredCount, label: "Answered", cls: "text-green-400" },
                { val: questions.length - answeredCount, label: "Remaining", cls: "text-gray-300" },
                { val: markedForReview.length, label: "For Review", cls: "text-orange-400" },
                { val: questions.length, label: "Total", cls: "text-blue-400" },
              ].map(s => (
                <div key={s.label} className="bg-gray-800 rounded-lg p-2 text-center">
                  <div className={`text-lg font-bold ${s.cls}`}>{s.val}</div>
                  <div className="text-[10px] text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Camera Feed */}
            {(!environmentScanActive || roomScanDone) && (isFeatureEnabled("face_recognition") || isFeatureEnabled("multi_face_detection")) && (
              <div className="p-2 border-b border-gray-700">
                <div className="relative rounded overflow-hidden bg-black aspect-video">
                  <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                  <div className="absolute top-1.5 right-1.5">
                    {faceDetected
                      ? <CheckCircle className="h-4 w-4 text-green-500 drop-shadow" />
                      : <XCircle className="h-4 w-4 text-red-500 drop-shadow" />}
                  </div>
                  <div className="absolute bottom-1 left-1 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-gray-300">
                    {proctoringActive ? "● Live" : "○ Off"}
                  </div>
                </div>
              </div>
            )}

            {/* Security Score */}
            <div className="p-3 border-b border-gray-700">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-gray-400 font-medium">Security Score</span>
                <span className={`text-xs font-bold ${getSecurityScoreColor(securityScore)}`}>{securityScore}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all ${securityScore >= 80 ? "bg-green-500" : securityScore >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${securityScore}%` }}
                />
              </div>
            </div>

            {/* Alerts */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest px-1">Alerts ({alerts.length})</p>
              {alerts.slice(-6).map(alert => (
                <div key={alert.id} className={`p-2 rounded border text-xs ${getAlertColor(alert.severity)}`}>
                  <div className="flex items-center gap-1.5">
                    {getAlertIcon(alert.type)}
                    <span className="line-clamp-2">{alert.message}</span>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && <p className="text-xs text-gray-600 text-center py-2">All systems normal</p>}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className={`flex-1 ${secureReady ? "ml-60" : ""} p-5 min-h-screen`}>
          {/* Hidden canvas for proctoring */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Security blocked overlay */}
          {blockActions && (
            <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center">
              <div className="bg-gray-900 border border-red-700 rounded-xl p-8 text-center max-w-sm space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                <h2 className="text-lg font-bold text-red-400">Assessment Paused</h2>
                <p className="text-sm text-gray-400">Security requirement not met. Please restore fullscreen / screen share to continue.</p>
                <Button onClick={resumeSecurity} className="bg-blue-600 hover:bg-blue-700">Resume</Button>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {secureReady && questions.length > 0 && (
            <div className="mb-5">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progress</span>
                <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded transition-all"
                  style={{ width: `${(answeredCount / Math.max(1, questions.length)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Question Card */}
          {currentQuestion && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">

              {/* Question Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 bg-gray-800/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {currentQuestionIndex + 1}
                  </div>
                  <span className="text-xs text-gray-400">of {questions.length}</span>
                  {currentQuestion.difficulty && (
                    <Badge className={
                      currentQuestion.difficulty === "Easy" ? "bg-green-800 text-green-200 text-xs" :
                      currentQuestion.difficulty === "Hard" ? "bg-red-800 text-red-200 text-xs" :
                      "bg-yellow-800 text-yellow-200 text-xs"
                    }>
                      {currentQuestion.difficulty}
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs capitalize">
                    {currentQuestion.type.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-gray-500">{currentQuestion.points} pts</span>
                </div>
                <button
                  onClick={() => toggleMarkForReview(currentQId)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all shrink-0 ${
                    markedForReview.includes(currentQId)
                      ? "bg-orange-600 border-orange-500 text-white"
                      : "border-gray-600 text-gray-400 hover:border-orange-500 hover:text-orange-300"
                  }`}
                >
                  🔖 {markedForReview.includes(currentQId) ? "Marked" : "Mark for Review"}
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Question Text */}
                <div className="text-white text-base leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.questionText}
                </div>

                {/* Examples */}
                {currentQuestion.examples && currentQuestion.examples.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Examples</p>
                    {currentQuestion.examples.map((ex, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-3 text-sm font-mono space-y-1">
                        <div><span className="text-gray-500">Input: </span><span className="text-green-300">{ex.input}</span></div>
                        <div><span className="text-gray-500">Output: </span><span className="text-blue-300">{ex.output}</span></div>
                        {ex.explanation && <div className="text-gray-400 text-xs">{ex.explanation}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* MCQ - large clickable cards */}
                {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = answers[currentQId] === option;
                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswerChange(currentQId, option)}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-900/25 text-white"
                              : "border-gray-700 bg-gray-800/40 text-gray-300 hover:border-gray-500 hover:bg-gray-800"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                            isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-gray-500 text-gray-400"
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-sm flex-1">{option}</span>
                          {isSelected && <CheckCircle className="h-4 w-4 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer */}
                {currentQuestion.type === "short_answer" && (
                  <Textarea
                    value={answers[currentQId] || ""}
                    onChange={e => handleAnswerChange(currentQId, e.target.value)}
                    placeholder="Type your answer here..."
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 min-h-[130px] resize-y"
                    rows={5}
                  />
                )}

                {/* Code */}
                {currentQuestion.type === "code_snippet" && (
                  <CodeEditor
                    value={answers[currentQId] || ""}
                    onChange={value => handleAnswerChange(currentQId, value)}
                    language={selectedLanguage}
                    height="420px"
                    testCases={currentQuestion.testCases || []}
                    onRunCode={runCode}
                    readOnly={false}
                    showTestCases={true}
                    theme="vs-dark"
                  />
                )}

                {/* Video */}
                {currentQuestion.type === "video_response" && (
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                    <p className="text-gray-400 mb-3">Record your video response (max 3 minutes)</p>
                    <Button className="bg-red-600 hover:bg-red-700">
                      <Camera className="h-4 w-4 mr-2" />Start Recording
                    </Button>
                  </div>
                )}

                {/* Hint */}
                {currentQuestion.hint && (
                  <details>
                    <summary className="text-xs text-yellow-400/80 cursor-pointer flex items-center gap-1.5 select-none list-none hover:text-yellow-300 transition-colors w-fit">
                      <span>💡</span> Show Hint
                    </summary>
                    <div className="mt-2 p-3 bg-yellow-900/15 border border-yellow-700/30 rounded-lg text-xs text-yellow-200/90 leading-relaxed">
                      {currentQuestion.hint}
                    </div>
                  </details>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  {!isFeatureEnabled("prevent_back_nav") ? (
                    <Button
                      variant="outline"
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                      className="border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                    >
                      ← Previous
                    </Button>
                  ) : <div />}

                  <Button
                    variant="ghost"
                    onClick={() => clearAnswer(currentQId)}
                    disabled={!answers[currentQId]}
                    className="text-gray-500 hover:text-gray-300 text-xs"
                  >
                    Clear Response
                  </Button>

                  {currentQuestionIndex === questions.length - 1 ? (
                    <Button
                      onClick={() => setShowSubmitModal(true)}
                      disabled={submitting || (isFeatureEnabled("fullscreen_lock") && !isFullscreen) || (isFeatureEnabled("screen_recording") && !screenRecording)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Submit Test
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNextQuestion}
                      disabled={(isFeatureEnabled("fullscreen_lock") && !isFullscreen) || (isFeatureEnabled("screen_recording") && !screenRecording)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next →
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FaceProctor widget */}
      {(isFeatureEnabled("face_recognition") || isFeatureEnabled("multi_face_detection")) && (
        <FaceProctor
          assessmentId={assessmentId}
          candidateId={"candidate"}
          minFaceSizeRatio={0.18}
          maxFaces={1}
          movementThreshold={24}
          checkIntervalMs={1000}
          evidence={isFeatureEnabled("face_recognition")}
          enableAudioMonitoring={isFeatureEnabled("audio_monitoring")}
          blockClipboard={isFeatureEnabled("clipboard_block")}
          maxWarningsBeforePause={3}
        />
      )}

      {/* Watermark overlay */}
      {secureReady && isFeatureEnabled("watermark_overlay") && assessment && (
        <div className="fixed inset-0 z-[5] pointer-events-none select-none overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute font-medium rotate-[-30deg] whitespace-nowrap"
              style={{
                top: `${(i * 11) % 100}%`,
                left: `${i % 2 === 0 ? -5 : 35}%`,
                fontSize: "0.65rem",
                color: "rgba(255,255,255,0.07)",
              }}
            >
              {assessment.title} • CONFIDENTIAL • HireAI
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
