"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useSession } from "../../hooks/use-session"

const RECRUITER_PRICE = process.env.NEXT_PUBLIC_RECRUITER_PRO_PRICE || ""
const STUDENT_PRICE = process.env.NEXT_PUBLIC_STUDENT_PLUS_PRICE || ""
const BILLING_ENABLED = (process.env.NEXT_PUBLIC_BILLING_ENABLED ?? "1") !== "0"

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const { session } = useSession() as any
  const recruiterPrice = RECRUITER_PRICE
  const studentPrice = STUDENT_PRICE
  const role = session?.role || "job_seeker"
  const [profile, setProfile] = useState<any | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setProfileLoading(true)
        const r = await fetch("/api/user/profile", { cache: "no-store" })
        if (!r.ok) throw new Error("profile failed")
        const d = await r.json()
        if (mounted) setProfile(d?.user || null)
      } catch {
        if (mounted) setProfile(null)
      } finally {
        if (mounted) setProfileLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const isActive = useMemo(() => {
    const status = (profile as any)?.subscription?.status || (session as any)?.subscription?.status
    return status === "active"
  }, [profile, session])

  const plan = useMemo(() => {
    if (role === "recruiter") {
      return {
        key: "recruiter",
        title: "Recruiter Pro",
        desc: "Advanced analytics, rules engine, rediscovery, bulk actions.",
        priceId: recruiterPrice,
        cta: isActive ? "Manage billing" : "Upgrade to Recruiter Pro",
      }
    }
    return {
      key: "student",
      title: "Student Plus",
      desc: "Advanced AI resume reviews, mock tests, interview insights.",
      priceId: studentPrice,
      cta: isActive ? "Manage billing" : "Upgrade to Student Plus",
    }
  }, [role, recruiterPrice, studentPrice, isActive])

  const currentPlan = useMemo(() => {
    const sub = (profile as any)?.subscription || (session as any)?.subscription
    const active = sub?.status === "active"
    if (!active) return "Free"
    return role === "recruiter" ? "Pro" : "Plus"
  }, [profile, session, role])

  const openCheckout = async (priceId?: string) => {
    try {
      setLoading("checkout")
      const usePrice = priceId
      if (!usePrice) {
        alert("Missing priceId. Please configure your Stripe Price ID in env.")
        return
      }
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: usePrice }),
      })
      const data = await res.json()
      if (!res.ok || !data?.url) {
        alert(data?.message || "Checkout failed")
        return
      }
      window.location.href = data.url
    } catch (e: any) {
      alert(e?.message || "Checkout error")
    } finally {
      setLoading(null)
    }
  }

  const openPortal = async () => {
    try {
      setLoading("portal")
      const res = await fetch("/api/billing/portal")
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok || !data?.url) {
        alert(`${data?.message || "Portal failed"}${data?.error ? `: ${data.error}` : ""}`)
        return
      }
      window.location.href = data.url
    } catch (e: any) {
      alert(e?.message || "Portal error")
    } finally {
      setLoading(null)
    }
  }

  if (!BILLING_ENABLED) {
    return (
      <div className="mx-auto max-w-2xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Billing</h1>
          <p className="text-sm text-muted-foreground">Billing is currently disabled.</p>
        </div>
      </div>
    )
  }

  const refreshPlan = async () => {
    try {
      setLoading("sync")
      const r = await fetch("/api/billing/sync", { cache: "no-store" })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.message || "Sync failed")
      // Best-effort: ping profile endpoint to refresh any caches
      await fetch("/api/user/profile", { cache: "no-store" })
      // Reload page so dashboards pick up features
      window.location.reload()
    } catch (e) {
      console.error(e)
      alert((e as any)?.message || "Failed to refresh plan")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <div className="flex items-center gap-2 pt-1">
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">Current Plan: {currentPlan}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Upgrade your plan or manage your subscription.</p>
      </div>

      <div className="rounded-lg border p-6 shadow-sm bg-white/60">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">{plan.title}</h2>
            <p className="text-sm text-muted-foreground max-w-md">{plan.desc}</p>
          </div>
        </div>
        <div className="pt-4">
          {isActive ? (
            <button
              className="inline-flex items-center justify-center rounded bg-black text-white px-4 py-2 disabled:opacity-50"
              disabled={loading === "portal"}
              onClick={openPortal}
            >
              {loading === "portal" ? "Opening portal..." : plan.cta}
            </button>
          ) : (
            <button
              className="inline-flex items-center justify-center rounded bg-black text-white px-4 py-2 disabled:opacity-50"
              disabled={loading === "checkout"}
              onClick={() => openCheckout(plan.priceId || undefined)}
            >
              {loading === "checkout" ? "Redirecting..." : plan.cta}
            </button>
          )}
        </div>
      </div>

      {/* Billing History */}
      <BillingHistory />

      <div className="pt-2">
        <button
          className="inline-flex items-center justify-center rounded border px-4 py-2 disabled:opacity-50"
          disabled={loading === "portal"}
          onClick={openPortal}
        >
          {loading === "portal" ? "Opening portal..." : "Manage billing"}
        </button>
        <button
          className="ml-2 inline-flex items-center justify-center rounded border px-4 py-2 disabled:opacity-50"
          disabled={loading === "sync"}
          onClick={refreshPlan}
        >
          {loading === "sync" ? "Refreshing..." : "Refresh plan"}
        </button>
      </div>
    </div>
  )
}

function BillingHistory() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/billing/history", { cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || "Failed to load history")
        setInvoices(Array.isArray(data?.invoices) ? data.invoices : [])
      } catch (e: any) {
        setError(e?.message || "Failed to load history")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="rounded-lg border p-6 shadow-sm bg-white/60">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Billing History</h2>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="py-2 pr-4">{inv.created ? new Date(inv.created).toLocaleString() : "-"}</td>
                  <td className="py-2 pr-4">{formatAmount(inv.amount, inv.currency)}</td>
                  <td className="py-2 pr-4 capitalize">{inv.status || "-"}</td>
                  <td className="py-2 pr-4">
                    {inv.payment_method === "card" && inv.card_brand
                      ? `${inv.card_brand?.toUpperCase()} •••• ${inv.card_last4}`
                      : inv.payment_method || "-"}
                  </td>
                  <td className="py-2 pr-4">
                    {inv.hosted_invoice_url ? (
                      <a className="underline" href={inv.hosted_invoice_url} target="_blank">View</a>
                    ) : inv.invoice_pdf ? (
                      <a className="underline" href={inv.invoice_pdf} target="_blank">PDF</a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatAmount(cents?: number, currency?: string) {
  if (!cents) return "-"
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: (currency || "usd").toUpperCase() }).format((cents || 0) / 100)
  } catch {
    return `${(cents || 0) / 100} ${currency?.toUpperCase() || "USD"}`
  }
}
