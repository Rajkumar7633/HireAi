"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Camera,
  Users,
  MessageCircle,
  CreditCard as Record,
  Square,
  Maximize,
  Minimize,
  FileText,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2,
  Code2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { CollabCodePanel } from "@/components/collab-code-panel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Participant {
  id: string;
  name: string;
  email: string;
  isHost: boolean;
  mediaState: {
    video: boolean;
    audio: boolean;
    screen: boolean;
  };
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  handRaised?: boolean;
  mutedByHost?: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
  type: "message" | "system";
}

interface VideoConferenceRoomProps {
  roomId: string;
  interviewId: string;
  isHost?: boolean;
  participantName?: string;
}

export function VideoConferenceRoom({
  roomId,
  interviewId,
  isHost = false,
  participantName = "User",
}: VideoConferenceRoomProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [mediaState, setMediaState] = useState({
    video: true,
    audio: true,
    screen: false,
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "reconnecting"
  >("connecting");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const [isCallEnding, setIsCallEnding] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbRating, setFbRating] = useState<number | undefined>(undefined);
  const [fbStrengths, setFbStrengths] = useState("");
  const [fbConcerns, setFbConcerns] = useState("");
  const [fbExperience, setFbExperience] = useState("");
  const [fbIssues, setFbIssues] = useState("");
  const [fbNextStep, setFbNextStep] = useState<"advance"|"reject"|"follow_up"|"undecided">("undecided");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );

  // Host: mute/unmute participant (courtesy mute)
  const hostToggleMuteParticipant = useCallback(
    (participantId: string) => {
      if (!isHost) return;
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId
            ? { ...p, mutedByHost: !p.mutedByHost, mediaState: { ...p.mediaState, audio: p.mutedByHost ? p.mediaState.audio : false } }
            : p,
        ),
      );
      // If host is muting current user (candidate side local), lock audio
      if (participantId === "current-user") {
        if (localStream) {
          const audioTrack = localStream.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = false;
            setMediaState((prev) => ({ ...prev, audio: false }));
            setHostLockedAudio(true);
            addSystemMessage("Host muted your microphone");
          }
        }
      }
    },
    [isHost, localStream],
  );

  // Participant: raise/lower hand
  const toggleRaiseHand = useCallback(() => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === "current-user" ? { ...p, handRaised: !p.handRaised } : p,
      ),
    );
    addSystemMessage(
      `"${participantName}" ${participants.find((x) => x.id === "current-user")?.handRaised ? "lowered" : "raised"} their hand`,
    );
  }, [participantName, participants]);
  const [needsUserPlay, setNeedsUserPlay] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [selectedMicId, setSelectedMicId] = useState<string>("");
  const [waitingForHost, setWaitingForHost] = useState(false);
  const [hostLockedAudio, setHostLockedAudio] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const initializeWebRTC = useCallback(async () => {
    try {
      console.log("[v0] Initializing WebRTC connection...");
      setConnectionStatus("connecting");

      // Get user media with enhanced constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setLocalStream(stream);

      // Enumerate devices (after permission is granted)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === "videoinput");
        const mics = devices.filter((d) => d.kind === "audioinput");
        setCameraDevices(cams);
        setMicDevices(mics);
        // Set defaults from track settings if present
        const vSettings: any = stream.getVideoTracks()[0]?.getSettings?.() || {};
        const aSettings: any = stream.getAudioTracks()[0]?.getSettings?.() || {};
        if (vSettings.deviceId) setSelectedCameraId(vSettings.deviceId);
        if (aSettings.deviceId) setSelectedMicId(aSettings.deviceId);
      } catch {}
      if (localVideoRef.current) {
        // Ensure attributes are set before attaching stream
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true;
        localVideoRef.current.srcObject = stream;
        try {
          await localVideoRef.current.play();
          setNeedsUserPlay(false);
        } catch {
          // Autoplay might be blocked; show tap to play overlay
          setNeedsUserPlay(true);
        }
      }

      // Create peer connection with STUN servers
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      // Add local stream tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log("[v0] Received remote stream");
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.playsInline = true;
          remoteVideoRef.current.srcObject = remoteStream;
          // Best-effort play()
          remoteVideoRef.current
            .play()
            .catch(() => console.warn("[v0] remote video play() blocked"));
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log("[v0] Connection state:", pc.connectionState);
        switch (pc.connectionState) {
          case "connected":
            setConnectionStatus("connected");
            break;
          case "disconnected":
          case "failed":
            setConnectionStatus("reconnecting");
            break;
          case "closed":
            setConnectionStatus("disconnected");
            break;
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[v0] New ICE candidate:", event.candidate);
          // In a real implementation, send this to the remote peer via signaling server
        }
      };

      setPeerConnection(pc);
      setConnectionStatus("connected");

      // Add system message
      addSystemMessage("Connected to video interview room");

      // Mock remote participant for demo
      setParticipants([
        {
          id: "current-user",
          name: participantName,
          email: "current@user.com",
          isHost,
          mediaState,
          connectionStatus: "connected",
        },
        {
          id: "remote-participant",
          name: isHost ? "Candidate" : "Recruiter",
          email: "remote@participant.com",
          isHost: !isHost,
          mediaState: { video: true, audio: true, screen: false },
          connectionStatus: "connected",
        },
      ]);
    } catch (error) {
      console.error("[v0] Error initializing WebRTC:", error);
      setConnectionStatus("disconnected");
      toast({
        title: "Connection Error",
        description:
          "Failed to initialize video connection. Please check your camera and microphone permissions.",
        variant: "destructive",
      });
    }
  }, [isHost, participantName, toast]);

  const cleanupWebRTC = useCallback(() => {
    console.log("[v0] Cleaning up WebRTC resources...");

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        console.log("[v0] Stopped track:", track.kind);
      });
    }

    if (peerConnection) {
      peerConnection.close();
    }

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
    setMediaRecorder(null);
  }, [localStream, peerConnection, mediaRecorder]);

  // Initialize only once to avoid flicker on state changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await initializeWebRTC();
    })();
    return () => {
      mounted = false;
      cleanupWebRTC();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll interview status for waiting room if not host
  useEffect(() => {
    if (!isHost && interviewId) {
      let timer: NodeJS.Timeout | null = null;
      const poll = async () => {
        try {
          const res = await fetch(`/api/video-interviews/${interviewId}`);
          if (res.ok) {
            const data = await res.json();
            const status = data?.interview?.status;
            setWaitingForHost(status === "scheduled");
          }
        } catch {}
        timer = setTimeout(poll, 3000);
      };
      poll();
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [interviewId, isHost]);

  const toggleVideo = useCallback(async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !mediaState.video;
        setMediaState((prev) => ({ ...prev, video: !prev.video }));

        // Update participants state
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === "current-user"
              ? {
                  ...p,
                  mediaState: { ...p.mediaState, video: !mediaState.video },
                }
              : p
          )
        );

        addSystemMessage(
          `Camera ${!mediaState.video ? "enabled" : "disabled"}`
        );
      }
    }
  }, [localStream, mediaState.video]);

  const toggleAudio = useCallback(async () => {
    if (hostLockedAudio) {
      toast({ title: "Muted by host", description: "Your microphone is locked by the host.", variant: "destructive" });
      return;
    }
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !mediaState.audio;
        setMediaState((prev) => ({ ...prev, audio: !prev.audio }));

        // Update participants state
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === "current-user"
              ? {
                  ...p,
                  mediaState: { ...p.mediaState, audio: !mediaState.audio },
                }
              : p
          )
        );

        addSystemMessage(
          `Microphone ${!mediaState.audio ? "enabled" : "disabled"}`
        );
      }
    }
  }, [localStream, mediaState.audio]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!mediaState.screen) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        // Replace video track in peer connection
        if (peerConnection && localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          const sender = peerConnection
            .getSenders()
            .find((s) => s.track === videoTrack);

          if (sender) {
            await sender.replaceTrack(screenStream.getVideoTracks()[0]);
          }
        }

        // Update local video display
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
          try {
            await localVideoRef.current.play();
            setNeedsUserPlay(false);
          } catch {
            setNeedsUserPlay(true);
          }
        }

        setMediaState((prev) => ({ ...prev, screen: true }));
        addSystemMessage("Screen sharing started");

        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = async () => {
          setMediaState((prev) => ({ ...prev, screen: false }));
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            try {
              await localVideoRef.current.play();
              setNeedsUserPlay(false);
            } catch {
              setNeedsUserPlay(true);
            }
          }
          addSystemMessage("Screen sharing stopped");
        };
      } else {
        // Stop screen sharing and return to camera
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
          try {
            await localVideoRef.current.play();
            setNeedsUserPlay(false);
          } catch {
            setNeedsUserPlay(true);
          }
        }
        setMediaState((prev) => ({ ...prev, screen: false }));
        addSystemMessage("Screen sharing stopped");
      }
    } catch (error) {
      console.error("[v0] Error toggling screen share:", error);
      toast({
        title: "Screen Share Error",
        description: "Failed to start screen sharing. Please try again.",
        variant: "destructive",
      });
    }
  }, [mediaState.screen, peerConnection, localStream, toast]);

  // Switch camera without restarting entire stream
  const switchCamera = useCallback(
    async (deviceId: string) => {
      try {
        if (!peerConnection) return;
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: false,
        });
        const newTrack = newStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === "video");
        if (sender && newTrack) {
          await sender.replaceTrack(newTrack);
          // Update local stream tracks
          if (localStream) {
            localStream.getVideoTracks().forEach((t) => t.stop());
            localStream.removeTrack(localStream.getVideoTracks()[0]);
            localStream.addTrack(newTrack);
          }
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream || newStream;
            try { await localVideoRef.current.play(); } catch {}
          }
          setSelectedCameraId(deviceId);
        }
      } catch (e) {
        console.error("[v0] switchCamera error", e);
      }
    },
    [peerConnection, localStream],
  );

  // Switch microphone without restarting entire stream
  const switchMic = useCallback(
    async (deviceId: string) => {
      try {
        if (!peerConnection) return;
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
          video: false,
        });
        const newTrack = newStream.getAudioTracks()[0];
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === "audio");
        if (sender && newTrack) {
          await sender.replaceTrack(newTrack);
          if (localStream) {
            localStream.getAudioTracks().forEach((t) => t.stop());
            localStream.removeTrack(localStream.getAudioTracks()[0]);
            localStream.addTrack(newTrack);
          }
          setSelectedMicId(deviceId);
        }
      } catch (e) {
        console.error("[v0] switchMic error", e);
      }
    },
    [peerConnection, localStream],
  );

  const toggleRecording = useCallback(async () => {
    try {
      if (!isRecording) {
        if (!localStream) {
          toast({
            title: "Recording Error",
            description: "No media stream available for recording.",
            variant: "destructive",
          });
          return;
        }

        const recorder = new MediaRecorder(localStream, {
          mimeType: "video/webm;codecs=vp9",
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          // Try upload to API (Cloudinary)
          try {
            const form = new FormData();
            const filename = `interview-${roomId}-${Date.now()}.webm`;
            form.append("file", new File([blob], filename, { type: "video/webm" }));
            const res = await fetch(`/api/video-interviews/${interviewId}/recording`, {
              method: "POST",
              body: form,
            });
            if (res.ok) {
              const data = await res.json();
              addSystemMessage("Recording uploaded successfully");
              toast({ title: "Recording Uploaded", description: "Cloud recording is available in interview details." });
              return;
            }
            // Fallback to local download
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Uploaded Failed", description: "Saved recording locally.", variant: "destructive" });
          } catch (e) {
            // Fallback to local download on error
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `interview-${roomId}-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Upload Error", description: "Saved recording locally.", variant: "destructive" });
          }
        };

        recorder.start(1000); // Collect data every second
        setMediaRecorder(recorder);
        setIsRecording(true);
        setRecordingDuration(0);

        // Start recording timer
        recordingIntervalRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);

        addSystemMessage("Recording started");
        toast({
          title: "Recording Started",
          description: "Interview recording has begun.",
        });
      } else {
        if (mediaRecorder) {
          mediaRecorder.stop();
          setMediaRecorder(null);
        }

        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }

        setIsRecording(false);
        addSystemMessage("Recording stopped");
        toast({
          title: "Recording Stopped",
          description: "Interview recording has been saved.",
        });
      }
    } catch (error) {
      console.error("[v0] Error toggling recording:", error);
      toast({
        title: "Recording Error",
        description: "Failed to toggle recording. Please try again.",
        variant: "destructive",
      });
    }
  }, [isRecording, localStream, mediaRecorder, roomId, toast]);

  const addSystemMessage = useCallback((message: string) => {
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "System",
      message,
      timestamp: new Date(),
      type: "system",
    };
    setChatMessages((prev) => [...prev, systemMessage]);
  }, []);

  const sendMessage = useCallback(() => {
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        sender: participantName,
        message: newMessage.trim(),
        timestamp: new Date(),
        type: "message",
      };
      setChatMessages((prev) => [...prev, message]);
      setNewMessage("");

      // Auto-scroll to bottom
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [newMessage, participantName]);

  const endCallNow = useCallback(async () => {
    setIsCallEnding(true);

    try {
      // Save interview data
      const response = await fetch(`/api/video-interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          notes: interviewNotes,
          duration: recordingDuration,
          endedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save interview data");
      }

      addSystemMessage("Interview ended and data saved");
      toast({
        title: "Interview Ended",
        description: "Interview data has been saved successfully.",
      });

      // Cleanup and redirect after a short delay
      setTimeout(() => {
        cleanupWebRTC();
        router.push("/dashboard");
      }, 1200);
    } catch (error) {
      console.error("[v0] Error ending call:", error);
      toast({
        title: "Error",
        description: "Failed to save interview data. Please try again.",
        variant: "destructive",
      });
      setIsCallEnding(false);
    }
  }, [cleanupWebRTC, interviewId, interviewNotes, recordingDuration, router, toast]);

  const endCall = useCallback(() => {
    // Open feedback dialog first
    setShowFeedback(true);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Enhanced Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">Video Interview</h1>
          <Badge
            variant={
              connectionStatus === "connected" ? "default" : "destructive"
            }
            className="flex items-center gap-1"
          >
            {connectionStatus === "connecting" && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
            {connectionStatus === "connected" && (
              <CheckCircle className="w-3 h-3" />
            )}
            {connectionStatus === "disconnected" && (
              <AlertCircle className="w-3 h-3" />
            )}
            {connectionStatus}
          </Badge>
          {isRecording && (
            <Badge className="bg-red-600 animate-pulse flex items-center gap-1">
              <Record className="w-3 h-3" />
              REC {formatDuration(recordingDuration)}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* Device selectors */}
          <div className="hidden md:flex items-center space-x-2">
            <select
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              value={selectedCameraId}
              onChange={(e) => switchCamera(e.target.value)}
            >
              {cameraDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(-4)}`}
                </option>
              ))}
            </select>
            <select
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              value={selectedMicId}
              onChange={(e) => switchMic(e.target.value)}
            >
              {micDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Mic ${d.deviceId.slice(-4)}`}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className="flex items-center gap-1"
          >
            <MessageCircle className="w-4 h-4" />
            Chat
            {chatMessages.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {chatMessages.length}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1"
          >
            <Code2 className="w-4 h-4" />
            Code
          </Button>
          {isHost && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              Notes
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Video Area */}
        <div className="flex-1 relative bg-gray-800">
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />

          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute top-4 right-4 w-64 h-48 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-600 shadow-lg">
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            {needsUserPlay && (
              <button
                className="absolute inset-0 bg-gray-900/70 flex items-center justify-center text-sm text-white"
                onClick={async () => {
                  try {
                    if (localVideoRef.current) {
                      await localVideoRef.current.play();
                      setNeedsUserPlay(false);
                    }
                  } catch {}
                }}
                aria-label="Tap to start video"
              >
                Tap to start video
              </button>
            )}
            {!mediaState.video && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                <Camera className="w-8 h-8 text-gray-400" />
                <span className="ml-2 text-sm text-gray-400">Camera Off</span>
              </div>
            )}
          </div>

          {/* Participants List */}
          <div className="absolute top-4 left-4">
            <Card className="bg-gray-800/90 border-gray-600 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center text-white">
                  <Users className="w-4 h-4 mr-2" />
                  Participants ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        participant.connectionStatus === "connected"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    />
                    <span className="text-white flex items-center gap-1">
                      {participant.name}
                      {participant.handRaised && (
                        <span title="Hand raised" className="text-yellow-300">✋</span>
                      )}
                    </span>
                    {participant.isHost && (
                      <Badge variant="secondary" className="text-xs">
                        Host
                      </Badge>
                    )}
                    <div className="flex space-x-1">
                      {participant.mediaState.video ? (
                        <Video className="w-3 h-3 text-green-500" />
                      ) : (
                        <VideoOff className="w-3 h-3 text-red-500" />
                      )}
                      {participant.mediaState.audio ? (
                        <Mic className="w-3 h-3 text-green-500" />
                      ) : (
                        <MicOff className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                    {isHost && !participant.isHost && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2 h-6 px-2"
                        onClick={() => hostToggleMuteParticipant(participant.id)}
                      >
                        {participant.mutedByHost ? "Unmute" : "Mute"}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Waiting room overlay */}
          {waitingForHost && (
            <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-40">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-4" />
                <p className="text-lg">Waiting for host to start the interview…</p>
              </div>
            </div>
          )}

          {/* Enhanced Controls */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-4 bg-gray-800/95 rounded-full px-6 py-3 backdrop-blur-sm border border-gray-600">
              <Button
                variant={mediaState.audio ? "default" : "destructive"}
                size="sm"
                onClick={toggleAudio}
                className="rounded-full w-12 h-12"
                disabled={isCallEnding}
              >
                {mediaState.audio ? (
                  <Mic className="w-5 h-5" />
                ) : (
                  <MicOff className="w-5 h-5" />
                )}
              </Button>

              <Button
                variant={mediaState.video ? "default" : "destructive"}
                size="sm"
                onClick={toggleVideo}
                className="rounded-full w-12 h-12"
                disabled={isCallEnding}
              >
                {mediaState.video ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <VideoOff className="w-5 h-5" />
                )}
              </Button>

              <Button
                variant={mediaState.screen ? "default" : "outline"}
                size="sm"
                onClick={toggleScreenShare}
                className="rounded-full w-12 h-12"
                disabled={isCallEnding}
              >
                {mediaState.screen ? (
                  <MonitorOff className="w-5 h-5" />
                ) : (
                  <Monitor className="w-5 h-5" />
                )}
              </Button>

              {/* Raise Hand */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleRaiseHand}
                className="rounded-full px-4"
                disabled={isCallEnding}
              >
                ✋ {participants.find((p) => p.id === "current-user")?.handRaised ? "Lower" : "Raise"}
              </Button>

              {isHost && (
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleRecording}
                  className="rounded-full w-12 h-12"
                  disabled={isCallEnding}
                >
                  {isRecording ? (
                    <Square className="w-5 h-5" />
                  ) : (
                    <Record className="w-5 h-5" />
                  )}
                </Button>
              )}

              <Button
                variant="destructive"
                size="sm"
                onClick={endCall}
                className="rounded-full w-12 h-12"
                disabled={isCallEnding}
              >
                {isCallEnding ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <PhoneOff className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-600 flex flex-col">
            <div className="p-4 border-b border-gray-600">
              <h3 className="font-semibold flex items-center">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </h3>
            </div>

            <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
              <div className="space-y-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-3 ${
                      msg.type === "system"
                        ? "bg-blue-900/50 border border-blue-700"
                        : "bg-gray-700"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={`font-medium text-sm ${
                          msg.type === "system" ? "text-blue-300" : "text-white"
                        }`}
                      >
                        {msg.sender}
                      </span>
                      <span className="text-xs text-gray-400">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200">{msg.message}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-gray-600">
              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Button
                  size="sm"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Collaborative Code Sidebar */}
        {showCode && (
          <div className="w-[720px] bg-gray-900 border-l border-gray-700 p-3 flex flex-col">
            <CollabCodePanel roomId={roomId} interviewId={interviewId} isHost={isHost} />
          </div>
        )}

        {/* Notes Sidebar */}
        {showNotes && isHost && (
          <div className="w-80 bg-gray-800 border-l border-gray-600 flex flex-col">
            <div className="p-4 border-b border-gray-600">
              <h3 className="font-semibold flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Interview Notes
              </h3>
            </div>

            <div className="flex-1 p-4">
              <Textarea
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                placeholder="Add your interview notes here..."
                className="bg-gray-700 border-gray-600 text-white h-full resize-none"
              />
            </div>

            <div className="p-4 border-t border-gray-600">
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(interviewNotes);
                  toast({
                    title: "Notes Copied",
                    description: "Interview notes copied to clipboard.",
                  });
                }}
                disabled={!interviewNotes.trim()}
              >
                Copy Notes
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="bg-gray-900 text-white border border-gray-700">
          <DialogHeader>
            <DialogTitle>Interview Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-gray-300">Rating (1-5)</Label>
              <input
                type="number"
                min={1}
                max={5}
                value={fbRating ?? ''}
                onChange={(e)=>setFbRating(e.target.value ? Number(e.target.value) : undefined)}
                className="mt-1 w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1"
              />
            </div>

            {isHost ? (
              <>
                <div>
                  <Label className="text-gray-300">Strengths</Label>
                  <Textarea
                    value={fbStrengths}
                    onChange={(e)=>setFbStrengths(e.target.value)}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Concerns</Label>
                  <Textarea
                    value={fbConcerns}
                    onChange={(e)=>setFbConcerns(e.target.value)}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Next Step</Label>
                  <select
                    value={fbNextStep}
                    onChange={(e)=>setFbNextStep(e.target.value as any)}
                    className="mt-1 bg-gray-800 border border-gray-600 rounded px-2 py-1"
                  >
                    <option value="advance">Advance</option>
                    <option value="reject">Reject</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="undecided">Undecided</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-gray-300">Interview Experience</Label>
                  <Textarea
                    value={fbExperience}
                    onChange={(e)=>setFbExperience(e.target.value)}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Issues</Label>
                  <Textarea
                    value={fbIssues}
                    onChange={(e)=>setFbIssues(e.target.value)}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              className="bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
              onClick={endCallNow}
              disabled={isCallEnding}
            >
              Skip & End
            </Button>
            <Button
              onClick={async ()=>{
                // Submit to API then end
                try {
                  setIsCallEnding(true);
                  const payload = isHost
                    ? { rating: fbRating, strengths: fbStrengths, concerns: fbConcerns }
                    : { rating: fbRating, experience: fbExperience, issues: fbIssues };
                  await fetch(`/api/video-interviews/${interviewId}/feedback`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roomId, role: isHost ? "recruiter" : "candidate", payload, nextStep: isHost ? fbNextStep : undefined }),
                  });
                } catch {}
                setShowFeedback(false);
                await endCallNow();
              }}
              disabled={isCallEnding}
            >
              Submit & End
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
