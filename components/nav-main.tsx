"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

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
import { useSocialRealtime } from "@/hooks/use-social-realtime";

type NavItemShape = {
  title: string;
  url: string;
  icon?: LucideIcon;
  section?: string;
  items?: { title: string; url: string }[];
};

type Section = {
  label?: string;
  items: NavItemShape[];
};

function groupBySection(items: NavItemShape[]): Section[] {
  const sections: Section[] = [];
  for (const item of items) {
    if (item.section) {
      sections.push({ label: item.section, items: [item] });
    } else if (sections.length === 0) {
      sections.push({ label: undefined, items: [item] });
    } else {
      sections[sections.length - 1].items.push(item);
    }
  }
  return sections;
}

export function NavMain({ items }: { items: NavItemShape[] }) {
  const pathname = usePathname() || "";
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = async () => {
    try {
      const res = await fetch("/api/social/connections", { cache: "no-store" });
      if (!res.ok) return;
      const j = await res.json();
      setPendingCount(Array.isArray(j?.pending) ? j.pending.length : 0);
    } catch {}
  };

  useEffect(() => { refreshPending(); }, []);
  useSocialRealtime({ onConnection: () => refreshPending() });

  const isActive = (url?: string) =>
    !!url && url !== "#" && (pathname === url || pathname.startsWith(`${url}/`));

  const sections = groupBySection(items);

  return (
    <>
      {sections.map((section, si) => (
        <SidebarGroup key={section.label ?? `s${si}`} className="px-2 py-1">
          {section.label && (
            <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 select-none">
              {section.label}
            </SidebarGroupLabel>
          )}
          <SidebarMenu className="gap-0.5">
            {section.items.map((item) => {
              const subActive = item.items?.some((s) => isActive(s.url));
              const active = isActive(item.url) || subActive;

              return (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <Collapsible
                      asChild
                      defaultOpen={subActive}
                      className="group/collapsible"
                    >
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={active}
                            className={[
                              "h-9 rounded-lg text-sm font-medium transition-all duration-150",
                              active
                                ? "bg-violet-50 text-violet-700 font-semibold"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                            ].join(" ")}
                          >
                            {item.icon && (
                              <item.icon
                                className={[
                                  "h-4 w-4 shrink-0",
                                  active ? "text-violet-600" : "text-slate-400",
                                ].join(" ")}
                              />
                            )}
                            <span className="flex-1 truncate">{item.title}</span>
                            <ChevronRight
                              className={[
                                "ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                                active ? "text-violet-500" : "text-slate-300",
                                "group-data-[state=open]/collapsible:rotate-90",
                              ].join(" ")}
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <SidebarMenuSub className="ml-4 border-l border-slate-100 pl-3 py-0.5 gap-0">
                            {item.items.map((sub) => {
                              const subIsActive = isActive(sub.url);
                              return (
                                <SidebarMenuSubItem key={sub.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={subIsActive}
                                    className={[
                                      "h-8 rounded-md text-[13px] transition-all duration-150",
                                      subIsActive
                                        ? "bg-violet-50 text-violet-700 font-semibold"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                                    ].join(" ")}
                                  >
                                    <Link href={sub.url} className="flex items-center gap-2 w-full px-2 py-1.5">
                                      {subIsActive && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-violet-600 shrink-0" />
                                      )}
                                      <span className="truncate">{sub.title}</span>
                                      {sub.title === "Requests" && pendingCount > 0 && (
                                        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-violet-600 text-white">
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
                      className={[
                        "h-9 rounded-lg text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-violet-50 text-violet-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      ].join(" ")}
                    >
                      <Link href={item.url} className="flex items-center gap-2 w-full">
                        {item.icon && (
                          <item.icon
                            className={[
                              "h-4 w-4 shrink-0",
                              active ? "text-violet-600" : "text-slate-400",
                            ].join(" ")}
                          />
                        )}
                        <span className="flex-1 truncate">{item.title}</span>
                        {active && (
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-600 shrink-0" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
