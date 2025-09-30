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
  FileText,
  CheckCircle,
  Bot,
  Briefcase,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResumeUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedResume, setUploadedResume] = useState<any>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadSuccess(false); // Reset success state when new file is selected
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a resume file to upload.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("resume", selectedFile);

    try {
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadSuccess(true);
        setUploadedResume(data.resume);
        toast({
          title: "Resume Uploaded Successfully!",
          description:
            data.message ||
            "Your resume has been processed and is ready for AI analysis.",
        });
      } else {
        // Handle specific error cases
        if (response.status === 401) {
          toast({
            title: "Authentication Required",
            description:
              "Please log in to upload your resume. Redirecting to login...",
            variant: "destructive",
          });
          // Redirect to login page after a delay
          setTimeout(() => {
            router.push("/login");
          }, 2000);
        } else {
          toast({
            title: "Upload Failed",
            description: data.message || "An error occurred during upload.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Network Error",
        description:
          "Failed to connect to the server. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  if (uploadSuccess && uploadedResume) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-800">
              Resume Uploaded Successfully!
            </CardTitle>
            <CardDescription className="text-green-700">
              Your resume has been processed and analyzed with AI-powered
              insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ATS Score Display */}
            {uploadedResume.atsScore && (
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-600" />
                  ATS Score & Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-3">
                      <div className="w-24 h-24 rounded-full border-8 border-gray-200 relative">
                        <div
                          className={`absolute inset-0 rounded-full border-8 border-transparent ${
                            uploadedResume.atsScore >= 80
                              ? "border-green-500"
                              : uploadedResume.atsScore >= 60
                              ? "border-yellow-500"
                              : "border-red-500"
                          }`}
                          style={{
                            borderTopColor: "transparent",
                            borderRightColor: "transparent",
                            transform: `rotate(${
                              (uploadedResume.atsScore / 100) * 360
                            }deg)`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold">
                            {uploadedResume.atsScore}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ATS Compatibility Score
                    </p>
                    <p
                      className={`text-sm font-medium ${
                        uploadedResume.atsScore >= 80
                          ? "text-green-600"
                          : uploadedResume.atsScore >= 60
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {uploadedResume.atsScore >= 80
                        ? "Excellent"
                        : uploadedResume.atsScore >= 60
                        ? "Good"
                        : "Needs Improvement"}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {uploadedResume.analysis?.strengths && (
                      <div>
                        <h4 className="font-medium text-green-700 mb-2">
                          Strengths
                        </h4>
                        <ul className="text-sm space-y-1">
                          {uploadedResume.analysis.strengths
                            .slice(0, 3)
                            .map((strength: string, index: number) => (
                              <li
                                key={index}
                                className="flex items-start gap-2"
                              >
                                <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                {strength}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {uploadedResume.analysis?.improvements && (
                      <div>
                        <h4 className="font-medium text-orange-700 mb-2">
                          Improvements
                        </h4>
                        <ul className="text-sm space-y-1">
                          {uploadedResume.analysis.improvements
                            .slice(0, 2)
                            .map((improvement: string, index: number) => (
                              <li
                                key={index}
                                className="flex items-start gap-2"
                              >
                                <div className="h-3 w-3 bg-orange-500 rounded-full mt-0.5 flex-shrink-0" />
                                {improvement}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Resume Details */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resume Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Filename:</span>
                  <p className="font-medium">{uploadedResume.filename}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>
                  <p className="font-medium">
                    {formatFileSize(uploadedResume.size)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Upload Date:</span>
                  <p className="font-medium">
                    {new Date(uploadedResume.uploadDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium text-green-600">Analyzed</p>
                </div>
              </div>
            </div>

            {uploadedResume.extractedData?.skills && (
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  Extracted Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {uploadedResume.extractedData.skills.map(
                    (skill: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {skill}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="h-5 w-5 text-purple-600" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Get detailed feedback and optimization tips from our AI
                    assistant.
                  </p>
                  <Button asChild className="w-full" size="sm">
                    <Link href="/dashboard/job-seeker/resume-chatbot-simple">
                      Start AI Chat
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Resume Builder
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create a FAANG-optimized resume with higher ATS scores.
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full bg-transparent"
                    size="sm"
                  >
                    <Link href="/dashboard/job-seeker/resume-builder">
                      Build Resume
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-green-600" />
                    Job Matching
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Find jobs that match your analyzed skills and experience.
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full bg-transparent"
                    size="sm"
                  >
                    <Link href="/dashboard/jobs">Browse Jobs</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  setUploadSuccess(false);
                  setSelectedFile(null);
                  setUploadedResume(null);
                }}
                variant="outline"
              >
                Upload Another Resume
              </Button>
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-6 w-6" />
            Upload Your Resume
          </CardTitle>
          <CardDescription>
            Upload your resume to get started with AI-powered analysis,
            optimization, and job matching.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-6">
            {/* File Upload */}
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
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, DOC, DOCX (Max size: 5MB)
              </p>
              {selectedFile && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)} •{" "}
                        {selectedFile.type}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !selectedFile}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UploadCloud className="mr-2 h-4 w-4" />
              {loading ? "Processing..." : "Upload Resume"}
            </Button>
          </form>

          {/* Features Preview */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="font-semibold mb-4">What happens after upload?</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-3 w-3 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">AI Analysis</p>
                  <p className="text-xs text-muted-foreground">
                    Get personalized feedback and optimization suggestions
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Briefcase className="h-3 w-3 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Job Matching</p>
                  <p className="text-xs text-muted-foreground">
                    Find relevant job opportunities based on your skills
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Resume Builder</p>
                  <p className="text-xs text-muted-foreground">
                    Create FAANG-optimized resumes with our builder
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
