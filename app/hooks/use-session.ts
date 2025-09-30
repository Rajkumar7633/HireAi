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
  email: string // for backward compatibility
  name: string // for backward compatibility
  role: string // for backward compatibility
  id: string // for backward compatibility
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSession = async () => {
    try {
      console.log("🔄 [v0] Fetching session...")
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("📡 [v0] Session response status:", response.status)
      console.log("📡 [v0] Session response headers:", Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [v0] Session data received:", data)

        if (data && data.user && data.user.id) {
          const sessionData = {
            user: data.user,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            id: data.user.id,
          }
          console.log("✅ [v0] Setting session:", sessionData)
          setSession(sessionData)
        } else {
          console.log("❌ [v0] Invalid session data structure:", data)
          setSession(null)
        }
      } else {
        const errorText = await response.text()
        console.log("❌ [v0] Session fetch failed:", response.status, errorText)
        setSession(null)
      }
    } catch (error) {
      console.error("❌ [v0] Session fetch error:", error)
      setSession(null)
    } finally {
      console.log("🏁 [v0] Setting loading to false")
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const checkSessionWithRetry = async (retryCount = 0) => {
      const cookies = document.cookie
      const hasAuthToken = cookies.includes("auth-token=")
      console.log(`🍪 [v0] Attempt ${retryCount + 1} - All cookies:`, cookies)
      console.log(`🍪 [v0] Attempt ${retryCount + 1} - Auth token present:`, hasAuthToken)

      if (!hasAuthToken) {
        // Retry up to 3 times with 500ms delay
        if (retryCount < 3) {
          console.log(`⏳ [v0] No auth token found, retrying in 500ms... (attempt ${retryCount + 1}/3)`)
          setTimeout(() => checkSessionWithRetry(retryCount + 1), 500)
          return
        }

        console.log("❌ [v0] No auth token found after retries, user not logged in")
        setSession(null)
        setIsLoading(false)
        return
      }

      console.log("🚀 [v0] Auth token found, fetching session...")
      await fetchSession()
    }

    checkSessionWithRetry()
  }, [])

  const refreshSession = () => {
    console.log("🔄 [v0] Refreshing session...")
    setIsLoading(true)
    fetchSession()
  }

  console.log("🔍 [v0] useSession returning:", {
    hasSession: !!session,
    isLoading,
    sessionRole: session?.role,
    sessionEmail: session?.email,
  })

  return { session, isLoading, refreshSession }
}
