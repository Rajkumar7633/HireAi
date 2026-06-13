"use client";

import type * as React from "react";
import { Sparkles } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useSession } from "@/hooks/use-session";
import { navigationByRole } from "@/config/navigation";

const ROLE_LABEL: Record<string, string> = {
  job_seeker:    "Job Seeker",
  recruiter:     "Recruiter",
  admin:         "Admin",
  college:       "College",
  college_admin: "College Admin",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session } = useSession();

  const navItems = session
    ? (navigationByRole[session.role as keyof typeof navigationByRole] ?? [])
    : [];

  const roleLabel = session ? (ROLE_LABEL[session.role] ?? session.role) : "";

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-slate-100">
      {/* ── Brand header ── */}
      <SidebarHeader className="px-0 pb-0 bg-gradient-to-b from-violet-50/80 to-transparent">
        <div className="flex items-center gap-3 px-4 py-4">
          {/* Logo mark */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          {/* App name + role */}
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-[15px] font-bold leading-none tracking-tight text-slate-900">
              HireAI
            </span>
            <span className="mt-0.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              {roleLabel} Platform
            </span>
          </div>
        </div>
        <SidebarSeparator className="mx-0" />
      </SidebarHeader>

      {/* ── Nav items ── */}
      <SidebarContent className="pt-2 pb-2 overflow-y-auto">
        <NavMain items={navItems} />
      </SidebarContent>

      {/* ── User footer ── */}
      <SidebarFooter className="border-t border-slate-100 p-2">
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
