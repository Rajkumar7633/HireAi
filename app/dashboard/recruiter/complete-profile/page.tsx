"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Building2, MapPin, CheckCircle } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";

interface RecruiterProfile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  role: string;
  profileImage?: string;
  companyName?: string;
  companyLogo?: string;
  companyDescription?: string;
  website?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  professionalSummary?: string;
  businessLocation?: string;
  isProfileComplete?: boolean;
}

export default function CompleteProfilePage() {
  const { session, isLoading: sessionLoading, refreshSession } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileJustCompleted, setProfileJustCompleted] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!sessionLoading && !profileJustCompleted) {
      if (session) {
        console.log("[v0] Session found in complete-profile:", session);
        // Check if profile is already complete
        if (session.user?.isProfileComplete) {
          console.log(
            "[v0] Profile already complete, redirecting to dashboard"
          );
          router.push("/dashboard/recruiter");
          return;
        }
        fetchProfile();
      } else {
        console.log("[v0] No session found, redirecting to login");
        router.push("/login");
      }
    } else {
      console.log("[v0] Session still loading or profile just completed...");
    }
  }, [sessionLoading, session, router, profileJustCompleted]);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      console.log("[v0] Fetching profile data...");
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        console.log("[v0] Profile data received:", data);
        setProfile(data.user);
      } else {
        console.log("[v0] Profile fetch failed, using default profile");
        const defaultProfile: RecruiterProfile = {
          id: session?.id || "",
          email: session?.email || "",
          name: session?.name || "",
          role: "recruiter",
          isProfileComplete: false,
        };
        setProfile(defaultProfile);
      }
    } catch (error) {
      console.error("[v0] Profile fetch error:", error);
      const defaultProfile: RecruiterProfile = {
        id: session?.id || "",
        email: session?.email || "",
        name: session?.name || "",
        role: "recruiter",
        isProfileComplete: false,
      };
      setProfile(defaultProfile);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleImageUpload = (file: File, type: "profile" | "company") => {
    if (type === "profile") {
      setProfileImageFile(file);
    } else {
      setCompanyLogoFile(file);
    }
  };

  const validateProfile = (
    profileData: RecruiterProfile
  ): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!profileData.name?.trim()) {
      errors.name = "Full name is required";
    }

    if (!profileData.email?.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!profileData.companyName?.trim()) {
      errors.companyName = "Company name is required";
    }

    if (profileData.website && profileData.website.trim()) {
      try {
        new URL(profileData.website);
      } catch {
        errors.website =
          "Please enter a valid website URL (e.g., https://www.example.com)";
      }
    }

    if (profileData.linkedinUrl && profileData.linkedinUrl.trim()) {
      if (!profileData.linkedinUrl.includes("linkedin.com")) {
        errors.linkedinUrl = "Please enter a valid LinkedIn URL";
      }
    }

    if (profileData.twitterUrl && profileData.twitterUrl.trim()) {
      if (
        !profileData.twitterUrl.includes("twitter.com") &&
        !profileData.twitterUrl.includes("x.com")
      ) {
        errors.twitterUrl = "Please enter a valid Twitter/X URL";
      }
    }

    return errors;
  };

  const calculateProgress = (): number => {
    if (!profile) return 0;

    const requiredFields = ["name", "email", "companyName"];
    const optionalFields = [
      "phone",
      "address",
      "businessLocation",
      "website",
      "professionalSummary",
    ];

    let completed = 0;
    const total = requiredFields.length + optionalFields.length;

    requiredFields.forEach((field) => {
      if (profile[field as keyof RecruiterProfile]) completed++;
    });

    optionalFields.forEach((field) => {
      if (profile[field as keyof RecruiterProfile]) completed++;
    });

    return Math.round((completed / total) * 100);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const errors = validateProfile(profile);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingProfile(true);
    try {
      let profileImageUrl = profile.profileImage;
      let companyLogoUrl = profile.companyLogo;

      // Handle image uploads if needed
      if (profileImageFile) {
        const formData = new FormData();
        formData.append("image", profileImageFile);
        formData.append("type", "profile");

        const imageResponse = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          profileImageUrl = imageData.url;
        }
      }

      if (companyLogoFile) {
        const formData = new FormData();
        formData.append("image", companyLogoFile);
        formData.append("type", "company");

        const imageResponse = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          companyLogoUrl = imageData.url;
        }
      }

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...profile,
          profileImage: profileImageUrl,
          companyLogo: companyLogoUrl,
          isProfileComplete: true,
          lastManualUpdate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setProfileJustCompleted(true);
        toast({
          title: "Profile Completed!",
          description:
            "Your recruiter profile has been successfully set up. Welcome to HireAI!",
        });

        // Refresh session and redirect after a short delay
        await refreshSession();
        setTimeout(() => {
          router.push("/dashboard/recruiter");
        }, 1000);
      } else {
        const errorData = await response.json();
        toast({
          title: "Update Failed",
          description:
            errorData.message || "An error occurred while updating profile.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingProfile(false);
    }
  };

  if (sessionLoading || loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading...</p>
      </div>
    );
  }

  if (!session) {
    console.log("[v0] No session available, showing loading...");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Authenticating...</p>
      </div>
    );
  }

  if (!profile) {
    console.log("[v0] No profile data available");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading profile...</p>
      </div>
    );
  }

  if (session.role !== "recruiter") {
    console.log("[v0] User is not a recruiter, redirecting to dashboard");
    router.push("/dashboard");
    return null;
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-blue-900">
              Complete Your Recruiter Profile
            </CardTitle>
            <CardDescription className="text-lg text-blue-700">
              Set up your professional profile to start connecting with top
              talent
            </CardDescription>
            <div className="mt-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-blue-600 mt-2">{progress}% Complete</p>
            </div>
          </CardHeader>
        </Card>

        <form onSubmit={handleProfileUpdate} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your basic professional details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6 mb-6">
                <div className="relative w-24 h-24">
                  <div className="w-full h-full rounded-full border-4 border-accent/20 overflow-hidden bg-muted flex items-center justify-center">
                    {profile.profileImage || profileImageFile ? (
                      <Image
                        src={
                          profileImageFile
                            ? URL.createObjectURL(profileImageFile)
                            : profile.profileImage!
                        }
                        alt="Profile"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full p-2 cursor-pointer transition-colors">
                    <Camera className="h-3 w-3" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleImageUpload(e.target.files[0], "profile")
                      }
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Profile Picture</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a professional photo to help candidates recognize you
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    className={validationErrors.name ? "border-red-500" : ""}
                    value={profile.name || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    placeholder="Enter your full name"
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-red-600">
                      {validationErrors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    className={validationErrors.email ? "border-red-500" : ""}
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                    placeholder="your.email@company.com"
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-600">
                      {validationErrors.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Personal Address</Label>
                  <Input
                    id="address"
                    value={profile.address || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, address: e.target.value })
                    }
                    placeholder="City, State, Country"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Tell candidates about your company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24">
                  <div className="w-full h-full rounded-lg border-2 border-dashed border-accent/30 overflow-hidden bg-muted flex items-center justify-center">
                    {profile.companyLogo || companyLogoFile ? (
                      <Image
                        src={
                          companyLogoFile
                            ? URL.createObjectURL(companyLogoFile)
                            : profile.companyLogo!
                        }
                        alt="Company Logo"
                        width={96}
                        height={96}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full p-1.5 cursor-pointer transition-colors">
                    <Camera className="h-3 w-3" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleImageUpload(e.target.files[0], "company")
                      }
                    />
                  </label>
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    className={
                      validationErrors.companyName ? "border-red-500" : ""
                    }
                    value={profile.companyName || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, companyName: e.target.value })
                    }
                    placeholder="Your Company Name"
                  />
                  {validationErrors.companyName && (
                    <p className="text-sm text-red-600">
                      {validationErrors.companyName}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyDescription">Company Description</Label>
                <Textarea
                  id="companyDescription"
                  className="min-h-[100px]"
                  value={profile.companyDescription || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      companyDescription: e.target.value,
                    })
                  }
                  placeholder="Describe your company's mission, values, and what makes it unique..."
                />
                <p className="text-xs text-muted-foreground">
                  {profile.companyDescription?.length || 0}/1000 characters
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Business Details
              </CardTitle>
              <CardDescription>
                Contact information and online presence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessLocation">Business Location</Label>
                  <Input
                    id="businessLocation"
                    value={profile.businessLocation || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        businessLocation: e.target.value,
                      })
                    }
                    placeholder="City, State, Country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Company Website</Label>
                  <Input
                    id="website"
                    className={validationErrors.website ? "border-red-500" : ""}
                    value={profile.website || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, website: e.target.value })
                    }
                    placeholder="https://www.yourcompany.com"
                  />
                  {validationErrors.website && (
                    <p className="text-sm text-red-600">
                      {validationErrors.website}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                  <Input
                    id="linkedinUrl"
                    className={
                      validationErrors.linkedinUrl ? "border-red-500" : ""
                    }
                    value={profile.linkedinUrl || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, linkedinUrl: e.target.value })
                    }
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                  {validationErrors.linkedinUrl && (
                    <p className="text-sm text-red-600">
                      {validationErrors.linkedinUrl}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitterUrl">Twitter/X Profile</Label>
                  <Input
                    id="twitterUrl"
                    className={
                      validationErrors.twitterUrl ? "border-red-500" : ""
                    }
                    value={profile.twitterUrl || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, twitterUrl: e.target.value })
                    }
                    placeholder="https://twitter.com/yourhandle"
                  />
                  {validationErrors.twitterUrl && (
                    <p className="text-sm text-red-600">
                      {validationErrors.twitterUrl}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="professionalSummary">
                  Professional Summary
                </Label>
                <Textarea
                  id="professionalSummary"
                  className="min-h-[120px]"
                  value={profile.professionalSummary || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      professionalSummary: e.target.value,
                    })
                  }
                  placeholder="Tell candidates about your experience, specialties, and what drives your passion for recruiting..."
                />
                <p className="text-xs text-muted-foreground">
                  {profile.professionalSummary?.length || 0}/1500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={updatingProfile}
              className="px-12 py-3 text-lg bg-blue-600 hover:bg-blue-700"
            >
              {updatingProfile && (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              )}
              <CheckCircle className="mr-2 h-5 w-5" />
              Complete Profile & Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
