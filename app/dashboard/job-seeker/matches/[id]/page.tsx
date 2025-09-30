"use client"

import { Label } from "@/components/ui/label"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Loader2, MapPin, DollarSign, Briefcase, ExternalLink } from "lucide-react"
import { format } from "date-fns"

interface Match {
  _id: string
  resumeId: {
    _id: string
    filename: string
    parsedText: string
  }
  jobDescriptionId: {
    _id: string
    title: string
    description: string
    requirements: string[]
    responsibilities: string[]
    location: string
    salary?: string
    employmentType: string
    skills: string[]
    postedDate: string
  }
  matchScore: number
  atsScore: number
  matchedSkills: string[]
  suggestions: string[]
  matchDate: string
}

export default function MatchDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string
  const { toast } = useToast()

  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (matchId) {
      fetchMatchDetails()
    }
  }, [matchId])

  const fetchMatchDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/match/${matchId}`)
      if (response.ok) {
        const data = await response.json()
        setMatch(data)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch match details.",
          variant: "destructive",
        })
        router.push("/dashboard/job-seeker/matches") // Redirect if match not found or error
      }
    } catch (error) {
      console.error("Error fetching match details:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch match details.",
        variant: "destructive",
      })
      router.push("/dashboard/job-seeker/matches") // Redirect on network error
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading match details...</p>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-muted-foreground">Match not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center justify-between">
            <span>{match.jobDescriptionId.title}</span>
            <Badge variant="default" className="text-lg px-4 py-2">
              Match: {match.matchScore}%
            </Badge>
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Matched with your resume: {match.resumeId.filename} on {format(new Date(match.matchDate), "MMM dd, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Job Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {match.jobDescriptionId.location}
              </p>
              {match.jobDescriptionId.salary && (
                <p className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" /> {match.jobDescriptionId.salary}
                </p>
              )}
              <p className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" /> {match.jobDescriptionId.employmentType}
              </p>
            </div>
            <p className="text-muted-foreground whitespace-pre-wrap mt-4">{match.jobDescriptionId.description}</p>
            <div className="flex justify-end mt-4">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/jobs/${match.jobDescriptionId._id}`}>
                  View Full Job Description
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mb-2">Match Analysis</h2>
            <div className="space-y-4">
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
                      <Badge key={idx} variant="secondary">
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
                  <Label className="text-sm font-medium">Suggestions for Resume Improvement</Label>
                  <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                    {match.suggestions.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button asChild>
              <Link href={`/dashboard/jobs/${match.jobDescriptionId._id}/apply`}>Apply for this Job</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
