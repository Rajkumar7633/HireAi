"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CustomChart } from "@/components/charts"
import { Badge } from "@/components/ui/badge"

export default function AdminStatsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<any | null>(null)
  const [signupsSeries, setSignupsSeries] = useState<any[]>([])
  const [subsSeries, setSubsSeries] = useState<any[]>([])
  const [days, setDays] = useState(14)

  useEffect(() => {
    let es: EventSource | null = null
    let cancelled = false
    const start = () => {
      try {
        es = new EventSource(`/api/admin/stats/stream?days=${encodeURIComponent(String(days))}`)
        es.addEventListener("stats", (ev: MessageEvent) => {
          const payload = JSON.parse(ev.data || "{}")
          const odata = payload.overview || {}
          const srows = Array.isArray(payload.signups) ? payload.signups : (payload.signups?.rows || [])
          const subrows = Array.isArray(payload.subs) ? payload.subs : (payload.subs?.rows || [])
          if (!cancelled) {
            setOverview(odata)
            setSignupsSeries(srows.map((r: any) => ({ name: r._id || r.date || r.day, value: r.count ?? 0 })))
            setSubsSeries(subrows.map((r: any) => ({ name: r._id || r.date || r.day, value: r.count ?? 0 })))
            setLoading(false)
          }
        })
        es.addEventListener("error", (ev: MessageEvent) => {
          if (!cancelled) setError("Stream error")
        })
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to start stream")
      }
    }
    setLoading(true)
    start()
    return () => {
      cancelled = true
      if (es) es.close()
    }
  }, [days])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Platform Statistics</h2>
        <div className="flex items-center gap-2">
          <select className="h-9 px-3 border rounded" value={days} onChange={(e) => setDays(parseInt(e.target.value) || 14)}>
            <option value={7}>7d</option>
            <option value={14}>14d</option>
            <option value={30}>30d</option>
            <option value={90}>90d</option>
          </select>
          <Button asChild variant="secondary">
            <Link href="/dashboard/admin">Back</Link>
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl">Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <div>Loading…</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading && !error && overview && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-4">
                <KPI title="Total Users" value={overview.totalUsers ?? overview.total ?? "-"} series={signupsSeries} />
              </div>
              <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-4">
                <KPI title="Active Subs" value={overview.activeSubscribers ?? overview.activeSubs ?? "-"} series={subsSeries} />
              </div>
              <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-4">
                <KPI title="MRR (est.)" value={overview.mrr ?? "-"} series={subsSeries} />
              </div>s
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        <Card className="border-0 shadow-none bg-transparent col-span-12 lg:col-span-6">
          <CardHeader className="px-0">
            <CardTitle className="text-xl">New Users ({days}d)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading && <div>Loading…</div>}
            {!loading && (
              <CustomChart
                type="line"
                data={signupsSeries}
                dataKey="value"
                nameKey="name"
                height={420}
                yDomain={[0, 'dataMax + 1']}
                yTickCount={5}
                softFill
                xInterval={days >= 90 ? ("preserveStartEnd" as any) : undefined}
                themeVariant="neon"
              />
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="px-0">
            <CardTitle className="text-xl">New Subscriptions ({days}d)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading && <div>Loading…</div>}
            {!loading && (
              <CustomChart
                type="line"
                data={subsSeries}
                dataKey="value"
                nameKey="name"
                height={420}
                yDomain={[0, 'dataMax + 1']}
                yTickCount={5}
                softFill
                xInterval={days >= 90 ? ("preserveStartEnd" as any) : undefined}
                themeVariant="neon"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-none bg-transparent col-span-12">
        <CardHeader className="px-0">
          <CardTitle className="text-xl">Signups vs Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!loading && (
            <CustomChart
              type="composed"
              data={mergeSeries(signupsSeries, subsSeries)}
              dataKey="signups"
              barKey="subs"
              nameKey="name"
              height={420}
              showLegend
              yDomain={[0, 'dataMax + 1']}
              yTickCount={5}
              xInterval={days >= 90 ? ("preserveStartEnd" as any) : undefined}
              themeVariant="neon"
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="px-0">
          <CardTitle className="text-xl">Last {days} Days</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <div>Loading…</div>}
          {!loading && signupsSeries && signupsSeries.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">New Users</th>
                    <th className="py-2 pr-4">New Subscriptions</th>
                  </tr>
                </thead>
                <tbody>
                  {signupsSeries.map((p: any, idx: number) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 pr-4">{p.name}</td>
                      <td className="py-2 pr-4">{p.value}</td>
                      <td className="py-2 pr-4">{subsSeries[idx]?.value ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loading && <div>No data</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KPI({ title, value, series }: { title: string; value: any; series: { name: string; value: number }[] }) {
  const last = series.at(-1)?.value ?? 0
  const prev = series.at(-8)?.value ?? series.at(0)?.value ?? 0
  const delta = last - prev
  const pct = prev === 0 ? 0 : Math.round((delta / prev) * 100)
  const up = pct > 0
  const down = pct < 0
  const sign = up ? "▲" : down ? "▼" : "≈"
  const variant = up ? "default" : down ? "destructive" : "secondary"
  return (
    <div className="border rounded-lg p-3">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="flex items-end justify-between gap-2 mt-1">
        <div className="text-2xl font-bold">{value}</div>
        <Badge variant={variant as any} className="text-xs">{sign} {Math.abs(pct)}%</Badge>
      </div>
      <div className="mt-2">
        <CustomChart type="spark" data={series} dataKey="value" height={64} />
      </div>
    </div>
  )
}

function mergeSeries(a: any[], b: any[]) {
  const map = new Map<string, { name: string; signups: number; subs: number }>()
  for (const p of a) {
    map.set(p.name, { name: p.name, signups: p.value, subs: 0 })
  }
  for (const p of b) {
    const existing = map.get(p.name)
    if (existing) existing.subs = p.value
    else map.set(p.name, { name: p.name, signups: 0, subs: p.value })
  }
  return Array.from(map.values()).sort((x, y) => (x.name < y.name ? -1 : 1))
}
