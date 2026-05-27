"use client"

import { Button } from "@/components/ui/button"
import { FileX2, Users, Briefcase, ClipboardList, Bell, Search, MessageSquare, Trophy } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionHref?: string
  className?: string
}

/**
 * Generic empty state component — shows an icon, heading, description, and optional CTA.
 *
 * @example
 * <EmptyState
 *   icon={Briefcase}
 *   title="No jobs posted yet"
 *   description="Create your first job to start finding candidates."
 *   actionLabel="Post a Job"
 *   onAction={() => router.push('/dashboard/recruiter/post-job')}
 * />
 */
export function EmptyState({
  icon: Icon = FileX2,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground opacity-60" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      )}
      {actionLabel && (onAction || actionHref) && (
        actionHref ? (
          <Button asChild className="bg-purple-600 hover:bg-purple-700">
            <a href={actionHref}>{actionLabel}</a>
          </Button>
        ) : (
          <Button onClick={onAction} className="bg-purple-600 hover:bg-purple-700">
            {actionLabel}
          </Button>
        )
      )}
    </div>
  )
}

// ─── Pre-built empty states for common scenarios ───────────────────────────

export const EmptyStates = {
  NoJobs: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Briefcase}
      title="No jobs posted yet"
      description="Post your first job to start matching with qualified candidates."
      actionLabel="Post a Job"
      {...props}
    />
  ),

  NoApplications: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={ClipboardList}
      title="No applications yet"
      description="Browse open positions and apply to get started with your job search."
      actionLabel="Browse Jobs"
      {...props}
    />
  ),

  NoCandidates: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Users}
      title="No candidates found"
      description="Candidates who apply to your jobs will appear here."
      {...props}
    />
  ),

  NoTests: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={ClipboardList}
      title="No tests created"
      description="Create skill assessments to evaluate candidates objectively."
      actionLabel="Create Test"
      {...props}
    />
  ),

  NoNotifications: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Bell}
      title="You're all caught up!"
      description="No new notifications. We'll let you know when something needs your attention."
      {...props}
    />
  ),

  NoMessages: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={MessageSquare}
      title="No messages yet"
      description="Start a conversation with a candidate or recruiter."
      {...props}
    />
  ),

  NoSearchResults: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search filters or keywords."
      {...props}
    />
  ),

  NoSubmissions: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Trophy}
      title="No submissions yet"
      description="Candidates haven't completed this test yet. Check back later."
      {...props}
    />
  ),
}
