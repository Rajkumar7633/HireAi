"use client";

import { useMemo } from "react";
import { useSession } from "@/hooks/use-session";
import { useRouter } from "next/navigation";

interface Props {
  otherSkills: string[];
  otherUserId: string;
}

export default function MutualSkillsHighlights({ otherSkills, otherUserId }: Props) {
  const { session } = useSession() as any;
  const router = useRouter();

  const { mutualSkills, mutualVerifiedCount } = useMemo(() => {
    try {
      const mineRaw = (((session as any)?.user as any)?.skills || []) as any[];
      const myNames = new Set<string>();
      const myVerified = new Set<string>();
      for (const s of mineRaw) {
        const name = typeof s === "string" ? s : s?.name;
        if (name && typeof name === "string") {
          const k = name.toLowerCase().trim();
          if (k) {
            myNames.add(k);
            if ((s as any)?.verified) myVerified.add(k);
          }
        }
      }
      const unique: string[] = [];
      const verifiedShared: Set<string> = new Set();
      const seen: Record<string, 1> = {};
      for (const raw of otherSkills || []) {
        const k = String(raw || "").toLowerCase().trim();
        if (k && myNames.has(k) && !seen[k]) {
          seen[k] = 1;
          unique.push(raw);
          if (myVerified.has(k)) verifiedShared.add(k);
        }
      }
      return { mutualSkills: unique, mutualVerifiedCount: verifiedShared.size };
    } catch {
      return { mutualSkills: [] as string[], mutualVerifiedCount: 0 };
    }
  }, [session, otherSkills.join("||")]);

  if (!mutualSkills.length) return null;

  const primarySkill = mutualSkills[0];

  const goToMessages = (intent: string) => {
    if (!otherUserId) return;
    const url = new URL(window.location.origin + "/dashboard/messages");
    url.searchParams.set("userId", String(otherUserId));
    url.searchParams.set("intent", intent);
    if (primarySkill) url.searchParams.set("skill", primarySkill);
    router.push(url.toString().replace(window.location.origin, ""));
  };

  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-xs font-medium text-emerald-900 mb-1">
            Mutual skills with you
          </div>
          <div className="flex flex-wrap gap-1">
            {mutualSkills.slice(0, 8).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] text-emerald-800"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {skill}
              </span>
            ))}
            {mutualSkills.length > 8 && (
              <span className="text-[11px] text-emerald-900/80">
                +{mutualSkills.length - 8} more
              </span>
            )}
          </div>
          {mutualVerifiedCount > 0 && (
            <div className="mt-1 text-[11px] text-emerald-900/80">
              {mutualVerifiedCount} of these are verified on your profile.
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 min-w-[150px]">
          <button
            type="button"
            className="text-[11px] px-2 py-1 rounded border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-left"
            onClick={() => goToMessages("collab")}
          >
            Suggest collaboration{primarySkill ? ` on ${primarySkill}` : ""}
          </button>
          <button
            type="button"
            className="text-[11px] px-2 py-1 rounded border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-left"
            onClick={() => goToMessages("mock-interview")}
          >
            Invite to mock interview{primarySkill ? ` for ${primarySkill}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
