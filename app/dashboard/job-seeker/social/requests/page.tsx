"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useSocialRealtime } from "@/hooks/use-social-realtime";

export default function RequestsPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string>("");
  const [pending, setPending] = useState<any[]>([]); // incoming to me
  const [outgoing, setOutgoing] = useState<any[]>([]); // sent by me
  const [profiles, setProfiles] = useState<Record<string, any>>({});
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

  useEffect(() => {
    refresh();
  }, []);

  useSocialRealtime({
    onConnection: () => refresh(),
  });

  // hydrate profiles for requester/addressee ids
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
      if (neededIds.length === 0) return;
      const res = await fetch(`/api/social/profiles?ids=${encodeURIComponent(neededIds.join(","))}`);
      const j = await res.json();
      const map: Record<string, any> = {};
      for (const it of j.items || []) map[String(it.userId)] = it;
      setProfiles(map);
    };
    run();
  }, [neededIds.join(",")]);

  const accept = async (requesterId: string) => {
    const r = await fetch("/api/social/connections/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requesterId }) });
    if (r.ok) toast({ title: "Request accepted" });
    refresh();
  };
  const decline = async (requesterId: string) => {
    const r = await fetch("/api/social/connections/decline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requesterId }) });
    if (r.ok) toast({ title: "Request declined" });
    refresh();
  };
  const cancel = async (addresseeId: string) => {
    const r = await fetch("/api/social/connections/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addresseeId }) });
    if (r.ok) toast({ title: "Request canceled" });
    refresh();
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-medium mb-2">Incoming</div>
                <div className="space-y-2">
                  {pending.length === 0 && <div className="text-sm text-muted-foreground">No incoming requests</div>}
                  {pending.map((c, idx) => {
                    const id = String(c.requesterId);
                    const p = profiles[id];
                    const name = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : id;
                    return (
                      <div key={idx} className="flex items-center justify-between border rounded p-3 bg-white">
                        <div className="flex items-center gap-3">
                          <img src={p?.profileImage || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`}
                               className="w-9 h-9 rounded-full border object-cover"/>
                          <div>
                            <div className="text-sm font-medium">
                              <Link href={`/dashboard/job-seeker/profile/${id}`} className="hover:underline">{name}</Link>
                            </div>
                            <div className="text-xs text-muted-foreground">{p?.currentTitle}{p?.location?` • ${p.location}`:''}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => accept(id)}>Accept</Button>
                          <Button size="sm" variant="outline" onClick={() => decline(id)}>Decline</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Outgoing</div>
                <div className="space-y-2">
                  {outgoing.length === 0 && <div className="text-sm text-muted-foreground">No outgoing requests</div>}
                  {outgoing.map((c, idx) => {
                    const id = String(c.addresseeId);
                    const p = profiles[id];
                    const name = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : id;
                    return (
                      <div key={idx} className="flex items-center justify-between border rounded p-3 bg-white">
                        <div className="flex items-center gap-3">
                          <img src={p?.profileImage || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`}
                               className="w-9 h-9 rounded-full border object-cover"/>
                          <div>
                            <div className="text-sm font-medium">
                              <Link href={`/dashboard/job-seeker/profile/${id}`} className="hover:underline">{name}</Link>
                            </div>
                            <div className="text-xs text-muted-foreground">{p?.currentTitle}{p?.location?` • ${p.location}`:''}</div>
                          </div>
                        </div>
                        <div>
                          <Button size="sm" variant="outline" onClick={() => cancel(id)}>Cancel</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
