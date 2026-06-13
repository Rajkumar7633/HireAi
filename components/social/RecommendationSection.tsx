"use client";
import { useEffect, useState } from "react";
import { Star, ChevronDown, ChevronUp, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Rec {
  _id: string;
  fromUserId: string;
  recommenderName: string;
  recommenderTitle: string;
  recommenderImage: string;
  relationship: string;
  text: string;
  createdAt: string;
}

interface Props {
  userId: string;
  myUserId: string;
}

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600", "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600", "from-orange-500 to-amber-600",
];
function grad(name: string) {
  let s = 0; for (let i = 0; i < name.length; i++) s += name.charCodeAt(i);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export default function RecommendationSection({ userId, myUserId }: Props) {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [relationship, setRelationship] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const isOwn = userId === myUserId;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/recommendations/${userId}`, { cache: "no-store" });
      const j = res.ok ? await res.json() : { recommendations: [] };
      setRecs(Array.isArray(j.recommendations) ? j.recommendations : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  const submit = async () => {
    if (submitting || text.trim().length < 20) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/social/recommendations/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), relationship }),
      });
      if (res.ok) {
        toast({ title: "Recommendation submitted!" });
        setText(""); setRelationship(""); setShowForm(false);
        await load();
      } else {
        const j = await res.json();
        toast({ title: j.error || "Error", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Write recommendation */}
      {!isOwn && myUserId && (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-medium hover:bg-violet-100 transition-colors"
            >
              <Plus className="h-4 w-4" /> Write a Recommendation
            </button>
          ) : (
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50">
              <p className="text-sm font-semibold text-slate-700">Write a Recommendation</p>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                <option value="">Relationship (optional)</option>
                <option value="Former colleague">Former colleague</option>
                <option value="Manager">Manager</option>
                <option value="Direct report">Direct report</option>
                <option value="Mentor">Mentor</option>
                <option value="Classmate">Classmate</option>
                <option value="Client">Client</option>
              </select>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share your experience working with this person (min 20 characters)..."
                maxLength={1000}
                className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{text.length}/1000</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowForm(false); setText(""); }}
                    className="px-3 py-1.5 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting || text.trim().length < 20}
                    className="px-4 py-1.5 rounded-xl text-sm bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3 p-4 rounded-2xl bg-slate-50">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-32" />
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-3 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : recs.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">No recommendations yet.</p>
      ) : (
        <div className="space-y-3">
          {recs.map((rec) => {
            const name = rec.recommenderName || "Anonymous";
            const isExpanded = expanded === rec._id;
            const short = rec.text.length > 200 && !isExpanded;
            return (
              <div key={rec._id} className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  {rec.recommenderImage ? (
                    <img src={rec.recommenderImage} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad(name)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-xs font-bold">{initials(name)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{name}</p>
                    {rec.recommenderTitle && <p className="text-xs text-slate-500">{rec.recommenderTitle}</p>}
                    {rec.relationship && (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-600 border border-violet-100">
                        {rec.relationship}
                      </span>
                    )}
                  </div>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {short ? rec.text.slice(0, 200) + "…" : rec.text}
                </p>
                {rec.text.length > 200 && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : rec._id)}
                    className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
                  >
                    {isExpanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Read more</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
