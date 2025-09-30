"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Brain,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ScreeningResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  skillsMatch: string[];
  experienceMatch: string;
  recommendations: string[];
}

export default function AIScreeningPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobRequirements, setJobRequirements] = useState("");
  const [skills, setSkills] = useState("");
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resumeChars = useMemo(() => resumeText.length, [resumeText]);
  const jdChars = useMemo(() => jobRequirements.length, [jobRequirements]);

  const handleScreening = async () => {
    if (!resumeText.trim() || !jobRequirements.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both resume text and job requirements.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/resume-screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobRequirements,
          skills: skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        toast({
          title: "Analysis Complete",
          description: "Resume has been analyzed successfully.",
        });
      } else {
        throw new Error("Failed to analyze resume");
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
          AI Resume Screening
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-2">
          Analyze resumes with AI to identify the best candidates automatically.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-muted">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Resume Analysis</CardTitle>
              <CardDescription>Paste the candidate's resume text and the job description. Add key skills to improve accuracy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Resume Text</label>
                  <span className="text-xs text-muted-foreground">{resumeChars} chars</span>
                </div>
                <Textarea
                  placeholder="Paste candidate resume text here..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="min-h-40"
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResumeText(
                        "Experienced Full-Stack Developer with 4+ years building scalable web apps. Strong in React, TypeScript, Node.js, REST/GraphQL, PostgreSQL, and CI/CD. Led a team to deliver a payments platform handling 50k+ tx/day, improving latency by 35%."
                      );
                    }}
                  >
                    Paste Example
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setResumeText("")}>Clear</Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Job Requirements</label>
                  <span className="text-xs text-muted-foreground">{jdChars} chars</span>
                </div>
                <Textarea
                  placeholder="Paste job description / requirements here..."
                  value={jobRequirements}
                  onChange={(e) => setJobRequirements(e.target.value)}
                  className="min-h-32"
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setJobRequirements(
                        "We are hiring a Full-Stack Engineer with strong React + TypeScript, Node.js, SQL, and experience with scalable systems. Bonus: Docker/Kubernetes, cloud (AWS/GCP), and testing best practices."
                      );
                    }}
                  >
                    Paste Example
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setJobRequirements("")}>Clear</Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Required Skills (comma-separated)</label>
                <Input
                  placeholder="e.g., React, TypeScript, Node.js, SQL"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <Button onClick={handleScreening} disabled={loading} className="w-full md:w-auto">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing Resume...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Analyze Resume
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="space-y-6 lg:sticky lg:top-20 h-fit">
          {result ? (
            <>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    {getScoreIcon(result.score)}
                    Overall Match Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`text-2xl md:text-3xl font-bold ${getScoreColor(
                          result.score
                        )}`}
                      >
                        {result.score}%
                      </div>
                      <Progress value={result.score} className="flex-1" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Skills Match:
                        </span>
                        <div className="font-medium">
                          {result.skillsMatch.length} skills
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Experience:
                        </span>
                        <div className="font-medium">
                          {result.experienceMatch}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Target className="h-5 w-5" />
                    Matched Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.skillsMatch.map((skill, index) => (
                      <Badge key={index} variant="default">
                        {skill}
                      </Badge>
                    ))}
                    {result.skillsMatch.length === 0 && (
                      <p className="text-muted-foreground">
                        No matching skills found
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <TrendingUp className="h-5 w-5" />
                    Analysis Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {result.strengths.map((strength, index) => (
                        <li
                          key={index}
                          className="text-sm flex items-start gap-2"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {result.weaknesses.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-600 mb-2">
                        Areas of Concern
                      </h4>
                      <ul className="space-y-1">
                        {result.weaknesses.map((weakness, index) => (
                          <li
                            key={index}
                            className="text-sm flex items-start gap-2"
                          >
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-blue-600 mb-2">
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {result.recommendations.map((rec, index) => (
                        <li
                          key={index}
                          className="text-sm flex items-start gap-2"
                        >
                          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="shadow-sm">
              <CardContent className="py-10 text-center">
                <Brain className="h-12 w-12 mx-auto mb-4 text-purple-500/60" />
                <p className="text-sm text-muted-foreground">
                  Enter resume details and click <span className="font-medium text-foreground">Analyze Resume</span> to see AI-powered insights.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
