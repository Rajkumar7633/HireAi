"use client";

export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function SetupForm() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token) {
      toast({ title: "Missing token", description: "Invalid setup link.", variant: "destructive" });
      return;
    }
    if (!password || password.length < 8) {
      toast({ title: "Weak password", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", description: "Please re-enter.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to set password");
      toast({ title: "Success", description: "Password has been set. Redirecting to onboarding..." });
      router.push("/onboarding");
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || "Could not set password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete your account setup</CardTitle>
          <CardDescription>Set your password to finish joining the team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button className="w-full" onClick={submit} disabled={loading}>{loading ? "Saving..." : "Set Password"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4">Loading...</div>}>
      <SetupForm />
    </Suspense>
  );
}
