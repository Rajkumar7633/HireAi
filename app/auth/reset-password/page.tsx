"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Lock, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const token = searchParams.get("token") || ""
  const email = searchParams.get("email") || ""

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token || !email) {
      setError("Invalid reset link. Please request a new one.")
    }
  }, [token, email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Reset failed. Please request a new link.")
        return
      }

      setDone(true)
      toast({ title: "✅ Password Reset!", description: "You can now log in with your new password." })
      setTimeout(() => router.push("/login"), 2500)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-purple-100">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-purple-600" />
          </div>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <CardDescription>
            {email && <span>Resetting password for <strong>{email}</strong></span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              <p className="font-semibold text-lg">Password Updated!</p>
              <p className="text-sm text-muted-foreground">Redirecting you to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPwd ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={!!error && !token}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPwd ? "text" : "password"}
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={!!error && !token}
                />
              </div>

              {/* Password strength indicator */}
              {newPassword.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          newPassword.length >= i * 3
                            ? i <= 1 ? "bg-red-400" : i <= 2 ? "bg-yellow-400" : i <= 3 ? "bg-blue-400" : "bg-green-500"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {newPassword.length < 6 ? "Too short" : newPassword.length < 8 ? "Weak" : newPassword.length < 12 ? "Good" : "Strong"}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={loading || (!!error && !token)}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                {loading ? "Resetting..." : "Reset Password"}
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link href="/auth/forgot-password">Request a new link</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
