"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SkillBar } from "@/components/ui/charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Camera, Building2, MapPin, Globe, Linkedin,
  Twitter, Phone, Mail, User, CheckCircle, Clock,
  Edit3, Shield, Briefcase, FileText, Save, AlertCircle,
} from "lucide-react";
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

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-xs text-rose-600 flex items-center gap-1 mt-1">
      <AlertCircle className="h-3 w-3" />{msg}
    </p>
  );
}

export default function RecruiterProfilePage() {
  const { session, isLoading: sessionLoading, refreshSession } = useSession();
  const { toast } = useToast();

  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading) {
      if (session) fetchProfile();
      else { setLoadingProfile(false); setError("Please log in to access your profile"); }
    }
  }, [sessionLoading, session]);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      } else {
        const err = await res.json().catch(() => ({}));
        setProfile({ id: session?.id || "", email: session?.email || "", name: session?.name || "", role: "recruiter", isProfileComplete: false });
        setError(`Failed to load profile: ${err.message || "Unknown error"}`);
      }
    } catch {
      setProfile({ id: session?.id || "", email: session?.email || "", name: session?.name || "", role: "recruiter", isProfileComplete: false });
      setError("Network error. Using default profile data.");
    } finally {
      setLoadingProfile(false);
    }
  };

  // Profile completion score
  const completionFields = useMemo(() => {
    if (!profile) return { score: 0, items: [] as { label: string; done: boolean }[] };
    const items = [
      { label: "Full name",           done: !!profile.name?.trim() },
      { label: "Phone number",        done: !!profile.phone?.trim() },
      { label: "Company name",        done: !!profile.companyName?.trim() },
      { label: "Company description", done: !!profile.companyDescription?.trim() },
      { label: "Business location",   done: !!profile.businessLocation?.trim() },
      { label: "Company website",     done: !!profile.website?.trim() },
      { label: "LinkedIn profile",    done: !!profile.linkedinUrl?.trim() },
      { label: "Professional summary",done: !!profile.professionalSummary?.trim() },
      { label: "Profile photo",       done: !!profile.profileImage || !!profileImageFile },
      { label: "Company logo",        done: !!profile.companyLogo || !!companyLogoFile },
    ];
    const score = Math.round((items.filter((i) => i.done).length / items.length) * 100);
    return { score, items };
  }, [profile, profileImageFile, companyLogoFile]);

  const validateProfile = (p: RecruiterProfile): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!p.name?.trim()) errors.name = "Full name is required";
    if (!p.email?.trim()) errors.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) errors.email = "Invalid email address";
    if (!p.companyName?.trim()) errors.companyName = "Company name is required";
    if (p.website?.trim()) { try { new URL(p.website); } catch { errors.website = "Enter a valid URL (e.g. https://example.com)"; } }
    if (p.linkedinUrl?.trim() && !p.linkedinUrl.includes("linkedin.com")) errors.linkedinUrl = "Must be a LinkedIn URL";
    if (p.twitterUrl?.trim() && !p.twitterUrl.includes("twitter.com") && !p.twitterUrl.includes("x.com")) errors.twitterUrl = "Must be a Twitter/X URL";
    if (p.phone?.trim() && !/^[+]?[1-9][\d]{0,15}$/.test(p.phone.replace(/[\s\-()\[\]]/g, ""))) errors.phone = "Invalid phone number";
    if ((p.companyDescription?.length || 0) > 1000) errors.companyDescription = "Max 1000 characters";
    if ((p.professionalSummary?.length || 0) > 1500) errors.professionalSummary = "Max 1500 characters";
    return errors;
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const errors = validateProfile(profile);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({ title: "Please fix the errors before saving", variant: "destructive" });
      return;
    }
    setUpdatingProfile(true);
    try {
      let profileImageUrl = profile.profileImage;
      let companyLogoUrl = profile.companyLogo;

      if (profileImageFile) {
        const fd = new FormData();
        fd.append("image", profileImageFile);
        fd.append("type", "profile");
        const r = await fetch("/api/upload/image", { method: "POST", body: fd });
        if (r.ok) profileImageUrl = (await r.json()).url;
      }
      if (companyLogoFile) {
        const fd = new FormData();
        fd.append("image", companyLogoFile);
        fd.append("type", "company");
        const r = await fetch("/api/upload/image", { method: "POST", body: fd });
        if (r.ok) companyLogoUrl = (await r.json()).url;
      }

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, profileImage: profileImageUrl, companyLogo: companyLogoUrl, isProfileComplete: true, lastManualUpdate: new Date().toISOString() }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setProfileImageFile(null);
        setCompanyLogoFile(null);
        setValidationErrors({});
        toast({ title: "Profile saved!", description: "Your recruiter profile has been updated." });
        refreshSession();
        try {
          await fetch("/api/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "profile", value: true }) });
          if (data.user?.companyName || data.user?.companyLogo) {
            await fetch("/api/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "branding", value: true }) });
          }
        } catch {}
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Update failed", description: err.message || "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" });
    } finally {
      setUpdatingProfile(false);
    }
  };

  if (sessionLoading || loadingProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Loader2 className="h-7 w-7 animate-spin text-violet-600 mx-auto" />
          <p className="text-sm text-muted-foreground">{sessionLoading ? "Loading session..." : "Loading profile..."}</p>
          {loadingProfile && !sessionLoading && (
            <Button variant="outline" size="sm" onClick={() => {
              setLoadingProfile(false);
              setProfile({ id: session?.id || "", email: session?.email || "", name: session?.name || "", role: "recruiter", isProfileComplete: false });
            }}>
              Continue with defaults
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-sm text-center p-6">
          <Shield className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <CardTitle className="mb-2">Login Required</CardTitle>
          <CardDescription>Please log in to access your profile.</CardDescription>
          <div className="flex gap-2 mt-4 justify-center">
            <Button variant="outline" onClick={() => refreshSession()}>Refresh</Button>
            <Button onClick={() => (window.location.href = "/login")}>Go to Login</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-sm text-center p-6">
          <CardTitle className="mb-2">Profile Error</CardTitle>
          <CardDescription>{error || "Failed to load profile."}</CardDescription>
          <Button className="mt-4" onClick={fetchProfile}>Retry</Button>
        </Card>
      </div>
    );
  }

  const profileSrc = profileImageFile ? URL.createObjectURL(profileImageFile) : profile.profileImage || null;
  const logoSrc = companyLogoFile ? URL.createObjectURL(companyLogoFile) : profile.companyLogo || null;
  const scoreColor = completionFields.score >= 80 ? "text-emerald-600" : completionFields.score >= 50 ? "text-amber-600" : "text-rose-600";
  const incomplete = completionFields.items.filter((i) => !i.done);

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1),_transparent_60%)]" />
        <div className="relative p-6 flex items-center gap-6 flex-wrap">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-24 w-24 rounded-2xl border-3 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center">
              {profileSrc ? (
                <Image src={profileSrc} alt="Profile" width={96} height={96} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-3xl font-bold">
                  {profile.name?.slice(0, 2).toUpperCase() || "R"}
                </span>
              )}
            </div>
            <label className="absolute -bottom-1.5 -right-1.5 h-8 w-8 rounded-full bg-white shadow flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
              <Camera className="h-4 w-4 text-violet-700" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setProfileImageFile(e.target.files[0])} />
            </label>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">{profile.name || "Complete Your Profile"}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <span className="text-white/70 text-sm flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />{profile.email}
              </span>
              {profile.companyName && (
                <span className="text-white/70 text-sm flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />{profile.companyName}
                </span>
              )}
              {profile.businessLocation && (
                <span className="text-white/70 text-sm flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />{profile.businessLocation}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-3">
              {profile.isProfileComplete ? (
                <Badge className="bg-emerald-500/30 text-emerald-100 border-emerald-400/30 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />Profile Complete
                </Badge>
              ) : (
                <Badge className="bg-amber-500/30 text-amber-100 border-amber-400/30 text-xs">
                  <Clock className="h-3 w-3 mr-1" />Profile Incomplete
                </Badge>
              )}
              {profile.lastManualUpdate && (
                <span className="text-white/50 text-xs">
                  Last updated {new Date(profile.lastManualUpdate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Completion ring */}
          <div className="shrink-0 bg-white/10 rounded-2xl p-4 text-center min-w-[100px]">
            <p className={`text-3xl font-bold text-white`}>{completionFields.score}%</p>
            <p className="text-white/70 text-xs mt-0.5">Profile complete</p>
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${completionFields.score}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="space-y-4">
          {/* Completion checklist */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Profile Completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <SkillBar label={`${completionFields.score}% complete (${completionFields.items.filter(i => i.done).length}/${completionFields.items.length})`} value={completionFields.score} color={completionFields.score >= 70 ? "#16a34a" : completionFields.score >= 40 ? "#f59e0b" : "#ef4444"} />
              </div>
              <div className="space-y-1.5 mt-2">
                {completionFields.items.map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    {done ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Info Preview */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Public Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {/* Company logo preview */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {logoSrc ? (
                    <Image src={logoSrc} alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{profile.companyName || "Your Company"}</p>
                  <p className="text-xs text-muted-foreground">{profile.businessLocation || "Location not set"}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-violet-600 hover:underline text-xs truncate">
                    <Globe className="h-3.5 w-3.5 shrink-0" />{profile.website}
                  </a>
                )}
                {profile.linkedinUrl && (
                  <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline text-xs truncate">
                    <Linkedin className="h-3.5 w-3.5 shrink-0" />LinkedIn
                  </a>
                )}
                {profile.twitterUrl && (
                  <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sky-500 hover:underline text-xs truncate">
                    <Twitter className="h-3.5 w-3.5 shrink-0" />Twitter / X
                  </a>
                )}
                {!profile.website && !profile.linkedinUrl && !profile.twitterUrl && (
                  <p className="text-xs text-muted-foreground">No links added yet</p>
                )}
              </div>

              {profile.professionalSummary && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground line-clamp-4">{profile.professionalSummary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggestions */}
          {incomplete.length > 0 && (
            <Card className="border border-amber-200 bg-amber-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-amber-700">Missing Fields</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1">
                  {incomplete.slice(0, 5).map(({ label }) => (
                    <li key={label} className="text-xs text-amber-700 flex items-center gap-1.5">
                      <div className="h-1 w-1 rounded-full bg-amber-500" />
                      {label}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right — Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleProfileUpdate}>
            <Tabs defaultValue="personal" className="space-y-4">
              <TabsList className="h-10 bg-muted p-1 rounded-xl gap-1 w-full grid grid-cols-4">
                <TabsTrigger value="personal" className="text-xs rounded-lg">
                  <User className="h-3.5 w-3.5 mr-1.5" />Personal
                </TabsTrigger>
                <TabsTrigger value="company" className="text-xs rounded-lg">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />Company
                </TabsTrigger>
                <TabsTrigger value="online" className="text-xs rounded-lg">
                  <Globe className="h-3.5 w-3.5 mr-1.5" />Online
                </TabsTrigger>
                <TabsTrigger value="summary" className="text-xs rounded-lg">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />Summary
                </TabsTrigger>
              </TabsList>

              {/* ── Personal Tab ── */}
              <TabsContent value="personal">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-5 w-5 text-violet-600" />Personal Information
                    </CardTitle>
                    <CardDescription>Your basic contact and identification details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-sm font-medium">
                          Full Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={profile.name || ""}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          placeholder="Your full name"
                          className={validationErrors.name ? "border-rose-400 focus-visible:ring-rose-300" : ""}
                        />
                        <FieldError msg={validationErrors.name} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email Address <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={profile.email}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            placeholder="you@company.com"
                            className={`pl-9 ${validationErrors.email ? "border-rose-400" : ""}`}
                          />
                        </div>
                        <FieldError msg={validationErrors.email} />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            value={profile.phone || ""}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            placeholder="+1 (555) 123-4567"
                            className={`pl-9 ${validationErrors.phone ? "border-rose-400" : ""}`}
                          />
                        </div>
                        <FieldError msg={validationErrors.phone} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="address" className="text-sm font-medium">Personal Address</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="address"
                            value={profile.address || ""}
                            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                            placeholder="City, State, Country"
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Company Tab ── */}
              <TabsContent value="company">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-5 w-5 text-violet-600" />Company Branding
                    </CardTitle>
                    <CardDescription>Showcase your company's identity to candidates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Logo + Name row */}
                    <div className="flex items-start gap-5">
                      <div className="shrink-0">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Company Logo</p>
                        <div className="relative">
                          <div className="h-20 w-20 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted overflow-hidden flex items-center justify-center">
                            {logoSrc ? (
                              <Image src={logoSrc} alt="Logo" width={80} height={80} className="w-full h-full object-contain" />
                            ) : (
                              <Building2 className="h-7 w-7 text-muted-foreground/50" />
                            )}
                          </div>
                          <label className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-violet-600 shadow flex items-center justify-center cursor-pointer hover:bg-violet-700 transition-colors">
                            <Camera className="h-3.5 w-3.5 text-white" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setCompanyLogoFile(e.target.files[0])} />
                          </label>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="companyName" className="text-sm font-medium">
                          Company Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="companyName"
                          value={profile.companyName || ""}
                          onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                          placeholder="Your Company Name"
                          className={validationErrors.companyName ? "border-rose-400" : ""}
                        />
                        <FieldError msg={validationErrors.companyName} />
                        <div className="space-y-1.5 pt-2">
                          <Label htmlFor="businessLocation" className="text-sm font-medium">Business Location</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="businessLocation"
                              value={profile.businessLocation || ""}
                              onChange={(e) => setProfile({ ...profile, businessLocation: e.target.value })}
                              placeholder="City, State, Country"
                              className="pl-9"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="companyDescription" className="text-sm font-medium">Company Description</Label>
                        <span className="text-xs text-muted-foreground">{profile.companyDescription?.length || 0}/1000</span>
                      </div>
                      <Textarea
                        id="companyDescription"
                        value={profile.companyDescription || ""}
                        onChange={(e) => setProfile({ ...profile, companyDescription: e.target.value })}
                        placeholder="Describe your company's mission, culture, and what makes it a great place to work..."
                        className={`min-h-[120px] resize-none ${validationErrors.companyDescription ? "border-rose-400" : ""}`}
                      />
                      <FieldError msg={validationErrors.companyDescription} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Online Tab ── */}
              <TabsContent value="online">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Globe className="h-5 w-5 text-violet-600" />Online Presence
                    </CardTitle>
                    <CardDescription>Your web footprint — shown on your public recruiter profile</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="website" className="text-sm font-medium flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />Company Website
                      </Label>
                      <Input
                        id="website"
                        value={profile.website || ""}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        placeholder="https://www.yourcompany.com"
                        className={validationErrors.website ? "border-rose-400" : ""}
                      />
                      <FieldError msg={validationErrors.website} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="linkedinUrl" className="text-sm font-medium flex items-center gap-1.5">
                        <Linkedin className="h-3.5 w-3.5 text-blue-600" />LinkedIn Profile
                      </Label>
                      <Input
                        id="linkedinUrl"
                        value={profile.linkedinUrl || ""}
                        onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                        placeholder="https://linkedin.com/in/yourprofile"
                        className={validationErrors.linkedinUrl ? "border-rose-400" : ""}
                      />
                      <FieldError msg={validationErrors.linkedinUrl} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="twitterUrl" className="text-sm font-medium flex items-center gap-1.5">
                        <Twitter className="h-3.5 w-3.5 text-sky-500" />Twitter / X Profile
                      </Label>
                      <Input
                        id="twitterUrl"
                        value={profile.twitterUrl || ""}
                        onChange={(e) => setProfile({ ...profile, twitterUrl: e.target.value })}
                        placeholder="https://twitter.com/yourhandle"
                        className={validationErrors.twitterUrl ? "border-rose-400" : ""}
                      />
                      <FieldError msg={validationErrors.twitterUrl} />
                    </div>

                    {/* Preview */}
                    {(profile.website || profile.linkedinUrl || profile.twitterUrl) && (
                      <div className="pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.website && (
                            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors">
                              <Globe className="h-3 w-3" />Website
                            </a>
                          )}
                          {profile.linkedinUrl && (
                            <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                              <Linkedin className="h-3 w-3" />LinkedIn
                            </a>
                          )}
                          {profile.twitterUrl && (
                            <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors">
                              <Twitter className="h-3 w-3" />Twitter
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Summary Tab ── */}
              <TabsContent value="summary">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-5 w-5 text-violet-600" />Professional Summary
                    </CardTitle>
                    <CardDescription>Tell candidates about your background and recruiting philosophy</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="professionalSummary" className="text-sm font-medium">About You</Label>
                        <span className="text-xs text-muted-foreground">{profile.professionalSummary?.length || 0}/1500</span>
                      </div>
                      <Textarea
                        id="professionalSummary"
                        value={profile.professionalSummary || ""}
                        onChange={(e) => setProfile({ ...profile, professionalSummary: e.target.value })}
                        placeholder="e.g. I'm a senior tech recruiter with 8+ years placing engineers at top startups. I specialise in full-stack and ML roles and believe in honest, fast communication with every candidate..."
                        className={`min-h-[180px] resize-none ${validationErrors.professionalSummary ? "border-rose-400" : ""}`}
                      />
                      <FieldError msg={validationErrors.professionalSummary} />
                    </div>

                    {/* Writing tips */}
                    <div className="rounded-xl bg-violet-50 p-4 space-y-2">
                      <p className="text-xs font-semibold text-violet-700">Tips for a great summary</p>
                      <ul className="space-y-1">
                        {[
                          "Mention years of experience and your specialisation",
                          "Highlight industries or roles you recruit for",
                          "Describe your communication style and values",
                          "Add a call-to-action (e.g. 'Let's connect!')",
                        ].map((tip) => (
                          <li key={tip} className="text-xs text-violet-700/80 flex items-start gap-1.5">
                            <div className="h-1 w-1 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {completionFields.score < 100
                  ? `${incomplete.length} field${incomplete.length !== 1 ? "s" : ""} still missing`
                  : "All fields complete!"}
              </p>
              <Button
                type="submit"
                disabled={updatingProfile}
                className="bg-violet-600 hover:bg-violet-700 px-6"
              >
                {updatingProfile ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" />Save Profile</>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
