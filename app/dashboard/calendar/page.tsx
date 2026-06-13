"use client"

import { useSession } from "@/hooks/use-session"
import { Loader2 } from "lucide-react"
import { CollegeMeetingHub } from "@/components/calendar/college-meeting-hub"
import { StudentMeetingHub } from "@/components/calendar/student-meeting-hub"

export default function CalendarPage() {
  const { session, isLoading } = useSession()

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  const role = session?.role

  if (role === "college" || role === "college_admin") {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <CollegeMeetingHub />
      </div>
    )
  }

  if (role === "job_seeker") {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <StudentMeetingHub />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center py-16 text-muted-foreground">
        <p>Meeting calendar is available for college admins and students.</p>
        <p className="text-sm mt-2">Recruiters can use Video Interviews for scheduling.</p>
      </div>
    </div>
  )
}
