"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface InsightItem {
  label: string
  value: string | number
  hint?: string
  href?: string
  icon: LucideIcon
  color: string
}

export function InsightStrip({ items, className }: { items: InsightItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
      {items.map((item) => {
        const inner = (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm hover:border-violet-200 hover:shadow-md transition-all">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", item.color.split(" ")[0])}>
              <item.icon className={cn("h-4 w-4", item.color.split(" ")[1])} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
              <p className="text-lg font-bold tabular-nums text-slate-900 leading-tight">{item.value}</p>
              {item.hint && <p className="text-[10px] text-slate-500 truncate">{item.hint}</p>}
            </div>
            {item.href && (
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0 group-hover:text-violet-500 transition-colors" />
            )}
          </div>
        )

        if (item.href) {
          return (
            <Link key={item.label} href={item.href} className="group">
              {inner}
            </Link>
          )
        }
        return <div key={item.label}>{inner}</div>
      })}
    </div>
  )
}
