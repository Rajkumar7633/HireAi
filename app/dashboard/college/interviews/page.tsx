"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Bell, Calendar, Clock, CheckCircle, XCircle, User, Building2 } from "lucide-react"

export default function InterviewsPage() {
  const [loading, setLoading] = useState(true)
  const [interviews, setInterviews] = useState<any[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newInterview, setNewInterview] = useState({
    driveId: "",
    studentId: "",
    date: "",
    time: "",
    venue: "",
    type: "Technical",
    notes: ""
  })

  useEffect(() => {
    fetchInterviews()
  }, [])

  const fetchInterviews = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/college/interviews")
      const data = await response.json()
      if (data.interviews) {
        setInterviews(data.interviews)
      }
    } catch (error) {
      console.error("Failed to fetch interviews:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInterview = async () => {
    try {
      const response = await fetch("/api/college/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInterview)
      })
      if (response.ok) {
        setShowCreateDialog(false)
        fetchInterviews()
      }
    } catch (error) {
      console.error("Failed to create interview:", error)
    }
  }

  const handleUpdateResult = async (interviewId: string, result: string) => {
    try {
      await fetch(`/api/college/interviews/${interviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result })
      })
      fetchInterviews()
    } catch (error) {
      console.error("Failed to update interview result:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Scheduled": return "bg-blue-100 text-blue-800"
      case "Completed": return "bg-green-100 text-green-800"
      case "Cancelled": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case "Selected": return "bg-green-100 text-green-800"
      case "Rejected": return "bg-red-100 text-red-800"
      case "Pending": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Bell className="w-8 h-8 text-blue-600" />
            Interview Management
          </h1>
          <p className="text-gray-600">Schedule and manage interviews</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Interview
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Interview</DialogTitle>
              <DialogDescription>Schedule a new interview for a student</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="driveId">Campus Drive</Label>
                <Input
                  id="driveId"
                  value={newInterview.driveId}
                  onChange={(e) => setNewInterview({ ...newInterview, driveId: e.target.value })}
                  placeholder="Drive ID"
                />
              </div>
              <div>
                <Label htmlFor="studentId">Student</Label>
                <Input
                  id="studentId"
                  value={newInterview.studentId}
                  onChange={(e) => setNewInterview({ ...newInterview, studentId: e.target.value })}
                  placeholder="Student ID"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newInterview.date}
                    onChange={(e) => setNewInterview({ ...newInterview, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newInterview.time}
                    onChange={(e) => setNewInterview({ ...newInterview, time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="venue">Venue *</Label>
                <Input
                  id="venue"
                  value={newInterview.venue}
                  onChange={(e) => setNewInterview({ ...newInterview, venue: e.target.value })}
                  placeholder="e.g., Room 101, Block A"
                />
              </div>
              <div>
                <Label htmlFor="type">Interview Type</Label>
                <Select value={newInterview.type} onValueChange={(value) => setNewInterview({ ...newInterview, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Group Discussion">Group Discussion</SelectItem>
                    <SelectItem value="Aptitude">Aptitude</SelectItem>
                    <SelectItem value="Case Study">Case Study</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newInterview.notes}
                  onChange={(e) => setNewInterview({ ...newInterview, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateInterview}>Schedule Interview</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{interviews.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{interviews.filter(i => i.status === "Scheduled").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{interviews.filter(i => i.status === "Completed").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{interviews.filter(i => i.result === "Selected").length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Interviews</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-4">
          {interviews.filter(i => i.status === "Scheduled" && new Date(i.date) > new Date()).map((interview) => (
            <Card key={interview.interviewId} className="border-2 border-blue-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{interview.type} Interview</CardTitle>
                    <CardDescription>{interview.driveTitle}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(interview.status)}>{interview.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{new Date(interview.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{interview.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{interview.student?.name || "Student"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{interview.company || "Company"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="outline" size="sm">Reschedule</Button>
                  <Button variant="destructive" size="sm">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {interviews.filter(i => i.status === "Completed").map((interview) => (
            <Card key={interview.interviewId} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{interview.type} Interview</CardTitle>
                    <CardDescription>{interview.driveTitle}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(interview.status)}>{interview.status}</Badge>
                    {interview.result && <Badge className={getResultColor(interview.result)}>{interview.result}</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{new Date(interview.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{interview.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{interview.student?.name || "Student"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{interview.company || "Company"}</span>
                  </div>
                </div>
                {interview.feedback && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium mb-1">Feedback:</div>
                    <div className="text-sm text-gray-600">{interview.feedback}</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  {!interview.result && (
                    <>
                      <Button size="sm" onClick={() => handleUpdateResult(interview.interviewId, "Selected")}>
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Select
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleUpdateResult(interview.interviewId, "Rejected")}>
                        <XCircle className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {interviews.map((interview) => (
            <Card key={interview.interviewId} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{interview.type} Interview</CardTitle>
                    <CardDescription>{interview.driveTitle}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(interview.status)}>{interview.status}</Badge>
                    {interview.result && <Badge className={getResultColor(interview.result)}>{interview.result}</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{new Date(interview.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{interview.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{interview.student?.name || "Student"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{interview.company || "Company"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Interview Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="text-sm font-medium">By Status</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Scheduled</span>
                      <span>{interviews.filter(i => i.status === "Scheduled").length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Completed</span>
                      <span>{interviews.filter(i => i.status === "Completed").length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cancelled</span>
                      <span>{interviews.filter(i => i.status === "Cancelled").length}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium">By Result</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Selected</span>
                      <span>{interviews.filter(i => i.result === "Selected").length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Rejected</span>
                      <span>{interviews.filter(i => i.result === "Rejected").length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pending</span>
                      <span>{interviews.filter(i => i.result === "Pending").length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
