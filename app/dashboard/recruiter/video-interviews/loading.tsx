import { Loader2, Video } from "lucide-react"

export default function VideoInterviewsLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
      <Video className="h-10 w-10 text-red-500 animate-pulse" />
      <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      <span className="text-sm font-medium">Loading Video Interview Studio…</span>
    </div>
  )
}
