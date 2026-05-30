"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Share2, Users, Trophy, Copy, CheckCircle } from "lucide-react"

interface Referral {
  _id: string
  referredEmail: string
  status: string
  referralCode: string
  bonus: { amount: number; status: string }
  createdAt: string
  referredUserId?: { name: string }
  jobId?: { title: string }
}

interface LeaderboardEntry {
  referrerName: string
  totalReferrals: number
  successfulHires: number
  totalBonusEarned: number
}

export default function ReferralsPage() {
  const [loading, setLoading] = useState(true)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState({
    pending: 0,
    signedUp: 0,
    applied: 0,
    hired: 0,
    bonusPaid: 0,
    totalBonusEarned: 0
  })
  const [creating, setCreating] = useState(false)
  const [newReferralEmail, setNewReferralEmail] = useState("")
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [referralsRes, leaderboardRes] = await Promise.all([
        fetch("/api/referral?my-referrals=true"),
        fetch("/api/referral?leaderboard=true")
      ])

      const referralsData = await referralsRes.json()
      const leaderboardData = await leaderboardRes.json()

      if (referralsData.success) {
        setReferrals(referralsData.referrals)
        setStats(referralsData.stats)
      }

      if (leaderboardData.success) {
        setLeaderboard(leaderboardData.leaderboard)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReferral = async () => {
    if (!newReferralEmail.trim()) return

    setCreating(true)
    try {
      const response = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          referredEmail: newReferralEmail,
          bonusAmount: 500 // Default bonus amount
        }),
      })

      const data = await response.json()
      if (data.success) {
        setNewReferralEmail("")
        await fetchData()
      }
    } catch (error) {
      console.error("Failed to create referral:", error)
    } finally {
      setCreating(false)
    }
  }

  const copyReferralLink = (code: string) => {
    const link = `${window.location.origin}/referral/${code}`
    navigator.clipboard.writeText(link)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800"
      case "Signed Up": return "bg-blue-100 text-blue-800"
      case "Applied": return "bg-purple-100 text-purple-800"
      case "Hired": return "bg-green-100 text-green-800"
      case "Bonus Paid": return "bg-emerald-100 text-emerald-800"
      case "Expired": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Share2 className="w-8 h-8 text-blue-600" />
          Referral Program
        </h1>
        <p className="text-gray-600">Refer candidates and earn bonuses when they get hired</p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Signed Up</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.signedUp}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.applied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Hired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.hired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bonus Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">${stats.totalBonusEarned}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my-referrals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="my-referrals">My Referrals</TabsTrigger>
          <TabsTrigger value="create">Create Referral</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="my-referrals" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>My Referrals</CardTitle>
              <CardDescription>Track all your referrals and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <Alert>
                  <AlertDescription>No referrals yet. Create your first referral to get started!</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {referrals.map((referral) => (
                    <div key={referral._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{referral.referredEmail}</div>
                        <div className="text-sm text-gray-600">
                          {referral.referredUserId?.name && `Referred: ${referral.referredUserId.name}`}
                          {referral.jobId?.title && ` • Job: ${referral.jobId.title}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          Created: {new Date(referral.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(referral.status)}>{referral.status}</Badge>
                        {referral.bonus.amount > 0 && (
                          <Badge variant="outline">${referral.bonus.amount}</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyReferralLink(referral.referralCode)}
                        >
                          {copiedCode === referral.referralCode ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Referral</CardTitle>
              <CardDescription>Send a referral link to someone you know</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Candidate Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="candidate@example.com"
                  value={newReferralEmail}
                  onChange={(e) => setNewReferralEmail(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateReferral} disabled={creating || !newReferralEmail.trim()}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Create Referral
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  Enter the candidate's email address to create a referral
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  Share the unique referral link with the candidate
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  Candidate signs up and applies using your referral
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">4.</span>
                  If they get hired, you earn a bonus!
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Referral Leaderboard
              </CardTitle>
              <CardDescription>Top referrers this month</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <Alert>
                  <AlertDescription>No leaderboard data available yet</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium">{entry.referrerName}</div>
                          <div className="text-sm text-gray-600">
                            {entry.successfulHires} hires • ${entry.totalBonusEarned} earned
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{entry.totalReferrals}</div>
                        <div className="text-sm text-gray-600">referrals</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
