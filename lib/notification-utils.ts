import {
  Bell,
  ClipboardList,
  FileCheck,
  GraduationCap,
  MessageSquare,
  ShieldAlert,
  TestTube2,
  UserCheck,
  Video,
  type LucideIcon,
} from "lucide-react"

export type NotificationType =
  | "assessment_assigned"
  | "assessment_completed"
  | "assessment_reminder"
  | "assessment_violation"
  | "interview_scheduled"
  | "application_status_update"
  | "message_received"
  | "test_assigned"
  | "test_completed"
  | "campus_drive_published"
  | "campus_drive_application"

export type NotificationCategory =
  | "all"
  | "tests"
  | "assessments"
  | "applications"
  | "interviews"
  | "messages"
  | "campus"
  | "alerts"

export interface AppNotification {
  _id: string
  userId?: string
  type: string
  message: string
  read: boolean
  createdAt: string
  relatedEntity?: {
    id?: string
    type?: string
  }
}

export const NOTIFICATION_CATEGORIES: Array<{
  id: NotificationCategory
  label: string
  types: string[]
}> = [
  { id: "all", label: "All", types: [] },
  {
    id: "tests",
    label: "Tests",
    types: ["test_assigned", "test_completed"],
  },
  {
    id: "assessments",
    label: "Assessments",
    types: [
      "assessment_assigned",
      "assessment_completed",
      "assessment_reminder",
      "assessment_violation",
    ],
  },
  {
    id: "applications",
    label: "Applications",
    types: ["application_status_update"],
  },
  {
    id: "interviews",
    label: "Interviews",
    types: ["interview_scheduled"],
  },
  {
    id: "messages",
    label: "Messages",
    types: ["message_received"],
  },
  {
    id: "campus",
    label: "Campus",
    types: ["campus_drive_published", "campus_drive_application"],
  },
  {
    id: "alerts",
    label: "Alerts",
    types: ["assessment_violation"],
  },
]

const TYPE_META: Record<
  string,
  { label: string; icon: LucideIcon; tone: string; category: NotificationCategory }
> = {
  test_assigned: {
    label: "Test assigned",
    icon: TestTube2,
    tone: "text-violet-600 bg-violet-50 border-violet-200",
    category: "tests",
  },
  test_completed: {
    label: "Test completed",
    icon: FileCheck,
    tone: "text-emerald-600 bg-emerald-50 border-emerald-200",
    category: "tests",
  },
  assessment_assigned: {
    label: "Assessment assigned",
    icon: ClipboardList,
    tone: "text-blue-600 bg-blue-50 border-blue-200",
    category: "assessments",
  },
  assessment_completed: {
    label: "Assessment completed",
    icon: UserCheck,
    tone: "text-emerald-600 bg-emerald-50 border-emerald-200",
    category: "assessments",
  },
  assessment_reminder: {
    label: "Assessment reminder",
    icon: Bell,
    tone: "text-amber-600 bg-amber-50 border-amber-200",
    category: "assessments",
  },
  assessment_violation: {
    label: "Proctoring alert",
    icon: ShieldAlert,
    tone: "text-rose-600 bg-rose-50 border-rose-200",
    category: "alerts",
  },
  interview_scheduled: {
    label: "Interview scheduled",
    icon: Video,
    tone: "text-indigo-600 bg-indigo-50 border-indigo-200",
    category: "interviews",
  },
  application_status_update: {
    label: "Application update",
    icon: FileCheck,
    tone: "text-cyan-600 bg-cyan-50 border-cyan-200",
    category: "applications",
  },
  message_received: {
    label: "New message",
    icon: MessageSquare,
    tone: "text-purple-600 bg-purple-50 border-purple-200",
    category: "messages",
  },
  campus_drive_published: {
    label: "Campus drive",
    icon: GraduationCap,
    tone: "text-orange-600 bg-orange-50 border-orange-200",
    category: "campus",
  },
  campus_drive_application: {
    label: "Campus application",
    icon: GraduationCap,
    tone: "text-orange-600 bg-orange-50 border-orange-200",
    category: "campus",
  },
}

export function getNotificationMeta(type: string) {
  return (
    TYPE_META[type] || {
      label: "Update",
      icon: Bell,
      tone: "text-gray-600 bg-gray-50 border-gray-200",
      category: "all" as NotificationCategory,
    }
  )
}

export function getNotificationLink(
  notification: AppNotification,
  role?: string,
): string | null {
  const entityId = notification.relatedEntity?.id?.toString?.()
  const entityType = notification.relatedEntity?.type
  const type = notification.type

  if (type === "message_received") return "/dashboard/messages"

  if (type === "test_assigned") {
    if (role === "recruiter" && entityId) {
      return `/dashboard/recruiter/tests/${entityId}/assign`
    }
    if (entityId) return `/dashboard/job-seeker/tests/${entityId}`
    return role === "recruiter"
      ? "/dashboard/recruiter/tests"
      : "/dashboard/job-seeker/tests"
  }

  if (type === "test_completed") {
    if (role === "recruiter" && entityId) {
      return `/dashboard/recruiter/tests/${entityId}/analytics`
    }
    if (entityId) return `/dashboard/job-seeker/tests/${entityId}`
    return role === "recruiter"
      ? "/dashboard/recruiter/tests"
      : "/dashboard/job-seeker/tests"
  }

  if (
    type === "assessment_assigned" ||
    type === "assessment_reminder" ||
    type === "assessment_violation"
  ) {
    if (role === "recruiter" && entityId) {
      return `/dashboard/recruiter/assessments/${entityId}/analytics`
    }
    if (entityId) return `/dashboard/job-seeker/assessments/${entityId}/take`
    return role === "recruiter"
      ? "/dashboard/recruiter/assessments"
      : "/dashboard/job-seeker/assessments"
  }

  if (type === "assessment_completed") {
    if (role === "recruiter" && entityId) {
      return `/dashboard/recruiter/assessments/${entityId}/analytics`
    }
    return role === "recruiter"
      ? "/dashboard/recruiter/assessments"
      : "/dashboard/job-seeker/assessments"
  }

  if (type === "application_status_update") {
    if (role === "recruiter") return "/dashboard/recruiter/candidates"
    return "/dashboard/job-seeker/applications"
  }

  if (type === "interview_scheduled") {
    if (role === "recruiter") return "/dashboard/recruiter/video-interviews"
    return "/dashboard/job-seeker/interviews"
  }

  if (type === "campus_drive_published" || type === "campus_drive_application") {
    if (entityType === "campus_drive") {
      if (role === "college" || role === "college_admin") {
        return "/dashboard/college/partnerships"
      }
      if (role === "recruiter") return "/dashboard/recruiter/campus-drives"
    }
    if (role === "college" || role === "college_admin") {
      return "/dashboard/college/campus-drives"
    }
    if (role === "recruiter") return "/dashboard/recruiter/campus-drives"
    return "/dashboard/job-seeker/campus-drives"
  }

  if (entityType === "test" && entityId) {
    return role === "recruiter"
      ? `/dashboard/recruiter/tests/${entityId}/analytics`
      : `/dashboard/job-seeker/tests/${entityId}`
  }

  if (entityType === "application" && entityId) {
    return role === "recruiter"
      ? "/dashboard/recruiter/candidates"
      : "/dashboard/job-seeker/applications"
  }

  return null
}

export function matchesCategory(notification: AppNotification, category: NotificationCategory) {
  if (category === "all") return true
  const cat = NOTIFICATION_CATEGORIES.find(c => c.id === category)
  return cat ? cat.types.includes(notification.type) : true
}

export function groupNotificationsByDate(notifications: AppNotification[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - 7)

  const groups: Array<{ label: string; items: AppNotification[] }> = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ]

  for (const n of notifications) {
    const d = new Date(n.createdAt)
    if (d >= startOfToday) groups[0].items.push(n)
    else if (d >= startOfYesterday) groups[1].items.push(n)
    else if (d >= startOfWeek) groups[2].items.push(n)
    else groups[3].items.push(n)
  }

  return groups.filter(g => g.items.length > 0)
}
