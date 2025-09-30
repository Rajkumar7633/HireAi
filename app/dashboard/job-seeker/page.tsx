"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Briefcase,
  MessageSquare,
  Bot,
  ListChecks,
  Target,
  TrendingUp,
  Clock,
  Zap,
  Brain,
  Calendar,
  Bell,
  User,
  Settings,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { useEffect, useState, useCallback } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { useNotifications } from "@/hooks/use-notifications";

interface JobSeekerStats {
  totalApplications: number;
  interviewsScheduled: number;
  jobMatches: number;
  profileCompleteness: number;
}

interface JSExperience {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

interface JSProject {
  title: string;
  tags?: string[];
  link?: string;
  description?: string;
}

export default function JobSeekerDashboard() {
  const { session } = useSession();
  const { notifications, unreadCount } = useNotifications();
  const [stats, setStats] = useState<JobSeekerStats>({
    totalApplications: 12,
    interviewsScheduled: 3,
    jobMatches: 47,
    profileCompleteness: 85,
  });

  const [experiences, setExperiences] = useState<JSExperience[]>([]);
  const [projects, setProjects] = useState<JSProject[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/job-seeker/profile", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const exps = Array.isArray(data.experiences) ? data.experiences : [];
      const projs = Array.isArray(data.projects) ? data.projects : [];
      setExperiences(exps);
      setProjects(projs);
      if (data?.lastUpdated) setLastUpdated(data.lastUpdated);
      if (typeof data.profileCompleteness === "number") {
        setStats((s) => ({ ...s, profileCompleteness: data.profileCompleteness }));
      }
    } catch (e) {
      // ignore; dashboard remains functional without profile
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    const handler = () => fetchProfile();
    window.addEventListener("profileUpdated", handler as EventListener);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") fetchProfile();
    });
    return () => {
      window.removeEventListener("profileUpdated", handler as EventListener);
    };
  }, [fetchProfile]);

  const assessmentNotifications = notifications.filter(
    (n) => n.type === "assessment_assigned" && !n.read
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome back, {session?.name || "Job Seeker"}!
          </h2>
          <p className="text-muted-foreground">
            Your AI-powered career journey continues. Here's your personalized
            dashboard.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <Button asChild variant="outline">
            <Link href="/dashboard/job-seeker/profile">
              <User className="mr-2 h-4 w-4" />
              My Profile
            </Link>
          </Button>
          <Button variant="outline" onClick={fetchProfile}>Refresh</Button>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Link href="/dashboard/job-seeker/matches">
              <Target className="mr-2 h-4 w-4" />
              View Job Matches
            </Link>
          </Button>
        </div>
      </div>

      {/* Recent Profile Items */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-700">
              <Briefcase className="h-5 w-5" /> Recent Experience
            </CardTitle>
            <CardDescription>Your latest roles from your profile</CardDescription>
          </CardHeader>
          <CardContent>
            {experiences && experiences.length > 0 ? (
              <div className="space-y-3">
                {experiences.slice(0, 3).map((e, idx) => (
                  <div key={idx} className="rounded-md border border-teal-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-teal-900">{e.role} at {e.company}</div>
                      <div className="text-xs text-teal-700">{e.startDate} - {e.current ? "Present" : (e.endDate || "")}</div>
                    </div>
                    {e.description ? (
                      <p className="mt-1 text-sm text-slate-700 line-clamp-2">{e.description}</p>
                    ) : null}
                  </div>
                ))}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="bg-transparent">
                    <Link href="/dashboard/job-seeker/profile">View all</Link>
                  </Button>
                  <Button asChild className="bg-teal-600 hover:bg-teal-700">
                    <Link href="/dashboard/job-seeker/profile?edit=experience">Edit Experience</Link>
                  </Button>
                  {lastUpdated && (
                    <span className="text-xs text-muted-foreground ml-auto">Last updated: {new Date(lastUpdated).toLocaleString()}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No experience added yet. Add your first role from your profile.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <FileText className="h-5 w-5" /> Recent Projects
            </CardTitle>
            <CardDescription>Showcasing your latest work</CardDescription>
          </CardHeader>
          <CardContent>
            {projects && projects.length > 0 ? (
              <div className="space-y-3">
                {projects.slice(0, 3).map((p, idx) => (
                  <div key={idx} className="rounded-md border border-indigo-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-indigo-900">{p.title}</div>
                      {p.link ? (
                        <Link href={p.link} target="_blank" className="text-xs text-indigo-700 underline">View</Link>
                      ) : null}
                    </div>
                    {p.tags && p.tags.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.tags.slice(0, 5).map((t, i) => (
                          <Badge key={i} className="bg-indigo-50 text-indigo-800 border border-indigo-200">{t}</Badge>
                        ))}
                      </div>
                    ) : null}
                    {p.description ? (
                      <p className="mt-1 text-sm text-slate-700 line-clamp-2">{p.description}</p>
                    ) : null}
                  </div>
                ))}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="bg-transparent">
                    <Link href="/dashboard/job-seeker/profile">View all</Link>
                  </Button>
                  <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
                    <Link href="/dashboard/job-seeker/profile?edit=projects">Edit Projects</Link>
                  </Button>
                  {lastUpdated && (
                    <span className="text-xs text-muted-foreground ml-auto">Last updated: {new Date(lastUpdated).toLocaleString()}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No projects added yet. Add your first project from your profile.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {assessmentNotifications.length > 0 && (
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-800">
                    New Assessment
                    {assessmentNotifications.length > 1 ? "s" : ""} Available
                  </h3>
                  <p className="text-sm text-orange-700">
                    You have {assessmentNotifications.length} new assessment
                    {assessmentNotifications.length > 1 ? "s" : ""} assigned.
                    Complete them to proceed with your applications.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/notifications">
                    <Bell className="mr-2 h-4 w-4" />
                    View All
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Link href="/dashboard/job-seeker/assessments">
                    <ListChecks className="mr-2 h-4 w-4" />
                    Take Assessments
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Applications
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalApplications}
                </p>
                <p className="text-xs text-blue-600 font-medium">Active</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Interviews
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.interviewsScheduled}
                </p>
                <p className="text-xs text-green-600 font-medium">Scheduled</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  AI Matches
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.jobMatches}
                </p>
                <p className="text-xs text-purple-600 font-medium">Available</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Link href="/dashboard/job-seeker/profile">
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Profile Score
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.profileCompleteness}%
                  </p>
                  <p className="text-xs text-orange-600 font-medium">
                    Complete
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {stats.profileCompleteness < 100 && (
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-800">
                    Complete Your Profile
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Your profile is {stats.profileCompleteness}% complete.
                    Finish setup to unlock all features and improve job
                    matching.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/job-seeker/profile-setup">
                    <Settings className="mr-2 h-4 w-4" />
                    Complete Setup
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Link href="/dashboard/job-seeker/profile">
                    <User className="mr-2 h-4 w-4" />
                    View Profile
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-4 space-y-6">
          <Card className="premium-card border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <Brain className="h-5 w-5" />
                AI Career Assistant
              </CardTitle>
              <CardDescription>
                Get personalized AI-powered career guidance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Resume Score:</span>
                <Badge className="bg-indigo-100 text-indigo-700">8.7/10</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Match Accuracy:</span>
                <Badge className="bg-purple-100 text-purple-700">94%</Badge>
              </div>
              <Button
                asChild
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Link href="/dashboard/job-seeker/resume-chatbot">
                  <Bot className="mr-2 h-4 w-4" />
                  Chat with AI Assistant
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full bg-transparent"
              >
                <Link href="/dashboard/job-seeker/resume-chatbot-simple">
                  Quick Resume Tips
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="premium-card border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <Target className="h-5 w-5" />
                Smart Job Matching
              </CardTitle>
              <CardDescription>
                AI finds the perfect jobs for your skills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">New Matches:</span>
                <Badge className="bg-emerald-100 text-emerald-700">
                  12 Today
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Match Quality:</span>
                <Badge className="bg-teal-100 text-teal-700">High</Badge>
              </div>
              <Button
                asChild
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <Link href="/dashboard/job-seeker/matches">
                  View Smart Matches
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-8 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="premium-card border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Upload className="h-5 w-5" />
                  Resume Management
                </CardTitle>
                <CardDescription>
                  AI-powered resume optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ATS Score:</span>
                    <Badge className="bg-blue-100 text-blue-700">92%</Badge>
                  </div>
                  <Button
                    asChild
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Link href="/dashboard/job-seeker/upload">
                      Upload Resume
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    <Link href="/dashboard/job-seeker/resume-builder">
                      <FileText className="mr-2 h-4 w-4" />
                      Resume Builder
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Briefcase className="h-5 w-5" />
                  Job Search & Matching
                </CardTitle>
                <CardDescription>AI-curated opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <Badge className="bg-purple-100 text-purple-700">76%</Badge>
                  </div>
                  <Button
                    asChild
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Link href="/dashboard/jobs">Browse Jobs</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    <Link href="/dashboard/job-seeker/matches">
                      <Target className="mr-2 h-4 w-4" />
                      Smart Matches
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <ListChecks className="h-5 w-5" />
                  Application Tracking
                </CardTitle>
                <CardDescription>Real-time status updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Response Rate:
                    </span>
                    <Badge className="bg-green-100 text-green-700">68%</Badge>
                  </div>
                  <Button
                    asChild
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Link href="/dashboard/job-seeker/applications">
                      My Applications
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    <Link href="/dashboard/job-seeker/status-portal">
                      <Clock className="mr-2 h-4 w-4" />
                      Status Portal
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <Calendar className="h-5 w-5" />
                  Interviews & Assessments
                </CardTitle>
                <CardDescription>Preparation and scheduling</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <Badge className="bg-orange-100 text-orange-700">82%</Badge>
                  </div>
                  <Button
                    asChild
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <Link href="/dashboard/job-seeker/interviews">
                      My Interviews
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    <Link href="/dashboard/job-seeker/assessments">
                      <ListChecks className="mr-2 h-4 w-4" />
                      Take Assessments
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-700">
                  <MessageSquare className="h-5 w-5" />
                  Communication Hub
                </CardTitle>
                <CardDescription>Connect with recruiters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active Chats:</span>
                    <Badge className="bg-rose-100 text-rose-700">5</Badge>
                  </div>
                  <Button
                    asChild
                    className="w-full bg-rose-600 hover:bg-rose-700"
                  >
                    <Link href="/dashboard/messages">Messages</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    <Link href="/dashboard/notifications">
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-700">
                  <User className="h-5 w-5" />
                  Profile Management
                </CardTitle>
                <CardDescription>
                  Manage your professional profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completeness:</span>
                    <Badge className="bg-slate-100 text-slate-700">
                      {stats.profileCompleteness}%
                    </Badge>
                  </div>
                  <Button
                    asChild
                    className="w-full bg-slate-600 hover:bg-slate-700"
                  >
                    <Link href="/dashboard/job-seeker/profile">
                      <User className="mr-2 h-4 w-4" />
                      View Profile
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    <Link href="/dashboard/job-seeker/profile-setup">
                      <Settings className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Quick Actions & AI Tools
              </CardTitle>
              <CardDescription>
                Access your most powerful career advancement features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/job-seeker/resume-chatbot">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">AI Resume Coach</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Optimize your resume
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/job-seeker/matches">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Smart Job Matching</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        AI-curated opportunities
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/job-seeker/status-portal">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Application Status</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Real-time tracking
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/messages">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-rose-600" />
                        <span className="font-medium">Direct Messaging</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Chat with recruiters
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/job-seeker/interviews">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">Interview Prep</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Schedule & prepare
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/job-seeker/profile">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-600" />
                        <span className="font-medium">Profile Management</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Update your profile
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/job-seeker/assessments">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">AI Assessments</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Skill evaluations
                      </span>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
