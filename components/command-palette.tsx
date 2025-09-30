"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { navigationByRole, type Role, type NavItem } from "@/config/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

function flattenItems(items: NavItem[]): { title: string; url: string }[] {
  const out: { title: string; url: string }[] = [];
  for (const item of items) {
    if (item.url && item.url !== "#") out.push({ title: item.title, url: item.url });
    if (item.items) {
      for (const s of item.items) out.push({ title: `${item.title} • ${s.title}`, url: s.url });
    }
  }
  return out;
}

export function CommandPalette() {
  const router = useRouter();
  const { session } = useSession();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);
  const [recents, setRecents] = React.useState<{ title?: string; url: string }[]>([]);

  const role: Role | undefined = session?.role as Role | undefined;
  const items = React.useMemo(() => (role ? flattenItems(navigationByRole[role]) : []), [role]);

  // Load recent pages from localStorage when palette opens
  React.useEffect(() => {
    if (!open) return;
    try {
      const key = "recent:pages";
      const raw = localStorage.getItem(key);
      const arr: { url: string; ts: number }[] = raw ? JSON.parse(raw) : [];
      // Map URLs to titles if we can match from nav items
      const map = new Map(items.map((i) => [i.url, i.title] as const));
      const recentMapped = arr
        .filter((r) => r.url.startsWith("/dashboard"))
        .map((r) => ({ url: r.url, title: map.get(r.url) }))
        .slice(0, 10);
      setRecents(recentMapped);
    } catch (e) {
      setRecents([]);
    }
  }, [open, items]);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) {
      // Build a combined list: recents first, then suggestions, de-duped
      const seen = new Set<string>();
      const recentList = recents.filter((r) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });
      const suggestions = items.filter((i) => {
        if (seen.has(i.url)) return false;
        seen.add(i.url);
        return true;
      });
      return { label: "Recent", recentList, suggestions: suggestions.slice(0, 20) };
    }
    const matches = items
      .filter((i) => i.title.toLowerCase().includes(query) || i.url.toLowerCase().includes(query))
      .slice(0, 50);
    return { label: "Results", recentList: [], suggestions: matches };
  }, [q, items, recents]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    setHighlight(0);
  }, [q, open]);

  const onEnter = () => {
    const list = [...filtered.recentList, ...filtered.suggestions];
    const pick = list[highlight];
    if (pick) {
      setOpen(false);
      router.push(pick.url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 overflow-hidden sm:max-w-lg">
        <div className="flex items-center gap-2 border-b p-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Type a command or search... (Cmd/Ctrl+K)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEnter();
              else if (e.key === "ArrowDown")
                setHighlight((h) => {
                  const listLen = filtered.recentList.length + filtered.suggestions.length;
                  return Math.min(h + 1, Math.max(listLen - 1, 0));
                });
              else if (e.key === "ArrowUp") setHighlight((h) => Math.max(h - 1, 0));
            }}
            className="h-10"
          />
        </div>
        <ScrollArea className="max-h-80">
          <ul className="p-2">
            {filtered.recentList.length === 0 && filtered.suggestions.length === 0 && (
              <li className="px-2 py-3 text-sm text-muted-foreground">No results</li>
            )}
            {filtered.recentList.length > 0 && (
              <li className="px-2 py-1 text-xs text-muted-foreground">Recent</li>
            )}
            {[...filtered.recentList, ...filtered.suggestions].map((item, idx) => (
              <li key={`${item.url}-${idx}`}>
                <Button
                  variant={idx === highlight ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => {
                    setOpen(false);
                    router.push(item.url);
                  }}
                >
                  {item.title || item.url}
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
