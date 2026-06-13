"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DashboardPanelProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export function DashboardPanel({
  title,
  description,
  icon,
  action,
  children,
  className,
  noPadding,
}: DashboardPanelProps) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && <div className="shrink-0">{icon}</div>}
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-900">{title}</p>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className={cn(!noPadding && "p-5")}>{children}</div>
    </div>
  )
}
