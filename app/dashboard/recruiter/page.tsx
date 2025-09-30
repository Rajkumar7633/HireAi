"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Users,
  BarChart3,
  ClipboardList,
  MessageSquare,
  User,
  Building2,
  MapPin,
  Globe,
  Edit3,
  TrendingUp,
  CheckCircle,
  Clock,
  Brain,
  Target,
  Zap,
  Mail,
  Video,
  Database,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/notification-bell";

interface RecruiterProfile {
  name?: string;
  email: string;
  profileImage?: string;
  companyName?: string;
  companyLogo?: string;
  businessLocation?: string;
  website?: string;
  isProfileComplete?: boolean;
}

interface DashboardStats {
  activeJobs: number;
  totalApplications: number;
  interviewsScheduled: number;
  hiredCandidates: number;
}

export default function RecruiterDashboard() {
  const { session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    activeJobs: 0,
    totalApplications: 0,
    interviewsScheduled: 0,
    hiredCandidates: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (session) {
      fetchProfileAndStats();
    } else {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (profile && !redirecting) {
      console.log("[v0] Profile data:", profile);
      console.log("[v0] Profile complete status:", profile.isProfileComplete);

      if (profile.isProfileComplete === false) {
        console.log(
          "[v0] Profile incomplete, redirecting to complete-profile page"
        );
        setRedirecting(true);

        setTimeout(() => {
          router.push("/dashboard/recruiter/complete-profile");
        }, 100);
      } else {
        console.log(
          "[v0] Profile is complete or status unknown, staying on dashboard"
        );
      }
    }
  }, [profile, router, redirecting]);

  const fetchProfileAndStats = async () => {
    try {
      console.log("[v0] Fetching profile data...");
      const profileResponse = await fetch("/api/user/profile");

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log("[v0] Profile data received:", profileData);
        setProfile(profileData.user);
      } else {
        const errorData = await profileResponse
          .json()
          .catch(() => ({ message: "Unknown error" }));
        console.error("[v0] Profile fetch failed:", errorData);
        setError(`Failed to load profile: ${errorData.message}`);

        setProfile({
          name: session?.name || "Recruiter",
          email: session?.email || "recruiter@example.com",
          isProfileComplete: false,
        });
      }

      setStats({
        activeJobs: 12,
        totalApplications: 156,
        interviewsScheduled: 8,
        hiredCandidates: 23,
      });
    } catch (error) {
      console.error("[v0] Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please check your connection.");

      setProfile({
        name: session?.name || "Recruiter",
        email: session?.email || "recruiter@example.com",
        isProfileComplete: false,
      });

      toast({
        title: "Connection Error",
        description:
          "Some data may not be up to date. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-lg font-semibold">
            Dashboard Error
          </div>
          <p className="text-muted-foreground">{error}</p>
          <Button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchProfileAndStats();
            }}
          >
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  if (profile && profile.isProfileComplete === false && redirecting) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">
            Redirecting to profile setup...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="text-yellow-600 font-medium">Notice:</div>
            <div className="text-yellow-700">{error}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                fetchProfileAndStats();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.name || "Recruiter"}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your AI-powered recruitment activities
            today.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <Button asChild className="action-button">
            <Link href="/dashboard/recruiter/job-descriptions">
              <Briefcase className="mr-2 h-4 w-4" />
              Post New Job
            </Link>
          </Button>
        </div>
      </div>

      {profile && profile.isProfileComplete === false && !redirecting && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">
                    Complete Your Profile
                  </p>
                  <p className="text-sm text-orange-700">
                    Finish setting up your recruiter profile to unlock all
                    features
                  </p>
                </div>
              </div>
              <Button asChild className="bg-orange-600 hover:bg-orange-700">
                <Link href="/dashboard/recruiter/complete-profile">
                  Complete Now
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-4 space-y-6">
          <Card className="profile-card">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Profile
                </CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/recruiter/profile">
                    <Edit3 className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={profile?.profileImage || "/placeholder.svg"}
                    alt={profile?.name || "Profile"}
                  />
                  <AvatarFallback className="text-lg">
                    {profile?.name?.slice(0, 2).toUpperCase() || "R"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {profile?.name || "Complete your profile"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {profile?.email}
                  </p>
                  {profile?.isProfileComplete === true ? (
                    <Badge className="mt-1 badge-success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Complete
                    </Badge>
                  ) : profile?.isProfileComplete === false ? (
                    <Badge variant="outline" className="mt-1">
                      <Clock className="mr-1 h-3 w-3" />
                      Incomplete
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="mt-1">
                      <Clock className="mr-1 h-3 w-3" />
                      Loading...
                    </Badge>
                  )}
                </div>
              </div>

              {profile?.companyName && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{profile.companyName}</span>
                  </div>
                  {profile.businessLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {profile.businessLocation}
                      </span>
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}
                </div>
              )}

              <Button
                asChild
                className="w-full bg-transparent"
                variant="outline"
              >
                <Link href="/dashboard/recruiter/complete-profile">
                  Update Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="premium-card border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Brain className="h-5 w-5" />
                AI-Powered Tools
              </CardTitle>
              <CardDescription>
                Leverage advanced AI for smarter recruitment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                asChild
                className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                <Link href="/dashboard/recruiter/ai-screening">
                  <Target className="mr-2 h-4 w-4" />
                  AI Resume Screening
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start bg-transparent"
                variant="outline"
                size="sm"
              >
                <Link href="/dashboard/recruiter/ai-matching">
                  <Zap className="mr-2 h-4 w-4" />
                  Smart Candidate Matching
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start bg-transparent"
                variant="outline"
                size="sm"
              >
                <Link href="/dashboard/recruiter/ai-interview">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  AI Interview Questions
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="premium-card border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <MessageSquare className="h-5 w-5" />
                Communication Hub
              </CardTitle>
              <CardDescription>
                Streamlined candidate communication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                asChild
                className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Link href="/dashboard/messages">
                  <Mail className="mr-2 h-4 w-4" />
                  Messages & Chat
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start bg-transparent"
                variant="outline"
                size="sm"
              >
                <Link href="/dashboard/recruiter/email-templates">
                  <FileText className="mr-2 h-4 w-4" />
                  Email Templates
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start bg-transparent"
                variant="outline"
                size="sm"
              >
                <Link href="/dashboard/recruiter/video-interviews">
                  <Video className="mr-2 h-4 w-4" />
                  Video Interviews
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-8 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="metric-card border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Active Jobs
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.activeJobs}
                    </p>
                    <p className="text-xs text-green-600 font-medium">
                      AI-Optimized
                    </p>
                  </div>
                  <Briefcase className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      AI Screened
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.floor(stats.totalApplications * 0.85)}
                    </p>
                    <p className="text-xs text-blue-600 font-medium">
                      Auto-Scored
                    </p>
                  </div>
                  <Brain className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Top Matches
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {Math.floor(stats.totalApplications * 0.15)}
                    </p>
                    <p className="text-xs text-purple-600 font-medium">
                      80%+ Score
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Hired
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {stats.hiredCandidates}
                    </p>
                    <p className="text-xs text-orange-600 font-medium">
                      This Month
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="premium-card border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <Brain className="h-5 w-5" />
                  AI Resume Screening
                </CardTitle>
                <CardDescription>
                  Automated candidate evaluation with skill matching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Screening Accuracy:
                  </span>
                  <Badge className="bg-green-100 text-green-700">94%</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time Saved:</span>
                  <Badge className="bg-blue-100 text-blue-700">
                    15 hrs/week
                  </Badge>
                </div>
                <Button
                  asChild
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  <Link href="/dashboard/recruiter/ai-screening">
                    Start AI Screening
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="premium-card border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <BarChart3 className="h-5 w-5" />
                  Advanced Analytics
                </CardTitle>
                <CardDescription>
                  Hiring funnel insights and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Conversion Rate:
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-700">
                    12.5%
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Avg. Time to Hire:
                  </span>
                  <Badge className="bg-teal-100 text-teal-700">18 days</Badge>
                </div>
                <Button
                  asChild
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Link href="/dashboard/recruiter/analytics">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Analytics
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="premium-card border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-700">
                  <Users className="h-5 w-5" />
                  Smart Candidate Pipeline
                </CardTitle>
                <CardDescription>
                  AI-powered candidate ranking and management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quality Score:</span>
                  <Badge className="bg-rose-100 text-rose-700">8.4/10</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Active Pipeline:
                  </span>
                  <Badge className="bg-pink-100 text-pink-700">
                    {stats.totalApplications}
                  </Badge>
                </div>
                <Button
                  asChild
                  className="w-full bg-rose-600 hover:bg-rose-700"
                >
                  <Link href="/dashboard/recruiter/candidates">
                    Manage Pipeline
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="premium-card border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <Database className="h-5 w-5" />
                  Talent Pool & Sourcing
                </CardTitle>
                <CardDescription>
                  Build and manage your talent database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Talent Pool Size:
                  </span>
                  <Badge className="bg-amber-100 text-amber-700">2,847</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Match Rate:</span>
                  <Badge className="bg-yellow-100 text-yellow-700">76%</Badge>
                </div>
                <Button
                  asChild
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  <Link href="/dashboard/recruiter/talent-pool">
                    Explore Talent Pool
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Quick Actions & Advanced Tools
              </CardTitle>
              <CardDescription>
                Access your most powerful recruitment features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/recruiter/ai-screening">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">AI Screening</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Auto-score resumes
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/recruiter/email-templates">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Email Templates</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Streamline communication
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/recruiter/collaboration">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Team Collaboration</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Work with your team
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/recruiter/video-interviews">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-red-600" />
                        <span className="font-medium">Video Interviews</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Schedule & conduct
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/recruiter/assessments">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">Smart Assessments</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Create & manage tests
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto p-3 bg-transparent"
                >
                  <Link href="/dashboard/recruiter/analytics">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium">Advanced Analytics</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Deep insights & metrics
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
