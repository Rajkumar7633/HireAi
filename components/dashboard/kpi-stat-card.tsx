"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { TrendLine } from "@/components/ui/charts"
import { cn } from "@/lib/utils"

interface KpiStatCardProps {
  label: string
  value: string | number
  sublabel?: string
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  trend?: number[]
  trendColor?: string
  href?: string
  className?: string
  accent?: "violet" | "emerald" | "blue" | "orange" | "rose" | "indigo" | "teal"
}

const ACCENT: Record<NonNullable<KpiStatCardProps["accent"]>, string> = {
  violet: "hover:border-violet-200 hover:shadow-violet-500/5",
  emerald: "hover:border-emerald-200 hover:shadow-emerald-500/5",
  blue: "hover:border-blue-200 hover:shadow-blue-500/5",
  orange: "hover:border-orange-200 hover:shadow-orange-500/5",
  rose: "hover:border-rose-200 hover:shadow-rose-500/5",
  indigo: "hover:border-indigo-200 hover:shadow-indigo-500/5",
  teal: "hover:border-teal-200 hover:shadow-teal-500/5",
}

export function KpiStatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconBg = "bg-violet-100",
  iconColor = "text-violet-600",
  trend,
  trendColor = "#8b5cf6",
  href,
  className,
  accent = "violet",
}: KpiStatCardProps) {
  const inner = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md",
        ACCENT[accent],
        href && "cursor-pointer",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50/80 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
          {sublabel && <p className="mt-0.5 text-xs text-slate-500">{sublabel}</p>}
          {trend && trend.length > 0 && (
            <div className="mt-2">
              <TrendLine values={trend} color={trendColor} width={72} height={26} />
            </div>
          )}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}
