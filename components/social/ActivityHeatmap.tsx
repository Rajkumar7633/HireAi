"use client";
import { useMemo } from "react";

interface Post {
  createdAt: string;
}

interface Props {
  posts: Post[];
}

export default function ActivityHeatmap({ posts }: Props) {
  const weeks = 26;
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of posts) {
      const d = new Date(p.createdAt);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [posts]);

  const grid = useMemo(() => {
    const days: { date: Date; count: number }[] = [];
    const startOffset = today.getDay(); // Sunday = 0
    for (let w = weeks - 1; w >= 0; w--) {
      for (let d = 0; d < 7; d++) {
        const diff = (weeks - 1 - w) * 7 + (6 - d) - (6 - startOffset);
        const date = new Date(today.getTime() - diff * 24 * 60 * 60 * 1000);
        const key = date.toISOString().slice(0, 10);
        days.push({ date, count: counts[key] || 0 });
      }
    }
    return days;
  }, [today, counts]);

  const maxCount = Math.max(...grid.map((d) => d.count), 1);

  function intensity(count: number) {
    if (count === 0) return "bg-slate-100";
    const ratio = count / maxCount;
    if (ratio <= 0.25) return "bg-violet-200";
    if (ratio <= 0.5) return "bg-violet-400";
    if (ratio <= 0.75) return "bg-violet-500";
    return "bg-violet-700";
  }

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    const seen = new Set<string>();
    grid.forEach((d, i) => {
      const col = Math.floor(i / 7);
      const month = d.date.toLocaleString("default", { month: "short" });
      if (!seen.has(month)) {
        seen.add(month);
        labels.push({ label: month, col });
      }
    });
    return labels;
  }, [grid]);

  const columns: { date: Date; count: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    columns.push(grid.slice(w * 7, w * 7 + 7));
  }

  const total = grid.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium">{total} post{total !== 1 ? "s" : ""} in the last 6 months</p>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          Less
          {["bg-slate-100", "bg-violet-200", "bg-violet-400", "bg-violet-600"].map((c, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
          ))}
          More
        </div>
      </div>
      <div className="overflow-x-auto">
        <div style={{ position: "relative" }}>
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 ml-0">
            {columns.map((_, w) => {
              const ml = monthLabels.find((l) => l.col === w);
              return (
                <div key={w} style={{ width: 11 }} className="flex-shrink-0 text-[9px] text-slate-400 leading-none">
                  {ml?.label || ""}
                </div>
              );
            })}
          </div>
          {/* Grid */}
          <div className="flex gap-[3px]">
            {columns.map((col, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                {col.map((cell, d) => (
                  <div
                    key={d}
                    title={`${cell.date.toDateString()}: ${cell.count} post${cell.count !== 1 ? "s" : ""}`}
                    className={`w-[11px] h-[11px] rounded-sm ${intensity(cell.count)} transition-colors cursor-default`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
