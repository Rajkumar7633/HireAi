"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "@/hooks/use-session"

export default function BillingSuccessClient() {
  const params = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState("Verifying your subscription…")
  const { refreshSession, session } = useSession() as any
  const sub = session?.subscription
  const nextDate = useMemo(() => {
    const ts = sub?.currentPeriodEnd
    try {
      if (!ts) return null
      const d = new Date(ts)
      return isNaN(d.getTime()) ? null : d.toLocaleString()
    } catch {
      return null
    }
  }, [sub])

  useEffect(() => {
    const sid = params?.get("session_id")
    const roleParam = params?.get("role")
    if (!sid) {
      setStatus("Payment completed. Subscription will be activated shortly.")
      return
    }
    setStatus("Payment completed. Finalizing your subscription…")
    try {
      refreshSession()
    } catch {}
    try {
      if (typeof window !== "undefined") {
        const until = Date.now() + 15 * 60 * 1000
        localStorage.setItem("provisional_active_until", String(until))
        const roleGuess = roleParam || (session as any)?.role || "recruiter"
        localStorage.setItem("provisional_role", roleGuess)
      }
    } catch {}
    ;(async () => {
      try {
        const q = sid ? `?session_id=${encodeURIComponent(sid)}` : ""
        await fetch(`/api/billing/sync${q}`, { cache: "no-store" })
      } catch {}
    })()
    if (roleParam === "recruiter") {
      router.push("/dashboard/recruiter")
      return
    }
    if (roleParam === "job_seeker") {
      router.push("/dashboard/job-seeker")
      return
    }
    let elapsed = 0
    const tick = async () => {
      try {
        await refreshSession()
      } catch {}
      try {
        const resp = await fetch("/api/user/profile", { cache: "no-store" })
        if (resp.ok) {
          const { user } = await resp.json()
          const active = user?.subscription?.status === "active"
          if (active) {
            setStatus("Subscription activated. Redirecting to your dashboard…")
            const role = user?.role
            if (role === "recruiter") router.push("/dashboard/recruiter")
            else if (role === "job_seeker") router.push("/dashboard/job-seeker")
            else router.push("/")
            return true
          }
        }
      } catch {}
      return false
    }
    let cancelled = false
    const interval = setInterval(async () => {
      if (cancelled) return
      const done = await tick()
      if (done) {
        clearInterval(interval)
      } else {
        elapsed += 500
        if (elapsed >= 10000) {
          clearInterval(interval)
          const role = (session as any)?.role
          router.push(
            role === "recruiter"
              ? "/dashboard/recruiter"
              : role === "job_seeker"
              ? "/dashboard/job-seeker"
              : "/"
          )
        }
      }
    }, 500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [params, refreshSession, router, session])

  return (
    <div className="mx-auto max-w-xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Payment Successful</h1>
      <p className="text-sm text-muted-foreground">
        {status}
        {nextDate ? ` • Next billing: ${nextDate}` : ""}
      </p>
      <div className="flex gap-3 pt-2">
        <button
          className="rounded bg-black text-white px-4 py-2"
          onClick={() => router.push("/dashboard/recruiter")}
        >
          Go to Recruiter Dashboard
        </button>
        <button
          className="rounded border px-4 py-2"
          onClick={() => router.push("/dashboard/job-seeker")}
        >
          Go to Job Seeker Dashboard
        </button>
        <button
          className="rounded border px-4 py-2"
          onClick={() => router.push("/billing")}
        >
          Manage Billing
        </button>
      </div>
    </div>
  )
}
