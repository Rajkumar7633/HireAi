import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";
import { connectDB } from "@/lib/mongodb";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import SocialPost from "@/models/SocialPost";
import SocialConnection from "@/models/SocialConnection";
import SocialRecommendation from "@/models/SocialRecommendation";
import MutualsBlock from "@/components/social/MutualsBlock";
import ControlsBlock from "@/components/social/ControlsBlock";
import ProfileTabs from "@/components/social/ProfileTabs";
import MutualSkillsHighlights from "@/components/social/MutualSkillsHighlights";
import OpenToWorkBadge from "@/components/social/OpenToWorkBadge";
import EndorsableSkills from "@/components/social/EndorsableSkills";
import RecommendationSection from "@/components/social/RecommendationSection";
import PeopleAlsoViewed from "@/components/social/PeopleAlsoViewed";
import ActivityHeatmap from "@/components/social/ActivityHeatmap";
import ShareProfileButton from "@/components/social/ShareProfileButton";
import ProfileViewTracker from "@/components/social/ProfileViewTracker";
import ProfileViewsWidget from "@/components/social/ProfileViewsWidget";
import {
  MapPin, Briefcase, GraduationCap, Globe, Github, Linkedin,
  Calendar, ExternalLink, Building2, Code2, Trophy, Sparkles,
  Target, Clock, Users, Mail, Phone, BookOpen, Star,
  Eye, CheckCircle2, TrendingUp, MessageSquarePlus,
} from "lucide-react";

// ─── auth ─────────────────────────────────────────────────────────────────────

async function getMyId(): Promise<string> {
  try {
    const jar = cookies();
    const token = jar.get("token")?.value || jar.get("auth-token")?.value;
    if (!token) return "";
    const s = await verifyTokenEdge(token);
    return s?.userId ? String(s.userId) : "";
  } catch { return ""; }
}

// ─── data ─────────────────────────────────────────────────────────────────────

async function getData(userId: string) {
  await connectDB();
  const profile = await JobSeekerProfile.findOne({ userId }).lean();
  if (!profile) return null;

  const [posts, edges, connectionsCount, recsCount] = await Promise.all([
    SocialPost.find({ authorId: userId })
      .sort({ createdAt: -1 }).limit(50)
      .select("_id content images createdAt likes commentsCount")
      .lean(),
    SocialConnection.find({ status: "accepted", $or: [{ requesterId: userId }, { addresseeId: userId }] })
      .sort({ updatedAt: -1 }).limit(8)
      .select("requesterId addresseeId updatedAt").lean(),
    SocialConnection.countDocuments({ status: "accepted", $or: [{ requesterId: userId }, { addresseeId: userId }] }),
    SocialRecommendation.countDocuments({ toUserId: userId }),
  ]);

  const peerIds = Array.from(new Set(
    edges.map((e: any) => String(e.requesterId) === String(userId) ? String(e.addresseeId) : String(e.requesterId))
  ));
  const peers = peerIds.length
    ? await JobSeekerProfile.find({ userId: { $in: peerIds } })
        .select("userId firstName lastName email profileImage currentTitle location").lean()
    : [];

  return {
    profile: JSON.parse(JSON.stringify(profile)),
    posts: JSON.parse(JSON.stringify(posts)),
    recentPeers: JSON.parse(JSON.stringify(peers)),
    connectionsCount,
    recsCount,
  } as any;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600", "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",     "from-indigo-500 to-blue-600",
];
function avatarGrad(name: string) {
  let sum = 0; for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const EDU_LABELS: Record<string, string> = {
  "high-school": "High School", associate: "Associate's Degree",
  bachelor: "Bachelor's Degree", master: "Master's Degree",
  phd: "Ph.D.", other: "Other",
};
const WORK_PREF: Record<string, { label: string; color: string }> = {
  remote:   { label: "Remote",   color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  hybrid:   { label: "Hybrid",   color: "bg-blue-50 text-blue-700 border-blue-200" },
  onsite:   { label: "On-site",  color: "bg-orange-50 text-orange-700 border-orange-200" },
  flexible: { label: "Flexible", color: "bg-purple-50 text-purple-700 border-purple-200" },
};

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const hr = Math.floor(diff / 3600000);
  if (hr < 1) return "just now";
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calcCompleteness(p: any): number {
  const checks = [
    !!(p.firstName), !!(p.lastName), !!(p.currentTitle),
    !!(p.location), !!(p.summary), !!(p.profileImage),
    !!(p.bannerImage), p.skills?.length > 0,
    p.experiences?.length > 0, !!(p.education || p.university),
    !!(p.linkedinUrl || p.githubUrl || p.portfolioUrl),
    p.projects?.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// ─── Section card ──────────────────────────────────────────────────────────────

function Section({ id, title, icon, children, badge }: {
  id: string; title: string; icon: React.ReactNode;
  children: React.ReactNode; badge?: React.ReactNode;
}) {
  return (
    <div id={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">{icon}</div>
        <h2 className="font-semibold text-slate-900 text-base flex-1">{title}</h2>
        {badge}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Completeness Ring (SVG) ───────────────────────────────────────────────────

function CompletenessRing({ pct }: { pct: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#8b5cf6" : "#f59e0b";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={88} height={88} viewBox="0 0 88 88">
        <circle cx={44} cy={44} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
        <circle cx={44} cy={44} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 44 44)" />
        <text x="44" y="49" textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>{pct}%</text>
      </svg>
      <p className="text-xs text-slate-500 font-medium text-center">
        Profile {pct >= 80 ? "Complete" : pct >= 50 ? "Good" : "Incomplete"}
      </p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function ProfilePage({ params }: { params: { userId: string } }) {
  const [data, myId] = await Promise.all([getData(params.userId), getMyId()]);
  if (!data) notFound();
  const { profile, posts, recentPeers, connectionsCount, recsCount } = data;
  const name = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || profile.email || "User";
  const initials = `${(profile.firstName || "").charAt(0)}${(profile.lastName || "").charAt(0)}`.toUpperCase() || "U";
  const grad = avatarGrad(name);
  const uid = String(profile.userId);
  const completeness = calcCompleteness(profile);
  const endorsements: { skill: string; endorsedBy: string[] }[] = profile.skillEndorsements || [];

  const hasExperience   = Array.isArray(profile.experiences) && profile.experiences.length > 0;
  const hasEducation    = !!(profile.university || profile.education);
  const hasProjects     = Array.isArray(profile.projects) && profile.projects.length > 0;
  const hasAchievements = Array.isArray(profile.achievements) && profile.achievements.length > 0;
  const hasSkills       = Array.isArray(profile.skills) && profile.skills.length > 0;
  const hasPosts        = posts.length > 0;

  const sectionIds = [
    "about",
    ...(hasExperience  ? ["experience"]   : []),
    ...(hasEducation   ? ["education"]    : []),
    ...(hasSkills      ? ["skills"]       : []),
    ...(hasProjects    ? ["projects"]     : []),
    ...(hasAchievements? ["achievements"] : []),
    "recommendations",
    ...(hasPosts       ? ["activity"]     : []),
    "connections",
  ];

  const wp = WORK_PREF[profile.workPreference] || null;

  // Completeness tips
  const tips: string[] = [];
  if (!profile.summary)          tips.push("Add a professional summary");
  if (!profile.profileImage)     tips.push("Upload a profile photo");
  if (!profile.bannerImage)      tips.push("Add a cover banner");
  if (!profile.skills?.length)   tips.push("Add your top skills");
  if (!profile.experiences?.length) tips.push("Add work experience");
  if (!profile.linkedinUrl && !profile.githubUrl) tips.push("Add LinkedIn or GitHub link");

  return (
    <div className="min-h-screen bg-slate-50/50">

      {/* Silently track profile view (client component, no UI) */}
      <ProfileViewTracker userId={uid} />

      {/* ── Hero banner ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        {/* Banner */}
        <div className="relative h-40 sm:h-52 w-full overflow-hidden">
          {profile.bannerImage
            ? <img src={profile.bannerImage} className="w-full h-full object-cover" />
            : <div className={`w-full h-full bg-gradient-to-r ${grad} opacity-80`} />
          }
          {/* Open To Work overlay on banner */}
          <div className="absolute bottom-3 left-3">
            <OpenToWorkBadge userId={uid} initialValue={!!profile.openToWork} isOwn={myId === uid} />
          </div>
        </div>

        {/* Profile info row */}
        <div className="px-6 sm:px-8">
          <div className="flex items-end gap-4 -mt-12 pb-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {profile.profileImage
                ? <img src={profile.profileImage}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg bg-white"
                  />
                : <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${grad} ring-4 ring-white shadow-lg flex items-center justify-center`}>
                    <span className="text-white font-bold text-2xl">{initials}</span>
                  </div>
              }
              <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white" title="Active" />
            </div>

            {/* Name + title */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{name}</h1>
                {completeness === 100 && (
                  <CheckCircle2 className="h-5 w-5 text-violet-500 shrink-0" title="Complete profile" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                {profile.currentTitle && (
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400" /> {profile.currentTitle}
                  </span>
                )}
                {profile.location && (
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" /> {profile.location}
                  </span>
                )}
                {profile.industry && (
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" /> {profile.industry}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-violet-600 font-semibold">
                  {connectionsCount} connection{connectionsCount !== 1 ? "s" : ""}
                </span>
                {recsCount > 0 && (
                  <span className="text-amber-600 font-medium flex items-center gap-1">
                    <Star className="h-3 w-3" /> {recsCount} recommendation{recsCount !== 1 ? "s" : ""}
                  </span>
                )}
                {profile.university && (
                  <span className="text-slate-500 flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" /> {profile.university}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="hidden sm:flex items-center gap-2 pb-1 shrink-0 flex-wrap justify-end">
              <ShareProfileButton userId={uid} name={name} />
              {myId === uid ? (
                <Link href="/dashboard/job-seeker/profile">
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-semibold hover:bg-violet-100 transition-colors">
                    Edit Profile
                  </button>
                </Link>
              ) : (
                <>
                  <Link href={`/dashboard/messages?userId=${encodeURIComponent(uid)}`}>
                    <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:border-violet-300 hover:text-violet-700 transition-colors bg-white">
                      <Mail className="h-4 w-4" /> Message
                    </button>
                  </Link>
                  <ControlsBlock otherId={uid} />
                </>
              )}
            </div>
          </div>

          {/* Mobile action buttons */}
          <div className="flex sm:hidden items-center gap-2 pb-4 flex-wrap">
            <ShareProfileButton userId={uid} name={name} />
            {myId === uid ? (
              <Link href="/dashboard/job-seeker/profile" className="flex-1">
                <button className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-semibold hover:bg-violet-100 transition-colors">
                  Edit Profile
                </button>
              </Link>
            ) : (
              <>
                <Link href={`/dashboard/messages?userId=${encodeURIComponent(uid)}`} className="flex-1">
                  <button className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:border-violet-300 transition-colors bg-white">
                    <Mail className="h-4 w-4" /> Message
                  </button>
                </Link>
                <div className="flex-1 flex justify-center"><ControlsBlock otherId={uid} /></div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky nav tabs ──────────────────────────────────────────────────── */}
      <ProfileTabs sectionIds={sectionIds} experienceLevel={profile.experienceLevel} profileId={uid} />

      {/* ── Content grid ─────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">

        {/* ── Main column ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* About */}
          <Section id="about" title="About" icon={<Sparkles className="h-4 w-4 text-violet-600" />}>
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Experience", value: `${profile.yearsOfExperience || 0} yrs`, color: "text-violet-600" },
                { label: "Skills",     value: (profile.skills?.length || 0).toString(), color: "text-blue-600" },
                { label: "Projects",   value: (profile.projects?.length || 0).toString(), color: "text-emerald-600" },
                { label: "Connections",value: connectionsCount.toString(), color: "text-amber-600" },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Summary */}
            {profile.summary ? (
              <p className="text-sm text-slate-700 leading-7 whitespace-pre-wrap">{profile.summary}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">No summary provided.</p>
            )}

            {/* Badges row */}
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.desiredRole && (
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-medium">
                  <Target className="h-3 w-3" /> {profile.desiredRole}
                </span>
              )}
              {wp && (
                <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium ${wp.color}`}>
                  <Clock className="h-3 w-3" /> {wp.label}
                </span>
              )}
              {profile.experienceLevel && (
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 capitalize font-medium">
                  {profile.experienceLevel} level
                </span>
              )}
            </div>
          </Section>

          {/* Experience */}
          {hasExperience && (
            <Section id="experience" title="Experience" icon={<Briefcase className="h-4 w-4 text-violet-600" />}>
              <div className="space-y-5">
                {profile.experiences.map((exp: any, i: number) => (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                        <Building2 className="h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{exp.role}</p>
                          <p className="text-sm text-slate-600 font-medium">{exp.company}</p>
                        </div>
                        <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" />
                          {formatDate(exp.startDate)} — {exp.current ? "Present" : formatDate(exp.endDate)}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="text-sm text-slate-600 mt-2 leading-6">{exp.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Education */}
          {hasEducation && (
            <Section id="education" title="Education" icon={<GraduationCap className="h-4 w-4 text-violet-600" />}>
              <div className="flex gap-4">
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
                <div>
                  {profile.university && (
                    <p className="font-semibold text-slate-900 text-sm">{profile.university}</p>
                  )}
                  {profile.education && (
                    <p className="text-sm text-slate-600 mt-0.5">{EDU_LABELS[profile.education] || profile.education}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    {profile.graduationYear && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Class of {profile.graduationYear}</span>}
                    {profile.gpa && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" /> GPA {profile.gpa}</span>}
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* Skills — with endorsements */}
          {hasSkills && (
            <Section id="skills" title="Skills & Endorsements" icon={<Code2 className="h-4 w-4 text-violet-600" />}>
              <EndorsableSkills
                userId={uid}
                skills={profile.skills}
                endorsements={endorsements}
                myUserId={myId}
              />
              <div className="mt-4">
                <MutualSkillsHighlights otherSkills={profile.skills as string[]} otherUserId={uid} />
              </div>
            </Section>
          )}

          {/* Projects */}
          {hasProjects && (
            <Section id="projects" title="Projects" icon={<Code2 className="h-4 w-4 text-violet-600" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.projects.map((proj: any, i: number) => (
                  <div key={i}
                    className="border border-slate-100 rounded-xl p-4 hover:border-violet-200 hover:shadow-sm transition-all bg-slate-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900 text-sm leading-snug">{proj.title}</p>
                      {proj.link && (
                        <a href={proj.link} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 text-violet-500 hover:text-violet-700 transition-colors">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {proj.description && (
                      <p className="text-xs text-slate-500 mt-1.5 leading-5 line-clamp-3">{proj.description}</p>
                    )}
                    {Array.isArray(proj.tags) && proj.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {proj.tags.slice(0, 4).map((t: string, j: number) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Achievements */}
          {hasAchievements && (
            <Section id="achievements" title="Achievements" icon={<Trophy className="h-4 w-4 text-violet-600" />}>
              <ul className="space-y-2.5">
                {profile.achievements.map((a: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                      <Star className="h-3 w-3 text-amber-500" />
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Recommendations */}
          <Section id="recommendations" title="Recommendations"
            icon={<MessageSquarePlus className="h-4 w-4 text-violet-600" />}
            badge={recsCount > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">{recsCount}</span>
            ) : undefined}
          >
            <RecommendationSection userId={uid} myUserId={myId} />
          </Section>

          {/* Activity — posts + heatmap */}
          {hasPosts && (
            <Section id="activity" title="Activity" icon={<TrendingUp className="h-4 w-4 text-violet-600" />}>
              {/* Heatmap */}
              <div className="mb-5">
                <ActivityHeatmap posts={posts} />
              </div>

              {/* Recent posts */}
              <div className="space-y-4">
                {posts.slice(0, 6).map((p: any) => (
                  <div key={p._id} className="border border-slate-100 rounded-xl p-4 hover:border-violet-100 hover:bg-violet-50/20 transition-colors">
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {relTime(p.createdAt)}
                    </p>
                    <p className="text-sm text-slate-700 leading-6 line-clamp-3 whitespace-pre-wrap">{p.content}</p>
                    {Array.isArray(p.images) && p.images.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {p.images.slice(0, 2).map((u: string, i: number) => (
                          <img key={i} src={u} className="rounded-xl border border-slate-100 object-cover h-28 w-full" />
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                      {p.likes > 0 && <span>❤️ {p.likes}</span>}
                      {p.commentsCount > 0 && <span>💬 {p.commentsCount}</span>}
                      <Link href="/dashboard/job-seeker/social/feed"
                        className="ml-auto text-violet-600 hover:text-violet-800 font-medium">
                        View in feed →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Profile Completeness Ring */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-violet-600" />
                </div>
                <h2 className="font-semibold text-slate-900 text-base">Profile Strength</h2>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <CompletenessRing pct={completeness} />
              {tips.length > 0 && (
                <div className="flex-1 space-y-1.5">
                  {tips.slice(0, 3).map((tip, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <span className="mt-0.5 w-3 h-3 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 block" />
                      </span>
                      {tip}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Profile Views (own profile only) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Eye className="h-4 w-4 text-violet-600" />
              </div>
              <h2 className="font-semibold text-slate-900 text-base">Profile Views</h2>
            </div>
            <ProfileViewsWidget />
          </div>

          {/* Connections */}
          <div id="connections" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-violet-600" />
              </div>
              <h2 className="font-semibold text-slate-900 text-base">Connections</h2>
            </div>
            <MutualsBlock userId={uid} />
          </div>

          {/* People Also Viewed */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-slate-500" />
              </div>
              <h2 className="font-semibold text-slate-900 text-base">People Also Viewed</h2>
            </div>
            <PeopleAlsoViewed userId={uid} />
          </div>

          {/* Links */}
          {(profile.linkedinUrl || profile.githubUrl || profile.portfolioUrl) && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-900 text-base mb-4">Links</h2>
              <div className="space-y-2.5">
                {profile.linkedinUrl && (
                  <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-slate-700 hover:text-violet-700 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:bg-blue-100 transition-colors">
                      <Linkedin className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="flex-1 truncate font-medium">LinkedIn</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </a>
                )}
                {profile.githubUrl && (
                  <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-slate-700 hover:text-violet-700 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 group-hover:bg-slate-200 transition-colors">
                      <Github className="h-4 w-4 text-slate-700" />
                    </div>
                    <span className="flex-1 truncate font-medium">GitHub</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </a>
                )}
                {profile.portfolioUrl && (
                  <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-slate-700 hover:text-violet-700 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center border border-violet-100 group-hover:bg-violet-100 transition-colors">
                      <Globe className="h-4 w-4 text-violet-600" />
                    </div>
                    <span className="flex-1 truncate font-medium">Portfolio</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Career Goals */}
          {(profile.desiredRole || profile.workPreference || profile.salaryExpectation || profile.industry) && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-900 text-base mb-4">Career Goals</h2>
              <div className="space-y-3">
                {profile.desiredRole && (
                  <div className="flex items-center gap-2.5">
                    <Target className="h-4 w-4 text-violet-500 shrink-0" />
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">Desired Role</p>
                      <p className="text-sm text-slate-700 font-medium">{profile.desiredRole}</p>
                    </div>
                  </div>
                )}
                {profile.industry && (
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">Industry</p>
                      <p className="text-sm text-slate-700 font-medium">{profile.industry}</p>
                    </div>
                  </div>
                )}
                {profile.workPreference && wp && (
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">Work Style</p>
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium inline-block mt-0.5 ${wp.color}`}>
                        {wp.label}
                      </span>
                    </div>
                  </div>
                )}
                {profile.salaryExpectation && (
                  <div className="flex items-center gap-2.5">
                    <Star className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">Expected Salary</p>
                      <p className="text-sm text-slate-700 font-medium">{profile.salaryExpectation}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact */}
          {profile.email && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-900 text-base mb-4">Contact</h2>
              <div className="space-y-2">
                <a href={`mailto:${profile.email}`}
                  className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-violet-700 transition-colors">
                  <Mail className="h-4 w-4 text-slate-400" /> {profile.email}
                </a>
                {profile.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" /> {profile.phone}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
