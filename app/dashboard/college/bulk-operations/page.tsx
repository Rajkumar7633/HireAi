"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Upload, Filter, Users, Download, CheckCircle, AlertCircle } from "lucide-react"

export default function BulkOperationsPage() {
  const [loading, setLoading] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)
  const [filterResults, setFilterResults] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)

  // Eligibility filter state
  const [filterCriteria, setFilterCriteria] = useState({
    minCGPA: "",
    maxBacklogs: "",
    requiredBranches: [] as string[],
    requiredYears: [] as string[],
    requiredSkills: "" as string,
  })

  const handleFileUpload = async () => {
    if (!file) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("csvFile", file)

      const response = await fetch("/api/bulk-operations", {
        method: "POST",
        headers: {},
        body: JSON.stringify({
          action: "import-students",
          formData,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setImportResults(data.results)
      }
    } catch (error) {
      console.error("Import failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEligibilityFilter = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/bulk-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "eligibility-filter",
          collegeId: "your-college-id",
          criteria: {
            minCGPA: filterCriteria.minCGPA ? parseFloat(filterCriteria.minCGPA) : undefined,
            maxBacklogs: filterCriteria.maxBacklogs ? parseInt(filterCriteria.maxBacklogs) : undefined,
            requiredBranches: filterCriteria.requiredBranches,
            requiredYears: filterCriteria.requiredYears.map(y => parseInt(y)),
            requiredSkills: filterCriteria.requiredSkills ? filterCriteria.requiredSkills.split(",").map(s => s.trim()) : [],
          },
        }),
      })

      const data = await response.json()
      if (data.success) {
        setFilterResults(data.results)
      }
    } catch (error) {
      console.error("Filter failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/bulk-operations?export-students=true&collegeId=your-college-id")
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "students-export.csv"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Users className="w-8 h-8 text-blue-600" />
          Bulk Student Operations
        </h1>
        <p className="text-gray-600">Manage large-scale student operations efficiently</p>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import">Import Students</TabsTrigger>
          <TabsTrigger value="filter">Eligibility Filter</TabsTrigger>
          <TabsTrigger value="update">Bulk Update</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Students from CSV
              </CardTitle>
              <CardDescription>Upload a CSV file to import student records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csvFile">CSV File</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <p className="text-sm text-gray-600 mt-2">
                  CSV format: name, email, password, year, branch, department, section, batch, cgpa
                </p>
              </div>
              <Button onClick={handleFileUpload} disabled={!file || loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Students
                  </>
                )}
              </Button>

              {importResults && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Import completed: {importResults.success} successful, {importResults.failure} failed
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {importResults && importResults.details && (
            <Card>
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {importResults.details.map((result: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium text-sm">{result.name}</div>
                        <div className="text-xs text-gray-600">{result.email}</div>
                      </div>
                      <Badge variant={result.status === "Success" ? "default" : "destructive"}>
                        {result.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="filter" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Eligibility Filter
              </CardTitle>
              <CardDescription>Filter students based on placement eligibility criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minCGPA">Minimum CGPA</Label>
                  <Input
                    id="minCGPA"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 6.5"
                    value={filterCriteria.minCGPA}
                    onChange={(e) => setFilterCriteria({ ...filterCriteria, minCGPA: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxBacklogs">Maximum Backlogs</Label>
                  <Input
                    id="maxBacklogs"
                    type="number"
                    placeholder="e.g., 2"
                    value={filterCriteria.maxBacklogs}
                    onChange={(e) => setFilterCriteria({ ...filterCriteria, maxBacklogs: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="requiredSkills">Required Skills (comma-separated)</Label>
                <Input
                  id="requiredSkills"
                  placeholder="e.g., JavaScript, Python, React"
                  value={filterCriteria.requiredSkills}
                  onChange={(e) => setFilterCriteria({ ...filterCriteria, requiredSkills: e.target.value })}
                />
              </div>
              <Button onClick={handleEligibilityFilter} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Filtering...
                  </>
                ) : (
                  <>
                    <Filter className="mr-2 h-4 w-4" />
                    Apply Filter
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {filterResults && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Eligible Students
                  </CardTitle>
                  <CardDescription>{filterResults.eligible} students</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filterResults.eligibleStudents?.slice(0, 10).map((student: any, idx: number) => (
                      <div key={idx} className="p-2 border rounded">
                        <div className="font-medium text-sm">{student.name}</div>
                        <div className="text-xs text-gray-600">
                          CGPA: {student.cgpa?.toFixed(2)} | Branch: {student.branch}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Ineligible Students
                  </CardTitle>
                  <CardDescription>{filterResults.ineligible} students</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filterResults.ineligibleStudents?.slice(0, 10).map((student: any, idx: number) => (
                      <div key={idx} className="p-2 border rounded bg-red-50">
                        <div className="font-medium text-sm">{student.name}</div>
                        <div className="text-xs text-gray-600">
                          CGPA: {student.cgpa?.toFixed(2)} | {student.reasons?.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="update" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Update Student Records</CardTitle>
              <CardDescription>Update multiple student records at once</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Select students and choose the fields to update. This feature requires integration with the student list.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Student Data
              </CardTitle>
              <CardDescription>Export student data to CSV file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="exportFilter">Export Filters (Optional)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="placed">Placed Students</SelectItem>
                    <SelectItem value="unplaced">Unplaced Students</SelectItem>
                    <SelectItem value="year-4">4th Year Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleExport} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
