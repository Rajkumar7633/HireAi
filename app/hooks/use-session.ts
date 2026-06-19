"use client"

import { useState, useEffect } from "react"

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

  const fetchSession = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()

        if (data?.user?.id) {
          setSession({
            user: data.user,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            id: data.user.id,
          })
        } else {
          setSession(null)
        }
      } else {
        setSession(null)
      }
    } catch {
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const checkSessionWithRetry = async (retryCount = 0) => {
      const hasAuthToken = document.cookie.includes("auth-token=")

      if (!hasAuthToken) {
        if (retryCount < 3) {
          setTimeout(() => checkSessionWithRetry(retryCount + 1), 500)
          return
        }
        setSession(null)
        setIsLoading(false)
        return
      }

      await fetchSession()
    }

    checkSessionWithRetry()
  }, [])

  const refreshSession = () => {
    setIsLoading(true)
    fetchSession()
  }

  return { session, isLoading, refreshSession }
}
