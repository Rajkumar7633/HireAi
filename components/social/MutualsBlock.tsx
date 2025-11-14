"use client";
import { useEffect, useMemo, useState } from "react";

export default function MutualsBlock({ userId }: { userId: string }) {
  const [me, setMe] = useState<string>("");
  const [theirIds, setTheirIds] = useState<string[]>([]);
  const [myIds, setMyIds] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    const run = async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const mj = meRes.ok ? await meRes.json() : {};
        const uid = String(mj?.user?.id || mj?.id || "");
        setMe(uid);
        const reqs: Promise<Response>[] = [
          fetch(`/api/social/connections/of/${encodeURIComponent(userId)}`, { cache: "no-store" }),
        ];
        if (uid) reqs.push(fetch(`/api/social/connections/of/${encodeURIComponent(uid)}`, { cache: "no-store" }));
        const [theirs, mine] = await Promise.all(reqs);
        const tj = theirs?.ok ? await theirs.json() : { connections: [] };
        const mj2 = mine?.ok ? await mine.json() : { connections: [] };
        setTheirIds(Array.isArray(tj.connections) ? tj.connections.map(String) : []);
        setMyIds(Array.isArray(mj2.connections) ? mj2.connections.map(String) : []);
      } catch {}
    };
    run();
  }, [userId]);

  const mutuals = useMemo(() => {
    if (!me) return [] as string[];
    const setMine = new Set(myIds);
    return theirIds.filter((id) => setMine.has(id));
  }, [myIds.join(","), theirIds.join(","), me]);

  useEffect(() => {
    const list = ([] as string[]).concat(theirIds || [], mutuals || []);
    const seen: Record<string, true> = {};
    const need: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const id = String(list[i]);
      if (!seen[id]) {
        seen[id] = true;
        need.push(id);
      }
    }
    if (need.length === 0) return;
    const load = async () => {
      const res = await fetch(`/api/social/profiles?ids=${encodeURIComponent(need.join(","))}`);
      const j = await res.json();
      const map: Record<string, any> = {};
      for (const it of j.items || []) map[String(it.userId)] = it;
      setProfiles(map);
    };
    load();
  }, [theirIds.join(","), mutuals.join(",")]);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded border p-6">
      <div className="font-semibold mb-3">Connections</div>
      <div className="text-sm text-muted-foreground mb-3">{theirIds.length} connections</div>
      {mutuals.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Mutual connections ({mutuals.length})</div>
          <div className="flex flex-wrap gap-2">
            {mutuals.slice(0, 8).map((id) => {
              const p = profiles[id];
              const name = p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() : id;
              return (
                <a key={id} href={`/dashboard/job-seeker/profile/${id}`} className="inline-flex items-center gap-2 border rounded px-2 py-1 bg-white hover:bg-slate-50">
                  <img src={p?.profileImage || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`}
                       className="w-6 h-6 rounded-full border object-cover"/>
                  <span className="text-sm">{name}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
