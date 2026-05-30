"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, FileText, Send, Save } from "lucide-react"

export default function CreateOfferLetterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [applicationId, setApplicationId] = useState("")

  const [offerDetails, setOfferDetails] = useState({
    position: "",
    department: "",
    startDate: "",
    employmentType: "Full-time",
    reportingTo: "",
    workLocation: "",
    workArrangement: "On-site",
  })

  const [compensation, setCompensation] = useState({
    baseSalary: "",
    currency: "USD",
    salaryPeriod: "Annual",
    bonus: "",
    bonusType: "Performance",
    equityGranted: false,
    equityType: "",
    equityQuantity: "",
    vestingSchedule: "",
    benefits: [],
  })

  const [terms, setTerms] = useState({
    probationPeriod: "3",
    noticePeriod: "30",
    workingHours: "40 hours/week",
    vacationDays: "20",
    sickDays: "10",
    otherTerms: "",
  })

  const [customContent, setCustomContent] = useState({
    greeting: "",
    introduction: "",
    additionalTerms: "",
    closing: "",
  })

  const [expiresAt, setExpiresAt] = useState("")

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/offer-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          applicationId,
          offerDetails,
          compensation: {
            ...compensation,
            baseSalary: parseFloat(compensation.baseSalary),
            bonus: compensation.bonus ? parseFloat(compensation.bonus) : 0,
          },
          terms: {
            ...terms,
            probationPeriod: parseInt(terms.probationPeriod),
            noticePeriod: parseInt(terms.noticePeriod),
            vacationDays: parseInt(terms.vacationDays),
            sickDays: parseInt(terms.sickDays),
          },
          customContent,
          expiresAt: expiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })

      const data = await response.json()
      if (data.success) {
        router.push(`/dashboard/recruiter/offer-letters/${data.offerLetter._id}`)
      }
    } catch (error) {
      console.error("Save failed:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/offer-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          applicationId,
          offerDetails,
          compensation: {
            ...compensation,
            baseSalary: parseFloat(compensation.baseSalary),
            bonus: compensation.bonus ? parseFloat(compensation.bonus) : 0,
          },
          terms: {
            ...terms,
            probationPeriod: parseInt(terms.probationPeriod),
            noticePeriod: parseInt(terms.noticePeriod),
            vacationDays: parseInt(terms.vacationDays),
            sickDays: parseInt(terms.sickDays),
          },
          customContent,
          expiresAt: expiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Send the offer
        const sendResponse = await fetch("/api/offer-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send",
            offerLetterId: data.offerLetter._id,
          }),
        })

        const sendData = await sendResponse.json()
        if (sendData.success) {
          router.push(`/dashboard/recruiter/offer-letters/${data.offerLetter._id}`)
        }
      }
    } catch (error) {
      console.error("Send failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-600" />
          Create Offer Letter
        </h1>
        <p className="text-gray-600">Create and send an offer letter to a candidate</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Application Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="applicationId">Application ID</Label>
            <Input
              id="applicationId"
              placeholder="Enter application ID"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Position Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="position">Position Title</Label>
              <Input
                id="position"
                value={offerDetails.position}
                onChange={(e) => setOfferDetails({ ...offerDetails, position: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={offerDetails.department}
                onChange={(e) => setOfferDetails({ ...offerDetails, department: e.target.value })}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={offerDetails.startDate}
                onChange={(e) => setOfferDetails({ ...offerDetails, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="employmentType">Employment Type</Label>
              <Select
                value={offerDetails.employmentType}
                onValueChange={(value) => setOfferDetails({ ...offerDetails, employmentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reportingTo">Reporting To</Label>
              <Input
                id="reportingTo"
                value={offerDetails.reportingTo}
                onChange={(e) => setOfferDetails({ ...offerDetails, reportingTo: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="workLocation">Work Location</Label>
              <Input
                id="workLocation"
                value={offerDetails.workLocation}
                onChange={(e) => setOfferDetails({ ...offerDetails, workLocation: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="workArrangement">Work Arrangement</Label>
            <Select
              value={offerDetails.workArrangement}
              onValueChange={(value) => setOfferDetails({ ...offerDetails, workArrangement: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="On-site">On-site</SelectItem>
                <SelectItem value="Remote">Remote</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Compensation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="baseSalary">Base Salary</Label>
              <Input
                id="baseSalary"
                type="number"
                value={compensation.baseSalary}
                onChange={(e) => setCompensation({ ...compensation, baseSalary: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={compensation.currency}
                onValueChange={(value) => setCompensation({ ...compensation, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="salaryPeriod">Salary Period</Label>
              <Select
                value={compensation.salaryPeriod}
                onValueChange={(value) => setCompensation({ ...compensation, salaryPeriod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bonus">Bonus Amount</Label>
              <Input
                id="bonus"
                type="number"
                value={compensation.bonus}
                onChange={(e) => setCompensation({ ...compensation, bonus: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="bonusType">Bonus Type</Label>
              <Input
                id="bonusType"
                value={compensation.bonusType}
                onChange={(e) => setCompensation({ ...compensation, bonusType: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="equityGranted"
              checked={compensation.equityGranted}
              onCheckedChange={(checked) => setCompensation({ ...compensation, equityGranted: checked as boolean })}
            />
            <Label htmlFor="equityGranted">Include Equity/Stock Options</Label>
          </div>
          {compensation.equityGranted && (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="equityType">Equity Type</Label>
                <Input
                  id="equityType"
                  value={compensation.equityType}
                  onChange={(e) => setCompensation({ ...compensation, equityType: e.target.value })}
                  placeholder="e.g., RSU, Stock Options"
                />
              </div>
              <div>
                <Label htmlFor="equityQuantity">Quantity</Label>
                <Input
                  id="equityQuantity"
                  type="number"
                  value={compensation.equityQuantity}
                  onChange={(e) => setCompensation({ ...compensation, equityQuantity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="vestingSchedule">Vesting Schedule</Label>
                <Input
                  id="vestingSchedule"
                  value={compensation.vestingSchedule}
                  onChange={(e) => setCompensation({ ...compensation, vestingSchedule: e.target.value })}
                  placeholder="e.g., 4 years with 1 year cliff"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="probationPeriod">Probation Period (months)</Label>
              <Input
                id="probationPeriod"
                type="number"
                value={terms.probationPeriod}
                onChange={(e) => setTerms({ ...terms, probationPeriod: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="noticePeriod">Notice Period (days)</Label>
              <Input
                id="noticePeriod"
                type="number"
                value={terms.noticePeriod}
                onChange={(e) => setTerms({ ...terms, noticePeriod: e.target.value })}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="workingHours">Working Hours</Label>
              <Input
                id="workingHours"
                value={terms.workingHours}
                onChange={(e) => setTerms({ ...terms, workingHours: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="vacationDays">Vacation Days</Label>
              <Input
                id="vacationDays"
                type="number"
                value={terms.vacationDays}
                onChange={(e) => setTerms({ ...terms, vacationDays: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sickDays">Sick Days</Label>
              <Input
                id="sickDays"
                type="number"
                value={terms.sickDays}
                onChange={(e) => setTerms({ ...terms, sickDays: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="otherTerms">Other Terms</Label>
            <Textarea
              id="otherTerms"
              value={terms.otherTerms}
              onChange={(e) => setTerms({ ...terms, otherTerms: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Custom Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="greeting">Greeting</Label>
            <Input
              id="greeting"
              value={customContent.greeting}
              onChange={(e) => setCustomContent({ ...customContent, greeting: e.target.value })}
              placeholder="e.g., Dear John,"
            />
          </div>
          <div>
            <Label htmlFor="introduction">Introduction</Label>
            <Textarea
              id="introduction"
              value={customContent.introduction}
              onChange={(e) => setCustomContent({ ...customContent, introduction: e.target.value })}
              rows={3}
              placeholder="Custom introduction message"
            />
          </div>
          <div>
            <Label htmlFor="additionalTerms">Additional Terms</Label>
            <Textarea
              id="additionalTerms"
              value={customContent.additionalTerms}
              onChange={(e) => setCustomContent({ ...customContent, additionalTerms: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="closing">Closing</Label>
            <Input
              id="closing"
              value={customContent.closing}
              onChange={(e) => setCustomContent({ ...customContent, closing: e.target.value })}
              placeholder="e.g., Best regards,"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Expiration</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="expiresAt">Offer Expires At</Label>
            <Input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-sm text-gray-600 mt-1">Default: 14 days from now</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={saving} variant="outline">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </>
          )}
        </Button>
        <Button onClick={handleSend} disabled={loading || !applicationId}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Offer
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
