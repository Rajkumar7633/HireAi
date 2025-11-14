"use client"

import { useRouter } from "next/navigation"

export default function BillingCancelPage() {
  const router = useRouter()
  return (
    <div className="mx-auto max-w-xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Checkout Canceled</h1>
      <p className="text-sm text-muted-foreground">No charges were made. You can try upgrading again anytime.</p>
      <div className="flex gap-3 pt-2">
        <button className="rounded bg-black text-white px-4 py-2" onClick={() => router.push("/billing")}>
          Return to Billing
        </button>
        <button className="rounded border px-4 py-2" onClick={() => router.push("/dashboard/recruiter")}>
          Go to Recruiter Dashboard
        </button>
        <button className="rounded border px-4 py-2" onClick={() => router.push("/dashboard/job-seeker")}>
          Go to Job Seeker Dashboard
        </button>
      </div>
    </div>
  )
}
