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
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <span>Loading video interview studio…</span>
      </div>
    ),
  },
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

  useEffect(() => {
    if (isCollegeMeeting) {
      setIsLoading(false);
      return;
    }
    checkPermissions();
  }, [isCollegeMeeting]);

  const checkPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermissions(true);
      setIsLoading(false);
      toast({ title: "Ready to join", description: "Camera and microphone are ready." });
    } catch {
      setError("Camera and microphone access is required for video interviews.");
      setIsLoading(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermissions(true);
      setError(null);
      toast({ title: "Permissions granted" });
    } catch {
      setError("Please allow camera and microphone access to join the interview.");
      toast({ title: "Permission denied", variant: "destructive" });
    }
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-violet-500 mx-auto mb-4" />
          <p className="font-medium">Preparing interview room…</p>
          <p className="text-sm text-gray-400 mt-2">Checking camera and microphone</p>
        </div>
      </div>
    );
  }

  if (error || !hasPermissions) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Permissions required</h2>
            <p className="text-gray-300 mb-6 text-sm">{error || "Allow camera and microphone to join."}</p>
            <div className="space-y-3">
              <Button onClick={requestPermissions} className="w-full bg-violet-600 hover:bg-violet-700">
                <Video className="w-4 h-4 mr-2" />
                Allow camera & microphone
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="w-full border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
              >
                Return to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <VideoConferenceRoom
      roomId={roomId}
      interviewId={interviewId}
      meetingId={meetingId}
      isHost={isHost}
      participantName={participantName}
    />
  );
}
