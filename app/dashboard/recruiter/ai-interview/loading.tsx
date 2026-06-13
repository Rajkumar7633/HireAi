export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-violet-50/30">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-violet-600/20 animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading AI Interview Studio…</p>
      </div>
    </div>
  )
}
