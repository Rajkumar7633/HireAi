import { type LucideIcon, BarChart3, Briefcase, FileText, ClipboardList, Users, MessageSquare, Bell, Database, User, Brain, UserCog, Settings } from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: Array<{ title: string; url: string }>;
};

export type Role = "job_seeker" | "recruiter" | "admin";

export const navigationByRole: Record<Role, NavItem[]> = {
  job_seeker: [
    { title: "Dashboard", url: "/dashboard/job-seeker", icon: BarChart3 },
    {
      title: "Resume",
      url: "#",
      icon: FileText,
      items: [
        { title: "Upload Resume", url: "/dashboard/job-seeker/upload" },
        { title: "Resume Builder", url: "/dashboard/job-seeker/resume-builder" },
        { title: "Resume Chatbot", url: "/dashboard/job-seeker/resume-chatbot" },
      ],
    },
    {
      title: "Jobs",
      url: "#",
      icon: Briefcase,
      items: [
        { title: "Browse Jobs", url: "/dashboard/jobs" },
        { title: "Job Matches", url: "/dashboard/job-seeker/matches" },
        { title: "My Applications", url: "/dashboard/job-seeker/applications" },
      ],
    },
    {
      title: "Assessments",
      url: "#",
      icon: ClipboardList,
      items: [
        { title: "My Tests", url: "/dashboard/job-seeker/tests" },
        { title: "Interviews", url: "/dashboard/job-seeker/interviews" },
        { title: "Video Interviews", url: "/dashboard/job-seeker/video-interviews" },
      ],
    },
    { title: "Messages", url: "/dashboard/messages", icon: MessageSquare },
    { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
  ],
  recruiter: [
    { title: "Dashboard", url: "/dashboard/recruiter", icon: BarChart3 },
    { title: "Profile", url: "/dashboard/recruiter/profile", icon: User },
    {
      title: "AI Tools",
      url: "#",
      icon: Brain,
      items: [
        { title: "Resume Screening", url: "/dashboard/recruiter/ai-screening" },
        { title: "Interview Questions", url: "/dashboard/recruiter/ai-interview" },
        { title: "Candidate Matching", url: "/dashboard/recruiter/ai-matching" },
      ],
    },
    {
      title: "Job Management",
      url: "#",
      icon: Briefcase,
      items: [
        { title: "Job Descriptions", url: "/dashboard/recruiter/job-descriptions" },
        { title: "Analytics", url: "/dashboard/recruiter/analytics" },
      ],
    },
    { title: "Candidates", url: "/dashboard/recruiter/candidates", icon: Users },
    {
      title: "Communication",
      url: "#",
      icon: MessageSquare,
      items: [
        { title: "Messages", url: "/dashboard/messages" },
        { title: "Video Interviews", url: "/dashboard/recruiter/video-interviews" },
        { title: "Email Templates", url: "/dashboard/recruiter/email-templates" },
        { title: "Email Settings", url: "/dashboard/recruiter/settings/email" },
        { title: "Team Collaboration", url: "/dashboard/recruiter/collaboration" },
      ],
    },
    { title: "Tests", url: "/dashboard/recruiter/tests", icon: ClipboardList },
    { title: "Talent Pool", url: "/dashboard/recruiter/talent-pool", icon: Database },
    { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
    { title: "History", url: "/dashboard/history", icon: Database },
  ],
  admin: [
    { title: "Dashboard", url: "/dashboard/admin", icon: BarChart3 },
    { title: "User Management", url: "/dashboard/admin/users", icon: UserCog },
    { title: "Platform Stats", url: "/dashboard/admin/stats", icon: BarChart3 },
    { title: "Job Oversight", url: "/dashboard/recruiter/job-descriptions", icon: Briefcase },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
  ],
};
