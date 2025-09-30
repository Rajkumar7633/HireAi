"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Monitor,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";

interface SystemCheck {
  name: string;
  status: "checking" | "passed" | "failed";
  required: boolean;
  description: string;
}

export default function StartAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<any>(null);
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([
    {
      name: "Camera Access",
      status: "checking",
      required: true,
      description: "Required for identity verification and proctoring",
    },
    {
      name: "Microphone Access",
      status: "checking",
      required: true,
      description: "Required for audio monitoring during assessment",
    },
    {
      name: "Screen Recording",
      status: "checking",
      required: true,
      description: "Required to monitor screen activity",
    },
    {
      name: "Full Screen Mode",
      status: "checking",
      required: true,
      description: "Assessment must be taken in full screen",
    },
  ]);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [systemCheckComplete, setSystemCheckComplete] = useState(false);

  useEffect(() => {
    fetchAssessment();
    runSystemChecks();
  }, [assessmentId]);

  const fetchAssessment = async () => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}`);
      if (response.ok) {
        const data = await response.json();
        setAssessment(data.assessment);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load assessment details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runSystemChecks = async () => {
    // Simulate system checks
    const checks = [...systemChecks];

    // Camera check
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      checks[0].status = "passed";
    } catch {
      checks[0].status = "failed";
    }

    // Microphone check
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      checks[1].status = "passed";
    } catch {
      checks[1].status = "failed";
    }

    // Screen recording check (simulated)
    checks[2].status = "passed";

    // Full screen check
    checks[3].status = document.fullscreenEnabled ? "passed" : "failed";

    setSystemChecks(checks);
    setSystemCheckComplete(true);
  };

  const startAssessment = async () => {
    if (!agreementChecked) {
      toast({
        title: "Agreement Required",
        description: "Please accept the terms and conditions to proceed.",
        variant: "destructive",
      });
      return;
    }

    const failedChecks = systemChecks.filter(
      (check) => check.required && check.status === "failed"
    );
    if (failedChecks.length > 0) {
      toast({
        title: "System Requirements Not Met",
        description:
          "Please resolve all required system checks before starting.",
        variant: "destructive",
      });
      return;
    }

    // Enter full screen mode
    try {
      await document.documentElement.requestFullscreen();
      router.push(`/dashboard/job-seeker/assessments/${assessmentId}/take`);
    } catch (error) {
      toast({
        title: "Full Screen Required",
        description: "Please allow full screen mode to start the assessment.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading assessment...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Assessment Not Found</h3>
            <p className="text-muted-foreground">
              The requested assessment could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Assessment Info */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl">{assessment.title}</CardTitle>
            <CardDescription className="text-blue-100">
              {assessment.jobTitle} at {assessment.companyName}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>{assessment.durationMinutes} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>{assessment.totalQuestions} questions</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>AI Proctored</span>
              </div>
            </div>
            <p className="text-muted-foreground">{assessment.description}</p>
          </CardContent>
        </Card>

        {/* System Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              System Requirements Check
            </CardTitle>
            <CardDescription>
              Please ensure all requirements are met before starting the
              assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemChecks.map((check, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {check.status === "checking" && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  )}
                  {check.status === "passed" && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {check.status === "failed" && (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">{check.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {check.description}
                    </p>
                  </div>
                </div>
                <div className="text-sm">
                  {check.required && (
                    <span className="text-red-500">Required</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
              <p>
                <strong>By starting this assessment, you agree to:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  Allow camera and microphone access for proctoring purposes
                </li>
                <li>Take the assessment in a quiet, well-lit environment</li>
                <li>Not use any external resources, devices, or assistance</li>
                <li>Complete the assessment in one sitting without breaks</li>
                <li>
                  Accept that any suspicious activity will be flagged and
                  reviewed
                </li>
              </ul>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreement"
                checked={agreementChecked}
                onCheckedChange={(checked) =>
                  setAgreementChecked(checked as boolean)
                }
              />
              <label
                htmlFor="agreement"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I have read and agree to the assessment terms and conditions
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Start Button */}
        <Card>
          <CardContent className="p-6">
            <Button
              onClick={startAssessment}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-6"
              disabled={!systemCheckComplete || !agreementChecked}
            >
              <Shield className="mr-2 h-5 w-5" />
              Start Secure Assessment
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-2">
              The assessment will start in full-screen mode with AI proctoring
              enabled
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
