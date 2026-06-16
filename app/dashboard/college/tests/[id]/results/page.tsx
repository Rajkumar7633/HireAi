"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/** Results are shown on the full analytics board (same as recruiter workflow). */
export default function CollegeTestResultsPage() {
  const params = useParams()
  const router = useRouter()
  const testId = (params?.id ?? "") as string

  useEffect(() => {
    if (testId) {
      router.replace(`/dashboard/college/tests/${testId}/analytics`)
    }
  }, [testId, router])

  return (
    <div className="dashboard-loading">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      <p className="text-sm text-muted-foreground">Opening analytics…</p>
    </div>
  )
}
