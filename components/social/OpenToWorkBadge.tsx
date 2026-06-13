"use client";
import { useState } from "react";
import { Briefcase, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: string;
  initialValue: boolean;
  isOwn: boolean;
}

export default function OpenToWorkBadge({ userId, initialValue, isOwn }: Props) {
  const [open, setOpen] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const toggle = async () => {
    if (!isOwn || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/social/profiles/${userId}/open-to-work`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openToWork: !open }),
      });
      if (res.ok) {
        const j = await res.json();
        setOpen(j.openToWork);
        toast({ title: j.openToWork ? "Open To Work turned on" : "Open To Work turned off" });
      }
    } finally {
      setBusy(false);
    }
  };

  if (!open && !isOwn) return null;

  return (
    <button
      onClick={isOwn ? toggle : undefined}
      disabled={busy}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all select-none",
        open
          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
          : "bg-slate-100 text-slate-500 border border-slate-200",
        isOwn ? "cursor-pointer hover:opacity-80" : "cursor-default",
      ].join(" ")}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Briefcase className="h-3.5 w-3.5" />
      )}
      {open ? "Open To Work" : "Not Open To Work"}
    </button>
  );
}
