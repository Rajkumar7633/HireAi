"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ActivityItem {
  id: string
  title: string
  description?: string
  time?: string | Date
  avatar?: string
  href?: string
  status?: "success" | "pending" | "info" | "warning"
}

const STATUS_DOT = {
  success: "bg-emerald-500",
  pending: "bg-amber-500",
  info: "bg-blue-500",
  warning: "bg-orange-500",
}

export function ActivityFeed({
  items,
  emptyMessage = "No recent activity",
  viewAllHref,
  className,
}: {
  items: ActivityItem[]
  emptyMessage?: string
  viewAllHref?: string
  className?: string
}) {
  if (items.length === 0) {
    return (
      <div className={cn("py-8 text-center", className)}>
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn("divide-y divide-slate-100", className)}>
      {items.map((item) => {
        const row = (
          <div className="flex items-start gap-3 px-1 py-3 hover:bg-slate-50/80 rounded-lg transition-colors group">
            <div className="relative shrink-0 mt-0.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold">
                {(item.avatar || item.title).charAt(0).toUpperCase()}
              </div>
              {item.status && (
                <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white", STATUS_DOT[item.status])} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate group-hover:text-violet-700 transition-colors">
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
              )}
            </div>
            {item.time && (
              <span className="text-[10px] text-slate-400 shrink-0 mt-1">
                {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
              </span>
            )}
            {item.href && (
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0 mt-1 transition-opacity" />
            )}
          </div>
        )

        if (item.href) {
          return (
            <Link key={item.id} href={item.href}>
              {row}
            </Link>
          )
        }
        return <div key={item.id}>{row}</div>
      })}
      {viewAllHref && (
        <div className="pt-2">
          <Button variant="ghost" size="sm" className="w-full text-xs text-violet-600 hover:text-violet-700" asChild>
            <Link href={viewAllHref}>
              View all activity <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
