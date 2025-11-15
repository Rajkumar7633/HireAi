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

  const fetchSession = async (allowRefresh: boolean = true) => {
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
        console.log("❌ [v0] Session fetch failed:", response.status)
        // If unauthorized and we haven't tried refresh yet, attempt token refresh once
        if (response.status === 401 && allowRefresh) {
          try {
            console.log("🔁 [v0] Attempting token refresh...")
            const refreshResponse = await fetch("/api/auth/refresh", {
              method: "POST",
              credentials: "include",
              cache: "no-store",
              headers: {
                "Content-Type": "application/json",
              },
            })

            console.log("📡 [v0] Refresh response status:", refreshResponse.status)

            if (refreshResponse.ok) {
              console.log("✅ [v0] Refresh successful, retrying session fetch...")
              await fetchSession(false)
              return
            } else {
              console.log("❌ [v0] Refresh failed, clearing session")
            }
          } catch (refreshError) {
            console.error("❌ [v0] Refresh error:", refreshError)
          }
        }
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
    // Just try to fetch the session directly - the server will validate the HttpOnly cookie
    console.log("🚀 [v0] Attempting to fetch session...")
    fetchSession(true)
  }, [])

  const refreshSession = () => {
    console.log("🔄 [v0] Refreshing session...")
    setIsLoading(true)
    fetchSession(true)
  }

  console.log("🔍 [v0] useSession returning:", {
    hasSession: !!session,
    isLoading,
    sessionRole: session?.role,
    sessionEmail: session?.email,
  })

  return { session, isLoading, refreshSession }
}
