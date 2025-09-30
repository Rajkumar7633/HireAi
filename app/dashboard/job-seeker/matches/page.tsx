"use client"

import { Label } from "@/components/ui/label"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ExternalLink } from "lucide-react"

interface Match {
  _id: string
  resumeId: {
    _id: string
    filename: string
  }
  jobDescriptionId: {
    _id: string
    title: string
    location: string
  }
  matchScore: number
  atsScore: number
  matchedSkills: string[]
  suggestions: string[]
  matchDate: string
}

export default function JobMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/match")
      if (response.ok) {
        const data = await response.json()
        setMatches(data)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch job matches.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching job matches:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch job matches.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateMatches = async () => {
    setLoading(true)
    try {
      // This would ideally trigger a backend process to re-run matching for all resumes
      // For simplicity, we'll just refetch existing matches after a delay
      const response = await fetch("/api/match/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // No specific resume/job ID, trigger for all user's resumes
      })

      if (response.ok) {
        toast({
          title: "Matches Generated",
          description: "New matches are being generated. Please refresh in a moment.",
        })
        await fetchMatches() // Refresh after triggering
      } else {
        const errorData = await response.json()
        toast({
          title: "Generation Failed",
          description: errorData.message || "Failed to generate new matches.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Generate matches error:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading job matches...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Job Matches</h1>
        <Button onClick={handleGenerateMatches} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate New Matches
        </Button>
      </div>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No job matches found yet. Upload a resume and click "Generate New Matches" to get started!
            <div className="mt-4">
              <Link href="/dashboard/job-seeker/upload">
                <Button>Upload Resume</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <Card key={match._id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{match.jobDescriptionId.title}</span>
                  <Badge variant="secondary" className="text-sm">
                    Match: {match.matchScore}%
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Matched with: {match.resumeId.filename}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">ATS Score</Label>
                  <Progress value={match.atsScore} className="w-full mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">{match.atsScore}% ATS Compatibility</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Matched Skills</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {match.matchedSkills.length > 0 ? (
                      match.matchedSkills.map((skill, idx) => (
                        <Badge key={idx} variant="outline">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No specific skills matched.</p>
                    )}
                  </div>
                </div>
                {match.suggestions && match.suggestions.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Suggestions</Label>
                    <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                      {match.suggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Separator />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/jobs/${match.jobDescriptionId._id}`}>
                      View Job
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/jobs/${match.jobDescriptionId._id}/apply`}>Apply Now</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
