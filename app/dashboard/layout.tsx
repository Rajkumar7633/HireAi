"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { useSession } from "@/hooks/use-session";
import { Loader2, PlusCircle, ListChecks, Upload, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User2, LogOut, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/notification-bell";
import { CommandPalette } from "@/components/command-palette";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");

  useEffect(() => {
    if (!isLoading && !session) {
      console.log("No user session found, redirecting to login");
      router.push("/login");
    }
  }, [session, isLoading, router]);

  // Force light theme on all dashboard pages (also on route changes)
  useEffect(() => {
    try {
      const applyLight = () => {
        const root = document.documentElement;
        root.classList.remove("dark");
        root.setAttribute("data-theme", "light");
        document.body.style.backgroundColor = "#ffffff";
        document.body.classList.remove("dark");
      };
      applyLight();
      const id = setTimeout(applyLight, 0); // run once more after layout paint
      return () => clearTimeout(id);
    } catch {}
  }, [pathname]);

  // Track recent pages for search suggestions
  useEffect(() => {
    try {
      const key = "recent:pages";
      const raw = localStorage.getItem(key);
      const arr: { url: string; ts: number }[] = raw ? JSON.parse(raw) : [];
      const now = Date.now();
      const url = pathname || "/dashboard";
      const filtered = arr.filter((i) => i.url !== url);
      filtered.unshift({ url, ts: now });
      const trimmed = filtered.slice(0, 30);
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (e) {
      // ignore
    }
  }, [pathname]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("auth-token");

      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });
        window.location.href = "/login";
      } else {
        const data = await res.json();
        toast({
          title: "Logout Error",
          description: data.message || "Logout failed.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Network error during logout.",
        variant: "destructive",
      });
    }
  };

  const getBreadcrumbs = () => {
    const pathSegments = pathname
      .split("/")
      .filter((segment) => segment !== "");
    const breadcrumbs = pathSegments.map((segment, index) => {
      const href = "/" + pathSegments.slice(0, index + 1).join("/");
      const isLast = index === pathSegments.length - 1;
      const displaySegment = segment
        .replace(/-/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      if (isLast) {
        return (
          <BreadcrumbItem key={href}>
            <BreadcrumbPage>{displaySegment}</BreadcrumbPage>
          </BreadcrumbItem>
        );
      } else {
        return (
          <React.Fragment key={href}>
            <BreadcrumbItem>
              <BreadcrumbLink href={href}>{displaySegment}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </React.Fragment>
        );
      }
    });
    return breadcrumbs;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Hide navigation for secure assessment taking experience
  const isSecureAssessmentTake =
    pathname?.startsWith("/dashboard/job-seeker/assessments/") &&
    pathname?.includes("/take");

  if (isSecureAssessmentTake) {
    // Render content only, no sidebar/header/breadcrumbs
    return (
      <main className="min-h-screen bg-black text-white">
        {children}
      </main>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-white text-gray-900">
        <CommandPalette />
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              {getBreadcrumbs()}
            </BreadcrumbList>
          </Breadcrumb>
          {/* Header search */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:block">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = query.trim();
                    if (q.length > 0) {
                      router.push(`/dashboard/search?query=${encodeURIComponent(q)}`);
                    }
                  }
                }}
                placeholder="Search..."
                className="h-8 w-56"
              />
            </div>
            {/* Role-based quick actions */}
            {session?.role === "recruiter" && (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/recruiter/job-descriptions") }>
                  <PlusCircle className="mr-2 h-4 w-4" /> Jobs
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/recruiter/tests") }>
                  <ListChecks className="mr-2 h-4 w-4" /> Tests
                </Button>
              </div>
            )}
            {session?.role === "job_seeker" && (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/job-seeker/upload") }>
                  <Upload className="mr-2 h-4 w-4" /> Upload
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/jobs") }>
                  <Briefcase className="mr-2 h-4 w-4" /> Jobs
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* New quick action menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">New</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {session?.role === "recruiter" && (
                  <>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/recruiter/job-descriptions?new=1")}>New Job Description</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/recruiter/tests")}>Assign Test</DropdownMenuItem>
                  </>
                )}
                {session?.role === "job_seeker" && (
                  <>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/job-seeker/upload")}>Upload Resume</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/job-seeker/assessments")}>Start Assessment</DropdownMenuItem>
                  </>
                )}
                {session?.role === "admin" && (
                  <>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/admin/users?new=1")}>New User</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>Settings</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User2 className="h-5 w-5" />
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{session.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/settings")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-white">
          {children}
        </main>
        {/* Global light overrides to avoid unexpected dark backgrounds from nested components */}
        <style jsx global>{`
          html, body { background-color: #ffffff !important; color: #111827; }
        `}</style>
      </SidebarInset>
    </SidebarProvider>
  );
}
