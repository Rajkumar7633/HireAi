"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "./use-session"

interface Notification {
  _id: string
  type: string
  message: string
  read: boolean
  createdAt: string
  relatedEntity?: {
    id: string
    type: string
  }
}

interface NotificationData {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
}

export function useNotifications() {
  const { session } = useSession()
  const [data, setData] = useState<NotificationData>({
    notifications: [],
    unreadCount: 0,
    loading: true,
  })

  const fetchNotifications = useCallback(async () => {
    if (!session) return

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch("/api/notifications", {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })

      if (response.ok) {
        const result = await response.json()
        setData({
          notifications: result.notifications || [],
          unreadCount: result.unreadCount || 0,
          loading: false,
        })
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setData((prev) => ({ ...prev, loading: false }))
    }
  }, [session])

  useEffect(() => {
    if (session?.userId) {
      fetchNotifications()

      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)

      return () => clearInterval(interval)
    }
  }, [session?.userId, fetchNotifications])

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  const markAsRead = async (id: string) => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })

      if (response.ok) {
        setData((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => (n._id === id ? { ...n, read: true } : n)),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1]

      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })

      if (response.ok) {
        setData((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }))
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  return {
    notifications: data.notifications,
    unreadCount: data.unreadCount,
    loading: data.loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
