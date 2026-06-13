"use client";
import { useEffect, useState } from "react";
import { Eye, TrendingUp } from "lucide-react";

interface ViewStats {
  total: number;
  last7days: number;
  last30days: number;
}

export default function ProfileViewsWidget() {
  const [stats, setStats] = useState<ViewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/social/me/profile-views", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (j) setStats(j); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-24" />
        <div className="h-8 bg-slate-200 rounded-xl w-16" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold text-slate-900">{stats.last30days}</span>
        <span className="text-sm text-slate-500 mb-0.5">views this month</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
          <p className="text-lg font-semibold text-violet-600">{stats.last7days}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Last 7 days</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
          <p className="text-lg font-semibold text-slate-700">{stats.total}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">All time</p>
        </div>
      </div>
    </div>
  );
}
