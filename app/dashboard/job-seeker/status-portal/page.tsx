"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  FileText,
  MessageSquare,
  Star,
  TrendingUp,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApplicationData {
  _id: string;
  jobDescriptionId: {
    title: string;
    location: string;
    company: string;
    recruiterId: {
      name: string;
      company: string;
    };
  };
  status: string;
  applicationDate: string;
  timeline: Array<{
    status: string;
    date: string;
    completed: boolean;
    description: string;
  }>;
  nextSteps: string[];
  estimatedTimeToResponse: string;
  canWithdraw: boolean;
  testId?: {
    title: string;
    description: string;
  };
  testScore?: number;
  interviewDate?: string;
}

interface PortalData {
  applications: ApplicationData[];
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
}

export default function CandidateStatusPortal() {
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] =
    useState<ApplicationData | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [feedback, setFeedback] = useState({
    rating: 5,
    comment: "",
    category: "application_process",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPortalData();
  }, []);

  const fetchPortalData = async () => {
    try {
      const response = await fetch("/api/candidate/status-portal");
      if (response.ok) {
        const data = await response.json();
        setPortalData(data);
      } else {
        throw new Error("Failed to fetch portal data");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load application status data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!selectedApplication) return;

    try {
      const response = await fetch("/api/candidate/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedApplication._id,
          ...feedback,
        }),
      });

      if (response.ok) {
        toast({
          title: "Feedback Submitted",
          description: "Thank you for your feedback!",
        });
        setFeedbackDialog(false);
        setFeedback({
          rating: 5,
          comment: "",
          category: "application_process",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-500";
      case "Reviewed":
        return "bg-blue-500";
      case "Test Assigned":
        return "bg-purple-500";
      case "Interview Scheduled":
        return "bg-green-500";
      case "Hired":
        return "bg-emerald-500";
      case "Rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getProgressPercentage = (timeline: ApplicationData["timeline"]) => {
    const completed = timeline.filter((item) => item.completed).length;
    return (completed / timeline.length) * 100;
  };

  // Safely parse various date inputs (string/Date) and return Date or null
  const safeParseDate = (value: any): Date | null => {
    try {
      if (!value) return null;
      if (value instanceof Date) return isValid(value) ? value : null;
      const native = new Date(value as any);
      if (isValid(native)) return native;
      const iso = parseISO(String(value));
      return isValid(iso) ? iso : null;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading your application status...</p>
      </div>
    );
  }

  if (!portalData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Unable to load application data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Application Status Portal</h1>
        <p className="text-muted-foreground mt-2">
          Track your job applications and stay updated on your progress
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Applications
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portalData.summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portalData.summary.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portalData.summary.inProgress}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portalData.summary.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Applications</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {portalData.applications
            .filter((app) => !["Hired", "Rejected"].includes(app.status))
            .map((application) => (
              <Card key={application._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {application.jobDescriptionId.title}
                      </CardTitle>
                      <CardDescription>
                        {application.jobDescriptionId.company} •{" "}
                        {application.jobDescriptionId.location}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>
                        {Math.round(
                          getProgressPercentage(application.timeline)
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={getProgressPercentage(application.timeline)}
                      className="h-2"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Next Steps</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {application.nextSteps.map((step, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Recent Timeline</h4>
                      <div className="space-y-2">
                        {application.timeline.slice(-3).map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            {item.completed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span
                              className={
                                item.completed
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }
                            >
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedApplication(application);
                        setFeedbackDialog(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Feedback
                    </Button>
                    {application.testId && !application.testScore && (
                      <Button size="sm">Take Assessment</Button>
                    )}
                    {application.interviewDate && (
                      <Button size="sm" variant="outline">
                        <Calendar className="h-4 w-4 mr-1" />
                        View Interview
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {portalData.applications
            .filter((app) => ["Hired", "Rejected"].includes(app.status))
            .map((application) => (
              <Card key={application._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {application.jobDescriptionId.title}
                      </CardTitle>
                      <CardDescription>
                        {application.jobDescriptionId.company} • Completed on{" "}
                        {format(
                          new Date(application.applicationDate),
                          "MMM dd, yyyy"
                        )}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedApplication(application);
                        setFeedbackDialog(true);
                      }}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Rate Experience
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          {portalData.applications.map((application) => (
            <Card key={application._id}>
              <CardHeader>
                <CardTitle>{application.jobDescriptionId.title}</CardTitle>
                <CardDescription>
                  {application.jobDescriptionId.company}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {application.timeline.map((item, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        {item.completed ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <Clock className="h-6 w-6 text-muted-foreground" />
                        )}
                        {index < application.timeline.length - 1 && (
                          <div className="w-px h-8 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{item.status}</h4>
                          <span className="text-sm text-muted-foreground">
                            {(() => {
                              const dt = safeParseDate(item.date);
                              return dt ? format(dt, "MMM dd, yyyy") : "-";
                            })()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Experience</DialogTitle>
            <DialogDescription>
              Help us improve by sharing feedback about your application
              experience
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rating</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFeedback({ ...feedback, rating: star })}
                    className={`p-1 ${star <= feedback.rating ? "text-yellow-500" : "text-gray-300"}`}
                  >
                    <Star className="h-5 w-5 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={feedback.category} onValueChange={(value) => setFeedback({ ...feedback, category: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application_process">Application Process</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="interview_experience">Interview Experience</SelectItem>
                  <SelectItem value="overall_experience">Overall Experience</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Comments</label>
              <Textarea
                placeholder="Share your thoughts about the application process..."
                value={feedback.comment}
                onChange={(e) =>
                  setFeedback({ ...feedback, comment: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setFeedbackDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={submitFeedback}>Submit Feedback</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
