"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { useSocialRealtime } from "@/hooks/use-social-realtime";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const pathname = usePathname() || "";
  const [pendingCount, setPendingCount] = useState<number>(0);

  const refreshPending = async () => {
    try {
      const res = await fetch("/api/social/connections", { cache: "no-store" });
      if (!res.ok) return;
      const j = await res.json();
      const n = Array.isArray(j?.pending) ? j.pending.length : 0;
      setPendingCount(n);
    } catch {}
  };

  useEffect(() => {
    refreshPending();
  }, []);

  useSocialRealtime({
    onConnection: () => {
      refreshPending();
    },
  });

  const isPathActive = (target?: string) =>
    !!target && (pathname === target || pathname.startsWith(`${target}/`));

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const subActive = item.items?.some((s) => isPathActive(s.url));
          const active = isPathActive(item.url) || subActive || item.isActive;

          return (
            <SidebarMenuItem key={item.title}>
              {item.items ? (
                <Collapsible
                  asChild
                  defaultOpen={subActive || item.isActive}
                  className="group/collapsible"
                >
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={active}
                        aria-current={active ? "page" : undefined}
                        className={active ? "ring-1 ring-primary/30 bg-primary/10 text-primary" : ""}
                      >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => {
                          const subIsActive = isPathActive(subItem.url);
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={subIsActive}
                                aria-current={subIsActive ? "page" : undefined}
                                className={subIsActive ? "ring-1 ring-primary/30 bg-primary/10 text-primary" : ""}
                              >
                                <Link href={subItem.url} className="w-full inline-flex items-center gap-2 py-1.5">
                                  <span>{subItem.title}</span>
                                  {subItem.title === "Requests" && pendingCount > 0 && (
                                    <span className="ml-2 inline-flex items-center justify-center px-1.5 min-w-[18px] h-[18px] text-[11px] rounded-full bg-teal-600 text-white">
                                      {pendingCount}
                                    </span>
                                  )}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ) : (
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={active}
                  aria-current={active ? "page" : undefined}
                  className={active ? "ring-1 ring-primary/30 bg-primary/10 text-primary" : ""}
                >
                  <Link href={item.url} className="w-full inline-flex items-center gap-2 py-2">
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
