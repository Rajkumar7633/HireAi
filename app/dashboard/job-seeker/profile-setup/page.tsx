"use client";

import React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/use-session";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Briefcase,
  GraduationCap,
  Globe,
  Loader2,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

interface ProfileData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;

  // Professional Information
  currentTitle: string;
  experienceLevel: string;
  industry: string;
  skills: string[];

  // Education
  education: string;
  university: string;
  graduationYear: string;

  // Online Presence
  linkedinUrl: string;
  portfolioUrl: string;
  githubUrl: string;

  // Career Goals
  desiredRole: string;
  salaryExpectation: string;
  workPreference: string;
  summary: string;
}

const STEPS = [
  { id: 1, title: "Personal Info", icon: User },
  { id: 2, title: "Professional", icon: Briefcase },
  { id: 3, title: "Education", icon: GraduationCap },
  { id: 4, title: "Online Presence", icon: Globe },
  { id: 5, title: "Career Goals", icon: CheckCircle },
];

export default function ProfileSetupPage() {
  const { session } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: session?.email || "",
    phone: "",
    location: "",
    currentTitle: "",
    experienceLevel: "",
    industry: "",
    skills: [],
    education: "",
    university: "",
    graduationYear: "",
    linkedinUrl: "",
    portfolioUrl: "",
    githubUrl: "",
    desiredRole: "",
    salaryExpectation: "",
    workPreference: "",
    summary: "",
  });

  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    if (session?.name) {
      const nameParts = session.name.split(" ");
      setProfileData((prev) => ({
        ...prev,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
      }));
    }
  }, [session]);

  const addSkill = () => {
    if (skillInput.trim() && !profileData.skills.includes(skillInput.trim())) {
      setProfileData((prev) => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setProfileData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(
          profileData.firstName &&
          profileData.lastName &&
          profileData.email &&
          profileData.location
        );
      case 2:
        return !!(
          profileData.currentTitle &&
          profileData.experienceLevel &&
          profileData.industry &&
          profileData.skills.length > 0
        );
      case 3:
        return !!profileData.education;
      case 4:
        return true; // Optional step
      case 5:
        return !!(profileData.desiredRole && profileData.workPreference);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/profile-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        toast({
          title: "Profile Created Successfully!",
          description:
            "Your profile has been set up. You can now access all features.",
        });
        router.push("/dashboard/job-seeker");
      } else {
        const errorData = await response.json();
        toast({
          title: "Setup Failed",
          description: errorData.message || "Failed to create profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  placeholder="Doe"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="john.doe@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={profileData.location}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                placeholder="San Francisco, CA"
                required
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentTitle">Current Job Title *</Label>
              <Input
                id="currentTitle"
                value={profileData.currentTitle}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    currentTitle: e.target.value,
                  }))
                }
                placeholder="Software Engineer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experienceLevel">Experience Level *</Label>
              <Select
                value={profileData.experienceLevel}
                onValueChange={(value) =>
                  setProfileData((prev) => ({
                    ...prev,
                    experienceLevel: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                  <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                  <SelectItem value="senior">
                    Senior Level (6-10 years)
                  </SelectItem>
                  <SelectItem value="lead">
                    Lead/Principal (10+ years)
                  </SelectItem>
                  <SelectItem value="executive">Executive Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry *</Label>
              <Select
                value={profileData.industry}
                onValueChange={(value) =>
                  setProfileData((prev) => ({ ...prev, industry: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills">Skills *</Label>
              <div className="flex gap-2">
                <Input
                  id="skills"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add a skill (e.g., JavaScript, React)"
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addSkill())
                  }
                />
                <Button type="button" onClick={addSkill} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {profileData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="education">Highest Education Level *</Label>
              <Select
                value={profileData.education}
                onValueChange={(value) =>
                  setProfileData((prev) => ({ ...prev, education: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select education level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high-school">High School</SelectItem>
                  <SelectItem value="associate">Associate Degree</SelectItem>
                  <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                  <SelectItem value="master">Master's Degree</SelectItem>
                  <SelectItem value="phd">PhD</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="university">University/Institution</Label>
              <Input
                id="university"
                value={profileData.university}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    university: e.target.value,
                  }))
                }
                placeholder="Stanford University"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="graduationYear">Graduation Year</Label>
              <Input
                id="graduationYear"
                value={profileData.graduationYear}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    graduationYear: e.target.value,
                  }))
                }
                placeholder="2020"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
              <Input
                id="linkedinUrl"
                value={profileData.linkedinUrl}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    linkedinUrl: e.target.value,
                  }))
                }
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolioUrl">Portfolio Website</Label>
              <Input
                id="portfolioUrl"
                value={profileData.portfolioUrl}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    portfolioUrl: e.target.value,
                  }))
                }
                placeholder="https://johndoe.dev"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="githubUrl">GitHub Profile</Label>
              <Input
                id="githubUrl"
                value={profileData.githubUrl}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    githubUrl: e.target.value,
                  }))
                }
                placeholder="https://github.com/johndoe"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="desiredRole">Desired Job Title *</Label>
              <Input
                id="desiredRole"
                value={profileData.desiredRole}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    desiredRole: e.target.value,
                  }))
                }
                placeholder="Senior Software Engineer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryExpectation">Salary Expectation</Label>
              <Select
                value={profileData.salaryExpectation}
                onValueChange={(value) =>
                  setProfileData((prev) => ({
                    ...prev,
                    salaryExpectation: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select salary range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50k-75k">$50,000 - $75,000</SelectItem>
                  <SelectItem value="75k-100k">$75,000 - $100,000</SelectItem>
                  <SelectItem value="100k-150k">$100,000 - $150,000</SelectItem>
                  <SelectItem value="150k-200k">$150,000 - $200,000</SelectItem>
                  <SelectItem value="200k+">$200,000+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workPreference">Work Preference *</Label>
              <Select
                value={profileData.workPreference}
                onValueChange={(value) =>
                  setProfileData((prev) => ({ ...prev, workPreference: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select work preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Professional Summary</Label>
              <Textarea
                id="summary"
                value={profileData.summary}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    summary: e.target.value,
                  }))
                }
                placeholder="Brief summary of your professional background and career goals..."
                className="min-h-[100px]"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <CardDescription>
              Help us personalize your job search experience
            </CardDescription>
            <div className="mt-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">
                Step {currentStep} of {STEPS.length}
              </p>
            </div>
          </CardHeader>
        </Card>

        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 
                    ${
                      isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : isCompleted
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-gray-300 bg-white text-gray-400"
                    }
                  `}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-2 ${
                        isCompleted ? "bg-green-600" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(STEPS[currentStep - 1].icon, {
                className: "h-5 w-5",
              })}
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Let's start with your basic information"}
              {currentStep === 2 &&
                "Tell us about your professional background"}
              {currentStep === 3 && "Share your educational background"}
              {currentStep === 4 && "Add your online presence"}
              {currentStep === 5 && "Define your career goals"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}

            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className={
                    validateCurrentStep()
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !validateCurrentStep()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Setup
                  <CheckCircle className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
