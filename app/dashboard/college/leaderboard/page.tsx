"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SkillBar } from "@/components/ui/charts"
import { Loader2, Trophy, Medal, Search, Crown, TrendingUp, Users, Star, GraduationCap, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Student {
  _id: string
  rank: number
  name: string
  email: string
  cgpa: number
  department: string
  year: number
  batch: string
  placementStatus: string
  readinessScore: number
  overallScore: number
  testsCompleted: number
  avatar: string | null
}

const DEPARTMENTS = ["All", "CSE", "IT", "ECE", "EEE", "ME", "CE", "MBA", "MCA"]
const YEARS = ["All", "1", "2", "3", "4"]

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-yellow-100 border-2 border-yellow-400">
        <Crown className="h-4 w-4 text-yellow-600" />
      </div>
    )
  if (rank === 2)
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 border-2 border-gray-400">
        <Medal className="h-4 w-4 text-gray-500" />
      </div>
    )
  if (rank === 3)
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-100 border-2 border-orange-400">
        <Medal className="h-4 w-4 text-orange-500" />
      </div>
    )
  return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted text-sm font-bold text-muted-foreground">
      {rank}
    </div>
  )
}

function PlacementBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Placed: "bg-green-100 text-green-800 border-green-200",
    "Not Placed": "bg-red-100 text-red-800 border-red-200",
    "In Progress": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Offer Received": "bg-blue-100 text-blue-800 border-blue-200",
  }
  return (
    <Badge className={`text-xs border ${map[status] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
      {status}
    </Badge>
  )
}

function TopPodium({ students }: { students: Student[] }) {
  if (students.length < 3) return null
  const [first, second, third] = students

  return (
    <div className="flex items-end justify-center gap-4 mb-8 py-6">
      {/* 2nd place */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
          {second.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm truncate max-w-[100px]">{second.name.split(" ")[0]}</p>
          <p className="text-xs text-muted-foreground">{second.overallScore} pts</p>
        </div>
        <div className="w-20 h-16 bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-lg flex items-center justify-center">
          <span className="text-2xl font-black text-gray-500">2</span>
        </div>
      </div>

      {/* 1st place */}
      <div className="flex flex-col items-center gap-2">
        <Crown className="h-6 w-6 text-yellow-500" />
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl ring-4 ring-yellow-300">
          {first.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <p className="font-bold text-sm truncate max-w-[120px]">{first.name.split(" ")[0]}</p>
          <p className="text-xs text-muted-foreground">{first.overallScore} pts</p>
        </div>
        <div className="w-20 h-24 bg-gradient-to-t from-yellow-200 to-yellow-100 rounded-t-lg flex items-center justify-center">
          <span className="text-3xl font-black text-yellow-500">1</span>
        </div>
      </div>

      {/* 3rd place */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
          {third.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm truncate max-w-[100px]">{third.name.split(" ")[0]}</p>
          <p className="text-xs text-muted-foreground">{third.overallScore} pts</p>
        </div>
        <div className="w-20 h-12 bg-gradient-to-t from-orange-200 to-orange-100 rounded-t-lg flex items-center justify-center">
          <span className="text-2xl font-black text-orange-500">3</span>
        </div>
      </div>
    </div>
  )
}

export default function CollegeLeaderboardPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [filtered, setFiltered] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [department, setDepartment] = useState("All")
  const [year, setYear] = useState("All")
  const [total, setTotal] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    fetchLeaderboard()
  }, [department, year])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      students.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      )
    )
  }, [search, students])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (department !== "All") params.set("department", department)
      if (year !== "All") params.set("year", year)
      const res = await fetch(`/api/college/leaderboard?${params}`)
      const data = await res.json()
      const list = data.leaderboard || []
      setStudents(list)
      setFiltered(list)
      setTotal(data.total || list.length)
    } catch {
      toast({ title: "Error", description: "Failed to load leaderboard.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const placed = students.filter((s) => s.placementStatus === "Placed").length
  const avgCgpa = students.length > 0 ? (students.reduce((a, s) => a + s.cgpa, 0) / students.length).toFixed(2) : "0.00"
  const topScore = students[0]?.overallScore || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-muted-foreground">Loading leaderboard…</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Student Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">Rankings based on CGPA, placement readiness, and test performance</p>
        </div>
        <Button variant="outline" onClick={fetchLeaderboard} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-purple-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold leading-none">{total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Students</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold leading-none">{placed}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Placed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold leading-none">{avgCgpa}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Avg CGPA</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <Star className="h-5 w-5 text-yellow-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold leading-none">{topScore}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Top Score</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Podium */}
      {students.length >= 3 && <TopPodium students={students} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>{d === "All" ? "All Departments" : d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y}>{y === "All" ? "All Years" : `Year ${y}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leaderboard Table */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No students found</h3>
            <p className="text-muted-foreground text-sm">
              {students.length === 0
                ? "Onboard students to see their rankings here."
                : "Try adjusting your search or filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rankings ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((student) => (
                <div
                  key={student._id}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors ${
                    student.rank <= 3 ? "bg-gradient-to-r from-yellow-50/40 to-transparent" : ""
                  }`}
                >
                  <RankBadge rank={student.rank} />

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {student.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{student.name}</p>
                      <PlacementBadge status={student.placementStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {student.department} • Year {student.year} {student.batch && `• ${student.batch}`}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-sm font-bold">{student.cgpa.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">CGPA</p>
                    </div>
                    <div className="text-center min-w-[80px]">
                      <p className="text-xs text-muted-foreground mb-1">Readiness</p>
                      <div className="w-20"><SkillBar label="" value={student.readinessScore} color={student.readinessScore >= 70 ? "#16a34a" : student.readinessScore >= 50 ? "#f59e0b" : "#ef4444"} /></div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">{student.testsCompleted}</p>
                      <p className="text-xs text-muted-foreground">Tests</p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-purple-600">{student.overallScore}</p>
                    <p className="text-xs text-muted-foreground">pts</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
