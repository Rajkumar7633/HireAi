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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Plus, Edit, Eye, Trash2, CheckCircle } from "lucide-react"

interface EmailTemplate {
  _id: string
  name: string
  subject: string
  content: string
  category: string
  variables: string[]
  isDefault: boolean
}

export default function EmailTemplatesPage() {
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [creating, setCreating] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({})

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    content: "",
    category: "application_update",
    variables: [] as string[],
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/email-templates")
      const data = await response.json()
      if (data.templates) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    setCreating(true)
    try {
      const response = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      })

      const data = await response.json()
      if (data.template) {
        setNewTemplate({
          name: "",
          subject: "",
          content: "",
          category: "application_update",
          variables: [],
        })
        await fetchTemplates()
      }
    } catch (error) {
      console.error("Failed to create template:", error)
    } finally {
      setCreating(false)
    }
  }

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    const initialVariables: Record<string, string> = {}
    template.variables.forEach(v => {
      initialVariables[v] = `{{${v}}}`
    })
    setPreviewVariables(initialVariables)
    setPreviewing(true)
  }

  const renderPreview = (text: string) => {
    let rendered = text
    Object.entries(previewVariables).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), value)
    })
    return rendered
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Mail className="w-8 h-8 text-blue-600" />
          Email Templates
        </h1>
        <p className="text-gray-600">Manage email templates for automated communications</p>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Template List</TabsTrigger>
          <TabsTrigger value="create">Create Template</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Templates</CardTitle>
              <CardDescription>Manage your email templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates.map((template) => (
                  <div key={template._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium">{template.name}</div>
                        {template.isDefault && <Badge variant="secondary">Default</Badge>}
                      </div>
                      <div className="text-sm text-gray-600">{template.subject}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Category: {template.category} • Variables: {template.variables.join(", ")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handlePreview(template)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!template.isDefault && (
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {previewing && selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview: {selectedTemplate.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Subject</Label>
                  <div className="p-2 border rounded bg-gray-50">{renderPreview(selectedTemplate.subject)}</div>
                </div>
                <div>
                  <Label>Body</Label>
                  <div className="p-4 border rounded bg-gray-50 whitespace-pre-wrap">{renderPreview(selectedTemplate.content)}</div>
                </div>
                <div>
                  <Label>Variables</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {selectedTemplate.variables.map((variable) => (
                      <div key={variable}>
                        <Label htmlFor={variable} className="text-xs">{variable}</Label>
                        <Input
                          id={variable}
                          value={previewVariables[variable] || ""}
                          onChange={(e) => setPreviewVariables({ ...previewVariables, [variable]: e.target.value })}
                          placeholder={`Enter ${variable}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={() => setPreviewing(false)}>Close Preview</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Template
              </CardTitle>
              <CardDescription>Create a custom email template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Welcome Email"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="application_update">Application Update</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="rejection">Rejection</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Application Received - {{jobTitle}}"
                  value={newTemplate.subject}
                  onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                />
                <p className="text-xs text-gray-600 mt-1">Use {{variableName}} for dynamic content</p>
              </div>
              <div>
                <Label htmlFor="content">Email Body</Label>
                <Textarea
                  id="content"
                  placeholder="Dear {{candidateName}},..."
                  className="min-h-32"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="variables">Variables (comma-separated)</Label>
                <Input
                  id="variables"
                  placeholder="candidateName, jobTitle, companyName"
                  value={newTemplate.variables.join(", ")}
                  onChange={(e) => setNewTemplate({ 
                    ...newTemplate, 
                    variables: e.target.value.split(",").map(v => v.trim()).filter(v => v) 
                  })}
                />
              </div>
              <Button onClick={handleCreateTemplate} disabled={!newTemplate.name || !newTemplate.subject || !newTemplate.content || creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
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
