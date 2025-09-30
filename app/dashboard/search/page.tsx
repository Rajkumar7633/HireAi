"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { navigationByRole, type Role } from "@/config/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function DashboardSearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const query = (params.get("query") || "").trim();
  const { session } = useSession();

  const role: Role | undefined = session?.role as Role | undefined;
  const items = role ? navigationByRole[role] : [];
  const [recents, setRecents] = useState<{ url: string; title?: string }[]>([]);

  const flattened = useMemo(() => {
    const out: { title: string; url: string }[] = [];
    for (const item of items) {
      if (item.url && item.url !== "#") out.push({ title: item.title, url: item.url });
      if (item.items) {
        for (const s of item.items) out.push({ title: `${item.title} • ${s.title}`, url: s.url });
      }
    }
    return out;
  }, [items]);

  useEffect(() => {
    try {
      const key = "recent:pages";
      const raw = localStorage.getItem(key);
      const arr: { url: string; ts: number }[] = raw ? JSON.parse(raw) : [];
      const map = new Map(flattened.map((i) => [i.url, i.title] as const));
      // Show only dashboard pages and dedupe
      const seen = new Set<string>();
      const recentMapped = arr
        .filter((r) => r.url.startsWith("/dashboard"))
        .filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)))
        .slice(0, 12)
        .map((r) => ({ url: r.url, title: map.get(r.url) }));
      setRecents(recentMapped);
    } catch {}
  }, [flattened]);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return flattened.slice(0, 30);
    return flattened.filter((i) => i.title.toLowerCase().includes(q) || i.url.toLowerCase().includes(q)).slice(0, 50);
  }, [flattened, query]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Find destinations across your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              defaultValue={query}
              placeholder="Search destinations..."
              className="h-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const value = (e.currentTarget as HTMLInputElement).value.trim();
                  router.replace(`/dashboard/search?query=${encodeURIComponent(value)}`);
                }
              }}
            />
            <Button
              className="hidden md:inline-flex"
              onClick={() => {
                const input = (document.activeElement as HTMLInputElement) || null;
                const value = input?.value ?? query;
                router.replace(`/dashboard/search?query=${encodeURIComponent((value || "").trim())}`);
              }}
            >
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {!query && recents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent</CardTitle>
            <CardDescription>Your latest pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recents.map((r, idx) => (
                <Link key={`${r.url}-${idx}`} href={r.url} className="px-3 py-1.5 rounded-md border hover:bg-muted text-sm">
                  {r.title || r.url}
                </Link>
              ))}
            </div>
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStorage.removeItem("recent:pages");
                  setRecents([]);
                }}
              >
                Clear Recents
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {query ? `Showing matches for "${query}"` : "Recent & suggested"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results found.</p>
          ) : (
            <ul className="grid md:grid-cols-2 gap-2">
              {results.map((r, idx) => (
                <li key={`${r.url}-${idx}`}>
                  <Link href={r.url} className="block px-3 py-2 rounded-md border hover:bg-muted">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.url}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
