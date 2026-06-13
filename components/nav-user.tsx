"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogOut, Settings, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/use-session";

const ROLE_LABEL: Record<string, string> = {
  job_seeker:    "Job Seeker",
  recruiter:     "Recruiter",
  admin:         "Admin",
  college:       "College",
  college_admin: "College Admin",
};

/** Deterministic background color from string */
const AVATAR_COLORS = [
  "from-violet-500 to-violet-700",
  "from-sky-500 to-sky-700",
  "from-emerald-500 to-emerald-700",
  "from-amber-500 to-amber-700",
  "from-rose-500 to-rose-700",
  "from-indigo-500 to-indigo-700",
];
function avatarGradient(seed: string) {
  const n = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function getInitials(name?: string, email?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function NavUser() {
  const { isMobile } = useSidebar();
  const { session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      localStorage.removeItem("auth-token");
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (res.ok) {
        toast({ title: "Signed out", description: "You have been successfully signed out." });
        window.location.href = "/login";
      } else {
        throw new Error("Logout failed");
      }
    } catch {
      toast({ title: "Error", description: "Failed to sign out. Please try again.", variant: "destructive" });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!session) return null;

  const initials = getInitials(session.name, session.email);
  const gradient = avatarGradient(session.email || session.name || "user");
  const roleLabel = ROLE_LABEL[session.role] ?? session.role;
  const displayName = session.name || session.email || "User";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-12 rounded-lg hover:bg-slate-100 data-[state=open]:bg-slate-100 transition-colors"
            >
              {/* Avatar */}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white text-xs font-bold shadow-sm`}>
                {initials}
              </div>

              {/* Name + role */}
              <div className="flex flex-1 flex-col text-left overflow-hidden">
                <span className="truncate text-sm font-semibold leading-tight text-slate-900">
                  {displayName}
                </span>
                <span className="truncate text-[11px] text-slate-400 capitalize">
                  {roleLabel}
                </span>
              </div>

              <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl shadow-lg border-slate-100"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={6}
          >
            {/* User info header */}
            <DropdownMenuLabel className="p-0">
              <div className="flex items-center gap-3 px-3 py-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white text-sm font-bold shadow-sm`}>
                  {initials}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-semibold text-slate-900">{displayName}</span>
                  <span className="truncate text-xs text-slate-500">{session.email}</span>
                  <span className="mt-0.5 inline-block w-fit text-[10px] bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 font-medium">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => router.push("/dashboard/settings")}
                className="gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              <span>{isLoggingOut ? "Signing out…" : "Sign out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
