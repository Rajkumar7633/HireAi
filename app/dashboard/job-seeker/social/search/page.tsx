"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SocialSearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [connections, setConnections] = useState<any>({ pending: [], outgoing: [], accepted: [] });
  const [loading, setLoading] = useState(false);
  const [browse, setBrowse] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [loc, setLoc] = useState("");
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [sort, setSort] = useState("recent");
  const [mutuals, setMutuals] = useState<Record<string, number>>({});
  const [compact, setCompact] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [ioReady, setIoReady] = useState(false);
  const skillSuggestions = [
    "JavaScript","TypeScript","React","Node.js","Next.js","Python","Django","MongoDB","SQL","Tailwind","Java","C++","AWS","Docker","Kubernetes"
  ];

  const pendingMap = useMemo(() => {
    const list = Array.isArray(connections?.pending) ? connections.pending : [];
    return new Set(list.map((c: any) => String(c.requesterId)));
  }, [connections]);

  const outgoingMap = useMemo(() => {
    const list = Array.isArray(connections?.outgoing) ? connections.outgoing : [];
    return new Set(list.map((c: any) => String(c.addresseeId)));
  }, [connections]);

  const acceptedSet = useMemo(() => {
    const s = new Set<string>();
    const list = Array.isArray(connections?.accepted) ? connections.accepted : [];
    for (const c of list) {
      s.add(String(c.requesterId));
      s.add(String(c.addresseeId));
    }
    return s;
  }, [connections]);

  const search = async () => {
    if (!q.trim()) {
      // When query is empty, show directory mode
      setResults([]);
      if (browse.length === 0) await loadBrowse(1, true);
      return;
    }
    setLoading(true);
    try {
      const [resResp, connResp] = await Promise.all([
        fetch(`/api/social/search?query=${encodeURIComponent(q)}`),
        fetch(`/api/social/connections`),
      ]);
      const res = resResp.ok ? await resResp.json() : { items: [] };
      const conn = connResp.ok ? await connResp.json() : { pending: [], outgoing: [], accepted: [] };
      setResults(Array.isArray(res.items) ? res.items : []);
      setConnections({
        pending: Array.isArray(conn.pending) ? conn.pending : [],
        outgoing: Array.isArray(conn.outgoing) ? conn.outgoing : [],
        accepted: Array.isArray(conn.accepted) ? conn.accepted : [],
      });
      // fetch mutuals for search results
      const ids = (Array.isArray(res.items) ? res.items : []).map((r: any) => String(r.userId)).filter(Boolean);
      if (ids.length) {
        const mRes = await fetch(`/api/social/mutuals?ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
        const mj = mRes.ok ? await mRes.json() : { items: [] };
        const map: Record<string, number> = {};
        for (const it of Array.isArray(mj.items) ? mj.items : []) map[String(it.userId)] = Number(it.mutuals || 0);
        setMutuals(map);
      } else setMutuals({});
    } catch {
      setResults([]);
      setConnections({ pending: [], outgoing: [], accepted: [] });
    } finally {
      setLoading(false);
    }
  };

  const loadBrowse = async (nextPage: number, replace = false) => {
    if (loadingBrowse) return;
    setLoadingBrowse(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "12", sort });
      if (loc.trim()) params.set("location", loc.trim());
      if (title.trim()) params.set("title", title.trim());
      if (skills.trim()) params.set("skills", skills.trim());
      const [resResp, connResp] = await Promise.all([
        fetch(`/api/social/browse?${params.toString()}`, { cache: "no-store" }),
        fetch(`/api/social/connections`, { cache: "no-store" }),
      ]);
      const res = resResp.ok ? await resResp.json() : { items: [], hasMore: false };
      const conn = connResp.ok ? await connResp.json() : { pending: [], outgoing: [], accepted: [] };
      const newItems = Array.isArray(res.items) ? res.items : [];
      setBrowse((prev) => (replace ? newItems : [...prev, ...newItems]));
      setHasMore(!!res.hasMore);
      setPage(nextPage);
      setConnections({
        pending: Array.isArray(conn.pending) ? conn.pending : [],
        outgoing: Array.isArray(conn.outgoing) ? conn.outgoing : [],
        accepted: Array.isArray(conn.accepted) ? conn.accepted : [],
      });
      // fetch mutuals for directory batch
      const ids = newItems.map((r: any) => String(r.userId)).filter(Boolean);
      if (ids.length) {
        const mRes = await fetch(`/api/social/mutuals?ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
        const mj = mRes.ok ? await mRes.json() : { items: [] };
        setMutuals((prev) => {
          const map = { ...prev } as Record<string, number>;
          for (const it of Array.isArray(mj.items) ? mj.items : []) map[String(it.userId)] = Number(it.mutuals || 0);
          return map;
        });
      }
    } catch {
      if (replace) setBrowse([]);
      setHasMore(false);
    } finally {
      setLoadingBrowse(false);
    }
  };

  const sendRequest = async (toUserId: string) => {
    await fetch(`/api/social/connections/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId }),
    });
    search();
  };

  const acceptRequest = async (requesterId: string) => {
    await fetch(`/api/social/connections/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId }),
    });
    search();
  };

  useEffect(() => {
    const t = setTimeout(() => {
      search();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Initial directory load
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/social/prefs", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (typeof j.location === "string") setLoc(j.location);
          if (typeof j.title === "string") setTitle(j.title);
          if (Array.isArray(j.skills)) setSkills(j.skills.join(", "));
          if (typeof j.sort === "string") setSort(j.sort);
          if (typeof j.compactCards === "boolean") setCompact(!!j.compactCards);
        }
      } catch {}
      if (!q.trim()) loadBrowse(1, true);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && !q.trim() && hasMore && !loadingBrowse) {
        loadBrowse(page + 1);
      }
    }, { rootMargin: "400px" });
    io.observe(el);
    setIoReady(true);
    return () => {
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelRef.current, q, hasMore, loadingBrowse, page]);

  const applyFilters = () => {
    setBrowse([]);
    setPage(1);
    setMutuals({});
    // persist to DB
    const payload = {
      location: loc.trim(),
      title: title.trim(),
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      sort,
    };
    fetch("/api/social/prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
    loadBrowse(1, true);
  };

  const clearFilters = () => {
    setLoc("");
    setTitle("");
    setSkills("");
    setSort("recent");
    // save cleared state then reload
    fetch("/api/social/prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "", title: "", skills: [], sort: "recent" }) }).catch(() => {});
    applyFilters();
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find job seekers and students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, title, or email…" />
            <Button onClick={search} disabled={loading}>Search</Button>
          </div>
          {/* Filters & sorting */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
            <Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Filter by location" />
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Filter by title" />
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skills (comma separated)" />
            <select className="border rounded px-3 py-2 bg-white" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">Recently updated</option>
              <option value="name_asc">Name A–Z</option>
            </select>
            <label className="flex items-center gap-2 text-sm px-2 py-2 border rounded bg-white">
              <input type="checkbox" checked={compact} onChange={(e) => { setCompact(e.target.checked); fetch('/api/social/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compactCards: e.target.checked }) }).catch(() => {}); }} />
              Compact
            </label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearFilters}>Clear</Button>
              <Button onClick={applyFilters} disabled={loadingBrowse}>Apply</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(q.trim() ? results : browse).map((r, idx) => {
              const uid = r?.userId ? String(r.userId) : "";
              const isAccepted = acceptedSet.has(uid);
              const isOutgoing = outgoingMap.has(uid);
              const isIncoming = pendingMap.has(uid);
              return (
                <div key={uid || idx} className={`border rounded-lg bg-white hover:shadow-sm transition overflow-hidden ${compact ? 'p-3' : 'p-0'}`}>
                  {!compact && (
                    r.bannerImage ? (
                      <img src={r.bannerImage} className="h-20 w-full object-cover" />
                    ) : (
                      <div className="h-20 w-full bg-gradient-to-r from-slate-100 to-slate-200" />
                    )
                  )}
                  <div className={`flex items-start gap-3 ${compact ? '' : 'px-4 pb-4 -mt-6'}`}>
                    <img
                      src={r.profileImage || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(`${r.firstName || ''} ${r.lastName || ''}`.trim() || r.email || 'User')}`}
                      className="w-12 h-12 rounded-full border object-cover"
                      alt={r.firstName || r.lastName ? `${r.firstName} ${r.lastName}` : r.email}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">
                          {uid ? (
                            <Link href={`/dashboard/job-seeker/profile/${uid}`} className="hover:underline">
                              {r.firstName} {r.lastName}
                            </Link>
                          ) : (
                            <>{r.firstName} {r.lastName}</>
                          )}
                        </div>
                        {r.experienceLevel && r.experienceLevel.toLowerCase().includes('student') && (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded border">Student</span>
                        )}
                        {uid && typeof mutuals[uid] === 'number' && mutuals[uid] > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 rounded border whitespace-nowrap">{mutuals[uid]} mutual</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{r.currentTitle || ""}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.location || r.email}</div>
                      {r.university && (
                        <div className="text-xs text-muted-foreground truncate">{r.university}</div>
                      )}
                      {Array.isArray(r.skills) && r.skills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.skills.slice(0, 3).map((s: string, i: number) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 bg-slate-50 border rounded">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 ${compact ? 'px-3 pb-3' : 'px-4 pb-4'}`}>
                    <a href={uid ? `/dashboard/messages?userId=${encodeURIComponent(uid)}` : '#'} className="text-xs text-teal-700 hover:underline">Message</a>
                    <a href={uid ? `/dashboard/job-seeker/profile/${uid}` : '#'} className="text-xs text-teal-700 hover:underline">View profile</a>
                    <div className="ml-auto flex items-center gap-2">
                      {!uid ? (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded" title="Missing user id on profile">Unavailable</span>
                      ) : isAccepted ? (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Connected</span>
                      ) : isOutgoing ? (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Request sent</span>
                      ) : isIncoming ? (
                        <Button size="sm" onClick={() => acceptRequest(uid)}>Accept</Button>
                      ) : (
                        <Button size="sm" onClick={() => sendRequest(uid)}>Connect</Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {loadingBrowse && (q.trim() ? false : true) && (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`sk-${i}`} className="border rounded p-4 bg-white animate-pulse flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                  </div>
                  <div className="w-24 h-8 bg-slate-200 rounded" />
                </div>
              ))
            )}
            {(q.trim() ? results.length === 0 : browse.length === 0) && !loading && !loadingBrowse && (
              <div className="text-sm text-muted-foreground">No results.</div>
            )}
          </div>
          {/* Infinite scroll sentinel */}
          {!q.trim() && (
            <div ref={sentinelRef} className="h-6" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
