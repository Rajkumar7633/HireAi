"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600", "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",     "from-indigo-500 to-blue-600",
];
function avatarGrad(name: string) {
  let sum = 0; for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function MutualsBlock({ userId }: { userId: string }) {
  const [me, setMe] = useState<string>("");
  const [theirIds, setTheirIds] = useState<string[]>([]);
  const [myIds, setMyIds] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
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
      finally { setLoading(false); }
    };
    run();
  }, [userId]);

  const mutuals = useMemo(() => {
    if (!me) return [] as string[];
    const setMine = new Set(myIds);
    return theirIds.filter((id) => setMine.has(id));
  }, [myIds.join(","), theirIds.join(","), me]);

  useEffect(() => {
    const list = [...new Set([...theirIds, ...mutuals])];
    if (!list.length) return;
    const load = async () => {
      const res = await fetch(`/api/social/profiles?ids=${encodeURIComponent(list.join(","))}`);
      const j = await res.json();
      const map: Record<string, any> = {};
      for (const it of j.items || []) map[String(it.userId)] = it;
      setProfiles(map);
    };
    load();
  }, [theirIds.join(","), mutuals.join(",")]);

  if (loading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-slate-200" />
            <div className="h-3 w-32 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  const displayList = theirIds.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* mutual connections */}
      {mutuals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
            {mutuals.length} mutual connection{mutuals.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {mutuals.slice(0, 6).map((id) => {
              const p = profiles[id];
              const name = p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() : "User";
              const init = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Link key={id} href={`/dashboard/job-seeker/profile/${id}`}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-violet-100 bg-violet-50 hover:bg-violet-100 transition-colors">
                  {p?.profileImage
                    ? <img src={p.profileImage} className="w-6 h-6 rounded-full object-cover" />
                    : <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarGrad(name)} flex items-center justify-center`}>
                        <span className="text-white text-[9px] font-bold">{init}</span>
                      </div>
                  }
                  <span className="text-xs text-violet-700 font-medium">{name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* their connections */}
      {displayList.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
            {theirIds.length} connection{theirIds.length !== 1 ? "s" : ""}
          </p>
          <div className="flex -space-x-2 flex-wrap">
            {displayList.map((id) => {
              const p = profiles[id];
              const name = p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() : "User";
              const init = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Link key={id} href={`/dashboard/job-seeker/profile/${id}`} title={name}>
                  {p?.profileImage
                    ? <img src={p.profileImage} className="w-9 h-9 rounded-full object-cover ring-2 ring-white" />
                    : <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad(name)} ring-2 ring-white flex items-center justify-center`}>
                        <span className="text-white text-[10px] font-bold">{init}</span>
                      </div>
                  }
                </Link>
              );
            })}
            {theirIds.length > 6 && (
              <div className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                <span className="text-[10px] text-slate-500 font-semibold">+{theirIds.length - 6}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {theirIds.length === 0 && mutuals.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Users className="h-4 w-4" /> No connections yet
        </div>
      )}
    </div>
  );
}
