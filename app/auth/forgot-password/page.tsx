"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      // Always show success to prevent email enumeration
      setSent(true)
      toast({ title: "Email sent!", description: data.message })
    } catch {
      toast({ title: "Network Error", description: "Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-purple-100">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Mail className="h-6 w-6 text-purple-600" />
          </div>
          <CardTitle className="text-2xl">Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a reset link valid for 15 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              <div>
                <p className="font-semibold text-lg">Check Your Inbox</p>
                <p className="text-sm text-muted-foreground mt-1">
                  If <strong>{email}</strong> has an account, a reset link was sent. Check your spam folder too.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Login</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
