"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface Steps {
  profile?: boolean;
  branding?: boolean;
  firstJob?: boolean;
  inviteTeam?: boolean;
}

export default function OnboardingPage() {
  const [steps, setSteps] = useState<Steps>({});
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const fetchState = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/onboarding");
      const data = await res.json();
      if (res.ok) {
        setSteps(data.onboardingSteps || {});
        setCompleted(!!data.onboardingCompleted);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const toggleStep = async (key: keyof Steps, val: boolean) => {
    try {
      const prev = steps[key];
      setSteps((s) => ({ ...s, [key]: val }));
      const res = await fetch("/api/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: key, value: val }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update");
      setCompleted(!!data.onboardingCompleted);
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || "Could not update step", variant: "destructive" });
    }
  };

  const goTo = (path: string) => router.push(path);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Welcome to HireAI</h1>
      <p className="text-muted-foreground mt-1">Let’s get your workspace set up quickly</p>

      <div className="grid gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Complete your recruiter profile</CardTitle>
            <CardDescription>Add company details and a profile photo</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox checked={!!steps.profile} onCheckedChange={(v) => toggleStep("profile", !!v)} />
              <span>Profile completed</span>
            </div>
            <Button variant="outline" onClick={() => goTo("/dashboard/recruiter/profile")}>Open Profile</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Upload logo and set company branding for emails</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox checked={!!steps.branding} onCheckedChange={(v) => toggleStep("branding", !!v)} />
              <span>Branding configured</span>
            </div>
            <Button variant="outline" onClick={() => goTo("/dashboard/recruiter/profile")}>Open Branding</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Post your first job</CardTitle>
            <CardDescription>Create a job to start collecting applicants</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox checked={!!steps.firstJob} onCheckedChange={(v) => toggleStep("firstJob", !!v)} />
              <span>First job published</span>
            </div>
            <Button variant="outline" onClick={() => goTo("/dashboard/recruiter/jobs")}>Create Job</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite your team</CardTitle>
            <CardDescription>Invite colleagues to collaborate on hiring</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox checked={!!steps.inviteTeam} onCheckedChange={(v) => toggleStep("inviteTeam", !!v)} />
              <span>Team invited</span>
            </div>
            <Button variant="outline" onClick={() => goTo("/dashboard/recruiter/collaboration")}>Invite Team</Button>
          </CardContent>
        </Card>
      </div>

      {completed && (
        <div className="mt-6">
          <Button onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
