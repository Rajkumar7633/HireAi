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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  ClipboardList,
  CalendarCheck,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns"; // Import format from date-fns
import { PDFViewer } from "@/components/pdf-viewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserProfile {
  _id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  role: string;
  jobSeekerProfile?: {
    firstName?: string;
    lastName?: string;
    location?: string;
    currentTitle?: string;
    skills?: string[];
    yearsOfExperience?: number;
    summary?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    githubUrl?: string;
    profileCompleteness?: number;
    atsScore?: number;
    lastUpdated?: string;
  } | null;
}

interface Resume {
  _id: string;
  filename: string;
  parsedText: string;
  fileUrl?: string; // Added fileUrl to interface
  metadata: {
    skills?: string[];
    experience?: string;
    education?: string;
  };
  uploadDate: string;
  atsScore?: number;
  analysis?: {
    strengths?: string[];
    improvements?: string[];
    keywordDensity?: Record<string, number>;
  };
  extractedData?: {
    name?: string;
    email?: string;
    phone?: string;
    skills?: string[];
    experience?: Array<{
      title?: string;
      company?: string;
      duration?: string;
    }>;
    education?: Array<{
      degree?: string;
      school?: string;
      year?: string;
    }>;
  };
  status?: string;
  size?: number;
  mimeType?: string;
}

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const resumeId = new URLSearchParams(window.location.search).get("resumeId");
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userResumes, setUserResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      fetchUserResumes();
    }
  }, [userId]);

  useEffect(() => {
    if (userResumes.length > 0) {
      if (resumeId) {
        const resumeToSelect = userResumes.find((r) => r._id === resumeId);
        if (resumeToSelect) {
          setSelectedResume(resumeToSelect);
        } else {
          setSelectedResume(userResumes[0]); // Fallback to first if specific not found
        }
      } else {
        setSelectedResume(userResumes[0]); // Select first resume by default
      }
    }
  }, [userResumes, resumeId]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.user);
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch user profile.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast({
        title: "Error",
        description: "Network error. Failed to fetch user profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserResumes = async () => {
    try {
      const response = await fetch(`/api/resume/user/${userId}`); // Assuming a backend route to get resumes by user ID
      if (response.ok) {
        const data = await response.json();
        setUserResumes(data.resumes);
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch user resumes.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching user resumes:", error);
      toast({
        title: "Error",
        description: "Network error. Failed to fetch user resumes.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading candidate profile...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-muted-foreground">Candidate not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {userProfile.jobSeekerProfile?.firstName || userProfile.name || "N/A"}
              {userProfile.jobSeekerProfile?.lastName ? ` ${userProfile.jobSeekerProfile.lastName}` : ""}
            </CardTitle>
            <CardDescription>
              {userProfile.jobSeekerProfile?.currentTitle || userProfile.role.replace("_", " ")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" /> {userProfile.email}
            </div>
            {userProfile.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" /> {userProfile.phone}
              </div>
            )}
            {(userProfile.jobSeekerProfile?.location || userProfile.address) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {userProfile.jobSeekerProfile?.location || userProfile.address}
              </div>
            )}
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/messages?userId=${userProfile._id}`}>
                  Message
                  <MessageSquare className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {/* Assuming you have an application ID to link to for assigning tests/interviews */}
              {/* For now, these buttons might need to be context-aware (e.g., from a job application) */}
              <Button variant="outline" size="sm">
                Assign Test
                <ClipboardList className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                Schedule Interview
                <CalendarCheck className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumes</CardTitle>
            <CardDescription>
              Select a resume to view its details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {userResumes.length === 0 ? (
              <p className="text-muted-foreground">
                No resumes uploaded by this user.
              </p>
            ) : (
              userResumes.map((resume) => (
                <Button
                  key={resume._id}
                  variant={
                    selectedResume?._id === resume._id ? "default" : "outline"
                  }
                  className="w-full justify-start"
                  onClick={() => setSelectedResume(resume)}
                >
                  {resume.filename}
                </Button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {/* Profile Overview (Live from JobSeekerProfile) */}
        {userProfile.jobSeekerProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Overview</CardTitle>
              <CardDescription>Live data from candidate profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userProfile.jobSeekerProfile.summary && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Summary</h3>
                  <p className="text-sm text-muted-foreground">{userProfile.jobSeekerProfile.summary}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Experience:</span> {userProfile.jobSeekerProfile.yearsOfExperience ?? 0} years
                </div>
                <div>
                  <span className="font-medium">Location:</span> {userProfile.jobSeekerProfile.location || "-"}
                </div>
                {typeof userProfile.jobSeekerProfile.profileCompleteness === 'number' && (
                  <div>
                    <span className="font-medium">Completeness:</span> {userProfile.jobSeekerProfile.profileCompleteness}%
                  </div>
                )}
                {typeof userProfile.jobSeekerProfile.atsScore === 'number' && (
                  <div>
                    <span className="font-medium">ATS Score:</span> {userProfile.jobSeekerProfile.atsScore}%
                  </div>
                )}
              </div>
              {userProfile.jobSeekerProfile.skills && userProfile.jobSeekerProfile.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Skills</h3>
                  <div className="flex flex-wrap gap-1">
                    {userProfile.jobSeekerProfile.skills.slice(0, 12).map((skill, idx) => (
                      <Badge key={idx} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {userProfile.jobSeekerProfile.linkedinUrl && (
                  <a href={userProfile.jobSeekerProfile.linkedinUrl} target="_blank" rel="noreferrer" className="text-sm underline">LinkedIn</a>
                )}
                {userProfile.jobSeekerProfile.portfolioUrl && (
                  <a href={userProfile.jobSeekerProfile.portfolioUrl} target="_blank" rel="noreferrer" className="text-sm underline">Portfolio</a>
                )}
                {userProfile.jobSeekerProfile.githubUrl && (
                  <a href={userProfile.jobSeekerProfile.githubUrl} target="_blank" rel="noreferrer" className="text-sm underline">GitHub</a>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Resume Details</CardTitle>
            <CardDescription>
              {selectedResume
                ? `Viewing: ${selectedResume.filename}`
                : "Select a resume from the left."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedResume ? (
              <Tabs defaultValue="parsed" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="parsed">Parsed Data</TabsTrigger>
                  <TabsTrigger
                    value="original"
                    disabled={!selectedResume.fileUrl}
                  >
                    Original PDF
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="parsed" className="space-y-4">
                  {selectedResume.atsScore && (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">ATS Score</h3>
                        <Badge
                          variant={
                            selectedResume.atsScore >= 70
                              ? "default"
                              : selectedResume.atsScore >= 50
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {selectedResume.atsScore}%
                        </Badge>
                      </div>
                      <Separator />
                    </>
                  )}

                  {selectedResume.extractedData && (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Extracted Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {selectedResume.extractedData.name && (
                            <div>
                              <span className="font-medium">Name:</span>{" "}
                              {selectedResume.extractedData.name}
                            </div>
                          )}
                          {selectedResume.extractedData.email && (
                            <div>
                              <span className="font-medium">Email:</span>{" "}
                              {selectedResume.extractedData.email}
                            </div>
                          )}
                          {selectedResume.extractedData.phone && (
                            <div>
                              <span className="font-medium">Phone:</span>{" "}
                              {selectedResume.extractedData.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {selectedResume.extractedData?.experience &&
                    selectedResume.extractedData.experience.length > 0 && (
                      <>
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            Work Experience
                          </h3>
                          <div className="space-y-3">
                            {selectedResume.extractedData.experience.map(
                              (exp, idx) => (
                                <div
                                  key={idx}
                                  className="border-l-2 border-muted pl-4"
                                >
                                  <div className="font-medium">{exp.title}</div>
                                  {exp.company && (
                                    <div className="text-sm text-muted-foreground">
                                      {exp.company}
                                    </div>
                                  )}
                                  {exp.duration && (
                                    <div className="text-xs text-muted-foreground">
                                      {exp.duration}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                  {selectedResume.extractedData?.education &&
                    selectedResume.extractedData.education.length > 0 && (
                      <>
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            Education
                          </h3>
                          <div className="space-y-2">
                            {selectedResume.extractedData.education.map(
                              (edu, idx) => (
                                <div key={idx} className="text-sm">
                                  <div className="font-medium">
                                    {edu.degree}
                                  </div>
                                  {edu.school && (
                                    <div className="text-muted-foreground">
                                      {edu.school}
                                    </div>
                                  )}
                                  {edu.year && (
                                    <div className="text-xs text-muted-foreground">
                                      {edu.year}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Extracted Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(selectedResume.extractedData?.skills ||
                        selectedResume.metadata?.skills) &&
                      (selectedResume.extractedData?.skills ||
                        selectedResume.metadata?.skills)!.length > 0 ? (
                        (selectedResume.extractedData?.skills ||
                          selectedResume.metadata?.skills)!.map(
                          (skill, idx) => (
                            <Badge key={idx} variant="secondary">
                              {skill}
                            </Badge>
                          )
                        )
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          No skills extracted.
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedResume.analysis && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Resume Analysis
                        </h3>
                        {selectedResume.analysis.strengths &&
                          selectedResume.analysis.strengths.length > 0 && (
                            <div className="mb-3">
                              <h4 className="font-medium text-green-600 mb-1">
                                Strengths
                              </h4>
                              <ul className="text-sm text-muted-foreground list-disc list-inside">
                                {selectedResume.analysis.strengths.map(
                                  (strength, idx) => (
                                    <li key={idx}>{strength}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {selectedResume.analysis.improvements &&
                          selectedResume.analysis.improvements.length > 0 && (
                            <div>
                              <h4 className="font-medium text-orange-600 mb-1">
                                Areas for Improvement
                              </h4>
                              <ul className="text-sm text-muted-foreground list-disc list-inside">
                                {selectedResume.analysis.improvements.map(
                                  (improvement, idx) => (
                                    <li key={idx}>{improvement}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    </>
                  )}

                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Resume Text</h3>
                    <div className="max-h-96 overflow-y-auto bg-muted/50 p-4 rounded-md">
                      <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                        {selectedResume.parsedText}
                      </p>
                    </div>
                  </div>

                  <Separator />
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div>
                      Uploaded on:{" "}
                      {format(
                        new Date(selectedResume.uploadDate),
                        "MMM dd, yyyy"
                      )}
                    </div>
                    <div className="flex gap-4">
                      {selectedResume.size && (
                        <span>
                          Size: {(selectedResume.size / 1024).toFixed(1)} KB
                        </span>
                      )}
                      {selectedResume.status && (
                        <Badge variant="outline" className="text-xs">
                          {selectedResume.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="original">
                  {selectedResume.fileUrl ? (
                    <div className="space-y-3">
                      <div className="flex justify-end gap-2">
                        <a
                          href={selectedResume.fileUrl}
                          download
                          className="inline-flex items-center text-sm px-3 py-1.5 border rounded hover:bg-muted"
                        >
                          Download
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(selectedResume.fileUrl as string, "_blank", "noopener,noreferrer")}
                        >
                          Open in New Tab
                        </Button>
                      </div>
                      <PDFViewer
                        fileUrl={selectedResume.fileUrl}
                        fileName={selectedResume.filename}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Original PDF file not available. If this is an older resume, re-upload to generate a viewable link.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-muted-foreground text-center py-8">
                No resume selected or available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
