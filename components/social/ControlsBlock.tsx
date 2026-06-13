"use client";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserCheck, Send, UserX, X, Check } from "lucide-react";

export default function ControlsBlock({ otherId }: { otherId: string }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string>("");
  const [pending, setPending] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [accepted, setAccepted] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const status = useMemo(() => {
    if (!otherId) return "none" as const;
    if (accepted.some((c) => String(c.requesterId) === otherId || String(c.addresseeId) === otherId)) return "connected" as const;
    if (outgoing.some((c) => String(c.addresseeId) === otherId)) return "outgoing" as const;
    if (pending.some((c) => String(c.requesterId) === otherId)) return "incoming" as const;
    return "none" as const;
  }, [otherId, pending, outgoing, accepted]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/connections", { cache: "no-store" });
      const j = res.ok ? await res.json() : { me: "", pending: [], outgoing: [], accepted: [] };
      setMe(String(j.me || ""));
      setPending(Array.isArray(j.pending) ? j.pending : []);
      setOutgoing(Array.isArray(j.outgoing) ? j.outgoing : []);
      setAccepted(Array.isArray(j.accepted) ? j.accepted : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [otherId]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const connect = () => run(async () => {
    const res = await fetch("/api/social/connections/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toUserId: otherId }) });
    if (res.ok) { const j = await res.json(); toast({ title: j.status === "accepted" ? "Connected!" : "Request sent" }); }
    refresh();
  });
  const accept = () => run(async () => {
    const r = await fetch("/api/social/connections/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requesterId: otherId }) });
    if (r.ok) toast({ title: "Connected!" });
    refresh();
  });
  const decline = () => run(async () => {
    const r = await fetch("/api/social/connections/decline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requesterId: otherId }) });
    if (r.ok) toast({ title: "Request declined" });
    refresh();
  });
  const cancel = () => run(async () => {
    const r = await fetch("/api/social/connections/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addresseeId: otherId }) });
    if (r.ok) toast({ title: "Request canceled" });
    refresh();
  });

  if (!otherId || loading) return <div className="w-20 h-9 rounded-xl bg-slate-100 animate-pulse" />;

  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold">
        <UserCheck className="h-4 w-4" /> Connected
      </span>
    );
  }
  if (status === "outgoing") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-sm font-medium">
          <Send className="h-3.5 w-3.5" /> Pending
        </span>
        <button onClick={cancel} disabled={busy}
          className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50">
          Cancel
        </button>
      </div>
    );
  }
  if (status === "incoming") {
    return (
      <div className="flex items-center gap-2">
        <button onClick={accept} disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
          <Check className="h-3.5 w-3.5" /> Accept
        </button>
        <button onClick={decline} disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }
  return (
    <button onClick={connect} disabled={busy}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
      <UserPlus className="h-4 w-4" /> Connect
    </button>
  );
}
