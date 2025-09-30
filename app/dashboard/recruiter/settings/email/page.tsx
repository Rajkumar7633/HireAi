"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function RecruiterEmailSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [to, setTo] = useState("");
  // Company branding state
  const [companyLoading, setCompanyLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [company, setCompany] = useState<{ name: string; logoUrl?: string; description?: string; website?: string }|null>(null);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        setCompanyLoading(true);
        const res = await fetch("/api/company/me");
        const j = await res.json();
        if (!res.ok) throw new Error(j?.message || "Failed to load company");
        setCompany({
          name: j.company?.name || "",
          logoUrl: j.company?.logoUrl || "",
          description: j.company?.description || "",
          website: j.company?.website || "",
        });
      } catch (e: any) {
        toast({ title: "Company load failed", description: e.message, variant: "destructive" });
      } finally {
        setCompanyLoading(false);
      }
    };
    loadCompany();
  }, [toast]);

  const saveCompany = async () => {
    if (!company) return;
    try {
      setSavingCompany(true);
      const res = await fetch("/api/company/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to save company");
      setCompany({
        name: j.company?.name || "",
        logoUrl: j.company?.logoUrl || "",
        description: j.company?.description || "",
        website: j.company?.website || "",
      });
      toast({ title: "Branding saved", description: "Company details updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingCompany(false);
    }
  };

  const sendTest = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to send test");
      toast({ title: "Test email sent", description: `Sent to ${j.to}` });
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message || "Please check SMTP settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const enabled = Boolean(process.env.NEXT_PUBLIC_EMAIL_ENABLED || process.env.EMAIL_SERVICE_HOST || process.env.SMTP_HOST);
  const host = (process.env.EMAIL_SERVICE_HOST || process.env.SMTP_HOST || "") as string;
  const user = (process.env.EMAIL_SERVICE_USER || process.env.SMTP_USER || "") as string;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
          <CardDescription>Verify and test your SMTP configuration for candidate communications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span>Status:</span>
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Enabled" : "Not Configured"}</Badge>
            {host ? <span className="text-xs text-muted-foreground">• Host: {host}</span> : null}
            {user ? <span className="text-xs text-muted-foreground">• User: {user}</span> : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="to">Send test to</label>
            <Input id="to" type="email" placeholder="you@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={sendTest} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Send Test Email
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Uses EMAIL_SERVICE_* or SMTP_* variables from your environment. Configure Gmail with an App Password.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Branding</CardTitle>
          <CardDescription>These details are used on job pages, candidate emails, and job seeker views.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {companyLoading ? (
            <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading company…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="cname">Company Name</label>
                  <Input id="cname" value={company?.name || ""} onChange={(e) => setCompany((c) => ({ ...(c||{name:""}), name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="clogo">Logo URL</label>
                  <Input id="clogo" placeholder="https://…" value={company?.logoUrl || ""} onChange={(e) => setCompany((c) => ({ ...(c||{name:""}), logoUrl: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium" htmlFor="cdesc">Description</label>
                  <Input id="cdesc" value={company?.description || ""} onChange={(e) => setCompany((c) => ({ ...(c||{name:""}), description: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium" htmlFor="cweb">Website</label>
                  <Input id="cweb" placeholder="https://company.com" value={company?.website || ""} onChange={(e) => setCompany((c) => ({ ...(c||{name:""}), website: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveCompany} disabled={savingCompany}>
                  {savingCompany ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save Branding
                </Button>
                {company?.logoUrl ? (
                  <img alt="logo preview" src={company.logoUrl} className="h-8 object-contain ml-2 rounded" />
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
