"use client";

import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Calendar,
  Clock,
  Video,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Play,
  Settings,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface Interview {
  _id: string;
  recruiterId: string;
  candidateId: string;
  jobId: string;
  scheduledDate: string;
  duration: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "missed";
  meetingLink?: string;
  roomId?: string;
  recordingUrl?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MyInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mediaPermissions, setMediaPermissions] = useState({
    video: false,
    audio: false,
  });
  const [testingMedia, setTestingMedia] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchInterviews();
    checkMediaPermissions();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchInterviews(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchInterviews = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);

    try {
      let retries = 3;
      let response;

      while (retries > 0) {
        response = await fetch("/api/video-interviews", {
          cache: "no-store",
        });

        if (response.ok) {
          break;
        } else if (response.status === 503) {
          const errorData = await response.json();
          if (errorData.code === "DB_TIMEOUT" && retries > 1) {
            console.log(
              `Database timeout, retrying... (${retries - 1} attempts left)`
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));
            retries--;
            continue;
          }
        }

        throw new Error("Failed to fetch interviews");
      }

      const data = await response.json();
      setInterviews(data.interviews || []);

      if (!silent && data.interviews?.length > 0) {
        console.log(`✅ Loaded ${data.interviews.length} interviews`);
      }
    } catch (error) {
      console.error("Error fetching interviews:", error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to fetch interviews. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setMediaPermissions({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("Media permissions denied:", error);
      setMediaPermissions({ video: false, audio: false });
    }
  };

  const testMediaDevices = async () => {
    setTestingMedia(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      toast({
        title: "Media Test Successful",
        description: "Your camera and microphone are working properly.",
      });
      stream.getTracks().forEach((track) => track.stop());
      setMediaPermissions({ video: true, audio: true });
    } catch (error) {
      toast({
        title: "Media Test Failed",
        description: "Please check your camera and microphone permissions.",
        variant: "destructive",
      });
    } finally {
      setTestingMedia(false);
    }
  };

  const handleJoinInterview = async (interviewId: string) => {
    if (!mediaPermissions.video || !mediaPermissions.audio) {
      toast({
        title: "Media Permissions Required",
        description:
          "Please allow camera and microphone access to join the interview.",
        variant: "destructive",
      });
      return;
    }

    try {
      let retries = 3;
      let response;

      while (retries > 0) {
        response = await fetch(`/api/video-interviews/${interviewId}/join`, {
          method: "POST",
        });

        if (response.ok) {
          const data = await response.json();
          console.log("✅ Successfully joined interview:", data.roomId);
          router.push(
            `/video-call/${data.roomId}?peerId=${data.peerId}&isHost=false&interviewId=${interviewId}`
          );
          return;
        } else if (response.status === 503) {
          const errorData = await response.json();

          if (
            (errorData.code === "DB_TIMEOUT" ||
              errorData.code === "DB_UNAVAILABLE") &&
            retries > 1
          ) {
            toast({
              title: "Connection Issue",
              description: `Database timeout. Retrying... (${
                retries - 1
              } attempts left)`,
              variant: "destructive",
            });

            await new Promise((resolve) =>
              setTimeout(resolve, errorData.retryAfter || 3000)
            );
            retries--;
            continue;
          }
        }

        const errorData = await response.json();
        toast({
          title: "Error",
          description:
            errorData.message || "Failed to join interview. Please try again.",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error("Error joining interview:", error);
      toast({
        title: "Network Error",
        description:
          "Failed to connect to interview. Please check your internet connection.",
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: Interview["status"]) => {
    switch (status) {
      case "scheduled":
        return "default";
      case "in-progress":
        return "secondary";
      case "completed":
        return "success";
      case "cancelled":
      case "missed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: Interview["status"]) => {
    switch (status) {
      case "scheduled":
        return <Calendar className="w-4 h-4" />;
      case "in-progress":
        return <Play className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
      case "missed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const canJoinInterview = (interview: Interview) => {
    if (interview.status !== "scheduled") return false;
    const interviewTime = new Date(interview.scheduledDate);
    const now = new Date();
    const timeDiff =
      Math.abs(now.getTime() - interviewTime.getTime()) / (1000 * 60); // minutes
    return timeDiff <= 15; // Can join 15 minutes before/after scheduled time
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading interviews...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Interviews</h1>
          <p className="text-gray-600 mt-1">
            Manage your scheduled video interviews
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                mediaPermissions.video ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span>Camera</span>
            <div
              className={`w-2 h-2 rounded-full ${
                mediaPermissions.audio ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span>Microphone</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={testMediaDevices}
            disabled={testingMedia}
          >
            {testingMedia ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Settings className="w-4 h-4 mr-2" />
            )}
            Test Media
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchInterviews()}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {(!mediaPermissions.video || !mediaPermissions.audio) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">
                  Media Permissions Required
                </h3>
                <p className="text-sm text-yellow-700">
                  Please allow camera and microphone access to join video
                  interviews.
                </p>
              </div>
              <Button size="sm" onClick={testMediaDevices} className="ml-auto">
                Grant Permissions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {interviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No interviews scheduled
            </h3>
            <p>You have no upcoming or past interviews.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {interviews.map((interview) => (
            <Card
              key={interview._id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Video Interview</span>
                  </div>
                  <Badge
                    variant={getStatusVariant(interview.status)}
                    className="flex items-center gap-1"
                  >
                    {getStatusIcon(interview.status)}
                    {interview.status.charAt(0).toUpperCase() +
                      interview.status.slice(1)}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Interview ID: {interview._id.slice(-8)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(interview.scheduledDate), "MMM dd, yyyy")}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {format(new Date(interview.scheduledDate), "hh:mm a")}
                    {interview.duration && ` • ${interview.duration}min`}
                  </p>
                  <p className="flex items-center gap-2 text-blue-600">
                    <Video className="h-4 w-4" />
                    Video Interview
                  </p>
                </div>

                {interview.feedback && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-1">Feedback:</h3>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {interview.feedback}
                      </p>
                      {interview.rating && (
                        <div className="flex items-center mt-2 gap-1">
                          <span className="text-xs text-gray-600">Rating:</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <div
                                key={star}
                                className={`w-3 h-3 rounded-full ${
                                  star <= interview.rating!
                                    ? "bg-yellow-400"
                                    : "bg-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {interview.status === "completed" && interview.recordingUrl && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      View Recording
                    </Button>
                  </>
                )}

                <Separator />
                <div className="flex justify-between gap-2">
                  {interview.status === "scheduled" && (
                    <Button
                      variant={
                        canJoinInterview(interview) ? "default" : "outline"
                      }
                      size="sm"
                      className={
                        canJoinInterview(interview)
                          ? "bg-green-600 hover:bg-green-700"
                          : ""
                      }
                      onClick={() => handleJoinInterview(interview._id)}
                      disabled={
                        !canJoinInterview(interview) ||
                        !mediaPermissions.video ||
                        !mediaPermissions.audio
                      }
                    >
                      <Video className="mr-2 h-4 w-4" />
                      {canJoinInterview(interview)
                        ? "Join Now"
                        : "Join Interview"}
                    </Button>
                  )}

                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/dashboard/messages?userId=${interview.recruiterId}`}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Message
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
