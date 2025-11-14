"use client";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ControlsBlock({ otherId }: { otherId: string }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string>("");
  const [pending, setPending] = useState<any[]>([]); // incoming to me
  const [outgoing, setOutgoing] = useState<any[]>([]); // sent by me
  const [accepted, setAccepted] = useState<any[]>([]);
  const { toast } = useToast();

  const status = useMemo(() => {
    if (!otherId) return "none" as const;
    const acc = accepted.some((c) => String(c.requesterId) === otherId || String(c.addresseeId) === otherId);
    if (acc) return "connected" as const;
    const out = outgoing.some((c) => String(c.addresseeId) === otherId);
    if (out) return "outgoing" as const;
    const inc = pending.some((c) => String(c.requesterId) === otherId);
    if (inc) return "incoming" as const;
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherId]);

  const connect = async () => {
    const res = await fetch("/api/social/connections/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toUserId: otherId }) });
    if (res.ok) {
      const j = await res.json();
      toast({ title: j.status === "accepted" ? "Connected" : "Request sent" });
    }
    refresh();
  };
  const accept = async () => {
    const r = await fetch("/api/social/connections/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requesterId: otherId }) });
    if (r.ok) toast({ title: "Request accepted" });
    refresh();
  };
  const decline = async () => {
    const r = await fetch("/api/social/connections/decline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requesterId: otherId }) });
    if (r.ok) toast({ title: "Request declined" });
    refresh();
  };
  const cancel = async () => {
    const r = await fetch("/api/social/connections/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addresseeId: otherId }) });
    if (r.ok) toast({ title: "Request canceled" });
    refresh();
  };

  if (!otherId || loading) return null;

  if (status === "connected") {
    return <span className="inline-flex items-center text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Connected</span>;
  }
  if (status === "outgoing") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Request sent</span>
        <button onClick={cancel} className="text-xs underline">Cancel</button>
      </div>
    );
  }
  if (status === "incoming") {
    return (
      <div className="flex items-center gap-2">
        <button onClick={accept} className="px-2 py-1 text-xs border rounded">Accept</button>
        <button onClick={decline} className="px-2 py-1 text-xs border rounded">Decline</button>
      </div>
    );
  }
  return (
    <button onClick={connect} className="px-3 py-1.5 text-sm border rounded">Connect</button>
  );
}
