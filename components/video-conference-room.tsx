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
import { InterviewFeedbackWizard } from "@/components/interview-feedback-wizard";

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
  meetingId?: string;
  isHost?: boolean;
  participantName?: string;
}

export function VideoConferenceRoom({
  roomId,
  interviewId,
  meetingId = "",
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

  const darkOutlineBtn =
    "bg-gray-700/90 border-gray-500 text-white hover:bg-gray-600 hover:text-white";
  const darkOutlineActive = "bg-violet-600 border-violet-500 text-white hover:bg-violet-700";
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

  // Poll interview status for waiting room if not host (recruiter interviews only)
  useEffect(() => {
    if (!isHost && interviewId && !meetingId) {
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
  }, [interviewId, isHost, meetingId]);

  // College meeting attendance heartbeat (students only)
  useEffect(() => {
    if (!meetingId || isHost) return
    const iv = setInterval(() => {
      fetch(`/api/job-seeker/meetings/${meetingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat" }),
      }).catch(() => {})
    }, 30000)
    return () => clearInterval(iv)
  }, [meetingId, isHost])

  const leaveCollegeMeeting = useCallback(async () => {
    if (!meetingId || isHost) return
    try {
      await fetch(`/api/job-seeker/meetings/${meetingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      })
    } catch {
      // ignore
    }
  }, [meetingId, isHost])

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
      if (meetingId) {
        await leaveCollegeMeeting();
        addSystemMessage("Left meeting");
        toast({
          title: "Left meeting",
          description: "You have left the college meeting.",
        });
        setTimeout(() => {
          cleanupWebRTC();
          router.push("/dashboard/calendar");
        }, 800);
        return;
      }

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
  }, [cleanupWebRTC, interviewId, interviewNotes, recordingDuration, router, toast, meetingId, leaveCollegeMeeting]);

  const endCall = useCallback(() => {
    if (meetingId) {
      endCallNow();
      return;
    }
    // Open feedback dialog first
    setShowFeedback(true);
  }, [meetingId, endCallNow]);

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

  const otherParticipant = participants.find((p) => p.id !== "current-user");
  const remoteLabel = otherParticipant?.name ?? (isHost ? "Candidate" : "Recruiter");
  const localLabel = participantName || "You";
  const immersiveVideo = !showCode;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-gray-900/95 p-3 md:p-4 flex items-center justify-between border-b border-gray-700/80 backdrop-blur-sm">
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
            className={`flex items-center gap-1 ${showChat ? darkOutlineActive : darkOutlineBtn}`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Chat</span>
            {chatMessages.length > 0 && (
              <Badge className="ml-1 text-xs bg-violet-500 text-white border-0">
                {chatMessages.length}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCode(!showCode)}
            className={`flex items-center gap-1 ${showCode ? darkOutlineActive : darkOutlineBtn}`}
          >
            <Code2 className="w-4 h-4" />
            <span className="hidden sm:inline">Code</span>
          </Button>
          {isHost && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
              className={`flex items-center gap-1 ${showNotes ? darkOutlineActive : darkOutlineBtn}`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Notes</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className={darkOutlineBtn}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main Video Area */}
        <div
          className={`min-w-0 relative bg-gray-950 flex flex-col min-h-0 ${
            showCode ? "flex-1" : "flex-1"
          }`}
        >
          <div
            className={`flex-1 min-h-0 ${
              immersiveVideo ? "p-2 md:p-3" : "p-2"
            }`}
          >
            <div
              className={`h-full min-h-[240px] ${
                immersiveVideo
                  ? "grid grid-cols-2 gap-2 md:gap-3"
                  : "grid grid-cols-2 gap-2"
              }`}
            >
              {/* Remote participant — left / first half */}
              <div className="relative min-h-0 rounded-xl overflow-hidden bg-gray-800 border border-gray-700/80 shadow-lg ring-1 ring-white/5">
                <video
                  ref={remoteVideoRef}
                  className={`w-full h-full min-h-[200px] object-cover bg-gray-900 ${
                    remoteStream ? "" : "opacity-0"
                  }`}
                  autoPlay
                  playsInline
                />
                {!remoteStream && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 text-gray-400 gap-3">
                    <Users className="w-12 h-12 opacity-50" />
                    <p className="text-sm font-medium">{remoteLabel}</p>
                    <p className="text-xs text-gray-500">Waiting for video…</p>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-black/65 text-white text-xs font-medium backdrop-blur-sm">
                    {remoteLabel}
                  </span>
                  {otherParticipant?.isHost && (
                    <Badge className="bg-violet-600/90 text-white border-0 text-[10px]">Host</Badge>
                  )}
                </div>
                {otherParticipant && (
                  <div className="absolute top-3 right-3 flex gap-1">
                    {otherParticipant.mediaState.video ? (
                      <Video className="w-4 h-4 text-emerald-400 drop-shadow" />
                    ) : (
                      <VideoOff className="w-4 h-4 text-red-400 drop-shadow" />
                    )}
                    {otherParticipant.mediaState.audio ? (
                      <Mic className="w-4 h-4 text-emerald-400 drop-shadow" />
                    ) : (
                      <MicOff className="w-4 h-4 text-red-400 drop-shadow" />
                    )}
                  </div>
                )}
              </div>

              {/* Local participant — right / second half */}
              <div className="relative min-h-0 rounded-xl overflow-hidden bg-gray-800 border border-gray-700/80 shadow-lg ring-1 ring-white/5">
                <video
                  ref={localVideoRef}
                  className="w-full h-full min-h-[200px] object-cover bg-gray-900"
                  autoPlay
                  playsInline
                  muted
                />
                {needsUserPlay && (
                  <button
                    className="absolute inset-0 bg-gray-900/75 flex items-center justify-center text-sm text-white z-10"
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 text-gray-400 gap-2">
                    <Camera className="w-10 h-10 opacity-50" />
                    <span className="text-sm">Camera off</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-black/65 text-white text-xs font-medium backdrop-blur-sm">
                    {localLabel}
                  </span>
                  {isHost && (
                    <Badge className="bg-violet-600/90 text-white border-0 text-[10px]">Host</Badge>
                  )}
                </div>
                <div className="absolute top-3 right-3 flex gap-1">
                  {mediaState.video ? (
                    <Video className="w-4 h-4 text-emerald-400 drop-shadow" />
                  ) : (
                    <VideoOff className="w-4 h-4 text-red-400 drop-shadow" />
                  )}
                  {mediaState.audio ? (
                    <Mic className="w-4 h-4 text-emerald-400 drop-shadow" />
                  ) : (
                    <MicOff className="w-4 h-4 text-red-400 drop-shadow" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Participants quick actions (host mute) — compact bar when immersive */}
          {immersiveVideo && isHost && otherParticipant && (
            <div className="shrink-0 px-3 pb-2 flex items-center justify-center gap-2">
              <span className="text-xs text-gray-400">
                {participants.length} in call
              </span>
              {!otherParticipant.isHost && (
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-7 text-xs ${darkOutlineBtn}`}
                  onClick={() => hostToggleMuteParticipant(otherParticipant.id)}
                >
                  {otherParticipant.mutedByHost ? "Unmute candidate" : "Mute candidate"}
                </Button>
              )}
            </div>
          )}

          {!immersiveVideo && (
            <div className="absolute top-3 left-3 z-10 max-w-[220px]">
              <Card className="bg-gray-900/90 border-gray-600 backdrop-blur-sm">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center text-white">
                    <Users className="w-3 h-3 mr-1.5" />
                    Participants ({participants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-2 space-y-1">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <div
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          participant.connectionStatus === "connected" ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      <span className="truncate">{participant.name}</span>
                      {isHost && !participant.isHost && (
                        <Button
                          size="sm"
                          variant="outline"
                          className={`ml-auto h-5 px-1.5 text-[10px] ${darkOutlineBtn}`}
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
          )}

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
          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-[95vw]">
            <div className="flex items-center gap-2 md:gap-3 bg-gray-900/95 rounded-2xl px-3 md:px-5 py-2.5 backdrop-blur-md border border-gray-600/80 shadow-xl">
              <Button
                size="sm"
                onClick={toggleAudio}
                className={`rounded-full w-11 h-11 shrink-0 ${
                  mediaState.audio
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-red-600 hover:bg-red-500 text-white"
                }`}
                disabled={isCallEnding}
                title={mediaState.audio ? "Mute" : "Unmute"}
              >
                {mediaState.audio ? (
                  <Mic className="w-5 h-5" />
                ) : (
                  <MicOff className="w-5 h-5" />
                )}
              </Button>

              <Button
                size="sm"
                onClick={toggleVideo}
                className={`rounded-full w-11 h-11 shrink-0 ${
                  mediaState.video
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-red-600 hover:bg-red-500 text-white"
                }`}
                disabled={isCallEnding}
                title={mediaState.video ? "Stop camera" : "Start camera"}
              >
                {mediaState.video ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <VideoOff className="w-5 h-5" />
                )}
              </Button>

              <Button
                size="sm"
                onClick={toggleScreenShare}
                className={`rounded-full w-11 h-11 shrink-0 ${
                  mediaState.screen
                    ? "bg-violet-600 hover:bg-violet-500 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-white border border-gray-500"
                }`}
                disabled={isCallEnding}
                title="Share screen"
              >
                {mediaState.screen ? (
                  <MonitorOff className="w-5 h-5" />
                ) : (
                  <Monitor className="w-5 h-5" />
                )}
              </Button>

              <Button
                size="sm"
                onClick={toggleRaiseHand}
                className="rounded-full h-11 px-3 shrink-0 bg-gray-700 hover:bg-gray-600 text-white border border-gray-500 text-xs md:text-sm"
                disabled={isCallEnding}
              >
                ✋{" "}
                <span className="hidden sm:inline">
                  {participants.find((p) => p.id === "current-user")?.handRaised ? "Lower" : "Raise"}
                </span>
              </Button>

              {isHost && (
                <Button
                  size="sm"
                  onClick={toggleRecording}
                  className={`rounded-full w-11 h-11 shrink-0 ${
                    isRecording
                      ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
                      : "bg-gray-700 hover:bg-gray-600 text-white border border-gray-500"
                  }`}
                  disabled={isCallEnding}
                  title={isRecording ? "Stop recording" : "Record"}
                >
                  {isRecording ? (
                    <Square className="w-5 h-5" />
                  ) : (
                    <Record className="w-5 h-5" />
                  )}
                </Button>
              )}

              <Button
                size="sm"
                onClick={endCall}
                className="rounded-full w-11 h-11 shrink-0 bg-red-600 hover:bg-red-500 text-white"
                disabled={isCallEnding}
                title="End call"
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
                  className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Collaborative Code Sidebar */}
        {showCode && (
          <div className="w-full sm:w-[min(720px,48vw)] shrink-0 bg-gray-950 border-l border-gray-700/80 flex flex-col min-h-0 shadow-2xl">
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-700/80 bg-gray-900/80">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
                <Code2 className="w-4 h-4 text-violet-400" />
                Live coding studio
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCode(false)}
                className={darkOutlineBtn}
              >
                Close
              </Button>
            </div>
            <div className="flex-1 min-h-0 p-3 overflow-hidden">
              <CollabCodePanel roomId={roomId} interviewId={interviewId} isHost={isHost} />
            </div>
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

      {/* Post-interview feedback → syncs to job pipeline */}
      <InterviewFeedbackWizard
        open={showFeedback}
        onOpenChange={setShowFeedback}
        isHost={isHost}
        isSubmitting={isCallEnding}
        onSkip={() => {
          setShowFeedback(false);
          endCallNow();
        }}
        onSubmit={async ({ recruiterPayload, candidatePayload, nextStep }) => {
          try {
            setIsCallEnding(true);
            if (interviewId) {
              await fetch(`/api/video-interviews/${interviewId}/feedback`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  roomId,
                  role: isHost ? "recruiter" : "candidate",
                  payload: isHost ? recruiterPayload : candidatePayload,
                  nextStep: isHost ? nextStep : undefined,
                }),
              });
            }
          } catch {
            toast({
              title: "Feedback save issue",
              description: "Interview will still end — check pipeline later.",
              variant: "destructive",
            });
          }
          setShowFeedback(false);
          await endCallNow();
        }}
      />
    </div>
  );
}
