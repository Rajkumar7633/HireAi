"use client";

import type React from "react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  UploadCloud,
  AlertCircle,
  CheckCircle,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ResumeUploadFormProps {
  onUploadSuccess?: (resumeData: any) => void;
  onUploadError?: (error: string) => void;
}

export default function ResumeUploadForm({
  onUploadSuccess,
  onUploadError,
}: ResumeUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      // Reset previous states
      setUploadStatus("idle");
      setErrorMessage("");
      setUploadProgress(0);

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        const error = "Please select a PDF, DOC, or DOCX file.";
        setErrorMessage(error);
        setUploadStatus("error");
        onUploadError?.(error);
        toast({
          title: "Invalid file type",
          description: error,
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        const error = "Please select a file smaller than 5MB.";
        setErrorMessage(error);
        setUploadStatus("error");
        onUploadError?.(error);
        toast({
          title: "File too large",
          description: error,
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    } else {
      setSelectedFile(null);
      setUploadStatus("idle");
      setErrorMessage("");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      const error = "Please select a resume file to upload.";
      setErrorMessage(error);
      setUploadStatus("error");
      toast({
        title: "No file selected",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadStatus("uploading");
    setUploadProgress(0);
    setErrorMessage("");

    const formData = new FormData();
    formData.append("resume", selectedFile);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      console.log("Starting upload for file:", selectedFile.name);

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
        credentials: "include", // Include cookies for authentication
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log("Upload response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        setUploadStatus("success");

        const successMessage = data.isDemoMode
          ? "Resume uploaded successfully (demo mode) - AI analysis is ready!"
          : "Resume uploaded successfully - AI analysis is ready!";

        toast({
          title: "Upload Successful",
          description: successMessage,
        });

        // Call success callback
        onUploadSuccess?.(data.resume);

        // Small delay to show 100% progress, then redirect
        setTimeout(() => {
          router.push("/dashboard/job-seeker/resume-chatbot-simple");
        }, 1500);
      } else if (response.status === 401) {
        // Handle authentication error
        const data = await response.json();
        setUploadStatus("error");
        setErrorMessage("Please log in to upload your resume.");

        console.log("Authentication error:", data);

        toast({
          title: "Authentication Required",
          description: "Please log in to upload your resume.",
          variant: "destructive",
        });

        // Redirect to login with current page as redirect
        setTimeout(() => {
          router.push(
            "/login?redirect=" + encodeURIComponent(window.location.pathname)
          );
        }, 2000);
      } else {
        const errorData = await response.json();
        const error = errorData.message || "Upload failed";
        setUploadStatus("error");
        setErrorMessage(error);
        onUploadError?.(error);

        console.error("Upload failed:", errorData);

        toast({
          title: "Upload Failed",
          description: error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress(0);
      setUploadStatus("error");

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Network error during upload. Please try again.";
      setErrorMessage(errorMessage);
      onUploadError?.(errorMessage);

      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadStatus("idle");
    setErrorMessage("");
    setUploadProgress(0);
    // Reset file input
    const fileInput = document.getElementById(
      "resume-file"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5" />
          Upload Your Resume
        </CardTitle>
        <CardDescription>
          Upload your resume to get started with AI-powered resume analysis and
          career guidance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="resume-file">Resume File</Label>
            <Input
              id="resume-file"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="cursor-pointer"
              disabled={loading}
            />

            {selectedFile && uploadStatus !== "error" && (
              <div className="mt-2 p-3 bg-muted rounded-md border">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB •{" "}
                      {selectedFile.type.split("/")[1].toUpperCase()}
                    </p>
                  </div>
                  {uploadStatus === "success" && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>
            )}
          </div>

          {loading && uploadStatus === "uploading" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading and processing...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadStatus === "error" && errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {uploadStatus === "success" && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Resume uploaded successfully! Redirecting to AI chat...
              </AlertDescription>
            </Alert>
          )}

          {uploadStatus === "idle" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Supported formats: PDF, DOC, DOCX (max 5MB)
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !selectedFile || uploadStatus === "success"}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UploadCloud className="mr-2 h-4 w-4" />
              {loading ? "Uploading..." : "Upload Resume"}
            </Button>

            {selectedFile && uploadStatus !== "uploading" && (
              <Button type="button" variant="outline" onClick={resetUpload}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
