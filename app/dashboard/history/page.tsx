"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Loader2, HistoryIcon as HistoryLucideIcon } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"

interface HistoryEntry {
  _id: string
  userId: string
  type: string
  details: string
  relatedEntity?: {
    id: string
    type: string
  }
  createdAt: string
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/history")
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch history.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching history:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch history.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading history...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Activity History</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No activity recorded yet.</p>
          ) : (
            <ScrollArea className="h-[600px]">
              {history.map((entry, index) => (
                <div key={entry._id} className="flex items-start gap-4 p-4">
                  <HistoryLucideIcon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{entry.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })} (
                      {format(new Date(entry.createdAt), "MMM dd, yyyy hh:mm a")})
                    </p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
