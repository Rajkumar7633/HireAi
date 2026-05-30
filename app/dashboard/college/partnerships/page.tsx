"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Building2, Users, TrendingUp, Calendar, CheckCircle, XCircle } from "lucide-react"

export default function PartnershipsPage() {
  const [loading, setLoading] = useState(true)
  const [partnerships, setPartnerships] = useState<any[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newPartnership, setNewPartnership] = useState({
    recruiterId: "",
    companyId: "",
    partnershipType: "Placement",
    agreementDetails: ""
  })

  useEffect(() => {
    fetchPartnerships()
  }, [])

  const fetchPartnerships = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/college/partnerships")
      const data = await response.json()
      if (data.partnerships) {
        setPartnerships(data.partnerships)
      }
    } catch (error) {
      console.error("Failed to fetch partnerships:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePartnership = async () => {
    try {
      const response = await fetch("/api/college/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPartnership)
      })
      if (response.ok) {
        setShowCreateDialog(false)
        fetchPartnerships()
      }
    } catch (error) {
      console.error("Failed to create partnership:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800"
      case "Inactive": return "bg-gray-100 text-gray-800"
      case "Pending": return "bg-yellow-100 text-yellow-800"
      case "Terminated": return "bg-red-100 text-red-800"
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
            Company Partnerships
          </h1>
          <p className="text-gray-600">Manage recruiter and company partnerships</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Partnership
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Partnership</DialogTitle>
              <DialogDescription>Add a new company partnership</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="partnershipType">Partnership Type</Label>
                <Select value={newPartnership.partnershipType} onValueChange={(value) => setNewPartnership({ ...newPartnership, partnershipType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Placement">Placement</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Campus Drive">Campus Drive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="agreementDetails">Agreement Details</Label>
                <Textarea
                  id="agreementDetails"
                  value={newPartnership.agreementDetails}
                  onChange={(e) => setNewPartnership({ ...newPartnership, agreementDetails: e.target.value })}
                  placeholder="Partnership agreement details"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={handleCreatePartnership}>Create Partnership</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Partnerships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{partnerships.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Partnerships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{partnerships.filter(p => p.status === "Active").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Drives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{partnerships.reduce((sum, p) => sum + (p.drivesConducted || 0), 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Students Placed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{partnerships.reduce((sum, p) => sum + (p.studentsPlaced || 0), 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {partnerships.filter(p => p.status === "Active").map((partnership) => (
            <Card key={partnership._id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{partnership.companyId?.name || "Company"}</CardTitle>
                    <CardDescription>{partnership.partnershipType} Partnership</CardDescription>
                  </div>
                  <Badge className={getStatusColor(partnership.status)}>{partnership.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Since {new Date(partnership.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{partnership.drivesConducted || 0} Drives</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{partnership.studentsPlaced || 0} Placed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">₹{partnership.totalPackageValue || 0}L Total</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="outline" size="sm">Add Note</Button>
                  <Button variant="outline" size="sm">Update Stats</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {partnerships.filter(p => p.status === "Pending").map((partnership) => (
            <Card key={partnership._id} className="border-2 border-yellow-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{partnership.companyId?.name || "Company"}</CardTitle>
                    <CardDescription>{partnership.partnershipType} Partnership</CardDescription>
                  </div>
                  <Badge className={getStatusColor(partnership.status)}>{partnership.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Approve</Button>
                  <Button variant="outline" size="sm">Reject</Button>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4 mt-4">
          {partnerships.filter(p => p.status === "Inactive").map((partnership) => (
            <Card key={partnership._id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{partnership.companyId?.name || "Company"}</CardTitle>
                    <CardDescription>{partnership.partnershipType} Partnership</CardDescription>
                  </div>
                  <Badge className={getStatusColor(partnership.status)}>{partnership.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Reactivate</Button>
                  <Button variant="outline" size="sm">View History</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {partnerships.map((partnership) => (
            <Card key={partnership._id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{partnership.companyId?.name || "Company"}</CardTitle>
                    <CardDescription>{partnership.partnershipType} Partnership</CardDescription>
                  </div>
                  <Badge className={getStatusColor(partnership.status)}>{partnership.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Since {new Date(partnership.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{partnership.drivesConducted || 0} Drives</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{partnership.studentsPlaced || 0} Placed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">₹{partnership.totalPackageValue || 0}L Total</span>
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
