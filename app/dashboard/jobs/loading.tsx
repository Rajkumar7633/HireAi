import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      <p className="ml-2 text-lg text-muted-foreground">Loading jobs...</p>
    </div>
  )
}
