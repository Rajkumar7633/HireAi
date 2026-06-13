"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CollegeMeetingRoom = dynamic(
  () =>
    import("@/components/college-meeting-room").then((m) => m.CollegeMeetingRoom),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        <span>Loading meeting room…</span>
      </div>
    ),
  },
);

const VideoConferenceRoom = dynamic(
  () =>
    import("@/components/video-conference-room").then((m) => m.VideoConferenceRoom),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <span>Loading video interview…</span>
      </div>
    ),
  },
);

const RealTimeChat = dynamic(() => import("@/components/real-time-chat").then((m) => m.RealTimeChat), {
  ssr: false,
});

const ScreenShareControls = dynamic(
  () => import("@/components/screen-share-controls").then((m) => m.ScreenShareControls),
  { ssr: false },
);

export default function VideoCallPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const roomId = String(params?.roomId ?? "");
  const interviewId = searchParams?.get("interviewId") || "";
  const meetingId = searchParams?.get("meetingId") || "";
  const meetingKind = searchParams?.get("kind") || "";
  const isHost = searchParams?.get("isHost") === "true";
  const participantName = searchParams?.get("name") || "User";
  const isCollegeMeeting = meetingKind === "college_meeting" || Boolean(meetingId);
  const isCollegeViewer = isCollegeMeeting && !isHost;

  const [isLoading, setIsLoading] = useState(!isCollegeMeeting);
  const [error, setError] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(isCollegeViewer);
  const [showChat, setShowChat] = useState(false);
  const [showScreenControls, setShowScreenControls] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessageCount, setChatMessageCount] = useState(0);

  useEffect(() => {
    if (isCollegeMeeting) {
      setIsLoading(false);
      return;
    }
    checkPermissions();
  }, [isCollegeMeeting]);

  const checkPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      stream.getTracks().forEach((track) => track.stop());

      setHasPermissions(true);
      setIsLoading(false);

      toast({
        title: "Ready to Join",
        description: "Camera and microphone access granted successfully.",
      });
    } catch (error) {
      console.error("Permission error:", error);
      setError(
        "Camera and microphone access is required for video interviews.",
      );
      setIsLoading(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermissions(true);
      setError(null);

      toast({
        title: "Permissions Granted",
        description: "You can now join the video interview.",
      });
    } catch (error) {
      setError(
        "Please allow camera and microphone access to join the interview.",
      );
      toast({
        title: "Permission Denied",
        description:
          "Camera and microphone access is required for video interviews.",
        variant: "destructive",
      });
    }
  };

  const handleToggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const handleScreenShareEnd = () => {
    setIsScreenSharing(false);
  };

  if (isCollegeMeeting && meetingId) {
    return (
      <CollegeMeetingRoom
        roomId={roomId}
        meetingId={meetingId}
        isHost={isHost}
        participantName={participantName}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p>Preparing video interview...</p>
          <p className="text-sm text-gray-400 mt-2">
            Checking camera and microphone permissions
          </p>
        </div>
      </div>
    );
  }

  if (error || !hasPermissions) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-600">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Permissions Required
            </h2>
            <p className="text-gray-300 mb-6">
              {error ||
                "Camera and microphone access is required to join the video interview."}
            </p>
            <div className="space-y-3">
              <Button onClick={requestPermissions} className="w-full">
                <Video className="w-4 h-4 mr-2" />
                Allow Camera & Microphone
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <div className="flex-1 relative">
        <VideoConferenceRoom
          roomId={roomId}
          interviewId={interviewId}
          meetingId={meetingId}
          isHost={isHost}
          participantName={participantName}
        />

        {showScreenControls && (
          <div className="absolute top-20 left-4 z-40">
            <ScreenShareControls
              isScreenSharing={isScreenSharing}
              onToggleScreenShare={handleToggleScreenShare}
              onScreenShareEnd={handleScreenShareEnd}
              isHost={isHost}
            />
          </div>
        )}
      </div>

      {showChat && (
        <RealTimeChat
          roomId={roomId}
          participantName={participantName}
          participantId="current-user"
          isHost={isHost}
          onMessageCount={setChatMessageCount}
        />
      )}

      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowChat(!showChat)}
          className="bg-gray-800/90 border-gray-600 text-white hover:bg-gray-700"
        >
          Chat {chatMessageCount > 0 && `(${chatMessageCount})`}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowScreenControls(!showScreenControls)}
          className="bg-gray-800/90 border-gray-600 text-white hover:bg-gray-700"
        >
          Screen Share
        </Button>
      </div>
    </div>
  );
}
