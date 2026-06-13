"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";

interface Profile {
  userId: string;
  firstName: string;
  lastName: string;
  currentTitle: string;
  profileImage: string;
  openToWork: boolean;
}

const COLORS = [
  "from-violet-500 to-purple-600", "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600", "from-orange-500 to-amber-600",
];
function grad(name: string) {
  let s = 0; for (let i = 0; i < name.length; i++) s += name.charCodeAt(i);
  return COLORS[s % COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export default function PeopleAlsoViewed({ userId }: { userId: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/social/similar?userId=${encodeURIComponent(userId)}&limit=5`, {
          cache: "no-store",
        });
        const j = res.ok ? await res.json() : { profiles: [] };
        setProfiles(Array.isArray(j.profiles) ? j.profiles : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-200 rounded w-24" />
              <div className="h-2.5 bg-slate-200 rounded w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!profiles.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
        <Users className="h-4 w-4" /> No similar profiles found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {profiles.map((p) => {
        const name = `${p.firstName || ""} ${p.lastName || ""}`.trim() || "User";
        const init = initials(name);
        return (
          <Link
            key={p.userId}
            href={`/dashboard/job-seeker/profile/${p.userId}`}
            className="flex items-center gap-2.5 group"
          >
            {p.profileImage ? (
              <img src={p.profileImage} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad(name)} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-[10px] font-bold">{init}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 group-hover:text-violet-600 transition-colors truncate">
                {name}
              </p>
              {p.currentTitle && (
                <p className="text-xs text-slate-400 truncate">{p.currentTitle}</p>
              )}
            </div>
            {p.openToWork && (
              <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                Open
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
