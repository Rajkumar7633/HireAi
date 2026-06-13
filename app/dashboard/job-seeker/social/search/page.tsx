"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Search, MapPin, Briefcase, GraduationCap, Users, UserCheck, UserPlus,
  Clock, SortAsc, X, ChevronDown, Filter, Sparkles, MessageSquare,
  CheckCircle2, Send
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-indigo-500 to-blue-600",
];

function avatarColor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(first = "", last = "") {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "U";
}

function Avatar({ src, firstName, lastName, size = "md" }: { src?: string; firstName?: string; lastName?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm";
  const name = `${firstName || ""} ${lastName || ""}`.trim();
  if (src) return <img src={src} alt={name} className={`${sizeClass} rounded-full object-cover ring-2 ring-white shrink-0`} />;
  const grad = avatarColor(name || "U");
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center ring-2 ring-white shrink-0`}>
      <span className="text-white font-semibold">{initials(firstName, lastName)}</span>
    </div>
  );
}

// ─── PersonCard ──────────────────────────────────────────────────────────────

function PersonCard({
  r, isAccepted, isOutgoing, isIncoming, mutualCount,
  onConnect, onAccept,
}: {
  r: any; isAccepted: boolean; isOutgoing: boolean; isIncoming: boolean; mutualCount: number;
  onConnect: (uid: string) => void; onAccept: (uid: string) => void;
}) {
  const uid = r?.userId ? String(r.userId) : "";
  const name = `${r.firstName || ""} ${r.lastName || ""}`.trim() || "User";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* banner */}
      {r.bannerImage
        ? <img src={r.bannerImage} className="h-20 w-full object-cover" />
        : <div className={`h-20 w-full bg-gradient-to-r ${avatarColor(name)}`} />
      }

      {/* avatar overlapping banner */}
      <div className="px-4 -mt-6 pb-3 flex-1 flex flex-col">
        <div className="flex items-end justify-between mb-3">
          <Avatar src={r.profileImage} firstName={r.firstName} lastName={r.lastName} size="lg" />
          <div className="flex items-center gap-1.5 pb-1">
            {uid && (
              <a
                href={`/dashboard/messages?userId=${encodeURIComponent(uid)}`}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-violet-600 hover:border-violet-300 transition-colors"
                title="Message"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </a>
            )}
            {!uid ? (
              <span className="text-xs px-3 py-1.5 bg-slate-100 text-slate-400 rounded-full">Unavailable</span>
            ) : isAccepted ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-medium">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : isOutgoing ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200 font-medium">
                <Send className="h-3 w-3" /> Pending
              </span>
            ) : isIncoming ? (
              <button
                onClick={() => onAccept(uid)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-600 text-white rounded-full font-semibold hover:bg-violet-700 transition-colors"
              >
                <UserCheck className="h-3 w-3" /> Accept
              </button>
            ) : (
              <button
                onClick={() => onConnect(uid)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-600 text-white rounded-full font-semibold hover:bg-violet-700 transition-colors"
              >
                <UserPlus className="h-3 w-3" /> Connect
              </button>
            )}
          </div>
        </div>

        {/* info */}
        <div className="flex-1">
          {uid ? (
            <Link href={`/dashboard/job-seeker/profile/${uid}`}
              className="font-semibold text-slate-900 hover:text-violet-700 transition-colors text-sm leading-5 block truncate">
              {name}
            </Link>
          ) : (
            <span className="font-semibold text-slate-900 text-sm">{name}</span>
          )}

          {r.currentTitle && (
            <p className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1">
              <Briefcase className="h-3 w-3 shrink-0" /> {r.currentTitle}
            </p>
          )}
          {r.location && (
            <p className="text-xs text-slate-400 mt-0.5 truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" /> {r.location}
            </p>
          )}
          {r.university && (
            <p className="text-xs text-slate-400 mt-0.5 truncate flex items-center gap-1">
              <GraduationCap className="h-3 w-3 shrink-0" /> {r.university}
            </p>
          )}

          {/* badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {r.experienceLevel?.toLowerCase().includes("student") && (
              <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-200 font-medium">Student</span>
            )}
            {mutualCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full border border-violet-200 font-medium flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" /> {mutualCount} mutual
              </span>
            )}
          </div>

          {/* skills */}
          {Array.isArray(r.skills) && r.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {r.skills.slice(0, 4).map((s: string, i: number) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-slate-600">
                  {s}
                </span>
              ))}
              {r.skills.length > 4 && (
                <span className="text-[10px] px-2 py-0.5 text-slate-400">+{r.skills.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SkeletonCard ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
      <div className="h-20 w-full bg-slate-200" />
      <div className="px-4 -mt-6 pb-4">
        <div className="flex items-end justify-between mb-3">
          <div className="w-14 h-14 rounded-full bg-slate-300 ring-2 ring-white" />
          <div className="w-20 h-7 bg-slate-200 rounded-full" />
        </div>
        <div className="h-3.5 w-28 bg-slate-200 rounded-full mb-2" />
        <div className="h-3 w-40 bg-slate-200 rounded-full mb-1.5" />
        <div className="h-3 w-32 bg-slate-200 rounded-full mb-3" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 bg-slate-200 rounded-full" />
          <div className="h-5 w-16 bg-slate-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const QUICK_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java",
  "AWS", "Docker", "SQL", "MongoDB", "Go", "Rust", "Figma", "Flutter",
];

const SORT_OPTIONS = [
  { value: "recent", label: "Recently updated", icon: Clock },
  { value: "name_asc", label: "Name A–Z", icon: SortAsc },
];

export default function SocialSearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [connections, setConnections] = useState<any>({ pending: [], outgoing: [], accepted: [] });
  const [loading, setLoading] = useState(false);
  const [browse, setBrowse] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [loc, setLoc] = useState("");
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [sort, setSort] = useState("recent");
  const [mutuals, setMutuals] = useState<Record<string, number>>({});
  const [activeSkillChips, setActiveSkillChips] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── connection maps ─────────────────────────────────────────────────────

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
    for (const c of list) { s.add(String(c.requesterId)); s.add(String(c.addresseeId)); }
    return s;
  }, [connections]);

  // ── fetch mutuals helper ──────────────────────────────────────────────

  const fetchMutuals = async (items: any[], replace = false) => {
    const ids = items.map((r: any) => String(r.userId)).filter(Boolean);
    if (!ids.length) return;
    try {
      const mRes = await fetch(`/api/social/mutuals?ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
      const mj = mRes.ok ? await mRes.json() : { items: [] };
      setMutuals((prev) => {
        const map = replace ? {} : { ...prev };
        for (const it of Array.isArray(mj.items) ? mj.items : []) map[String(it.userId)] = Number(it.mutuals || 0);
        return map;
      });
    } catch {}
  };

  // ── search ────────────────────────────────────────────────────────────

  const search = useCallback(async () => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const [resResp, connResp] = await Promise.all([
        fetch(`/api/social/search?query=${encodeURIComponent(q)}`),
        fetch(`/api/social/connections`),
      ]);
      const res = resResp.ok ? await resResp.json() : { items: [] };
      const conn = connResp.ok ? await connResp.json() : { pending: [], outgoing: [], accepted: [] };
      const items = Array.isArray(res.items) ? res.items : [];
      setResults(items);
      setConnections({
        pending: Array.isArray(conn.pending) ? conn.pending : [],
        outgoing: Array.isArray(conn.outgoing) ? conn.outgoing : [],
        accepted: Array.isArray(conn.accepted) ? conn.accepted : [],
      });
      await fetchMutuals(items, true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ── browse (directory) ────────────────────────────────────────────────

  const loadBrowse = useCallback(async (nextPage: number, replace = false) => {
    if (loadingBrowse) return;
    setLoadingBrowse(true);
    try {
      const effectiveSkills = [
        ...skills.split(",").map((s) => s.trim()).filter(Boolean),
        ...activeSkillChips,
      ].join(",");
      const params = new URLSearchParams({ page: String(nextPage), limit: "12", sort });
      if (loc.trim()) params.set("location", loc.trim());
      if (title.trim()) params.set("title", title.trim());
      if (effectiveSkills) params.set("skills", effectiveSkills);

      const [resResp, connResp] = await Promise.all([
        fetch(`/api/social/browse?${params}`, { cache: "no-store" }),
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
      await fetchMutuals(newItems, replace);
    } catch { if (replace) setBrowse([]); setHasMore(false); }
    finally { setLoadingBrowse(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, title, skills, sort, activeSkillChips, loadingBrowse]);

  // ── connection actions ────────────────────────────────────────────────

  const sendRequest = async (toUserId: string) => {
    await fetch(`/api/social/connections/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId }),
    });
    const conn = await fetch(`/api/social/connections`).then((r) => r.json()).catch(() => null);
    if (conn) setConnections({
      pending: Array.isArray(conn.pending) ? conn.pending : [],
      outgoing: Array.isArray(conn.outgoing) ? conn.outgoing : [],
      accepted: Array.isArray(conn.accepted) ? conn.accepted : [],
    });
  };

  const acceptRequest = async (requesterId: string) => {
    await fetch(`/api/social/connections/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId }),
    });
    const conn = await fetch(`/api/social/connections`).then((r) => r.json()).catch(() => null);
    if (conn) setConnections({
      pending: Array.isArray(conn.pending) ? conn.pending : [],
      outgoing: Array.isArray(conn.outgoing) ? conn.outgoing : [],
      accepted: Array.isArray(conn.accepted) ? conn.accepted : [],
    });
  };

  // ── apply / clear filters ─────────────────────────────────────────────

  const applyFilters = () => {
    setBrowse([]); setPage(1); setMutuals({});
    const payload = {
      location: loc.trim(), title: title.trim(),
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean), sort,
    };
    fetch("/api/social/prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
    loadBrowse(1, true);
  };

  const clearFilters = () => {
    setLoc(""); setTitle(""); setSkills(""); setSort("recent"); setActiveSkillChips([]);
    fetch("/api/social/prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "", title: "", skills: [], sort: "recent" }) }).catch(() => {});
  };

  const toggleSkillChip = (skill: string) => {
    setActiveSkillChips((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const hasActiveFilters = !!(loc || title || skills || activeSkillChips.length || sort !== "recent");

  // ── effects ───────────────────────────────────────────────────────────

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { if (q.trim()) search(); else setResults([]); }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Initial load: prefs + directory + suggestions
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/social/prefs", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (j.location) setLoc(j.location);
          if (j.title) setTitle(j.title);
          if (Array.isArray(j.skills)) setSkills(j.skills.join(", "));
          if (j.sort) setSort(j.sort);
        }
      } catch {}
      loadBrowse(1, true);
      // fetch suggestions
      try {
        const sRes = await fetch("/api/social/suggestions");
        const sj = sRes.ok ? await sRes.json() : { items: [] };
        setSuggestions(Array.isArray(sj.items) ? sj.items.slice(0, 6) : []);
      } catch {}
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-load browse when skill chips or sort change
  useEffect(() => {
    if (!q.trim()) { setBrowse([]); setPage(1); loadBrowse(1, true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSkillChips, sort]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !q.trim() && hasMore && !loadingBrowse) {
        loadBrowse(page + 1);
      }
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hasMore, loadingBrowse, page]);

  const displayList = q.trim() ? results : browse;
  const isSearchMode = !!q.trim();

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">People</h1>
          <p className="text-sm text-slate-500 mt-0.5">Search and connect with professionals in your network</p>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, title, location, skills, or university…"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 focus:bg-white transition-all placeholder:text-slate-400"
            />
            {q && (
              <button onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              showFilters || hasActiveFilters
                ? "bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
                : "bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center">
                {[loc, title, skills, ...activeSkillChips].filter(Boolean).length + (sort !== "recent" ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Expanded filters panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                  placeholder="Location"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
                />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Job title"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
                />
              </div>
              <div className="relative">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Skills (comma separated)"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-violet-400 focus:bg-white transition-all text-slate-700"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={applyFilters}
                className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
              >
                Apply filters
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:border-red-300 hover:text-red-600 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active filter pills */}
        {hasActiveFilters && !showFilters && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {loc && <FilterPill label={`📍 ${loc}`} onRemove={() => { setLoc(""); applyFilters(); }} />}
            {title && <FilterPill label={`💼 ${title}`} onRemove={() => { setTitle(""); applyFilters(); }} />}
            {skills && <FilterPill label={`⚡ ${skills}`} onRemove={() => { setSkills(""); applyFilters(); }} />}
            {sort !== "recent" && <FilterPill label="Name A–Z" onRemove={() => { setSort("recent"); }} />}
            {activeSkillChips.map((s) => <FilterPill key={s} label={s} onRemove={() => toggleSkillChip(s)} />)}
          </div>
        )}
      </div>

      {/* ── Quick skill chips (directory mode only) ── */}
      {!isSearchMode && (
        <div className="flex flex-wrap gap-2">
          {QUICK_SKILLS.map((s) => (
            <button
              key={s}
              onClick={() => toggleSkillChip(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeSkillChips.includes(s)
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── People you may know (directory mode, no results loaded yet) ── */}
      {!isSearchMode && suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-slate-700">People you may know</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {suggestions.map((r: any) => {
              const uid = String(r.userId || "");
              const name = `${r.firstName || ""} ${r.lastName || ""}`.trim() || "User";
              return (
                <div key={uid} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col items-center text-center gap-2">
                  <Avatar src={r.profileImage} firstName={r.firstName} lastName={r.lastName} size="lg" />
                  <div className="w-full">
                    {uid
                      ? <Link href={`/dashboard/job-seeker/profile/${uid}`} className="text-xs font-semibold text-slate-800 hover:text-violet-700 line-clamp-1">{name}</Link>
                      : <span className="text-xs font-semibold text-slate-800 line-clamp-1">{name}</span>
                    }
                    {r.currentTitle && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{r.currentTitle}</p>}
                  </div>
                  {uid && (
                    acceptedSet.has(uid) ? (
                      <span className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-medium">Connected</span>
                    ) : outgoingMap.has(uid) ? (
                      <span className="text-[10px] px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">Pending</span>
                    ) : (
                      <button
                        onClick={() => sendRequest(uid)}
                        className="text-[10px] px-3 py-1 bg-violet-600 text-white rounded-full font-semibold hover:bg-violet-700 transition-colors w-full"
                      >
                        Connect
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Results / Directory ── */}
      <div>
        {/* Section label */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isSearchMode
              ? <><Search className="h-4 w-4 text-violet-500" /><h2 className="text-sm font-semibold text-slate-700">Search results</h2></>
              : <><Users className="h-4 w-4 text-violet-500" /><h2 className="text-sm font-semibold text-slate-700">Browse professionals</h2></>
            }
            {!loading && !loadingBrowse && displayList.length > 0 && (
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{displayList.length}{!isSearchMode && hasMore ? "+" : ""}</span>
            )}
          </div>
          {!isSearchMode && (
            <div className="flex items-center gap-1.5">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setSort(o.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sort === o.value ? "bg-violet-50 text-violet-700 border border-violet-200" : "text-slate-500 hover:text-violet-600"
                  }`}
                >
                  <o.icon className="h-3 w-3" /> {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        {(loading || (loadingBrowse && browse.length === 0)) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-violet-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {isSearchMode ? "No results found" : "No professionals found"}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {isSearchMode ? "Try a different name, title, skill, or location." : "Try adjusting your filters."}
            </p>
            {isSearchMode && (
              <button onClick={() => setQ("")} className="mt-4 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayList.map((r: any, idx: number) => {
                const uid = r?.userId ? String(r.userId) : "";
                return (
                  <PersonCard
                    key={uid || idx}
                    r={r}
                    isAccepted={acceptedSet.has(uid)}
                    isOutgoing={outgoingMap.has(uid)}
                    isIncoming={pendingMap.has(uid)}
                    mutualCount={mutuals[uid] || 0}
                    onConnect={sendRequest}
                    onAccept={acceptRequest}
                  />
                );
              })}

              {/* inline load-more skeletons while paginating */}
              {loadingBrowse && !isSearchMode && (
                Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)
              )}
            </div>

            {/* Infinite scroll sentinel */}
            {!isSearchMode && (
              <div ref={sentinelRef} className="h-8 flex items-center justify-center mt-2">
                {!hasMore && browse.length > 0 && (
                  <p className="text-xs text-slate-400">You've seen everyone</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── FilterPill ───────────────────────────────────────────────────────────────

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium">
      {label}
      <button onClick={onRemove} className="w-4 h-4 rounded-full hover:bg-violet-200 flex items-center justify-center transition-colors">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}
