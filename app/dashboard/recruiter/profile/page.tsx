"use client";

import type React from "react";

import { useState, useEffect } from "react";
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
import { Loader2, Camera, Building2, MapPin } from "lucide-react";
import { useSession } from "@/hooks/use-session"; 
import Image from "next/image";

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
  lastLoginUpdate?: string;
  isProfileComplete?: boolean;
  lastManualUpdate?: string;
}

export default function RecruiterProfilePage() {
  const { session, isLoading: sessionLoading, refreshSession } = useSession();
  const { toast } = useToast();

  console.log("[v0] Profile Page - Current state:", {
    sessionLoading,
    hasSession: !!session,
    sessionData: session,
    timestamp: new Date().toISOString(),
  });

  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log(
      "[v0] Profile page useEffect - Session loading:",
      sessionLoading,
      "Session:",
      session
    );
    if (!sessionLoading) {
      if (session) {
        console.log("[v0] Session found, fetching profile...");
        fetchProfile();
      } else {
        console.log("[v0] No session found, setting error...");
        setLoadingProfile(false);
        setError("Please log in to access your profile");
      }
    }
  }, [sessionLoading, session]);

  const fetchProfile = async () => {
    console.log("[v0] Fetching profile...");
    setLoadingProfile(true);
    setError(null);
    try {
      const response = await fetch("/api/user/profile");
      console.log("[v0] Profile API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[v0] Profile data received:", data);
        setProfile(data.user);

        if (data.user.lastLoginUpdate) {
          const lastUpdate = new Date(data.user.lastLoginUpdate);
          const now = new Date();
          const timeDiff = now.getTime() - lastUpdate.getTime();
          const hoursDiff = timeDiff / (1000 * 3600);

          if (hoursDiff < 1) {
            toast({
              title: "Welcome Back!",
              description:
                "Your professional profile has been automatically updated with enhanced details. Feel free to customize it further.",
            });
          }
        }
      } else {
        const errorData = await response.json();
        console.log("[v0] Profile API error:", errorData);
        const defaultProfile: RecruiterProfile = {
          id: session?.id || "",
          email: session?.email || "",
          name: session?.name || "",
          role: "recruiter",
          isProfileComplete: false,
        };
        setProfile(defaultProfile);
        setError(
          `Failed to load profile: ${errorData.message || "Unknown error"}`
        );
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
      setError("Network error. Using default profile data.");
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

    if (profileData.phone && profileData.phone.trim()) {
      const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(profileData.phone.replace(/[\s\-$$$$]/g, ""))) {
        errors.phone = "Please enter a valid phone number";
      }
    }

    if (
      profileData.companyDescription &&
      profileData.companyDescription.length > 1000
    ) {
      errors.companyDescription =
        "Company description must be less than 1000 characters";
    }

    if (
      profileData.professionalSummary &&
      profileData.professionalSummary.length > 1500
    ) {
      errors.professionalSummary =
        "Professional summary must be less than 1500 characters";
    }

    return errors;
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
        const data = await response.json();
        setProfile(data.user);
        setProfileImageFile(null);
        setCompanyLogoFile(null);
        setValidationErrors({});
        toast({
          title: "Profile Updated",
          description: "Your recruiter profile has been successfully updated.",
        });
        refreshSession();
        // Mark onboarding steps: profile (always after successful save), branding (if branding fields present)
        try {
          await fetch("/api/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "profile", value: true }) });
          const brandingDone = !!(data.user?.companyName || data.user?.companyLogo);
          if (brandingDone) {
            await fetch("/api/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "branding", value: true }) });
          }
        } catch {}
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

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading session...</p>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p>Loading profile...</p>
          <Button
            variant="outline"
            onClick={() => {
              setLoadingProfile(false);
              const defaultProfile: RecruiterProfile = {
                id: session?.id || "",
                email: session?.email || "",
                name: session?.name || "",
                role: "recruiter",
                isProfileComplete: false,
              };
              setProfile(defaultProfile);
            }}
          >
            Continue with Default Profile
          </Button>
        </div>
      </div>
    );
  }

  if (!session && !sessionLoading) {
    console.log(
      "[v0] Showing login required - sessionLoading:",
      sessionLoading,
      "session:",
      session
    );
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-6">
          <CardTitle>Login Required</CardTitle>
          <CardDescription className="mt-2">
            Please log in to access your recruiter profile.
            <br />
            <small className="text-xs text-muted-foreground mt-2 block">
              Debug: Session loading: {sessionLoading ? "true" : "false"},
              Session exists: {session ? "true" : "false"}
            </small>
          </CardDescription>
          <div className="flex gap-2 mt-4 justify-center">
            <Button onClick={() => refreshSession()}>Refresh Session</Button>
            <Button onClick={() => (window.location.href = "/login")}>
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-6">
          <CardTitle>Profile Error</CardTitle>
          <CardDescription className="mt-2">
            {error || "Failed to load profile data."}
          </CardDescription>
          <Button className="mt-4" onClick={fetchProfile}>
            Retry Loading Profile
          </Button>
        </Card>
      </div>
    );
  }

  if (session.role !== "recruiter") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-6">
          <CardTitle>Access Denied</CardTitle>
          <CardDescription className="mt-2">
            This page is only available to recruiters.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {error && (
        <div className="max-w-4xl mx-auto mb-4">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ {error} You can still edit your profile below.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="premium-profile-card">
          <CardHeader className="text-center pb-2">
            <div className="relative mx-auto w-32 h-32 mb-4">
              <div className="w-full h-full rounded-full border-4 border-accent/20 overflow-hidden bg-muted flex items-center justify-center">
                {profile.profileImage || profileImageFile ? (
                  <Image
                    src={
                      profileImageFile
                        ? URL.createObjectURL(profileImageFile)
                        : profile.profileImage!
                    }
                    alt="Profile"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full p-2 cursor-pointer transition-colors">
                <Camera className="h-4 w-4" />
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
            <CardTitle className="text-2xl font-bold text-foreground">
              {profile.name || "Complete Your Profile"}
            </CardTitle>
            <CardDescription className="text-lg">
              Professional Recruiter Profile
            </CardDescription>
          </CardHeader>
        </Card>

        <form onSubmit={handleProfileUpdate} className="space-y-8">
          <Card className="premium-form-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your basic professional details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="premium-label">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    className={`premium-input ${
                      validationErrors.name ? "border-red-500" : ""
                    }`}
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
                  <Label htmlFor="email" className="premium-label">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    className={`premium-input ${
                      validationErrors.email ? "border-red-500" : ""
                    }`}
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
                  <Label htmlFor="phone" className="premium-label">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    className={`premium-input ${
                      validationErrors.phone ? "border-red-500" : ""
                    }`}
                    value={profile.phone || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                  {validationErrors.phone && (
                    <p className="text-sm text-red-600">
                      {validationErrors.phone}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="premium-label">
                    Personal Address
                  </Label>
                  <Input
                    id="address"
                    className="premium-input"
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

          <Card className="premium-form-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Branding
              </CardTitle>
              <CardDescription>
                Showcase your company's identity and brand
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
                  <Label htmlFor="companyName" className="premium-label">
                    Company Name *
                  </Label>
                  <Input
                    id="companyName"
                    className={`premium-input ${
                      validationErrors.companyName ? "border-red-500" : ""
                    }`}
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
                <Label htmlFor="companyDescription" className="premium-label">
                  Company Description
                </Label>
                <Textarea
                  id="companyDescription"
                  className={`premium-input min-h-[100px] ${
                    validationErrors.companyDescription ? "border-red-500" : ""
                  }`}
                  value={profile.companyDescription || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      companyDescription: e.target.value,
                    })
                  }
                  placeholder="Describe your company's mission, values, and what makes it unique..."
                />
                {validationErrors.companyDescription && (
                  <p className="text-sm text-red-600">
                    {validationErrors.companyDescription}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {profile.companyDescription?.length || 0}/1000 characters
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-form-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Contact details and online presence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessLocation" className="premium-label">
                    Business Location
                  </Label>
                  <Input
                    id="businessLocation"
                    className="premium-input"
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
                  <Label htmlFor="website" className="premium-label">
                    Company Website
                  </Label>
                  <Input
                    id="website"
                    className={`premium-input ${
                      validationErrors.website ? "border-red-500" : ""
                    }`}
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
                  <Label htmlFor="linkedinUrl" className="premium-label">
                    LinkedIn Profile
                  </Label>
                  <Input
                    id="linkedinUrl"
                    className={`premium-input ${
                      validationErrors.linkedinUrl ? "border-red-500" : ""
                    }`}
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
                  <Label htmlFor="twitterUrl" className="premium-label">
                    Twitter/X Profile
                  </Label>
                  <Input
                    id="twitterUrl"
                    className={`premium-input ${
                      validationErrors.twitterUrl ? "border-red-500" : ""
                    }`}
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
            </CardContent>
          </Card>

          <Card className="premium-form-section">
            <CardHeader>
              <CardTitle>Professional Summary</CardTitle>
              <CardDescription>
                Share your professional background and recruiting philosophy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="professionalSummary" className="premium-label">
                  About You
                </Label>
                <Textarea
                  id="professionalSummary"
                  className={`premium-input min-h-[120px] ${
                    validationErrors.professionalSummary ? "border-red-500" : ""
                  }`}
                  value={profile.professionalSummary || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      professionalSummary: e.target.value,
                    })
                  }
                  placeholder="Tell candidates about your experience, specialties, and what drives your passion for recruiting..."
                />
                {validationErrors.professionalSummary && (
                  <p className="text-sm text-red-600">
                    {validationErrors.professionalSummary}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {profile.professionalSummary?.length || 0}/1500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updatingProfile}
              className="premium-button-primary px-8 py-3 text-lg"
            >
              {updatingProfile && (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              )}
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
