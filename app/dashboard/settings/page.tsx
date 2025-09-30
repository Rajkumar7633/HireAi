"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { useSession } from "@/hooks/use-session"

interface UserProfile {
  id: string
  email: string
  name?: string
  phone?: string
  address?: string
  role: string
}

export default function SettingsPage() {
  const { session, isLoading: sessionLoading, refreshSession } = useSession()
  const { toast } = useToast()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")

  useEffect(() => {
    if (!sessionLoading && session) {
      fetchProfile()
    }
  }, [sessionLoading, session])

  const fetchProfile = async () => {
    setLoadingProfile(true)
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch profile.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch profile.",
        variant: "destructive",
      })
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setUpdatingProfile(true)
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        })
        refreshSession() // Refresh session to update name/email if changed
      } else {
        const errorData = await response.json()
        toast({
          title: "Update Failed",
          description: errorData.message || "An error occurred while updating profile.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Profile update error:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      })
      return
    }

    setUpdatingPassword(true)
    try {
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (response.ok) {
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated.",
        })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmNewPassword("")
      } else {
        const errorData = await response.json()
        toast({
          title: "Update Failed",
          description: errorData.message || "An error occurred while updating password.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Password update error:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdatingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return
    }

    setDeletingAccount(true)
    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Account Deleted",
          description: "Your account has been successfully deleted.",
        })
        refreshSession() // Clear session
        window.location.href = "/signup" // Redirect to signup page
      } else {
        const errorData = await response.json()
        toast({
          title: "Deletion Failed",
          description: errorData.message || "An error occurred while deleting your account.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Account deletion error:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingAccount(false)
    }
  }

  if (sessionLoading || loadingProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading settings...</p>
      </div>
    )
  }

  if (!session || !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-6">
          <CardTitle>Access Denied</CardTitle>
          <CardDescription className="mt-2">Please log in to view your settings.</CardDescription>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Account Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={profile.name || ""}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={profile.address || ""}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" disabled={updatingProfile}>
              {updatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={updatingPassword}>
              {updatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="text-red-600">Delete Account</CardTitle>
          <CardDescription>Permanently delete your account and all associated data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>
            {deletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
