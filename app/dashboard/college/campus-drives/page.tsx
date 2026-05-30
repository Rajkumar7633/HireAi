"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Plus, Building2, Calendar, Users, CheckCircle, XCircle, Clock } from "lucide-react"

export default function CampusDrivesPage() {
  const [loading, setLoading] = useState(true)
  const [drives, setDrives] = useState<any[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newDrive, setNewDrive] = useState({
    title: "",
    description: "",
    recruiterId: "",
    companyId: "",
    jobDescriptionId: "",
    departments: [],
    branches: [],
    eligibilityCriteria: {
      minCGPA: 0,
      minYear: 1,
      maxYear: 5,
      skills: []
    },
    driveDate: "",
    venue: ""
  })

  useEffect(() => {
    fetchDrives()
  }, [])

  const fetchDrives = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/college/campus-drives")
      const data = await response.json()
      if (data.drives) {
        setDrives(data.drives)
      }
    } catch (error) {
      console.error("Failed to fetch drives:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDrive = async () => {
    try {
      const response = await fetch("/api/college/campus-drives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDrive)
      })
      if (response.ok) {
        setShowCreateDialog(false)
        fetchDrives()
      }
    } catch (error) {
      console.error("Failed to create drive:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Upcoming": return "bg-blue-100 text-blue-800"
      case "Ongoing": return "bg-green-100 text-green-800"
      case "Completed": return "bg-gray-100 text-gray-800"
      case "Cancelled": return "bg-red-100 text-red-800"
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
            <Building2 className="w-8 h-8 text-blue-600" />
            Campus Drives
          </h1>
          <p className="text-gray-600">Manage campus recruitment drives</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Drive
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Campus Drive</DialogTitle>
              <DialogDescription>Fill in the details for the new campus drive</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Drive Title *</Label>
                <Input
                  id="title"
                  value={newDrive.title}
                  onChange={(e) => setNewDrive({ ...newDrive, title: e.target.value })}
                  placeholder="e.g., Google Campus Drive 2024"
                />
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={newDrive.description}
                  onChange={(e) => setNewDrive({ ...newDrive, description: e.target.value })}
                  placeholder="Drive description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="driveDate">Drive Date *</Label>
                  <Input
                    id="driveDate"
                    type="date"
                    value={newDrive.driveDate}
                    onChange={(e) => setNewDrive({ ...newDrive, driveDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="venue">Venue *</Label>
                  <Input
                    id="venue"
                    value={newDrive.venue}
                    onChange={(e) => setNewDrive({ ...newDrive, venue: e.target.value })}
                    placeholder="e.g., Auditorium Block A"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minCGPA">Min CGPA</Label>
                  <Input
                    id="minCGPA"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={newDrive.eligibilityCriteria.minCGPA}
                    onChange={(e) => setNewDrive({
                      ...newDrive,
                      eligibilityCriteria: { ...newDrive.eligibilityCriteria, minCGPA: parseFloat(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="minYear">Min Year</Label>
                  <Input
                    id="minYear"
                    type="number"
                    min="1"
                    max="5"
                    value={newDrive.eligibilityCriteria.minYear}
                    onChange={(e) => setNewDrive({
                      ...newDrive,
                      eligibilityCriteria: { ...newDrive.eligibilityCriteria, minYear: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateDrive}>Create Drive</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Drives</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-4">
          {drives.filter(d => d.status === "Upcoming").map((drive) => (
            <Card key={drive._id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{drive.title}</CardTitle>
                    <CardDescription>{drive.description}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(drive.status)}>{drive.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{new Date(drive.driveDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{drive.registeredStudents?.length || 0} Registered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{drive.selectedStudents?.length || 0} Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{drive.companyId?.name || "Company"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="outline" size="sm">Manage Students</Button>
                  <Button size="sm">Schedule Interviews</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ongoing" className="space-y-4 mt-4">
          {drives.filter(d => d.status === "Ongoing").map((drive) => (
            <Card key={drive._id} className="border-2 border-green-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{drive.title}</CardTitle>
                    <CardDescription>{drive.description}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(drive.status)}>{drive.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{new Date(drive.driveDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{drive.registeredStudents?.length || 0} Registered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{drive.selectedStudents?.length || 0} Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{drive.companyId?.name || "Company"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="outline" size="sm">Manage Interviews</Button>
                  <Button size="sm">Add Results</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {drives.filter(d => d.status === "Completed").map((drive) => (
            <Card key={drive._id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{drive.title}</CardTitle>
                    <CardDescription>{drive.description}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(drive.status)}>{drive.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{new Date(drive.driveDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{drive.registeredStudents?.length || 0} Registered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{drive.selectedStudents?.length || 0} Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{drive.companyId?.name || "Company"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Report</Button>
                  <Button variant="outline" size="sm">View Results</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {drives.map((drive) => (
            <Card key={drive._id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{drive.title}</CardTitle>
                    <CardDescription>{drive.description}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(drive.status)}>{drive.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{new Date(drive.driveDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{drive.registeredStudents?.length || 0} Registered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{drive.selectedStudents?.length || 0} Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{drive.companyId?.name || "Company"}</span>
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
      </Tabs>
    </div>
  )
}
