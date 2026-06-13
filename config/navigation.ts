import {
  type LucideIcon,
  BarChart3, Briefcase, FileText, ClipboardList, Users, MessageSquare,
  Bell, Database, User, Brain, UserCog, Settings, Target, GraduationCap,
  BookOpen, School, Building2, HelpCircle, CreditCard, CalendarDays,
  Clock, Shield, Mail, TrendingUp, FileCheck, Home, Search,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: Array<{ title: string; url: string }>;
  /** If set, this item starts a new named section in the sidebar */
  section?: string;
};

export type Role = "job_seeker" | "recruiter" | "admin" | "college" | "college_admin";

// ─── College nav (shared by college + college_admin) ─────────────────────────
const collegeNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard/college",         icon: Home },
  { title: "Profile",   url: "/dashboard/college/profile", icon: User },

  { title: "Student Management", url: "#", icon: Users, section: "Students",
    items: [
      { title: "Onboard Students",  url: "/dashboard/college/students" },
      { title: "Student Tracking",  url: "/dashboard/college/student-tracking" },
      { title: "Bulk Operations",   url: "/dashboard/college/bulk-operations" },
      { title: "Leaderboard",       url: "/dashboard/college/leaderboard" },
    ],
  },

  { title: "Placement & Drives", url: "#", icon: Target, section: "Placement",
    items: [
      { title: "Campus Drives",     url: "/dashboard/college/campus-drives" },
      { title: "Drive Shortlist",   url: "/dashboard/college/drive-shortlist" },
      { title: "Placements",        url: "/dashboard/college/placements" },
      { title: "Invite Recruiters", url: "/dashboard/college/partnerships" },
      { title: "Support Requests",  url: "/dashboard/college/support-requests" },
    ],
  },
  { title: "Tests & Assessments", url: "#", icon: ClipboardList,
    items: [
      { title: "Test Center", url: "/dashboard/college/assign-tests" },
      { title: "Create MCQ Test", url: "/dashboard/college/tests/create" },
      { title: "Create Coding Test", url: "/dashboard/college/tests/create/coding" },
    ],
  },

  { title: "Analytics", url: "#", icon: TrendingUp, section: "Insights",
    items: [
      { title: "Placement Analytics", url: "/dashboard/college/placement-analytics" },
      { title: "Reports",             url: "/dashboard/college/reports" },
    ],
  },

  { title: "Meetings & Calendar", url: "/dashboard/calendar", icon: CalendarDays, section: "General" },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

// ─── Main navigation config ───────────────────────────────────────────────────
export const navigationByRole: Record<Role, NavItem[]> = {

  // ── JOB SEEKER ────────────────────────────────────────────────────────────
  job_seeker: [
    { title: "Dashboard", url: "/dashboard/job-seeker", icon: Home },

    { title: "Resume", url: "#", icon: FileText, section: "Career",
      items: [
        { title: "Upload Resume",  url: "/dashboard/job-seeker/upload" },
        { title: "Resume Builder", url: "/dashboard/job-seeker/resume-builder" },
        { title: "Resume Chatbot", url: "/dashboard/job-seeker/resume-chatbot" },
      ],
    },
    { title: "Jobs", url: "#", icon: Briefcase,
      items: [
        { title: "Browse Jobs",     url: "/dashboard/jobs" },
        { title: "Job Matches",     url: "/dashboard/job-seeker/matches" },
        { title: "My Applications", url: "/dashboard/job-seeker/applications" },
        { title: "Status Portal",   url: "/dashboard/job-seeker/status-portal" },
      ],
    },
    { title: "Assessments", url: "#", icon: ClipboardList,
      items: [
        { title: "My Tests",         url: "/dashboard/job-seeker/tests" },
        { title: "Interviews",       url: "/dashboard/job-seeker/interviews" },
        { title: "Video Interviews", url: "/dashboard/job-seeker/video-interviews" },
        { title: "Mock Interview",   url: "/dashboard/job-seeker/mock-interview" },
      ],
    },

    { title: "College", url: "#", icon: School, section: "Campus",
      items: [
        { title: "My College",      url: "/dashboard/job-seeker/my-college" },
        { title: "Campus Drives",   url: "/dashboard/job-seeker/campus-drives" },
        { title: "College Meetings", url: "/dashboard/calendar" },
        { title: "Contact College", url: "/dashboard/job-seeker/contact-college" },
      ],
    },

    { title: "AI Career Tools", url: "#", icon: Brain, section: "AI Tools",
      items: [
        { title: "AI Interview Coach", url: "/dashboard/job-seeker/interview-coach" },
        { title: "Skill Gap Analyzer", url: "/dashboard/job-seeker/skill-gap" },
      ],
    },

    { title: "Social", url: "#", icon: Users, section: "Community",
      items: [
        { title: "My Profile", url: "/dashboard/job-seeker/profile" },
        { title: "Feed",       url: "/dashboard/job-seeker/social/feed" },
        { title: "Search",     url: "/dashboard/job-seeker/social/search" },
        { title: "Requests",   url: "/dashboard/job-seeker/social/requests" },
        { title: "Chat",       url: "/dashboard/job-seeker/social/chat" },
      ],
    },
    { title: "Messages",      url: "/dashboard/messages",      icon: MessageSquare },
    { title: "Notifications", url: "/dashboard/notifications", icon: Bell },

    { title: "Billing", url: "/billing", icon: CreditCard, section: "Account" },
  ],

  // ── RECRUITER ─────────────────────────────────────────────────────────────
  recruiter: [
    { title: "Dashboard", url: "/dashboard/recruiter",         icon: Home },
    { title: "Profile",   url: "/dashboard/recruiter/profile", icon: User },

    { title: "AI Tools", url: "#", icon: Brain, section: "Recruiting",
      items: [
        { title: "Resume Screening",    url: "/dashboard/recruiter/ai-screening" },
        { title: "Interview Questions", url: "/dashboard/recruiter/ai-interview" },
        { title: "Candidate Matching",  url: "/dashboard/recruiter/ai-matching" },
        { title: "JD Tailor",           url: "/dashboard/recruiter/job-description-tailor" },
      ],
    },
    { title: "Job Management", url: "#", icon: Briefcase,
      items: [
        { title: "Job Descriptions", url: "/dashboard/recruiter/job-descriptions" },
        { title: "Assessments",      url: "/dashboard/recruiter/assessments" },
        { title: "Analytics",        url: "/dashboard/recruiter/analytics" },
      ],
    },
    { title: "Candidates",  url: "/dashboard/recruiter/candidates",  icon: Users },
    { title: "Talent Pool", url: "/dashboard/recruiter/talent-pool", icon: Database },

    { title: "Communication", url: "#", icon: MessageSquare, section: "Outreach",
      items: [
        { title: "Messages",           url: "/dashboard/messages" },
        { title: "Video Interviews",   url: "/dashboard/recruiter/video-interviews" },
        { title: "Email Templates",    url: "/dashboard/recruiter/email-templates" },
        { title: "Email Settings",     url: "/dashboard/recruiter/settings/email" },
        { title: "Team Collaboration", url: "/dashboard/recruiter/collaboration" },
      ],
    },
    { title: "Hiring", url: "#", icon: FileCheck,
      items: [
        { title: "Tests",                   url: "/dashboard/recruiter/tests" },
        { title: "Background Verification", url: "/dashboard/recruiter/background-verification" },
        { title: "Offer Letters",           url: "/dashboard/recruiter/offer-letters/create" },
      ],
    },
    { title: "Campus Drives", url: "/dashboard/recruiter/campus-drives", icon: GraduationCap },

    { title: "Notifications", url: "/dashboard/notifications", icon: Bell,     section: "Account" },
    { title: "History",       url: "/dashboard/history",       icon: Clock },
    { title: "Billing",       url: "/billing",                 icon: CreditCard },
  ],

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  admin: [
    { title: "Dashboard",       url: "/dashboard/admin",       icon: Home },

    { title: "User Management", url: "/dashboard/admin/users",  icon: UserCog,  section: "Management" },
    { title: "Platform Stats",  url: "/dashboard/admin/stats",  icon: TrendingUp },
    { title: "Job Oversight",   url: "/dashboard/admin/jobs",   icon: Briefcase },
    { title: "Email Templates", url: "/dashboard/admin/email-templates", icon: Mail },

    { title: "Security", url: "/dashboard/admin/security", icon: Shield, section: "System" },
    { title: "Settings", url: "/dashboard/settings",       icon: Settings },
  ],

  college:       collegeNav,
  college_admin: collegeNav,
};
