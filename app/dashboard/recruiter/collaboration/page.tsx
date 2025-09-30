"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, UserPlus, Users } from "lucide-react";

export default function RecruiterCollaborationPage() {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<any[]>([]);

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast({ title: "Missing email", description: "Please enter a teammate's email.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/recruiter/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "Failed to send invite");
      toast({ title: "Invite sent", description: `Invitation sent to ${inviteEmail}` });
      setInviteEmail("");
      fetchInvites();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || "Could not send invite", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/recruiter/invites");
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const actionInvite = async (id: string, action: "resend" | "revoke" | "delete") => {
    try {
      if (action === "delete") {
        const res = await fetch(`/api/recruiter/invites/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete invite");
      } else {
        const res = await fetch(`/api/recruiter/invites/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
        if (!res.ok) throw new Error(`Failed to ${action} invite`);
      }
      toast({ title: "Success", description: `Invite ${action}ed.` });
      fetchInvites();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || `Could not ${action} invite`, variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" /> Team Collaboration
          </h1>
          <p className="text-muted-foreground mt-1">Invite teammates and manage recruiter collaboration</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Invite teammate</CardTitle>
            <CardDescription>Send an invite to a teammate to join your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Teammate email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                type="email"
              />
              <Button onClick={handleInvite} disabled={sending}>
                <Mail className="h-4 w-4 mr-2" /> {sending ? "Sending..." : "Send Invite"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">A real invite API can be wired here later.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team members</CardTitle>
            <CardDescription>Basic placeholder list (hook to your users DB later)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading invites...</p>
            ) : invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invites yet.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {invites.map((inv) => (
                  <div key={inv._id} className="flex items-center justify-between border rounded-md p-2">
                    <div>
                      <div className="font-medium">{inv.email}</div>
                      <div className="text-xs text-muted-foreground">Role: {inv.role} • Status: {inv.status}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => actionInvite(inv._id, "resend")} disabled={inv.status !== "pending"}>Resend</Button>
                      <Button variant="outline" size="sm" onClick={() => actionInvite(inv._id, "revoke")} disabled={inv.status !== "pending"}>Revoke</Button>
                      <Button variant="outline" size="sm" onClick={() => actionInvite(inv._id, "delete")}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
