"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Linkedin, Github, Link, CheckCircle } from "lucide-react"

export default function SocialImportPage() {
  const [loading, setLoading] = useState(false)
  const [linkedInToken, setLinkedInToken] = useState("")
  const [githubToken, setGithubToken] = useState("")
  const [githubUsername, setGithubUsername] = useState("")
  const [imported, setImported] = useState<{ linkedin?: boolean; github?: boolean }>({})
  const [githubProfile, setGithubProfile] = useState<any>(null)

  const handleLinkedInImport = async () => {
    if (!linkedInToken) return

    setLoading(true)
    try {
      const response = await fetch("/api/social-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "linkedin",
          accessToken: linkedInToken,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setImported({ ...imported, linkedin: true })
      }
    } catch (error) {
      console.error("LinkedIn import failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubImport = async () => {
    if (!githubToken) return

    setLoading(true)
    try {
      const response = await fetch("/api/social-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "github",
          accessToken: githubToken,
          username: githubUsername,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setImported({ ...imported, github: true })
      }
    } catch (error) {
      console.error("GitHub import failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchGitHubProfile = async () => {
    if (!githubUsername) return

    setLoading(true)
    try {
      const response = await fetch(`/api/social-import?platform=github&username=${githubUsername}`)
      const data = await response.json()
      if (data.success) {
        setGithubProfile(data.profile)
      }
    } catch (error) {
      console.error("Fetch GitHub profile failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import Profile</h1>
        <p className="text-gray-600">Import your professional profile from LinkedIn or GitHub</p>
      </div>

      <Tabs defaultValue="linkedin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
        </TabsList>

        <TabsContent value="linkedin" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Linkedin className="w-5 h-5 text-blue-600" />
                LinkedIn Profile Import
              </CardTitle>
              <CardDescription>Import your professional profile from LinkedIn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="linkedinToken">LinkedIn Access Token</Label>
                <Input
                  id="linkedinToken"
                  type="password"
                  placeholder="Enter your LinkedIn OAuth access token"
                  value={linkedInToken}
                  onChange={(e) => setLinkedInToken(e.target.value)}
                />
                <p className="text-sm text-gray-600 mt-2">
                  Generate access token from LinkedIn Developer Portal
                </p>
              </div>
              <Button onClick={handleLinkedInImport} disabled={!linkedInToken || loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Linkedin className="mr-2 h-4 w-4" />
                    Import LinkedIn Profile
                  </>
                )}
              </Button>

              {imported.linkedin && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>LinkedIn profile imported successfully</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="w-5 h-5 text-gray-800" />
                GitHub Profile Import
              </CardTitle>
              <CardDescription>Import your developer profile from GitHub</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="githubUsername">GitHub Username</Label>
                <Input
                  id="githubUsername"
                  placeholder="e.g., johndoe"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="githubToken">GitHub Access Token (Optional)</Label>
                <Input
                  id="githubToken"
                  type="password"
                  placeholder="Enter your GitHub personal access token"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleGitHubImport} disabled={!githubUsername || loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Github className="mr-2 h-4 w-4" />
                      Import GitHub Profile
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleFetchGitHubProfile} disabled={!githubUsername || loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Link className="mr-2 h-4 w-4" />
                      Fetch Public Profile
                    </>
                  )}
                </Button>
              </div>

              {imported.github && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>GitHub profile imported successfully</AlertDescription>
                </Alert>
              )}

              {githubProfile && (
                <Card>
                  <CardHeader>
                    <CardTitle>Public GitHub Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <img src={githubProfile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full" />
                        <div>
                          <div className="font-semibold">{githubProfile.name || githubProfile.login}</div>
                          <div className="text-sm text-gray-600">{githubProfile.bio}</div>
                          <a href={githubProfile.html_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm flex items-center gap-1">
                            <Link className="w-3 h-3" />
                            View Profile
                          </a>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <div className="text-gray-600">Public Repos</div>
                          <div className="font-semibold">{githubProfile.public_repos}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Followers</div>
                          <div className="font-semibold">{githubProfile.followers}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Following</div>
                          <div className="font-semibold">{githubProfile.following}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Location</div>
                          <div className="font-semibold">{githubProfile.location || "N/A"}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
