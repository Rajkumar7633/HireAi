"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, TrendingUp, CheckCircle, AlertCircle, User, Briefcase, GraduationCap } from "lucide-react"

interface BenchmarkData {
  applicationId: string
  candidateId: string
  candidateName: string
  jobTitle: string
  overallMatch: number
  skillMatch: { score: number; matched: string[]; missing: string[]; partial: string[] }
  experienceMatch: { score: number; required: number; has: number; gap: number }
  educationMatch: { score: number; required: string; has: string; match: boolean }
  keywordMatch: { score: number; found: string[]; missing: string[] }
  softSkills: { score: number; found: string[]; suggested: string[] }
  recommendations: string[]
  strengths: string[]
  gaps: string[]
  visualData: {
    radarChart: Array<{ label: string; value: number }>
    barChart: Array<{ label: string; value: number }>
    progressBars: Array<{ label: string; value: number; color: string }>
  }
}

export default function CandidateBenchmarkPage() {
  const params = useParams()
  const applicationId = params?.id as string | undefined
  const [loading, setLoading] = useState(true)
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null)

  useEffect(() => {
    if (applicationId) {
      fetchBenchmark()
    }
  }, [applicationId])

  const fetchBenchmark = async () => {
    if (!applicationId) return
    setLoading(true)
    try {
      const response = await fetch("/api/benchmark/candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      })

      const data = await response.json()
      if (data.success) {
        setBenchmark(data.benchmark)
      }
    } catch (error) {
      console.error("Failed to fetch benchmark:", error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100"
    if (score >= 60) return "bg-yellow-100"
    return "bg-red-100"
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!benchmark) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load benchmark data</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          Candidate Benchmark
        </h1>
        <p className="text-gray-600">
          {benchmark.candidateName} vs {benchmark.jobTitle}
        </p>
      </div>

      {/* Overall Score */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Overall Match Score
            <Badge className={`text-3xl px-6 py-3 ${getScoreBgColor(benchmark.overallMatch)}`}>
              {benchmark.overallMatch}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={benchmark.overallMatch} className="h-3" />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="visual">Visual</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getScoreColor(benchmark.skillMatch.score)}`}>
                  {benchmark.skillMatch.score}%
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {benchmark.skillMatch.matched.length} matched
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getScoreColor(benchmark.experienceMatch.score)}`}>
                  {benchmark.experienceMatch.score}%
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {benchmark.experienceMatch.has} vs {benchmark.experienceMatch.required} years
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getScoreColor(benchmark.educationMatch.score)}`}>
                  {benchmark.educationMatch.score}%
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {benchmark.educationMatch.has}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getScoreColor(benchmark.keywordMatch.score)}`}>
                  {benchmark.keywordMatch.score}%
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {benchmark.keywordMatch.found.length} found
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {benchmark.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {benchmark.gaps.map((gap, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-red-600 mt-0.5">!</span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Matched Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {benchmark.skillMatch.matched.map((skill, idx) => (
                  <Badge key={idx} className="bg-green-100 text-green-800">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Missing Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {benchmark.skillMatch.missing.map((skill, idx) => (
                  <Badge key={idx} variant="destructive">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Partial Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {benchmark.skillMatch.partial.map((skill, idx) => (
                  <Badge key={idx} variant="outline">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {benchmark.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm p-3 bg-gray-50 rounded">
                    <span className="text-blue-600 font-bold">{idx + 1}.</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Soft Skills Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Soft Skills Score</span>
                    <span className={`font-semibold ${getScoreColor(benchmark.softSkills.score)}`}>
                      {benchmark.softSkills.score}%
                    </span>
                  </div>
                  <Progress value={benchmark.softSkills.score} />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Found:</p>
                  <div className="flex flex-wrap gap-2">
                    {benchmark.softSkills.found.map((skill, idx) => (
                      <Badge key={idx} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Suggested:</p>
                  <div className="flex flex-wrap gap-2">
                    {benchmark.softSkills.suggested.map((skill, idx) => (
                      <Badge key={idx} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visual" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {benchmark.visualData.progressBars.map((bar, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{bar.label}</span>
                    <span className="font-semibold">{bar.value}%</span>
                  </div>
                  <Progress value={bar.value} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skill Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {benchmark.visualData.barChart.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.label}</span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                    <Progress value={(item.value / 10) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
