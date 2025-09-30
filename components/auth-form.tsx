"use client";

import Link from "next/link";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useSession } from "@/hooks/use-session";

interface AuthFormProps {
  type: "login" | "signup";
}

export function AuthForm({ type }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("job_seeker"); // Default role for signup
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { refresh } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = type === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body =
      type === "login" ? { email, password } : { email, password, name, role };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast({
          title: type === "login" ? "Logged In" : "Account Created",
          description:
            type === "login"
              ? "You have been successfully logged in."
              : "Your account has been successfully created. You are now logged in.",
        });
        await refresh(); // Update session state
        router.push("/dashboard");
      } else {
        const errorData = await response.json();
        toast({
          title: type === "login" ? "Login Failed" : "Signup Failed",
          description: errorData.message || "An error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`${type} error:`, error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-bold">
          {type === "login" ? "Login" : "Sign Up"}
        </CardTitle>
        <CardDescription>
          {type === "login"
            ? "Enter your email below to login to your account."
            : "Create your account to get started."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {type === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="role">Account Type</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job_seeker">Job Seeker</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {type === "login" ? "Login" : "Sign Up"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          {type === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="underline" prefetch={false}>
                Sign Up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="underline" prefetch={false}>
                Login
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
