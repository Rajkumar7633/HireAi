"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Plus, Edit, Trash2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildProfessionalTemplate } from "@/lib/email-templates";
import { renderTemplate } from "@/lib/template-render";

interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  variables: string[];
  isDefault: boolean;
  createdAt: string;
}

export default function EmailTemplatesPage() {
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUseDialog, setShowUseDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    content: "",
    category: "application_update",
    variables: [] as string[],
  });
  const [sendForm, setSendForm] = useState({
    to: "",
    subjectOverride: "",
    ctaUrl: "",
    ctaLabel: "",
    vars: {} as Record<string, string>,
    sending: false,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/communication/email-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch email templates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyInterviewDefaults = (vars: Record<string, string>) => {
    // Set smart defaults if not provided
    const hasDate = Object.prototype.hasOwnProperty.call(vars, "interviewDate");
    const hasTime = Object.prototype.hasOwnProperty.call(vars, "interviewTime");
    const hasDur = Object.prototype.hasOwnProperty.call(vars, "duration");
    if (hasDate && !vars.interviewDate) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      vars.interviewDate = d.toISOString().slice(0, 10);
    }
    if (hasTime && !vars.interviewTime) {
      const d = new Date();
      const minutes = d.getMinutes();
      const rounded = minutes <= 15 ? 30 : minutes <= 45 ? 60 : 90; // next slot ~30m+ buffer
      d.setMinutes(rounded, 0, 0);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      vars.interviewTime = `${hh}:${mm}`;
    }
    if (hasDur && !vars.duration) {
      vars.duration = "60"; // 1 hour default
    }
  };

  const formatDate = (isoLike: string) => {
    const d = new Date(isoLike);
    try {
      return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "2-digit" });
    } catch {
      return isoLike;
    }
  };
  const formatTime = (hhmm: string) => {
    const [hStr, mStr] = String(hhmm).split(":");
    let h = parseInt(hStr || "0", 10);
    const m = parseInt(mStr || "0", 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const mm = (m < 10 ? "0" : "") + m;
    return `${h}:${mm} ${ampm}`;
  };
  const formatDuration = (min: number) => {
    if (!isFinite(min) || min <= 0) return "";
    const h = Math.floor(min / 60);
    const m = min % 60;
    const parts: string[] = [];
    if (h) parts.push(`${h} hr${h > 1 ? "s" : ""}`);
    if (m) parts.push(`${m} min`);
    return parts.join(" ") || `${min} min`;
  };

  const handlePreview = () => {
    if (!selectedTemplate) return;
    const vars = { ...sendForm.vars } as Record<string, string>;
    applyInterviewDefaults(vars);
    const hasInterview = !!(vars.interviewDate && vars.interviewTime && (vars.duration));
    const subject = sendForm.subjectOverride || renderTemplate(selectedTemplate.subject, vars);
    const rawContent = renderTemplate(selectedTemplate.content, vars);
    const contentHasGreeting = /^\s*(hello|dear)\b/i.test(rawContent);
    let details: Record<string, string> | undefined;
    let badge: string | undefined;
    let preheader: string | undefined;
    if (hasInterview) {
      badge = "Interview";
      details = {
        Date: formatDate(String(vars.interviewDate)),
        Time: formatTime(String(vars.interviewTime)),
        Location: String(vars.interviewLocation || "Online"),
        Duration: formatDuration(Number(vars.duration || 30)),
      };
      preheader = renderTemplate("Interview invitation for {{jobTitle}}", vars);
    }
    const html = buildProfessionalTemplate({
      recipientName: vars.candidateName || "there",
      heading: "Hello",
      messageHtml: rawContent.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
      ctaUrl: sendForm.ctaUrl || undefined,
      ctaLabel: sendForm.ctaLabel || undefined,
      footerNote: `Subject: ${subject}`,
      details,
      badge,
      preheader,
      includeGreeting: !contentHasGreeting,
    });
    setPreviewHtml(html);
    setShowPreview(true);
  };

  // Auto-open Use modal and pre-fill from URL params when templateId is provided
  useEffect(() => {
    if (loading) return;
    if (!templates?.length) return;
    if (!searchParams) return;
    const tplId = searchParams.get("templateId");
    const to = searchParams.get("to") || "";
    const subjectOverride = searchParams.get("subject") || "";
    const ctaUrl = searchParams.get("ctaUrl") || "";
    const ctaLabel = searchParams.get("ctaLabel") || "";

    if (!tplId && !to && !ctaUrl && !ctaLabel && !subjectOverride) return;

    let tpl: EmailTemplate | null = null;
    if (tplId) tpl = templates.find((t) => t._id === tplId) || null;
    if (tpl) {
      // Build vars map using template variable names from query params
      const v: Record<string, string> = {};
      (tpl.variables || []).forEach((k) => {
        const val = searchParams.get(k);
        if (val != null) v[k] = val;
      });
      setSelectedTemplate(tpl);
      setSendForm({
        to,
        subjectOverride,
        ctaUrl,
        ctaLabel: ctaLabel || "View Details",
        vars: v,
        sending: false,
      });
      setShowUseDialog(true);
    }
  }, [loading, templates, searchParams]);

  const openUseTemplate = (tpl: EmailTemplate) => {
    setSelectedTemplate(tpl);
    const v: Record<string, string> = {};
    (tpl.variables || []).forEach((k) => (v[k] = ""));
    applyInterviewDefaults(v);
    setSendForm((prev) => ({ ...prev, to: "", subjectOverride: "", ctaUrl: "", ctaLabel: "View Details", vars: v }));
    setShowUseDialog(true);
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;
    if (!sendForm.to) {
      toast({ title: "Missing recipient", description: "Please enter a recipient email.", variant: "destructive" });
      return;
    }
    setSendForm((p) => ({ ...p, sending: true }));
    try {
      const body: any = {
        to: sendForm.to,
        variables: sendForm.vars,
        subjectOverride: sendForm.subjectOverride || undefined,
        ctaUrl: sendForm.ctaUrl || undefined,
        ctaLabel: sendForm.ctaLabel || undefined,
      };
      if ((selectedTemplate as any)._id) {
        body.templateId = (selectedTemplate as any)._id;
      } else {
        // default template card (no _id) -> send raw subject/content
        body.subject = selectedTemplate.subject;
        body.content = selectedTemplate.content;
      }

      const res = await fetch("/api/communication/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "Failed to send");
      toast({ title: "Email sent", description: "Your email has been sent successfully." });
      setShowUseDialog(false);
    } catch (e: any) {
      toast({ title: "Send failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSendForm((p) => ({ ...p, sending: false }));
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch("/api/communication/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      });

      if (response.ok) {
        toast({
          title: "Template Created",
          description: "Email template has been created successfully.",
        });
        setShowCreateDialog(false);
        setNewTemplate({
          name: "",
          subject: "",
          content: "",
          category: "application_update",
          variables: [],
        });
        fetchTemplates();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create email template.",
        variant: "destructive",
      });
    }
  };

  const defaultTemplates = [
    {
      name: "Application Received",
      subject: "Thank you for your application - {{jobTitle}}",
      content: `Dear {{candidateName}},

Thank you for applying to the {{jobTitle}} position at {{companyName}}. We have received your application and will review it carefully.

We will contact you within {{timeframe}} with an update on your application status.

Best regards,
{{recruiterName}}
{{companyName}} Recruitment Team`,
      category: "application_update",
      variables: [
        "candidateName",
        "jobTitle",
        "companyName",
        "timeframe",
        "recruiterName",
      ],
    },
    {
      name: "Interview Invitation",
      subject: "Interview Invitation - {{jobTitle}} Position",
      content: `Dear {{candidateName}},

We are pleased to invite you for an interview for the {{jobTitle}} position at {{companyName}}.

Interview Details:
- Date: {{interviewDate}}
- Time: {{interviewTime}}
- Location: {{interviewLocation}}
- Duration: {{duration}}

Please confirm your availability by replying to this email.

Best regards,
{{recruiterName}}`,
      category: "interview",
      variables: [
        "candidateName",
        "jobTitle",
        "companyName",
        "interviewDate",
        "interviewTime",
        "interviewLocation",
        "duration",
        "recruiterName",
      ],
    },
    {
      name: "Application Rejection",
      subject: "Update on your application - {{jobTitle}}",
      content: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{companyName}} and for taking the time to apply.

After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.

We appreciate your interest in {{companyName}} and encourage you to apply for future opportunities that match your skills and experience.

Best regards,
{{recruiterName}}`,
      category: "application_update",
      variables: ["candidateName", "jobTitle", "companyName", "recruiterName"],
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading email templates...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="h-8 w-8" />
            Email Templates
          </h1>
          <p className="text-muted-foreground mt-2">
            Create and manage email templates for candidate communication
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Email Template</DialogTitle>
              <DialogDescription>
                Create a reusable email template for candidate communication
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Template name"
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, name: e.target.value })
                }
              />

              <Select
                value={newTemplate.category}
                onValueChange={(value) =>
                  setNewTemplate({ ...newTemplate, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application_update">
                    Application Update
                  </SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Job Offer</SelectItem>
                  <SelectItem value="rejection">Rejection</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Email subject"
                value={newTemplate.subject}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, subject: e.target.value })
                }
              />

              <Textarea
                placeholder="Email content (use {{variableName}} for dynamic content)"
                value={newTemplate.content}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, content: e.target.value })
                }
                className="min-h-32"
              />

              <div className="flex gap-2">
                <Button onClick={handleCreateTemplate}>Create Template</Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Default Templates */}
        {defaultTemplates.map((template, index) => (
          <Card key={`default-${index}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant="secondary">Default</Badge>
              </div>
              <CardDescription>{template.subject}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground line-clamp-3">
                  {template.content}
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.variables.slice(0, 3).map((variable) => (
                    <Badge key={variable} variant="outline" className="text-xs">
                      {variable}
                    </Badge>
                  ))}
                  {template.variables.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.variables.length - 3} more
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openUseTemplate(template)}>
                    <Send className="h-4 w-4 mr-1" />
                    Use
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Custom Templates */}
        {templates.map((template) => (
          <Card key={template._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge>{template.category}</Badge>
              </div>
              <CardDescription>{template.subject}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground line-clamp-3">
                  {template.content}
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.variables.slice(0, 3).map((variable) => (
                    <Badge key={variable} variant="outline" className="text-xs">
                      {variable}
                    </Badge>
                  ))}
                  {template.variables.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.variables.length - 3} more
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Send className="h-4 w-4 mr-1" />
                    Use
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>
              No custom templates created yet. Start by creating your first
              email template.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Use Template Dialog */}
      <Dialog open={showUseDialog} onOpenChange={setShowUseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Use Template</DialogTitle>
            <DialogDescription>Fill in details and send to a candidate</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Recipient email" value={sendForm.to} onChange={(e) => setSendForm((p) => ({ ...p, to: e.target.value }))} />
                <Input placeholder="Subject override (optional)" value={sendForm.subjectOverride} onChange={(e) => setSendForm((p) => ({ ...p, subjectOverride: e.target.value }))} />
                <Input placeholder="CTA URL (optional)" value={sendForm.ctaUrl} onChange={(e) => setSendForm((p) => ({ ...p, ctaUrl: e.target.value }))} />
                <Input placeholder="CTA Label (optional)" value={sendForm.ctaLabel} onChange={(e) => setSendForm((p) => ({ ...p, ctaLabel: e.target.value }))} />
              </div>
              {selectedTemplate.variables?.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Template Variables</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedTemplate.variables.map((k) => {
                      // Special widgets for interview fields
                      if (k === "interviewDate") {
                        return (
                          <Input
                            key={k}
                            type="date"
                            placeholder="YYYY-MM-DD"
                            value={sendForm.vars[k] || ""}
                            onChange={(e) => setSendForm((p) => ({ ...p, vars: { ...p.vars, [k]: e.target.value } }))}
                          />
                        );
                      }
                      if (k === "interviewTime") {
                        // Parse current value like HH:mm (24h)
                        const cur = sendForm.vars[k] || "";
                        const [hhStr, mmStr] = cur.split(":");
                        let hh = parseInt(hhStr || "", 10);
                        let mm = parseInt(mmStr || "", 10);
                        const ampm = isNaN(hh) ? "AM" : hh >= 12 ? "PM" : "AM";
                        const hour12 = isNaN(hh) ? 9 : (hh % 12) || 12;
                        const minuteDisplay = isNaN(mm) ? 0 : mm;

                        const setTime = (h12: number, m: number, ap: "AM" | "PM") => {
                          let h24 = h12 % 12;
                          if (ap === "PM") h24 += 12;
                          const mmStr2 = (m < 10 ? "0" : "") + m;
                          const hhStr2 = (h24 < 10 ? "0" : "") + h24;
                          const val = `${hhStr2}:${mmStr2}`;
                          setSendForm((p) => ({ ...p, vars: { ...p.vars, [k]: val } }));
                        };

                        return (
                          <div key={k} className="flex gap-2">
                            <Select value={String(hour12)} onValueChange={(v) => setTime(parseInt(v, 10), minuteDisplay, ampm as any)}>
                              <SelectTrigger className="w-full"><SelectValue placeholder="Hour" /></SelectTrigger>
                              <SelectContent>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map((h) => (
                                  <SelectItem key={h} value={String(h)}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={String(minuteDisplay)} onValueChange={(v) => setTime(hour12, parseInt(v, 10), ampm as any)}>
                              <SelectTrigger className="w-full"><SelectValue placeholder="Min" /></SelectTrigger>
                              <SelectContent>
                                {[0,15,30,45].map((m) => (
                                  <SelectItem key={m} value={String(m)}>{m.toString().padStart(2, '0')}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={ampm} onValueChange={(v: any) => setTime(hour12, minuteDisplay, v)}>
                              <SelectTrigger className="w-full"><SelectValue placeholder="AM/PM" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }
                      if (k === "duration") {
                        const curMin = parseInt(sendForm.vars[k] || "", 10) || 0;
                        const curH = Math.floor(curMin / 60);
                        const curM = curMin % 60;
                        const setDuration = (h: number, m: number) => {
                          const total = Math.max(0, h * 60 + m);
                          setSendForm((p) => ({ ...p, vars: { ...p.vars, [k]: String(total) } }));
                        };
                        return (
                          <div key={k} className="flex gap-2 items-center">
                            <Input type="number" min={0} placeholder="Hours" value={String(curH)} onChange={(e) => setDuration(parseInt(e.target.value || "0", 10), curM)} />
                            <Input type="number" min={0} max={59} placeholder="Minutes" value={String(curM)} onChange={(e) => setDuration(curH, Math.min(59, Math.max(0, parseInt(e.target.value || "0", 10))))} />
                          </div>
                        );
                      }
                      // default text input
                      return (
                        <Input
                          key={k}
                          placeholder={k}
                          value={sendForm.vars[k] || ""}
                          onChange={(e) => setSendForm((p) => ({ ...p, vars: { ...p.vars, [k]: e.target.value } }))}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowUseDialog(false)}>Cancel</Button>
                <Button variant="outline" onClick={handlePreview}>Preview</Button>
                <Button onClick={handleSend} disabled={sendForm.sending}>
                  {sendForm.sending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>) : (<>Send</>)}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>This is how the email will look in the inbox</DialogDescription>
          </DialogHeader>
          <div className="w-full h-full overflow-auto bg-muted rounded">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
