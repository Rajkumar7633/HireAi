"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DashboardHeroProps {
  title: string
  subtitle?: string
  badge?: string
  badgeVariant?: "default" | "pro" | "outline"
  avatar?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  gradient?: "violet" | "purple" | "indigo" | "emerald"
  className?: string
}

const GRADIENTS = {
  violet: "from-violet-600 via-purple-600 to-indigo-600",
  purple: "from-purple-600 via-violet-600 to-fuchsia-600",
  indigo: "from-indigo-600 via-violet-600 to-purple-600",
  emerald: "from-emerald-600 via-teal-600 to-cyan-600",
}

export function DashboardHero({
  title,
  subtitle,
  badge,
  badgeVariant = "default",
  avatar,
  meta,
  actions,
  gradient = "violet",
  className,
}: DashboardHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r p-6 text-white shadow-lg shadow-violet-500/10",
        GRADIENTS[gradient],
        className,
      )}
    >
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.06%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-2xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          {avatar}
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">{title}</h1>
              {badge && (
                <Badge
                  className={cn(
                    "text-[10px] border-0 shrink-0",
                    badgeVariant === "pro" && "bg-amber-400/90 text-amber-950",
                    badgeVariant === "outline" && "bg-white/15 text-white border-white/25",
                    badgeVariant === "default" && "bg-white/20 text-white",
                  )}
                >
                  {badge}
                </Badge>
              )}
            </div>
            {subtitle && <p className="text-sm text-white/80 leading-relaxed">{subtitle}</p>}
            {meta && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/70">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
