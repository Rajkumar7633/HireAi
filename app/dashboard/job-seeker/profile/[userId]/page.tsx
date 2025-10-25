import { notFound } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import SocialPost from "@/models/SocialPost";
import SocialConnection from "@/models/SocialConnection";
import MutualsBlock from "@/components/social/MutualsBlock";
import ControlsBlock from "@/components/social/ControlsBlock";
import ProfileTabs from "@/components/social/ProfileTabs";

async function getData(userId: string) {
  await connectDB();
  const profile = await JobSeekerProfile.findOne({ userId }).lean();
  if (!profile) return null;
  const posts = await SocialPost.find({ authorId: userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("_id content images createdAt")
    .lean();
  const edges = await SocialConnection.find({
    status: "accepted",
    $or: [{ requesterId: userId }, { addresseeId: userId }],
  })
    .sort({ updatedAt: -1 })
    .limit(8)
    .select("requesterId addresseeId updatedAt")
    .lean();
  const peerIds = Array.from(
    new Set(
      edges.map((e: any) => String(e.requesterId) === String(userId) ? String(e.addresseeId) : String(e.requesterId))
    )
  );
  const peers = peerIds.length
    ? await JobSeekerProfile.find({ userId: { $in: peerIds } })
        .select("userId firstName lastName email profileImage currentTitle")
        .lean()
    : [];
  return {
    profile: JSON.parse(JSON.stringify(profile)),
    posts: JSON.parse(JSON.stringify(posts)),
    recentPeers: JSON.parse(JSON.stringify(peers)),
    connectionsCount: await SocialConnection.countDocuments({ status: "accepted", $or: [{ requesterId: userId }, { addresseeId: userId }] }),
  } as any;
}

export default async function ProfilePage({ params }: { params: { userId: string } }) {
  const data = await getData(params.userId);
  if (!data) notFound();
  const { profile, posts, recentPeers, connectionsCount } = data;
  const name = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();

  return (
    <div className="space-y-6">
      {/* Banner header */}
      <div className="w-full bg-white border-b">
        <div className="h-40 md:h-52 w-full overflow-hidden">
          {profile.bannerImage ? (
            <img src={profile.bannerImage} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-100 to-slate-200" />
          )}
        </div>
        <div className="max-w-6xl mx-auto -mt-12 px-6 pb-4 flex items-end gap-4">
          <img
            src={profile.profileImage || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name || profile.email || "User")}`}
            className="w-20 h-20 rounded-full border-2 border-white object-cover bg-white"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xl font-semibold">{name || profile.email}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>{profile.currentTitle}{profile.location ? ` • ${profile.location}` : ""}</span>
              {profile.university && <span className="inline-flex items-center rounded bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5">{profile.university}</span>}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Link href={`/dashboard/messages?userId=${encodeURIComponent(String(profile.userId))}`} className="inline-flex">
              <button className="px-3 py-1.5 border rounded text-sm">Message</button>
            </Link>
            <div className="inline-flex"><ControlsBlock otherId={String(profile.userId)} /></div>
            <Link href={`/dashboard/job-seeker/social/search`} className="inline-flex">
              <button className="px-3 py-1.5 border rounded text-sm">Find more</button>
            </Link>
          </div>
        </div>
      </div>
      {/* Section nav */}
      <ProfileTabs sectionIds={["about","connections","posts","activity"]} experienceLevel={profile.experienceLevel} />
      {/* Content grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
        {/* Main column */}
        <div className="md:col-span-2 space-y-6">
          <div id="about" className="bg-white rounded border p-6">
            <div className="flex items-start gap-4">
              <img
                src={profile.profileImage || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name || profile.email || "User")}`}
                className="w-20 h-20 rounded-full border object-cover"
              />
              <div className="flex-1">
                <div className="text-xl font-semibold">{name || profile.email}</div>
                <div className="text-sm text-muted-foreground">{profile.currentTitle}{profile.location ? ` • ${profile.location}` : ""}</div>
                {profile.email && (
                  <div className="text-xs text-muted-foreground mt-1">{profile.email}</div>
                )}
              </div>
            </div>
            {/* About body */}
            <div className="mt-4 space-y-4">
              <div className="text-sm font-medium text-slate-700 border-b pb-1">About</div>
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border rounded p-2">
                  <div className="text-xs text-muted-foreground">Experience</div>
                  <div className="text-sm font-semibold">{Number((profile as any).yearsOfExperience || 0)} yrs</div>
                </div>
                <div className="border rounded p-2">
                  <div className="text-xs text-muted-foreground">Projects</div>
                  <div className="text-sm font-semibold">{Array.isArray((profile as any).projects) ? (profile as any).projects.length : 0}</div>
                </div>
                <div className="border rounded p-2">
                  <div className="text-xs text-muted-foreground">Skills</div>
                  <div className="text-sm font-semibold">{Array.isArray(profile.skills) ? profile.skills.length : 0}</div>
                </div>
              </div>
              {profile.university && (
                <div className="text-sm"><span className="font-medium">University:</span> <span className="text-muted-foreground">{profile.university}</span></div>
              )}
              {profile.summary && (
                <div className="text-sm whitespace-pre-wrap leading-6">{profile.summary}</div>
              )}
              {Array.isArray(profile.skills) && profile.skills.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {profile.skills.slice(0, 12).map((s: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-slate-50 border rounded">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Posts */}
          <div id="posts" className="bg-white rounded border p-6">
            <div className="text-sm font-medium text-slate-700 border-b pb-1 mb-3">Recent posts</div>
            {posts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No posts yet.</div>
            ) : (
              <div className="space-y-4">
                {posts.map((p: any) => (
                  <div key={p._id} className="border rounded p-4">
                    <div className="text-xs text-muted-foreground mb-1">{new Date(p.createdAt).toLocaleString()}</div>
                    <div className="whitespace-pre-wrap text-[15px] leading-6 mb-2">{p.content}</div>
                    {Array.isArray(p.images) && p.images.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {p.images.map((u: string, i: number) => (
                          <img key={i} src={u} className="rounded border" />
                        ))}
                      </div>
                    )}
                    <div className="mt-3">
                      <Link href={`/dashboard/job-seeker/social/posts/${p._id}`} className="text-teal-700 text-sm hover:underline">Open post</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          <div id="activity" className="bg-white rounded border p-6">
            <div className="text-sm font-medium text-slate-700 border-b pb-1 mb-2">Recent activity</div>
            <div className="text-sm text-muted-foreground">Connections and posts over the last few weeks.</div>
            {posts.length === 0 && (!recentPeers || recentPeers.length === 0) ? (
              <div className="text-sm text-muted-foreground mt-3">No recent activity.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {recentPeers?.slice(0,3).map((p: any, i: number) => (
                  <div key={`act-c-${i}`} className="text-sm">Connected with <a className="text-teal-700 hover:underline" href={`/dashboard/job-seeker/profile/${p.userId}`}>{`${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email}</a></div>
                ))}
                {posts.slice(0,3).map((p: any) => (
                  <div key={`act-p-${p._id}`} className="text-sm">Posted <a className="text-teal-700 hover:underline" href={`/dashboard/job-seeker/social/posts/${p._id}`}>an update</a> • {new Date(p.createdAt).toLocaleDateString()}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div id="connections" className="bg-white rounded border p-6">
            <div className="text-sm font-medium text-slate-700 border-b pb-1 mb-2">Connections</div>
            <div className="text-sm text-muted-foreground mb-3">{connectionsCount || 0} connections</div>
            <MutualsBlock userId={String(profile.userId)} />
          </div>
          <div className="bg-white rounded border p-6">
            <div className="text-sm font-medium text-slate-700 border-b pb-1 mb-2">Links</div>
            <div className="text-sm space-y-1">
              {profile.linkedinUrl && <a className="text-teal-700 hover:underline block" href={profile.linkedinUrl} target="_blank">LinkedIn</a>}
              {profile.githubUrl && <a className="text-teal-700 hover:underline block" href={profile.githubUrl} target="_blank">GitHub</a>}
              {profile.portfolioUrl && <a className="text-teal-700 hover:underline block" href={profile.portfolioUrl} target="_blank">Portfolio</a>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
