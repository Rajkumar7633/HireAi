"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Building2, MapPin, Phone, Mail, Globe, Save, CheckCircle, Plus, X, GraduationCap } from "lucide-react"

export default function CollegeProfilePage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [profile, setProfile] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    description: "",
    establishedYear: "",
    accreditation: "",
    type: "Engineering",
    studentCapacity: "",
    placementCellHead: "",
    placementCellEmail: "",
    placementCellPhone: "",
    departments: [] as Array<{name: string, branches: string[]}>
  })

  const [newDepartment, setNewDepartment] = useState({ name: "", branch: "" })

  const addDepartment = () => {
    if (newDepartment.name.trim()) {
      setProfile({
        ...profile,
        departments: [...profile.departments, { name: newDepartment.name.trim(), branches: [] }]
      })
      setNewDepartment({ name: "", branch: "" })
    }
  }

  const addBranch = (deptIndex: number) => {
    if (newDepartment.branch.trim()) {
      const updatedDepartments = [...profile.departments]
      updatedDepartments[deptIndex].branches.push(newDepartment.branch.trim())
      setProfile({ ...profile, departments: updatedDepartments })
      setNewDepartment({ ...newDepartment, branch: "" })
    }
  }

  const removeDepartment = (index: number) => {
    const updatedDepartments = profile.departments.filter((_, i) => i !== index)
    setProfile({ ...profile, departments: updatedDepartments })
  }

  const removeBranch = (deptIndex: number, branchIndex: number) => {
    const updatedDepartments = [...profile.departments]
    updatedDepartments[deptIndex].branches = updatedDepartments[deptIndex].branches.filter((_, i) => i !== branchIndex)
    setProfile({ ...profile, departments: updatedDepartments })
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/college/profile")
      const data = await response.json()
      if (data.profile) {
        setProfile(data.profile)
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    try {
      const response = await fetch("/api/college/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      })
      if (response.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (error) {
      console.error("Failed to save profile:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                C
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">College Dashboard</h1>
                <p className="text-sm text-gray-600">Profile Management</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.history.back()}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">College Profile</h2>
          <p className="text-gray-600">Manage your college's information and placement cell details</p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">Profile saved successfully!</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>College details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">College Name *</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Enter college name"
                />
              </div>
              <div>
                <Label htmlFor="code">College Code *</Label>
                <Input
                  id="code"
                  value={profile.code}
                  onChange={(e) => setProfile({ ...profile, code: e.target.value })}
                  placeholder="e.g., DEC001"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Enter complete address"
                rows={2}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  value={profile.zipCode}
                  onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })}
                  placeholder="ZIP Code"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="info@college.edu"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://www.college.edu"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="Brief description about the college"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Academic Information</CardTitle>
            <CardDescription>Academic details and accreditation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="establishedYear">Established Year</Label>
                <Input
                  id="establishedYear"
                  value={profile.establishedYear}
                  onChange={(e) => setProfile({ ...profile, establishedYear: e.target.value })}
                  placeholder="e.g., 1995"
                />
              </div>
              <div>
                <Label htmlFor="accreditation">Accreditation</Label>
                <Input
                  id="accreditation"
                  value={profile.accreditation}
                  onChange={(e) => setProfile({ ...profile, accreditation: e.target.value })}
                  placeholder="e.g., AICTE, NBA"
                />
              </div>
              <div>
                <Label htmlFor="type">College Type</Label>
                <Select value={profile.type} onValueChange={(value) => setProfile({ ...profile, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Medical">Medical</SelectItem>
                    <SelectItem value="Management">Management</SelectItem>
                    <SelectItem value="Arts">Arts & Science</SelectItem>
                    <SelectItem value="Law">Law</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="studentCapacity">Student Capacity</Label>
              <Input
                id="studentCapacity"
                value={profile.studentCapacity}
                onChange={(e) => setProfile({ ...profile, studentCapacity: e.target.value })}
                placeholder="e.g., 5000"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Placement Cell Information
            </CardTitle>
            <CardDescription>Contact details for placement cell</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="placementCellHead">Placement Cell Head</Label>
              <Input
                id="placementCellHead"
                value={profile.placementCellHead}
                onChange={(e) => setProfile({ ...profile, placementCellHead: e.target.value })}
                placeholder="Dr. John Doe"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="placementCellEmail">Placement Cell Email *</Label>
                <Input
                  id="placementCellEmail"
                  type="email"
                  value={profile.placementCellEmail}
                  onChange={(e) => setProfile({ ...profile, placementCellEmail: e.target.value })}
                  placeholder="placement@college.edu"
                />
              </div>
              <div>
                <Label htmlFor="placementCellPhone">Placement Cell Phone *</Label>
                <Input
                  id="placementCellPhone"
                  value={profile.placementCellPhone}
                  onChange={(e) => setProfile({ ...profile, placementCellPhone: e.target.value })}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Departments & Branches
            </CardTitle>
            <CardDescription>Manage your college's departments and branches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add Department */}
            <div className="flex gap-2">
              <Input
                placeholder="Department name (e.g., Computer Science)"
                value={newDepartment.name}
                onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
              />
              <Button onClick={addDepartment}>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </div>

            {/* Departments List */}
            <div className="space-y-4">
              {profile.departments.map((dept, deptIndex) => (
                <Card key={deptIndex} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{dept.name}</CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => removeDepartment(deptIndex)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {dept.branches.map((branch, branchIndex) => (
                          <div key={branchIndex} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                            <span className="text-sm">{branch}</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => removeBranch(deptIndex, branchIndex)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add branch (e.g., CSE, IT)"
                          value={newDepartment.branch}
                          onChange={(e) => setNewDepartment({ ...newDepartment, branch: e.target.value })}
                          onKeyPress={(e) => e.key === 'Enter' && addBranch(deptIndex)}
                        />
                        <Button onClick={() => addBranch(deptIndex)} variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Branch
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
