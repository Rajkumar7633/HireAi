"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSocialRealtime } from "@/hooks/use-social-realtime";

export default function FriendsPage() {
  const [accepted, setAccepted] = useState<any[]>([]);
  const [me, setMe] = useState<string>("");
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of accepted) {
      ids.add(String(c.requesterId));
      ids.add(String(c.addresseeId));
    }
    return Array.from(ids);
  }, [accepted]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/social/connections");
        const j = res.ok ? await res.json() : { accepted: [], me: "" };
        setAccepted(Array.isArray(j.accepted) ? j.accepted : []);
        if (j.me) setMe(String(j.me));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Realtime: refresh when connections change
  useSocialRealtime({
    onConnection: () => {
      (async () => {
        try {
          const res = await fetch("/api/social/connections", { cache: "no-store" });
          const j = res.ok ? await res.json() : { accepted: [], me: "" };
          setAccepted(Array.isArray(j.accepted) ? j.accepted : []);
          if (j.me) setMe(String(j.me));
        } catch {}
      })();
    },
  });

  useEffect(() => {
    const run = async () => {
      if (userIds.length === 0) return;
      const ids = userIds.join(",");
      const res = await fetch(`/api/social/profiles?ids=${encodeURIComponent(ids)}`);
      const j = await res.json();
      const map: Record<string, any> = {};
      for (const it of j.items || []) map[String(it.userId)] = it;
      setProfiles(map);
    };
    run();
  }, [userIds.join(",")]);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your connections</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading…</div>
          ) : accepted.length === 0 ? (
            <div className="text-sm text-muted-foreground">No connections yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accepted.map((c, i) => {
                const otherId = String(c.requesterId) === String(me) ? String(c.addresseeId) : String(c.requesterId);
                const p = profiles[otherId];
                return (
                  <div key={i} className="border rounded p-4 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={p?.profileImage || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(((p?.firstName||'')+' '+(p?.lastName||'')).trim())}`}
                           className="w-10 h-10 rounded-full border object-cover"/>
                      <div>
                        <div className="font-medium">{p ? `${p.firstName||''} ${p.lastName||''}`.trim() : otherId}</div>
                        <div className="text-xs text-muted-foreground">{p?.currentTitle}{p?.location?` • ${p.location}`:''}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/job-seeker/profile/${otherId}`} className="inline-flex"><Button size="sm" variant="outline">View Profile</Button></Link>
                      <Link href={`/dashboard/messages?with=${otherId}`} className="inline-flex"><Button size="sm">Message</Button></Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
