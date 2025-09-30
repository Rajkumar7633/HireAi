"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function TestAuthPage() {
  const [authStatus, setAuthStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    testAuth();
  }, []);

  const testAuth = async () => {
    setAuthStatus("loading");
    try {
      const response = await fetch("/api/resume/my-resumes");
      const data = await response.json();

      if (response.ok) {
        setAuthStatus("success");
        setSessionData(data);
      } else {
        setAuthStatus("error");
        setError(data.message || "Authentication failed");
      }
    } catch (err) {
      setAuthStatus("error");
      setError("Network error");
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("auth-token");

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Logged out",
          description: "You have been logged out successfully",
        });
        window.location.href = "/login";
      }
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Could not log out",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Authentication Test
            </span>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span>Auth Status:</span>
            {authStatus === "loading" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <Badge variant="secondary">Testing...</Badge>
              </>
            )}
            {authStatus === "success" && (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <Badge variant="default" className="bg-green-600">
                  Authenticated
                </Badge>
              </>
            )}
            {authStatus === "error" && (
              <>
                <XCircle className="h-4 w-4 text-red-600" />
                <Badge variant="destructive">Not Authenticated</Badge>
              </>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">Error: {error}</p>
              <Button
                onClick={() => router.push("/login")}
                className="mt-2"
                size="sm"
              >
                Go to Login
              </Button>
            </div>
          )}

          {sessionData && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm">
                Authentication successful! Found{" "}
                {Array.isArray(sessionData) ? sessionData.length : 0} resumes.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={testAuth} className="flex-1">
              Test Authentication Again
            </Button>
            <Button
              onClick={() => router.push("/dashboard/job-seeker/upload")}
              variant="outline"
            >
              Try Upload
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
