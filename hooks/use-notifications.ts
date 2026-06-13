"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  const esRef = useRef<EventSource | null>(null)
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!session) return
    try {
      const response = await fetch("/api/notifications?status=unread&limit=50", { credentials: "include" })
      if (response.ok) {
        const result = await response.json()
        setData({
          notifications: result.notifications || [],
          unreadCount: result.unreadCount ?? result.stats?.unread ?? 0,
          loading: false,
        })
      }
    } catch {
      setData((prev) => ({ ...prev, loading: false }))
    }
  }, [session])

  // SSE connection with polling fallback
  useEffect(() => {
    if (!session?.userId) return

    // Try SSE first
    if (typeof EventSource !== "undefined") {
      const es = new EventSource("/api/notifications/stream", { withCredentials: true })
      esRef.current = es

      es.addEventListener("initial", (e) => {
        const payload = JSON.parse(e.data)
        setData({
          notifications: payload.notifications || [],
          unreadCount: payload.unreadCount || 0,
          loading: false,
        })
      })

      es.addEventListener("new", (e) => {
        const payload = JSON.parse(e.data)
        setData((prev) => {
          const incoming: Notification[] = payload.notifications || []
          // Deduplicate by _id
          const existingIds = new Set(prev.notifications.map((n) => n._id))
          const genuinelyNew = incoming.filter((n) => !existingIds.has(n._id))
          const merged = [...genuinelyNew, ...prev.notifications].slice(0, 50)
          return {
            notifications: merged,
            unreadCount: prev.unreadCount + genuinelyNew.filter((n) => !n.read).length,
            loading: false,
          }
        })

        // Browser notification for new items
        if ("Notification" in window && window.Notification.permission === "granted") {
          const incoming: Notification[] = payload.notifications || []
          incoming.forEach((n) => {
            new window.Notification("HireAI", { body: n.message, icon: "/favicon.ico" })
          })
        }
      })

      es.onerror = () => {
        // SSE failed — fall back to polling
        es.close()
        esRef.current = null
        fallbackRef.current = setInterval(fetchNotifications, 30000)
        fetchNotifications()
      }

      return () => {
        es.close()
        esRef.current = null
      }
    } else {
      // No EventSource support — use polling
      fetchNotifications()
      fallbackRef.current = setInterval(fetchNotifications, 30000)
      return () => {
        if (fallbackRef.current) clearInterval(fallbackRef.current)
      }
    }
  }, [session?.userId, fetchNotifications])

  // Request browser notification permission once
  useEffect(() => {
    if ("Notification" in window && window.Notification.permission === "default") {
      window.Notification.requestPermission()
    }
  }, [])

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      })
      if (response.ok) {
        setData((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => (n._id === id ? { ...n, read: true } : n)),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }))
      }
    } catch {
      // silent
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
        credentials: "include",
      })
      if (response.ok) {
        setData((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }))
      }
    } catch {
      // silent
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
