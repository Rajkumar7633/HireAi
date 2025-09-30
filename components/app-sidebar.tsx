"use client";

import type * as React from "react";
import { Bot } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useSession } from "@/hooks/use-session";
import { navigationByRole } from "@/config/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session } = useSession();

  const getNavItems = () => {
    if (!session) return [];
    const role = session.role as keyof typeof navigationByRole;
    return navigationByRole[role] ?? [];
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Bot className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-lg">HireAI</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getNavItems()} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={session} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
