"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InterviewPipelineDashboard } from "@/components/interview-pipeline-dashboard";
import { InterviewNotificationSystem } from "@/components/interview-notification-system";
import {
  Video,
  Calendar,
  Clock,
  Search,
  Play,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface VideoInterview {
  id: string;
  recruiterName: string;
  recruiterEmail: string;
  position: string;
  scheduledDate: string;
  duration: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "missed";
  meetingLink?: string;
  recordingUrl?: string;
  notes?: string;
  rating?: number;
  avatar?: string;
  roomId?: string;
}

export default function JobSeekerVideoInterviewsPage() {
  const [interviews, setInterviews] = useState<VideoInterview[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showPipeline, setShowPipeline] = useState(false);
  const [mediaPermissions, setMediaPermissions] = useState({
    video: false,
    audio: false,
  });
  const [testingMedia, setTestingMedia] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchInterviews();
    checkMediaPermissions();
  }, []);

  const fetchInterviews = async () => {
    try {
      const response = await fetch("/api/video-interviews");
      if (response.ok) {
        const data = await response.json();
        setInterviews(data.interviews || []);
      }
    } catch (error) {
      console.error("Error fetching interviews:", error);
      // Mock data for demo
      setInterviews([
        {
          id: "1",
          recruiterName: "Sarah Wilson",
          recruiterEmail: "sarah@techcorp.com",
          position: "Senior Frontend Developer",
          scheduledDate: new Date(Date.now() + 3600000).toISOString(),
          duration: 60,
          status: "scheduled",
        },
        {
          id: "2",
          recruiterName: "Michael Chen",
          recruiterEmail: "michael@startup.io",
          position: "Full Stack Engineer",
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          duration: 45,
          status: "scheduled",
        },
      ]);
    } finally {
      setLoading(false);
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
      alert(
        "Media test successful! Your camera and microphone are working properly."
      );
      stream.getTracks().forEach((track) => track.stop());
      setMediaPermissions({ video: true, audio: true });
    } catch (error) {
      alert(
        "Media test failed. Please check your camera and microphone permissions."
      );
    } finally {
      setTestingMedia(false);
    }
  };

  const handleJoinInterview = async (interviewId: string) => {
    if (!mediaPermissions.video || !mediaPermissions.audio) {
      alert("Please allow camera and microphone access to join the interview.");
      return;
    }

    try {
      const response = await fetch(
        `/api/video-interviews/${interviewId}/join`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        const data = await response.json();
        router.push(
          `/video-call/${data.roomId}?interviewId=${interviewId}&isHost=false&name=Candidate`
        );
      }
    } catch (error) {
      console.error("Error joining interview:", error);
    }
  };

  const filteredInterviews = interviews.filter((interview) => {
    const matchesSearch =
      interview.recruiterName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      interview.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.recruiterEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      selectedFilter === "all" || interview.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "missed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Calendar className="w-4 h-4" />;
      case "in-progress":
        return <Play className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      case "missed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const canJoinInterview = (interview: VideoInterview) => {
    if (interview.status !== "scheduled") return false;
    const interviewTime = new Date(interview.scheduledDate);
    const now = new Date();
    const timeDiff =
      Math.abs(now.getTime() - interviewTime.getTime()) / (1000 * 60);
    return timeDiff <= 15;
  };

  const stats = {
    total: interviews.length,
    scheduled: interviews.filter((i) => i.status === "scheduled").length,
    completed: interviews.filter((i) => i.status === "completed").length,
    upcoming: interviews.filter(
      (i) => i.status === "scheduled" && new Date(i.scheduledDate) > new Date()
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your interviews...</p>
        </div>
      </div>
    );
  }

  if (showPipeline) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Interview Pipeline
            </h1>
            <p className="text-gray-600 mt-1">
              Your interview progress and analytics
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <InterviewNotificationSystem />
            <Button variant="outline" onClick={() => setShowPipeline(false)}>
              Back to List
            </Button>
          </div>
        </div>
        <InterviewPipelineDashboard userRole="job_seeker" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            My Video Interviews
          </h1>
          <p className="text-gray-600 mt-1">
            Join and manage your scheduled video interviews
          </p>
        </div>

        <div className="flex items-center gap-4">
          <InterviewNotificationSystem />
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
            {testingMedia ? "Testing..." : "Test Media"}
          </Button>
          <Button variant="outline" onClick={() => setShowPipeline(true)}>
            View Pipeline
          </Button>
        </div>
      </div>

      {/* Media Permissions Warning */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Interviews
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <Video className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.upcoming}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.scheduled}
                </p>
              </div>
              <Play className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.completed}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search interviews by recruiter, position, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedFilter === "all" ? "default" : "outline"}
                onClick={() => setSelectedFilter("all")}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={selectedFilter === "scheduled" ? "default" : "outline"}
                onClick={() => setSelectedFilter("scheduled")}
                size="sm"
              >
                Scheduled
              </Button>
              <Button
                variant={selectedFilter === "completed" ? "default" : "outline"}
                onClick={() => setSelectedFilter("completed")}
                size="sm"
              >
                Completed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interviews List */}
      <div className="space-y-4">
        {filteredInterviews.map((interview) => (
          <Card
            key={interview.id}
            className="hover:shadow-lg transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={interview.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {interview.recruiterName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {interview.position}
                    </h3>
                    <p className="text-sm text-gray-600">
                      with {interview.recruiterName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {interview.recruiterEmail}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {format(
                        new Date(interview.scheduledDate),
                        "MMM dd, yyyy"
                      )}
                    </p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(interview.scheduledDate), "hh:mm a")} •{" "}
                      {interview.duration}min
                    </p>
                  </div>

                  <Badge
                    className={`${getStatusColor(
                      interview.status
                    )} flex items-center gap-1`}
                  >
                    {getStatusIcon(interview.status)}
                    {interview.status.replace("-", " ")}
                  </Badge>

                  <div className="flex space-x-2">
                    {interview.status === "scheduled" && (
                      <Button
                        size="sm"
                        className={
                          canJoinInterview(interview)
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        }
                        onClick={() => handleJoinInterview(interview.id)}
                        disabled={
                          !mediaPermissions.video || !mediaPermissions.audio
                        }
                      >
                        <Video className="w-4 h-4 mr-1" />
                        {canJoinInterview(interview) ? "Join Now" : "Join"}
                      </Button>
                    )}
                    {interview.status === "completed" &&
                      interview.recordingUrl && (
                        <Button size="sm" variant="outline">
                          <Play className="w-4 h-4 mr-1" />
                          Recording
                        </Button>
                      )}
                    <Button size="sm" variant="outline">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredInterviews.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No interviews found
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? "Try adjusting your search criteria."
                : "You have no video interviews scheduled."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
