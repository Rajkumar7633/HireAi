"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSocialRealtime } from "@/hooks/use-social-realtime";
import Link from "next/link";
import {
  UserCheck, UserX, X, Send, Inbox, Bell, Users,
  MapPin, Briefcase, ArrowRight,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600", "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",     "from-indigo-500 to-blue-600",
];
function avatarGrad(name: string) {
  let sum = 0; for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function Avatar({ src, firstName, lastName }: { src?: string; firstName?: string; lastName?: string }) {
  const name = `${firstName || ""} ${lastName || ""}`.trim();
  if (src) return <img src={src} alt={name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shrink-0" />;
  const init = `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase() || "U";
  return (
    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarGrad(name || "U")} flex items-center justify-center ring-2 ring-white shrink-0`}>
      <span className="text-white font-semibold text-sm">{init}</span>
    </div>
  );
}

function EmptyState({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string>("");
  const [pending, setPending] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [tab, setTab] = useState<"incoming" | "sent">("incoming");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/connections", { cache: "no-store" });
      const j = res.ok ? await res.json() : { me: "", pending: [], outgoing: [] };
      setMe(String(j.me || ""));
      setPending(Array.isArray(j.pending) ? j.pending : []);
      setOutgoing(Array.isArray(j.outgoing) ? j.outgoing : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);
  useSocialRealtime({ onConnection: () => refresh() });

  const neededIds = useMemo(() => {
    const ids: string[] = [];
    for (const c of pending) ids.push(String(c.requesterId));
    for (const c of outgoing) ids.push(String(c.addresseeId));
    const seen: Record<string, 1> = {}; const uniq: string[] = [];
    for (const id of ids) if (!seen[id]) { seen[id] = 1; uniq.push(id); }
    return uniq;
  }, [pending, outgoing]);

  useEffect(() => {
    const run = async () => {
      if (!neededIds.length) return;
      const res = await fetch(`/api/social/profiles?ids=${encodeURIComponent(neededIds.join(","))}`);
      const j = await res.json();
      const map: Record<string, any> = {};
      for (const it of j.items || []) map[String(it.userId)] = it;
      setProfiles(map);
    };
    run();
  }, [neededIds.join(",")]);

  const withBusy = (id: string, fn: () => Promise<void>) => async () => {
    setBusy((b) => ({ ...b, [id]: true }));
    try { await fn(); } finally { setBusy((b) => ({ ...b, [id]: false })); }
  };

  const accept = (requesterId: string) => withBusy(requesterId, async () => {
    const r = await fetch("/api/social/connections/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requesterId }) });
    if (r.ok) toast({ title: "Connected!", description: "You are now connected." });
    refresh();
  })();

  const decline = (requesterId: string) => withBusy(`d-${requesterId}`, async () => {
    const r = await fetch("/api/social/connections/decline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requesterId }) });
    if (r.ok) toast({ title: "Request declined" });
    refresh();
  })();

  const cancel = (addresseeId: string) => withBusy(`c-${addresseeId}`, async () => {
    const r = await fetch("/api/social/connections/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addresseeId }) });
    if (r.ok) toast({ title: "Request canceled" });
    refresh();
  })();

  const totalPending = pending.length;
  const totalOutgoing = outgoing.length;

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Connection Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your incoming and sent connection requests</p>
        </div>
        {totalPending > 0 && (
          <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 text-sm font-medium px-4 py-2 rounded-xl">
            <Bell className="h-4 w-4" />
            {totalPending} new request{totalPending !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <Inbox className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{totalPending}</p>
            <p className="text-xs text-slate-500">Incoming</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Send className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{totalOutgoing}</p>
            <p className="text-xs text-slate-500">Sent</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Grow your network</p>
            <Link href="/dashboard/job-seeker/social/search"
              className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-0.5 mt-0.5">
              Find people <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex items-center gap-1 w-fit">
        {(["incoming", "sent"] as const).map((t) => {
          const count = t === "incoming" ? totalPending : totalOutgoing;
          const active = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                active ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:text-violet-600 hover:bg-violet-50"
              }`}>
              {t === "incoming" ? <Inbox className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {t === "incoming" ? "Incoming" : "Sent"}
              {count > 0 && (
                <span className={`min-w-[20px] h-5 rounded-full text-[11px] font-bold flex items-center justify-center px-1.5 ${
                  active ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700"
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-36 bg-slate-200 rounded-full" />
                <div className="h-3 w-52 bg-slate-200 rounded-full" />
              </div>
              <div className="flex gap-2">
                <div className="w-20 h-8 bg-slate-200 rounded-full" />
                <div className="w-20 h-8 bg-slate-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : tab === "incoming" ? (
        <div className="space-y-3">
          {totalPending === 0 ? (
            <EmptyState
              icon={<Inbox className="h-8 w-8 text-violet-300" />}
              title="No incoming requests"
              desc="When someone sends you a connection request, it will appear here."
              action={
                <Link href="/dashboard/job-seeker/social/search"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
                  Find people to connect <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          ) : (
            pending.map((c, idx) => {
              const id = String(c.requesterId);
              const p = profiles[id];
              const name = p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() || "User" : "User";
              return (
                <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-4">
                  <Link href={`/dashboard/job-seeker/profile/${id}`} className="shrink-0">
                    <Avatar src={p?.profileImage} firstName={p?.firstName} lastName={p?.lastName} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/job-seeker/profile/${id}`}
                      className="font-semibold text-slate-900 hover:text-violet-700 transition-colors text-sm block truncate">
                      {name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {p?.currentTitle && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> {p.currentTitle}
                        </span>
                      )}
                      {p?.location && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {p.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => accept(id)}
                      disabled={busy[id]}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => decline(id)}
                      disabled={busy[`d-${id}`]}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors"
                    >
                      <UserX className="h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {totalOutgoing === 0 ? (
            <EmptyState
              icon={<Send className="h-8 w-8 text-violet-300" />}
              title="No sent requests"
              desc="Requests you've sent that are waiting for acceptance will appear here."
            />
          ) : (
            outgoing.map((c, idx) => {
              const id = String(c.addresseeId);
              const p = profiles[id];
              const name = p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() || "User" : "User";
              return (
                <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-4">
                  <Link href={`/dashboard/job-seeker/profile/${id}`} className="shrink-0">
                    <Avatar src={p?.profileImage} firstName={p?.firstName} lastName={p?.lastName} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/job-seeker/profile/${id}`}
                      className="font-semibold text-slate-900 hover:text-violet-700 transition-colors text-sm block truncate">
                      {name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {p?.currentTitle && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> {p.currentTitle}
                        </span>
                      )}
                      {p?.location && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {p.location}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                      Awaiting acceptance
                    </p>
                  </div>
                  <div className="shrink-0">
                    <button
                      onClick={() => cancel(id)}
                      disabled={busy[`c-${id}`]}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
