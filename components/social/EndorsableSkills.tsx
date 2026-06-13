"use client";
import { useEffect, useState } from "react";
import { ThumbsUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SkillEndorsement {
  skill: string;
  endorsedBy: string[];
}

interface Props {
  userId: string;
  skills: string[];
  endorsements: SkillEndorsement[];
  myUserId: string;
}

export default function EndorsableSkills({ userId, skills, endorsements, myUserId }: Props) {
  const [data, setData] = useState<Record<string, { count: number; endorsed: boolean }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();
  const isOwn = userId === myUserId;

  useEffect(() => {
    const map: Record<string, { count: number; endorsed: boolean }> = {};
    for (const s of skills) {
      const entry = endorsements.find((e) => e.skill === s);
      map[s] = {
        count: entry?.endorsedBy.length ?? 0,
        endorsed: entry?.endorsedBy.includes(myUserId) ?? false,
      };
    }
    setData(map);
  }, [skills, endorsements, myUserId]);

  const endorse = async (skill: string) => {
    if (isOwn || busy) return;
    setBusy(skill);
    try {
      const res = await fetch(`/api/social/profiles/${userId}/endorse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill }),
      });
      if (res.ok) {
        const j = await res.json();
        setData((prev) => ({ ...prev, [skill]: { count: j.count, endorsed: j.endorsed } }));
        toast({ title: j.endorsed ? `Endorsed ${skill}` : `Removed endorsement for ${skill}` });
      }
    } finally {
      setBusy(null);
    }
  };

  if (!skills.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => {
        const info = data[skill] ?? { count: 0, endorsed: false };
        return (
          <button
            key={skill}
            onClick={() => endorse(skill)}
            disabled={isOwn || busy === skill}
            className={[
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all",
              info.endorsed
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50",
              isOwn ? "cursor-default" : "cursor-pointer",
            ].join(" ")}
          >
            <span>{skill}</span>
            {busy === skill ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
                <ThumbsUp className={`h-3 w-3 ${info.endorsed ? "fill-violet-500 text-violet-500" : ""}`} />
                {info.count > 0 && <span>{info.count}</span>}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
