"use client"

/**
 * components/ui/page-skeleton.tsx
 * Production-grade skeleton loading components for common page layouts.
 */
import { Skeleton } from "@/components/ui/skeleton"

// ─── Generic card skeletons ────────────────────────────────────────────────

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4 grid-cols-2 md:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-md border overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 bg-muted/40 px-4 py-3 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3 border-b last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 flex-1 ${c === 0 ? "w-8 flex-none" : ""}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="space-y-3">
        {[80, 60, 90, 70].map((w, i) => (
          <Skeleton key={i} className={`h-4 w-[${w}%]`} />
        ))}
      </div>
    </div>
  )
}

export function DashboardPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <StatCardsSkeleton count={4} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border p-4">
          <Skeleton className="h-5 w-32" />
          <TableSkeleton rows={4} cols={3} />
        </div>
        <div className="space-y-3 rounded-xl border p-4">
          <Skeleton className="h-5 w-32" />
          <CardListSkeleton count={3} />
        </div>
      </div>
    </div>
  )
}
