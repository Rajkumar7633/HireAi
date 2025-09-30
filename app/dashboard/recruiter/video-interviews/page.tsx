"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InterviewPipelineDashboard } from "@/components/interview-pipeline-dashboard";
import { InterviewNotificationSystem } from "@/components/interview-notification-system";
import {
  Video,
  CalendarIcon,
  Clock,
  Plus,
  Search,
  Filter,
  Play,
  Settings,
  MessageCircle,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface VideoInterview {
  id: string;
  candidateName: string;
  candidateEmail: string;
  position: string;
  scheduledDate: string;
  duration: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "missed" | "expired";
  meetingLink?: string;
  recordingUrl?: string;
  notes?: string;
  rating?: number;
  avatar?: string;
  roomId?: string;
  startedAt?: string;
  endedAt?: string;
  hostJoinedAt?: string;
  candidateJoinedAt?: string;
}

export default function VideoInterviewsPage() {
  const [interviews, setInterviews] = useState<VideoInterview[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<null | { id: string; current: VideoInterview }>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    candidateEmail: "",
    candidateName: "",
    position: "",
    scheduledDate: "",
    duration: 60,
    notes: "",
  });
  // Calendar + time for Schedule modal
  const [schedDate, setSchedDate] = useState<Date | undefined>(undefined);
  const [schedTime, setSchedTime] = useState<string>("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const response = await fetch("/api/video-interviews");
      if (response.ok) {
        const data = await response.json();
        const items = (data.interviews || []).map((it: any) => ({
          id: it._id || it.id,
          candidateName: it.candidateName || "",
          candidateEmail: it.candidateEmail || "",
          position: it.position || "",
          scheduledDate: it.scheduledDate,
          duration: it.duration || 60,
          status: it.status || "scheduled",
          meetingLink: it.meetingLink,
          recordingUrl: it.recordingUrl,
          notes: it.notes,
          avatar: it.avatar,
          roomId: it.roomId,
          startedAt: it.startedAt,
          endedAt: it.endedAt,
          hostJoinedAt: it.hostJoinedAt,
          candidateJoinedAt: it.candidateJoinedAt,
        }));
        // Recompute status client-side to avoid stale flags
        setInterviews(items.map((i) => ({ ...i, status: computeStatus(i) as any })));
      }
    } catch (error) {
      console.error("Error fetching interviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const computeStatus = (i: VideoInterview) => {
    const now = Date.now();
    const start = new Date(i.scheduledDate).getTime();
    const durationMs = (i.duration || 60) * 60 * 1000;
    const graceMs = 15 * 60 * 1000; // 15 min grace
    const endWindow = start + durationMs + graceMs;
    const hasHost = !!i.hostJoinedAt;
    const hasCand = !!i.candidateJoinedAt;
    const started = !!i.startedAt || hasHost || hasCand;
    const ended = !!i.endedAt;
    if (ended) return "completed";
    if (started && now < endWindow) return "in-progress";
    if (now < start && !started) return "scheduled";
    if (now >= endWindow && !started) return "missed"; // no one joined
    if (now >= endWindow && started && !ended) return "expired";
    return "scheduled";
  };

  const handleScheduleInterview = async () => {
    // Basic validation
    const emailOk = /.+@.+\..+/.test(scheduleForm.candidateEmail.trim());
    if (!scheduleForm.candidateName.trim()) return toast({ title: "Candidate name required", variant: "destructive" });
    if (!emailOk) return toast({ title: "Valid email required", variant: "destructive" });
    if (!scheduleForm.position.trim()) return toast({ title: "Position required", variant: "destructive" });
    // Build datetime from calendar + time
    if (!schedDate) return toast({ title: "Pick a date", variant: "destructive" });
    if (!schedTime) return toast({ title: "Pick a time", variant: "destructive" });
    const [hh, mm] = schedTime.split(":").map((v) => parseInt(v || "0", 10));
    const when = new Date(schedDate);
    when.setHours(hh || 0, mm || 0, 0, 0);
    if (Number.isNaN(when.getTime())) return toast({ title: "Invalid date/time", variant: "destructive" });
    if (when.getTime() < Date.now() - 60_000) return toast({ title: "Date must be in the future", variant: "destructive" });

    try {
      setScheduling(true);
      const payload = {
        ...scheduleForm,
        candidateEmail: scheduleForm.candidateEmail.trim(),
        candidateName: scheduleForm.candidateName.trim(),
        position: scheduleForm.position.trim(),
        scheduledDate: when.toISOString(),
      };

      const response = await fetch("/api/video-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({ title: "Scheduled", description: "Invite created and saved." });
        setShowScheduleModal(false);
        setScheduleForm({
          candidateEmail: "",
          candidateName: "",
          position: "",
          scheduledDate: "",
          duration: 60,
          notes: "",
        });
        setSchedDate(undefined);
        setSchedTime("");
        fetchInterviews();
      } else {
        const t = await response.text();
        toast({ title: "Failed to schedule", description: t || "Please try again.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error scheduling interview:", error);
      toast({ title: "Schedule error", description: String(error), variant: "destructive" });
    }
    setScheduling(false);
  };

  const handleJoinInterview = async (interviewId: string) => {
    try {
      const response = await fetch(
        `/api/video-interviews/${interviewId}/join`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        const data = await response.json();
        const url = data.joinUrl || (data.roomId ? `/video-call/${data.roomId}?interviewId=${interviewId}&isHost=true` : null);
        if (url) {
          router.push(url);
        }
      }
    } catch (error) {
      console.error("Error joining interview:", error);
    }
  };

  const openMessage = (interview: VideoInterview) => {
    // Navigate to your messaging area with preselected user if available
    const q = interview.candidateEmail ? `?to=${encodeURIComponent(interview.candidateEmail)}` : "";
    router.push(`/dashboard/messages${q}`);
  };

  const openReschedule = (interview: VideoInterview) => {
    setShowRescheduleModal({ id: interview.id, current: interview });
    setScheduleForm({
      candidateEmail: interview.candidateEmail,
      candidateName: interview.candidateName,
      position: interview.position,
      scheduledDate: new Date(interview.scheduledDate).toISOString().slice(0,16),
      duration: interview.duration || 60,
      notes: interview.notes || "",
    });
  };

  const submitReschedule = async () => {
    if (!showRescheduleModal) return;
    if (!scheduleForm.scheduledDate) {
      toast({ title: "Missing date", description: "Please select a new date/time.", variant: "destructive" });
      return;
    }
    try {
      setRescheduling(true);
      // Convert local input (YYYY-MM-DDTHH:mm) to ISO for server
      const iso = new Date(scheduleForm.scheduledDate).toISOString();
      const res = await fetch(`/api/video-interviews/${showRescheduleModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate: iso,
          duration: scheduleForm.duration,
          reason: "reschedule",
        }),
      });
      if (res.ok) {
        setShowRescheduleModal(null);
        toast({ title: "Rescheduled", description: "Interview time updated." });
        await fetchInterviews();
      } else {
        const t = await res.text();
        toast({ title: "Failed to reschedule", description: t || "Please try again.", variant: "destructive" });
      }
    } catch (e) {
      console.error("Reschedule failed", e);
      toast({ title: "Reschedule error", description: String(e), variant: "destructive" });
    }
    setRescheduling(false);
  };

  const cancelInterview = async () => {
    if (!showRescheduleModal) return;
    try {
      const res = await fetch(`/api/video-interviews/${showRescheduleModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        setShowRescheduleModal(null);
        toast({ title: "Cancelled", description: "Interview has been cancelled." });
        await fetchInterviews();
      } else {
        const t = await res.text();
        toast({ title: "Failed to cancel", description: t || "Please try again.", variant: "destructive" });
      }
    } catch (e) {
      console.error("Cancel failed", e);
      toast({ title: "Cancel error", description: String(e), variant: "destructive" });
    }
  };

  const filteredInterviews = interviews.filter((interview) => {
    const matchesSearch =
      (interview.candidateName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (interview.position || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (interview.candidateEmail || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

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
      case "expired":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <CalendarIcon className="w-4 h-4" />;
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

  const stats = {
    total: interviews.length,
    scheduled: interviews.filter((i) => i.status === "scheduled").length,
    completed: interviews.filter((i) => i.status === "completed").length,
    inProgress: interviews.filter((i) => i.status === "in-progress").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video interviews...</p>
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
              Comprehensive interview analytics and management
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <InterviewNotificationSystem />
            <Button variant="outline" onClick={() => setShowPipeline(false)}>
              Back to List
            </Button>
          </div>
        </div>
        <InterviewPipelineDashboard userRole="recruiter" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Video Interviews</h1>
          <p className="text-gray-600 mt-1">
            Schedule and manage video interviews with candidates
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <InterviewNotificationSystem />
          <Button variant="outline" onClick={() => setShowPipeline(true)}>
            View Pipeline
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowScheduleModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Interview
          </Button>
        </div>
      </div>

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
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.scheduled}
                </p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.inProgress}
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
                placeholder="Search interviews by candidate name, position, or email..."
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
                variant={
                  selectedFilter === "in-progress" ? "default" : "outline"
                }
                onClick={() => setSelectedFilter("in-progress")}
                size="sm"
              >
                Live
              </Button>
              <Button
                variant={selectedFilter === "completed" ? "default" : "outline"}
                onClick={() => setSelectedFilter("completed")}
                size="sm"
              >
                Completed
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
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
                      {interview.candidateName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {interview.candidateName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {interview.position}
                    </p>
                    <p className="text-xs text-gray-500">
                      {interview.candidateEmail}
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
                    {(interview.status === "scheduled" || interview.status === "in-progress") && (
                      <Button
                        size="sm"
                        className={
                          interview.status === "in-progress"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }
                        onClick={() => handleJoinInterview(interview.id)}
                      >
                        <Video className="w-4 h-4 mr-1" />
                        {interview.status === "in-progress"
                          ? "Join Live"
                          : "Join"}
                      </Button>
                    )}
                    {interview.status === "completed" &&
                      interview.recordingUrl && (
                        <Button size="sm" variant="outline">
                          <Play className="w-4 h-4 mr-1" />
                          Recording
                        </Button>
                      )}
                    <Button size="sm" variant="outline" onClick={() => openMessage(interview)}>
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openReschedule(interview)}>
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {interview.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{interview.notes}</p>
                  {interview.rating && (
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-gray-600 mr-2">
                        Rating:
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= interview.rating!
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or schedule a new interview.
            </p>
            <Button onClick={() => setShowScheduleModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Interview
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl shadow-2xl border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">Schedule Video Interview</CardTitle>
              <p className="text-sm text-gray-500">Send a calendar invite and meeting link to the candidate.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Candidate Name<span className="text-red-500"> *</span></label>
                  <Input
                    placeholder="John Doe"
                    value={scheduleForm.candidateName}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, candidateName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Candidate Email<span className="text-red-500"> *</span></label>
                  <Input
                    type="email"
                    placeholder="candidate@example.com"
                    value={scheduleForm.candidateEmail}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, candidateEmail: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Position<span className="text-red-500"> *</span></label>
                  <Input
                    placeholder="Senior Developer"
                    value={scheduleForm.position}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, position: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Date<span className="text-red-500"> *</span></label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {schedDate ? new Date(schedDate).toLocaleDateString() : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Calendar mode="single" selected={schedDate} onSelect={setSchedDate} disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium">Time<span className="text-red-500"> *</span></label>
                  <Input type="time" step={300} value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
                  <p className="text-xs text-gray-500 mt-1">Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    placeholder="60"
                    value={scheduleForm.duration}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, duration: Number.parseInt(e.target.value || "60") })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    placeholder="Interview notes, topics, panel, etc."
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">A calendar invite will be emailed to the candidate.</p>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setShowScheduleModal(false)} disabled={scheduling}>Cancel</Button>
                  <Button onClick={handleScheduleInterview} disabled={scheduling}>{scheduling ? "Scheduling..." : "Schedule"}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reschedule Interview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Date & Time</label>
                <Input
                  type="datetime-local"
                  value={scheduleForm.scheduledDate}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input
                  type="number"
                  value={scheduleForm.duration}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, duration: Number.parseInt(e.target.value || "60") })
                  }
                />
              </div>
              <div className="flex justify-between items-center">
                <Button variant="destructive" onClick={cancelInterview} disabled={rescheduling}>Cancel Interview</Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setShowRescheduleModal(null)} disabled={rescheduling}>Close</Button>
                  <Button onClick={submitReschedule} disabled={rescheduling}>Save</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
