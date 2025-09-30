"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BellIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  _id: string
  userId: string
  type: string
  message: string
  read: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch notifications.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch notifications.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
      })
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to mark notification as read.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to mark notification as read.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading notifications...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Latest Updates</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No new notifications.</p>
          ) : (
            <ScrollArea className="h-[600px]">
              {notifications.map((notification, index) => (
                <div
                  key={notification._id}
                  className={`flex items-start gap-4 p-4 ${
                    !notification.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                  } rounded-md`}
                  onClick={() => !notification.read && markAsRead(notification._id)}
                  style={{ cursor: !notification.read ? "pointer" : "default" }}
                >
                  <BellIcon className={`h-5 w-5 ${!notification.read ? "text-blue-600" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className={`text-sm ${!notification.read ? "font-medium" : "text-muted-foreground"}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
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
