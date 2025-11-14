"use client"
import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/hooks/use-session"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session } = useSession() as any
  const router = useRouter()

  useEffect(() => {
    const enabled = (process.env.NEXT_PUBLIC_ADMIN_ENABLED ?? "1") !== "0"
    if (!enabled) {
      router.replace("/")
      return
    }
    const role = (session as any)?.role
    if (role && role !== "admin") {
      router.replace("/")
    }
  }, [session, router])

  return <div className="p-6 max-w-7xl mx-auto">{children}</div>
}
