"use client"

import { useState, useEffect } from "react"
import { authFetch, persistAuthToken, syncClientAuthToken } from "@/lib/client-auth"

interface User {
  id: string
  email: string
  name: string
  role: "job_seeker" | "recruiter" | "admin"
}

interface Session {
  user: User
  email: string
  name: string
  role: string
  id: string
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSession = async (allowRefresh: boolean = true) => {
    try {
      const response = await authFetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()

        if (data && data.user && data.user.id) {
          const sessionData = {
            user: data.user,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            id: data.user.id,
          }
          setSession(sessionData)
          if (!sessionStorage.getItem("auth-token")) {
            await syncClientAuthToken()
          }
        } else {
          setSession(null)
        }
      } else {
        if (response.status === 401 && allowRefresh) {
          try {
            const refreshResponse = await authFetch("/api/auth/refresh", {
              method: "POST",
              cache: "no-store",
              headers: {
                "Content-Type": "application/json",
              },
            })

            if (refreshResponse.ok) {
              try {
                const refreshData = await refreshResponse.json()
                persistAuthToken(refreshData.accessToken)
              } catch { /* ignore */ }
              await fetchSession(false)
              return
            }
          } catch {
            /* refresh failed */
          }
        }
        setSession(null)
      }
    } catch {
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSession(true)
  }, [])

  const refreshSession = () => {
    setIsLoading(true)
    fetchSession(true)
  }

  return { session, isLoading, refreshSession }
}
