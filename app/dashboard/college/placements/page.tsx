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
import { Loader2, Plus, CheckCircle2, DollarSign, Building2, Calendar, FileText, Download } from "lucide-react"

export default function PlacementsPage() {
  const [loading, setLoading] = useState(true)
  const [placements, setPlacements] = useState<any[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newPlacement, setNewPlacement] = useState({
    studentId: "",
    driveId: "",
    companyId: "",
    recruiterId: "",
    jobTitle: "",
    jobDescription: "",
    package: "",
    packageType: "CTC",
    currency: "INR",
    location: "",
    offerDate: "",
    joiningDate: "",
    placementType: "Campus Placement"
  })

  useEffect(() => {
    fetchPlacements()
  }, [])

  const fetchPlacements = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/college/placements")
      const data = await response.json()
      if (data.placements) {
        setPlacements(data.placements)
      }
    } catch (error) {
      console.error("Failed to fetch placements:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlacement = async () => {
    try {
      const response = await fetch("/api/college/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlacement)
      })
      if (response.ok) {
        setShowCreateDialog(false)
        fetchPlacements()
      }
    } catch (error) {
      console.error("Failed to create placement:", error)
    }
  }

  const getOfferStatusColor = (status: string) => {
    switch (status) {
      case "Accepted": return "bg-green-100 text-green-800"
      case "Rejected": return "bg-red-100 text-red-800"
      case "Pending": return "bg-yellow-100 text-yellow-800"
      case "Deferred": return "bg-blue-100 text-blue-800"
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
            <CheckCircle2 className="w-8 h-8 text-blue-600" />
            Student Placements
          </h1>
          <p className="text-gray-600">Track all student placements and offers</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Placement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Placement Record</DialogTitle>
                <DialogDescription>Record a new student placement</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="studentId">Student *</Label>
                  <Input
                    id="studentId"
                    value={newPlacement.studentId}
                    onChange={(e) => setNewPlacement({ ...newPlacement, studentId: e.target.value })}
                    placeholder="Student ID"
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    value={newPlacement.jobTitle}
                    onChange={(e) => setNewPlacement({ ...newPlacement, jobTitle: e.target.value })}
                    placeholder="e.g., Software Engineer"
                  />
                </div>
                <div>
                  <Label htmlFor="package">Package (LPA) *</Label>
                  <Input
                    id="package"
                    type="number"
                    value={newPlacement.package}
                    onChange={(e) => setNewPlacement({ ...newPlacement, package: e.target.value })}
                    placeholder="e.g., 10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="offerDate">Offer Date *</Label>
                    <Input
                      id="offerDate"
                      type="date"
                      value={newPlacement.offerDate}
                      onChange={(e) => setNewPlacement({ ...newPlacement, offerDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="joiningDate">Joining Date</Label>
                    <Input
                      id="joiningDate"
                      type="date"
                      value={newPlacement.joiningDate}
                      onChange={(e) => setNewPlacement({ ...newPlacement, joiningDate: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newPlacement.location}
                    onChange={(e) => setNewPlacement({ ...newPlacement, location: e.target.value })}
                    placeholder="e.g., Bangalore"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                  <Button onClick={handleCreatePlacement}>Add Placement</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Placements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{placements.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accepted Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{placements.filter(p => p.offerStatus === "Accepted").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{placements.filter(p => p.offerStatus === "Pending").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Package</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              ₹{placements.length > 0 ? (placements.reduce((sum, p) => sum + (p.package || 0), 0) / placements.length).toFixed(2) : 0}L
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Placements</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {placements.map((placement) => (
            <Card key={placement._id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{placement.jobTitle}</CardTitle>
                    <CardDescription>{placement.companyId?.name || "Company"}</CardDescription>
                  </div>
                  <Badge className={getOfferStatusColor(placement.offerStatus)}>{placement.offerStatus}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">₹{placement.package}L {placement.packageType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Offer: {new Date(placement.offerDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{placement.location || "TBD"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{placement.placementType}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="outline" size="sm">Update Status</Button>
                  <Button variant="outline" size="sm">Add Documents</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4 mt-4">
          {placements.filter(p => p.offerStatus === "Accepted").map((placement) => (
            <Card key={placement._id} className="border-2 border-green-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{placement.jobTitle}</CardTitle>
                    <CardDescription>{placement.companyId?.name || "Company"}</CardDescription>
                  </div>
                  <Badge className={getOfferStatusColor(placement.offerStatus)}>{placement.offerStatus}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">₹{placement.package}L {placement.packageType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Offer: {new Date(placement.offerDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{placement.location || "TBD"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{placement.placementType}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="outline" size="sm">View Documents</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {placements.filter(p => p.offerStatus === "Pending").map((placement) => (
            <Card key={placement._id} className="border-2 border-yellow-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{placement.jobTitle}</CardTitle>
                    <CardDescription>{placement.companyId?.name || "Company"}</CardDescription>
                  </div>
                  <Badge className={getOfferStatusColor(placement.offerStatus)}>{placement.offerStatus}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">₹{placement.package}L {placement.packageType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Offer: {new Date(placement.offerDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{placement.location || "TBD"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{placement.placementType}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="outline" size="sm">Update Status</Button>
                  <Button size="sm">Send Reminder</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-4">
          {placements.filter(p => p.offerStatus === "Rejected").map((placement) => (
            <Card key={placement._id} className="border-2 border-red-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{placement.jobTitle}</CardTitle>
                    <CardDescription>{placement.companyId?.name || "Company"}</CardDescription>
                  </div>
                  <Badge className={getOfferStatusColor(placement.offerStatus)}>{placement.offerStatus}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">₹{placement.package}L {placement.packageType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Offer: {new Date(placement.offerDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{placement.location || "TBD"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{placement.placementType}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="outline" size="sm">View History</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
