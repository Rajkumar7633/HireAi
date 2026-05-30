"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Sparkles, CheckCircle, AlertCircle, TrendingUp } from "lucide-react"

interface AnalysisResult {
  overallScore: number
  clarity: { score: number; issues: string[]; suggestions: string[] }
  inclusivity: { score: number; issues: string[]; suggestions: string[] }
  completeness: { score: number; missing: string[]; suggestions: string[] }
  effectiveness: { score: number; issues: string[]; suggestions: string[] }
  keywords: { found: string[]; suggested: string[]; missing: string[] }
  optimizedVersion: string
  priorityActions: Array<{ type: string; issue: string }>
}

export default function JobDescriptionTailorPage() {
  const [jobDescription, setJobDescription] = useState("")
  const [title, setTitle] = useState("")
  const [industry, setIndustry] = useState("")
  const [experienceLevel, setExperienceLevel] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [optimizedVersion, setOptimizedVersion] = useState("")

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) return

    setAnalyzing(true)
    try {
      const response = await fetch("/api/job-description/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, title, industry, experienceLevel }),
      })

      const data = await response.json()
      if (data.success) {
        setAnalysis(data.analysis)
        setOptimizedVersion(data.analysis.optimizedVersion)
      }
    } catch (error) {
      console.error("Analysis failed:", error)
    } finally {
      setAnalyzing(false)
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

  const getPriorityBadgeColor = (type: string) => {
    switch (type) {
      case "critical": return "bg-red-500"
      case "high": return "bg-orange-500"
      case "medium": return "bg-yellow-500"
      default: return "bg-gray-500"
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          AI Job Description Tailor
        </h1>
        <p className="text-gray-600">
          Optimize your job descriptions with AI-powered insights to attract better candidates
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Job Description Input</CardTitle>
            <CardDescription>Paste your job description for AI analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                placeholder="e.g., Senior Software Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., Technology, Healthcare, Finance"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="experience">Experience Level</Label>
              <Input
                id="experience"
                placeholder="e.g., Mid-level, Senior, Executive"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                placeholder="Paste your job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={12}
                className="resize-none"
              />
            </div>
            <Button 
              onClick={handleAnalyze} 
              disabled={!jobDescription.trim() || analyzing}
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze & Optimize
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Analysis Results
                <Badge className={`text-2xl px-4 py-2 ${getScoreBgColor(analysis.overallScore)}`}>
                  {analysis.overallScore}/100
                </Badge>
              </CardTitle>
              <CardDescription>AI-powered insights and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="keywords">Keywords</TabsTrigger>
                  <TabsTrigger value="optimized">Optimized</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Clarity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-3xl font-bold ${getScoreColor(analysis.clarity.score)}`}>
                          {analysis.clarity.score}%
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Inclusivity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-3xl font-bold ${getScoreColor(analysis.inclusivity.score)}`}>
                          {analysis.inclusivity.score}%
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Completeness</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-3xl font-bold ${getScoreColor(analysis.completeness.score)}`}>
                          {analysis.completeness.score}%
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Effectiveness</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-3xl font-bold ${getScoreColor(analysis.effectiveness.score)}`}>
                          {analysis.effectiveness.score}%
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      <strong className="font-semibold">Priority Actions:</strong>
                      <ul className="mt-2 space-y-1">
                        {analysis.priorityActions.map((action, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Badge className={getPriorityBadgeColor(action.type)}>{action.type}</Badge>
                            {action.issue}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                <TabsContent value="details" className="space-y-4 mt-4">
                  {Object.entries(analysis).map(([key, value]: [string, any]) => {
                    if (typeof value !== 'object' || !value.issues) return null
                    return (
                      <Card key={key}>
                        <CardHeader>
                          <CardTitle className="capitalize text-lg">{key}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {value.issues.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                Issues
                              </h4>
                              <ul className="space-y-1 text-sm">
                                {value.issues.map((issue: string, idx: number) => (
                                  <li key={idx} className="text-red-600">• {issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {value.suggestions.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Suggestions
                              </h4>
                              <ul className="space-y-1 text-sm">
                                {value.suggestions.map((suggestion: string, idx: number) => (
                                  <li key={idx} className="text-green-600">• {suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </TabsContent>

                <TabsContent value="keywords" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Found Keywords</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {analysis.keywords.found.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary">{keyword}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Suggested Keywords</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {analysis.keywords.suggested.map((keyword, idx) => (
                          <Badge key={idx} variant="outline">{keyword}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="optimized" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Optimized Version</CardTitle>
                      <CardDescription>AI-improved job description</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={optimizedVersion}
                        onChange={(e) => setOptimizedVersion(e.target.value)}
                        rows={16}
                        className="resize-none"
                      />
                      <Button className="mt-4 w-full" onClick={() => setJobDescription(optimizedVersion)}>
                        Apply Optimized Version
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
