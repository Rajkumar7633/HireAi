"use client";
import { useState } from "react";
import { Share2, Check, Link2 } from "lucide-react";

interface Props {
  userId: string;
  name: string;
}

export default function ShareProfileButton({ userId, name }: Props) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/dashboard/job-seeker/profile/${userId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name}'s Profile`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-colors"
    >
      {copied ? (
        <><Check className="h-4 w-4 text-emerald-500" /> <span className="text-emerald-600">Copied!</span></>
      ) : (
        <><Share2 className="h-4 w-4" /> Share</>
      )}
    </button>
  );
}
