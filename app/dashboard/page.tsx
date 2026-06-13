"use client"

import { useSession } from "@/hooks/use-session"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

const ROLE_HOME: Record<string, string> = {
  recruiter: "/dashboard/recruiter",
  job_seeker: "/dashboard/job-seeker",
  admin: "/dashboard/admin",
  college: "/dashboard/college",
  college_admin: "/dashboard/college",
}

export default function DashboardPage() {
  const { session, isLoading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!session) {
      router.replace("/login")
      return
    }

    const role = session.user?.role ?? session.role
    const target = ROLE_HOME[role] ?? "/login"
    router.replace(target)
  }, [session, isLoading, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      <p className="text-sm font-medium">Opening your dashboard…</p>
    </div>
  )
}
