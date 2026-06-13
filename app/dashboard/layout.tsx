"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { useSession } from "@/hooks/use-session";
import {
  Loader2, PlusCircle, Upload, Briefcase, ListChecks,
  LogOut, Settings, Search, LayoutDashboard, Command,
} from "lucide-react";
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
    if (!isLoading && !session) router.push("/login");
  }, [session, isLoading, router]);

  // Force light theme on all dashboard pages
  useEffect(() => {
    try {
      const apply = () => {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
        document.body.style.backgroundColor = "#ffffff";
        document.body.classList.remove("dark");
      };
      apply();
      const id = setTimeout(apply, 0);
      return () => clearTimeout(id);
    } catch {}
  }, [pathname]);

  // Track recent pages for search suggestions
  useEffect(() => {
    try {
      const key = "recent:pages";
      const arr: { url: string; ts: number }[] = (() => {
        try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
      })();
      const url = pathname || "/dashboard";
      const filtered = arr.filter((i) => i.url !== url);
      filtered.unshift({ url, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(filtered.slice(0, 30)));
    } catch {}
  }, [pathname]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("auth-token");
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (res.ok) {
        toast({ title: "Logged out", description: "You have been successfully logged out." });
        window.location.href = "/login";
      } else {
        const data = await res.json();
        toast({ title: "Logout Error", description: data.message || "Logout failed.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error during logout.", variant: "destructive" });
    }
  };

  // Build breadcrumbs — skip the "dashboard" root segment (shown as hardcoded first item)
  const getBreadcrumbs = () => {
    const segments = (pathname ?? "/")
      .split("/")
      .filter((s) => s !== "" && s !== "dashboard");

    return segments.map((segment, index) => {
      const href = "/dashboard/" + segments.slice(0, index + 1).join("/");
      const isLast = index === segments.length - 1;
      const label = segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      return (
        <React.Fragment key={href}>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {isLast ? (
              <BreadcrumbPage className="font-medium text-foreground">{label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink href={href} className="text-muted-foreground hover:text-foreground transition-colors">{label}</BreadcrumbLink>
            )}
          </BreadcrumbItem>
        </React.Fragment>
      );
    });
  };

  // User initials for avatar
  const initials = (() => {
    if (session?.name) {
      const parts = session.name.trim().split(" ");
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0][0].toUpperCase();
    }
    return (session?.email?.[0] ?? "U").toUpperCase();
  })();

  const roleLabel: Record<string, string> = {
    job_seeker: "Job Seeker",
    recruiter: "Recruiter",
    admin: "Admin",
    college: "College",
    college_admin: "College Admin",
  };

  const dashboardHome = (() => {
    const role = session?.role ?? session?.user?.role
    if (role === "recruiter") return "/dashboard/recruiter"
    if (role === "job_seeker") return "/dashboard/job-seeker"
    if (role === "admin") return "/dashboard/admin"
    if (role === "college" || role === "college_admin") return "/dashboard/college"
    return "/dashboard"
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-white">
        <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
      </div>
    );
  }

  // Full-screen override for test-taking pages (no sidebar, no header)
  if (
    (pathname?.startsWith("/dashboard/job-seeker/tests/") && pathname !== "/dashboard/job-seeker/tests") ||
    (pathname?.startsWith("/dashboard/job-seeker/assessments/") && pathname?.includes("/take"))
  ) {
    return <main className="min-h-screen bg-gray-950 text-white overflow-hidden">{children}</main>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="dashboard-shell text-gray-900">
        <CommandPalette />

        {/* ── Top header bar ── */}
        <header className="dashboard-glass-header sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 px-4">

          {/* Left: trigger + breadcrumbs */}
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap text-sm">
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={dashboardHome}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {getBreadcrumbs()}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Role pill — desktop */}
          {session.role && (
            <span className="hidden xl:inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700 ring-1 ring-violet-100">
              {roleLabel[session.role] ?? session.role}
            </span>
          )}

          {/* Right: search + actions + notifications + avatar */}
          <div className="ml-auto flex items-center gap-2">

            {/* Command palette hint */}
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:flex h-8 gap-1.5 text-xs text-muted-foreground border-slate-200 bg-slate-50/80"
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
              }}
            >
              <Command className="h-3 w-3" />
              Quick nav
              <kbd className="ml-1 rounded border border-slate-200 bg-white px-1 py-0.5 text-[9px] font-mono">⌘K</kbd>
            </Button>

            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    router.push(`/dashboard/search?query=${encodeURIComponent(query.trim())}`);
                  }
                }}
                placeholder="Search..."
                className="h-8 w-52 pl-8 text-sm bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>

            {/* New — role-aware quick actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs font-medium">New</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {session.role === "recruiter" && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Recruiter Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/recruiter/job-descriptions/create")}>
                      <Briefcase className="mr-2 h-4 w-4 text-violet-500" /> New Job Description
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/recruiter/tests")}>
                      <ListChecks className="mr-2 h-4 w-4 text-violet-500" /> Create Test
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/recruiter/candidates")}>
                      <Search className="mr-2 h-4 w-4 text-violet-500" /> Find Candidates
                    </DropdownMenuItem>
                  </>
                )}
                {session.role === "job_seeker" && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Quick Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/job-seeker/upload")}>
                      <Upload className="mr-2 h-4 w-4 text-violet-500" /> Upload Resume
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/jobs")}>
                      <Briefcase className="mr-2 h-4 w-4 text-violet-500" /> Browse Jobs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/job-seeker/mock-interview")}>
                      <ListChecks className="mr-2 h-4 w-4 text-violet-500" /> Mock Interview
                    </DropdownMenuItem>
                  </>
                )}
                {session.role === "admin" && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Admin Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/admin/users?new=1")}>
                      <PlusCircle className="mr-2 h-4 w-4 text-violet-500" /> New User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                      <Settings className="mr-2 h-4 w-4 text-violet-500" /> Settings
                    </DropdownMenuItem>
                  </>
                )}
                {(session.role === "college" || session.role === "college_admin") && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">College Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/college/students")}>
                      <PlusCircle className="mr-2 h-4 w-4 text-violet-500" /> Onboard Student
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/college/campus-drives")}>
                      <Briefcase className="mr-2 h-4 w-4 text-violet-500" /> New Campus Drive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/college/partnerships")}>
                      <Search className="mr-2 h-4 w-4 text-violet-500" /> Invite Recruiter
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <NotificationBell />

            {/* User avatar + menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold ring-2 ring-transparent hover:ring-violet-200 transition-all focus:outline-none">
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="pb-1">
                  <p className="text-sm font-semibold truncate">{session.name || session.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{session.email}</p>
                  {session.role && (
                    <span className="mt-1 inline-block text-[10px] bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 font-medium">
                      {roleLabel[session.role] ?? session.role}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </header>

        <main className="flex flex-1 flex-col">
          {children}
        </main>

        <style jsx global>{`
          html, body { background-color: #f8fafc !important; color: #111827; }
        `}</style>
      </SidebarInset>
    </SidebarProvider>
  );
}
