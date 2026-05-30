"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, CheckCircle, AlertCircle, Clock } from "lucide-react"

export default function BackgroundVerificationPage() {
  const [loading, setLoading] = useState(false)
  const [applicationId, setApplicationId] = useState("")
  const [provider, setProvider] = useState("Manual")
  const [verification, setVerification] = useState<any>(null)

  const handleInitiate = async () => {
    if (!applicationId) return

    setLoading(true)
    try {
      const response = await fetch("/api/background-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initiate",
          applicationId,
          provider,
          components: {
            identity: true,
            education: true,
            employment: true,
            criminal: true,
          }
        }),
      })

      const data = await response.json()
      if (data.success) {
        setVerification(data.verification)
      }
    } catch (error) {
      console.error("Initiation failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateComponent = async (component: string, status: string) => {
    if (!verification) return

    setLoading(true)
    try {
      const response = await fetch("/api/background-verification", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId: verification._id,
          action: "update-component",
          component,
          status,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setVerification(data.verification)
      }
    } catch (error) {
      console.error("Update failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Verified": return "bg-green-100 text-green-800"
      case "Failed": return "bg-red-100 text-red-800"
      case "Pending": return "bg-yellow-100 text-yellow-800"
      case "Not Required": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-600" />
          Background Verification
        </h1>
        <p className="text-gray-600">Manage background checks for candidates</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Initiate Verification */}
        <Card>
          <CardHeader>
            <CardTitle>Initiate Verification</CardTitle>
            <CardDescription>Start a background check for a candidate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="applicationId">Application ID</Label>
              <Input
                id="applicationId"
                placeholder="Enter application ID"
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="provider">Verification Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Checkr">Checkr</SelectItem>
                  <SelectItem value="Hireright">Hireright</SelectItem>
                  <SelectItem value="Sterling">Sterling</SelectItem>
                  <SelectItem value="GoodHire">GoodHire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInitiate} disabled={!applicationId || loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Initiate Verification
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Verification Status */}
        {verification && (
          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
              <CardDescription>Track verification progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Status</span>
                <Badge className={verification.status === "Completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                  {verification.status}
                </Badge>
              </div>
              
              {verification.overallResult && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Result</span>
                  <Badge variant={verification.overallResult === "Clear" ? "default" : "destructive"}>
                    {verification.overallResult}
                  </Badge>
                </div>
              )}

              <div className="space-y-3">
                <div className="text-sm font-medium">Components</div>
                {Object.entries(verification.components).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm capitalize">{key}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(value.status)}>{value.status}</Badge>
                      {value.status === "Pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateComponent(key, "Verified")}
                        >
                          Mark Verified
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {verification.status === "Completed" && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Background verification completed on {new Date(verification.completedAt).toLocaleDateString()}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Verification Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Initiated</span>
              <span>{verification ? new Date(verification.initiatedAt).toLocaleDateString() : "Not initiated"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Completion</span>
              <span>{verification ? new Date(verification.estimatedCompletion).toLocaleDateString() : "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed</span>
              <span>{verification?.completedAt ? new Date(verification.completedAt).toLocaleDateString() : "In progress"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
