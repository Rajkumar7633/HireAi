"use client";

import { useEffect, useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Heart, MessageCircle, Share2, MoreHorizontal, Pencil, Trash2,
  ImagePlus, X, ChevronDown, ChevronUp, EyeOff, Flag, CheckCircle2,
  Users, TrendingUp, Briefcase
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSocialRealtime } from "@/hooks/use-social-realtime";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ─── helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-indigo-500 to-blue-600",
];

function avatarColor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(firstName: string, lastName: string) {
  return `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase() || "U";
}

// ─── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ src, firstName, lastName, size = "md" }: { src?: string; firstName?: string; lastName?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  const name = `${firstName || ""} ${lastName || ""}`.trim();
  if (src) {
    return <img src={src} alt={name} className={`${sizeClass} rounded-full object-cover ring-2 ring-white shrink-0`} />;
  }
  const grad = avatarColor(name || "U");
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center ring-2 ring-white shrink-0`}>
      <span className="text-white font-semibold">{initials(firstName || "", lastName || "")}</span>
    </div>
  );
}

// ─── LinkifiedText ───────────────────────────────────────────────────────────

function LinkifiedText({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[\w.-]+(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?)/gi;
  const parts: (string | { url: string })[] = [];
  let lastIndex = 0;
  text.replace(urlRegex, (match, _p1, offset) => {
    if (offset > lastIndex) parts.push(text.slice(lastIndex, offset));
    parts.push({ url: match });
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return (
    <>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <a key={i} href={part.url} target="_blank" rel="noopener noreferrer"
            className="text-violet-600 hover:text-violet-800 hover:underline break-all font-medium">
            {part.url}
          </a>
        )
      )}
    </>
  );
}

// ─── ImagesBlock ─────────────────────────────────────────────────────────────

function ImagesBlock({ imgs, onOpen }: { imgs: string[]; onOpen?: (index: number) => void }) {
  const n = imgs.length;
  const cls = "rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center cursor-zoom-in";
  if (n === 1) {
    return (
      <div className="mt-3">
        <div className={cls}>
          <img onClick={() => onOpen?.(0)} src={imgs[0]} className="w-full max-h-[560px] object-contain" />
        </div>
      </div>
    );
  }
  if (n === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        {imgs.map((u, i) => (
          <div key={i} className={cls}>
            <img onClick={() => onOpen?.(i)} src={u} className="w-full h-[300px] object-cover" />
          </div>
        ))}
      </div>
    );
  }
  if (n === 3) {
    return (
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className={`col-span-2 ${cls}`}>
          <img onClick={() => onOpen?.(0)} src={imgs[0]} className="w-full h-[340px] object-cover" />
        </div>
        <div className="col-span-1 grid grid-rows-2 gap-2">
          {[1, 2].map((i) => (
            <div key={i} className={cls}>
              <img onClick={() => onOpen?.(i)} src={imgs[i]} className="w-full h-[165px] object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {imgs.slice(0, 4).map((u, i) => (
        <div key={i} className={`${cls} relative`}>
          <img onClick={() => onOpen?.(i)} src={u} className="w-full h-[240px] object-cover" />
          {i === 3 && n > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl cursor-pointer" onClick={() => onOpen?.(3)}>
              <span className="text-white text-2xl font-bold">+{n - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── PostCard ────────────────────────────────────────────────────────────────

function PostCard({
  p, session, copiedId, editingId, editingText, openComments, comments, commentDrafts, expanded,
  onToggleLike, onToggleComments, onShare, onStartEdit, onSaveEdit, onCancelEdit,
  onDeletePost, onHidePost, onReportPost, onSendComment,
  setEditingText, setCommentDrafts, setExpanded, setLightbox,
}: any) {
  const isOwn = session?.id && String(p.authorId) === String(session.id);
  const name = `${p.author?.firstName || ""} ${p.author?.lastName || ""}`.trim() || "User";
  const full = p.content || "";
  const limit = 300;
  const isLong = full.length > limit;
  const showFull = !!expanded[p._id];
  const text = !isLong || showFull ? full : full.slice(0, limit) + "…";

  return (
    <div id={p._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* header */}
      <div className="p-5 pb-3">
        <div className="flex items-start gap-3">
          <a href={p.author?.userId ? `/dashboard/job-seeker/profile/${p.author.userId}` : undefined}>
            <Avatar
              src={p.author?.profileImage}
              firstName={p.author?.firstName}
              lastName={p.author?.lastName}
              size="md"
            />
          </a>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {p.author?.userId ? (
                <a href={`/dashboard/job-seeker/profile/${p.author.userId}`}
                  className="font-semibold text-slate-900 hover:text-violet-700 transition-colors text-sm leading-5">
                  {name}
                </a>
              ) : (
                <span className="font-semibold text-slate-900 text-sm">{name}</span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              {p.author?.currentTitle && (
                <span className="truncate max-w-[200px]">{p.author.currentTitle}</span>
              )}
              {p.author?.location && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{p.author.location}</span>
                </>
              )}
              <span className="text-slate-300">•</span>
              <span>{relativeTime(p.createdAt)}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {isOwn ? (
                <>
                  <DropdownMenuItem onClick={() => onStartEdit(p)} className="gap-2 cursor-pointer">
                    <Pencil className="h-4 w-4" /> Edit post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDeletePost(p._id)}
                    className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                    <Trash2 className="h-4 w-4" /> Delete post
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => onHidePost(p._id)} className="gap-2 cursor-pointer">
                    <EyeOff className="h-4 w-4" /> Hide post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onReportPost(p._id)} className="gap-2 cursor-pointer">
                    <Flag className="h-4 w-4" /> Report post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* body */}
      <div className="px-5 pb-3">
        {editingId === p._id ? (
          <div className="space-y-2">
            <Textarea
              rows={3}
              value={editingText}
              onChange={(e: any) => setEditingText(e.target.value)}
              className="resize-none rounded-xl border-slate-200 focus:border-violet-400 focus:ring-violet-400/20"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onSaveEdit(p._id)}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg h-8 px-4 text-xs">
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelEdit}
                className="rounded-lg h-8 px-4 text-xs text-slate-600">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              <LinkifiedText text={text} />
              {isLong && (
                <button
                  onClick={() => setExpanded((e: any) => ({ ...e, [p._id]: !e[p._id] }))}
                  className="ml-1.5 text-violet-600 text-sm hover:underline font-medium inline-flex items-center gap-0.5"
                >
                  {showFull ? <><ChevronUp className="h-3 w-3" /> See less</> : <><ChevronDown className="h-3 w-3" /> See more</>}
                </button>
              )}
            </div>
            {Array.isArray(p.images) && p.images.length > 0 && (
              <div onClick={(e) => e.stopPropagation()}>
                <ImagesBlock
                  imgs={p.images}
                  onOpen={(idx: number) => setLightbox({ postId: p._id, index: idx })}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* stats row */}
      {((p.likes || 0) > 0 || (p.commentsCount || 0) > 0) && (
        <div className="px-5 py-1.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-50">
          <span>
            {(p.likes || 0) > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-violet-100 flex items-center justify-center">
                  <Heart className="h-2.5 w-2.5 text-violet-600 fill-violet-600" />
                </span>
                {p.likedByMe
                  ? p.likes === 1 ? "You" : `You and ${p.likes - 1} other${p.likes - 1 > 1 ? "s" : ""}`
                  : `${p.likes}`}
              </span>
            )}
          </span>
          {(p.commentsCount || 0) > 0 && (
            <button
              onClick={() => { onToggleComments(p._id); if (!openComments[p._id]) {} }}
              className="hover:underline hover:text-violet-600 transition-colors"
            >
              {p.commentsCount} comment{p.commentsCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      {/* action bar */}
      <div className="px-3 py-1.5 border-t border-slate-100 flex items-center gap-1">
        <button
          onClick={() => onToggleLike(p._id)}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all
            ${p.likedByMe
              ? "text-violet-600 bg-violet-50 hover:bg-violet-100"
              : "text-slate-500 hover:text-violet-600 hover:bg-slate-50"}`}
        >
          <Heart className={`h-4 w-4 transition-all ${p.likedByMe ? "fill-violet-600 scale-110" : ""}`} />
          Like
        </button>
        <button
          onClick={() => { onToggleComments(p._id); }}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all
            ${openComments[p._id]
              ? "text-violet-600 bg-violet-50 hover:bg-violet-100"
              : "text-slate-500 hover:text-violet-600 hover:bg-slate-50"}`}
        >
          <MessageCircle className="h-4 w-4" />
          Comment
        </button>
        <button
          onClick={() => onShare(p._id)}
          className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-violet-600 hover:bg-slate-50 transition-all"
        >
          {copiedId === p._id
            ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-emerald-600">Copied!</span></>
            : <><Share2 className="h-4 w-4" />Share</>}
        </button>
      </div>

      {/* comments section */}
      {openComments[p._id] && (
        <div className="px-5 pb-4 pt-2 bg-slate-50/60 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Write a comment..."
              value={commentDrafts[p._id] || ""}
              onChange={(e: any) => setCommentDrafts((d: any) => ({ ...d, [p._id]: e.target.value }))}
              onKeyDown={(e: any) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendComment(p._id); } }}
              className="flex-1 rounded-full border-slate-200 bg-white text-sm h-9 px-4 focus:border-violet-400 focus:ring-violet-400/20"
            />
            <Button size="sm" onClick={() => onSendComment(p._id)}
              className="rounded-full bg-violet-600 hover:bg-violet-700 text-white h-9 px-4 text-xs">
              Post
            </Button>
          </div>
          <div className="space-y-2.5">
            {(comments[p._id] || []).map((c: any) => (
              <div key={c._id} className="flex items-start gap-2.5">
                <Avatar
                  src={c.author?.profileImage}
                  firstName={c.author?.firstName}
                  lastName={c.author?.lastName}
                  size="sm"
                />
                <div className="flex-1 bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-slate-100 shadow-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-slate-800">
                      {c.author ? `${c.author.firstName || ""} ${c.author.lastName || ""}`.trim() || "User" : "User"}
                    </span>
                    <span className="text-[11px] text-slate-400">{relativeTime(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap leading-5">{c.text}</p>
                </div>
              </div>
            ))}
            {(!comments[p._id] || comments[p._id].length === 0) && (
              <p className="text-xs text-slate-400 text-center py-1">No comments yet — be the first!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SocialFeedPage() {
  const { session } = useSession() as any;
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [postErr, setPostErr] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [lightbox, setLightbox] = useState<{ postId: string; index: number } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── API handlers (unchanged) ─────────────────────────────────────────────

  const hidePost = async (postId: string) => {
    await fetch(`/api/social/posts/${postId}/hide`, { method: "POST" });
    setFeed((prev) => prev.filter((p) => String(p._id) !== String(postId)));
  };

  const reportPost = async (postId: string) => {
    await fetch(`/api/social/posts/${postId}/report`, { method: "POST" });
  };

  const loadFeed = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/feed");
      const json = await res.json();
      setFeed(json?.items || []);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (post: any) => {
    setEditingId(post._id);
    setEditingText(post.content || "");
  };
  const cancelEdit = () => { setEditingId(null); setEditingText(""); };
  const saveEdit = async (postId: string) => {
    const text = editingText.trim();
    if (!text) return;
    const res = await fetch(`/api/social/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    if (res.ok) {
      setFeed((prev) => prev.map((p) => (String(p._id) === String(postId) ? { ...p, content: text } : p)));
      cancelEdit();
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/social/posts/${postId}`, { method: "DELETE" });
    if (res.ok) setFeed((prev) => prev.filter((p) => String(p._id) !== String(postId)));
  };

  const toggleLike = async (postId: string) => {
    try {
      const res = await fetch("/api/social/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) return;
      const j = await res.json();
      setFeed((prev) =>
        prev.map((p) =>
          String(p._id) === String(postId) ? { ...p, likes: j.likes, likedByMe: j.liked } : p
        )
      );
    } catch {}
  };

  const loadComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/social/posts/${postId}/comments`);
      const j = await res.json();
      setComments((prev) => ({ ...prev, [postId]: j.items || [] }));
    } catch {
      setComments((prev) => ({ ...prev, [postId]: [] }));
    }
  };

  const sendComment = async (postId: string) => {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/social/posts/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, text }),
      });
      if (!res.ok) return;
      const j = await res.json();
      setCommentDrafts((d) => ({ ...d, [postId]: "" }));
      setComments((prev) => ({ ...prev, [postId]: [j.comment, ...(prev[postId] || [])] }));
      setFeed((prev) =>
        prev.map((p) => (String(p._id) === String(postId) ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p))
      );
    } catch {}
  };

  const sharePost = async (postId: string) => {
    try {
      const url = `${window.location.origin}/dashboard/job-seeker/social/feed#${postId}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(postId);
      setTimeout(() => setCopiedId((v) => (v === postId ? null : v)), 1600);
    } catch {}
  };

  const createPost = async () => {
    if (!content.trim() && images.length === 0) return;
    setBusy(true);
    setPostErr(null);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, images }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        try {
          const j = JSON.parse(txt);
          throw new Error(j?.error || "Upload failed");
        } catch (e: any) {
          throw new Error(e?.message || txt || "Upload failed");
        }
      }
      setContent("");
      setImages([]);
      loadFeed();
    } catch (e: any) {
      setPostErr(e?.message || "Failed to post");
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    setPreviewErr(null);
    if (!files) return;
    const arr = Array.from(files).slice(0, 4);
    const toCompressedDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxDim = 1280;
            let { width, height } = img;
            if (width > height && width > maxDim) { height = (height * maxDim) / width; width = maxDim; }
            else if (height > width && height > maxDim) { width = (width * maxDim) / height; height = maxDim; }
            canvas.width = Math.round(width);
            canvas.height = Math.round(height);
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("canvas error"));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          };
          img.onerror = () => reject(new Error("image decode error"));
          img.src = reader.result as string;
        };
        reader.onerror = () => reject(new Error("read error"));
        reader.readAsDataURL(file);
      });
    try {
      const dataUrls = await Promise.all(arr.map(toCompressedDataUrl));
      setImages((prev) => [...prev, ...dataUrls].slice(0, 4));
    } catch (e: any) {
      setPreviewErr(e?.message || "Unable to preview images");
    }
  };

  const toggleComments = (postId: string) => {
    const willOpen = !openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: willOpen }));
    if (willOpen) loadComments(postId);
  };

  useEffect(() => { loadFeed(); }, []);

  useSocialRealtime({
    onLike: ({ postId, likes }: any) => {
      setFeed((prev) => prev.map((p) => (String(p._id) === String(postId) ? { ...p, likes } : p)));
    },
    onComment: ({ postId, commentsCount, comment }: any) => {
      setFeed((prev) => prev.map((p) => (String(p._id) === String(postId) ? { ...p, commentsCount } : p)));
      setComments((map) => (map[postId] ? { ...map, [postId]: [comment, ...map[postId]] } : map));
    },
  });

  const sessionName = session?.name || "";
  const sessionFirstName = sessionName.split(" ")[0] || "";
  const sessionLastName = sessionName.split(" ").slice(1).join(" ") || "";

  return (
    <div className="p-6 space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Professional Feed</h1>
            <p className="text-sm text-slate-500 mt-0.5">Stay connected with your network</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white rounded-xl border border-slate-100 px-3 py-2 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live updates
          </div>
        </div>

        {/* Post Composer */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Avatar firstName={sessionFirstName} lastName={sessionLastName} size="md" />
            <Textarea
              rows={3}
              placeholder="Share an achievement, insight, or update with your network..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 resize-none rounded-xl border-slate-200 focus:border-violet-400 focus:ring-violet-400/20 text-sm placeholder:text-slate-400"
            />
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 pl-13">
              {images.map((src, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden bg-slate-100 aspect-square">
                  <img src={src} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(previewErr || postErr) && (
            <p className="text-xs text-red-500">{previewErr || postErr}</p>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors font-medium"
              >
                <ImagePlus className="h-4 w-4" />
                Photo
              </button>
              <span className="text-xs text-slate-400">{images.length}/4</span>
            </div>
            <Button
              onClick={createPost}
              disabled={busy || (!content.trim() && images.length === 0)}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-5 h-9 text-sm font-semibold disabled:opacity-40"
            >
              {busy ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-36 bg-slate-200 rounded-full" />
                    <div className="h-2.5 w-52 bg-slate-200 rounded-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-200 rounded-full" />
                  <div className="h-3 w-5/6 bg-slate-200 rounded-full" />
                  <div className="h-3 w-3/4 bg-slate-200 rounded-full" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="h-40 bg-slate-200 rounded-xl" />
                  <div className="h-40 bg-slate-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : feed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-violet-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Nothing here yet</h3>
            <p className="text-sm text-slate-500 mt-1.5">Be the first to share something with your network.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feed.map((p: any) => (
              <PostCard
                key={p._id}
                p={p}
                session={session}
                copiedId={copiedId}
                editingId={editingId}
                editingText={editingText}
                openComments={openComments}
                comments={comments}
                commentDrafts={commentDrafts}
                expanded={expanded}
                onToggleLike={toggleLike}
                onToggleComments={toggleComments}
                onShare={sharePost}
                onStartEdit={startEdit}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onDeletePost={deletePost}
                onHidePost={hidePost}
                onReportPost={reportPost}
                onSendComment={sendComment}
                setEditingText={setEditingText}
                setCommentDrafts={setCommentDrafts}
                setExpanded={setExpanded}
                setLightbox={setLightbox}
              />
            ))}
          </div>
        )}

      {/* Lightbox */}
      {lightbox && (
        <Dialog open={true} onOpenChange={(o) => !o && setLightbox(null)}>
          <DialogContent className="max-w-4xl p-0 bg-black border-0 rounded-2xl overflow-hidden">
            <div className="relative w-[85vw] max-w-4xl h-[80vh] flex items-center justify-center">
              {(() => {
                const p = feed.find((x) => String(x._id) === String(lightbox.postId));
                const imgs = p?.images || [];
                const idx = lightbox.index;
                const go = (d: number) =>
                  setLightbox((s) =>
                    !s || imgs.length === 0 ? null : { postId: s.postId, index: (s.index + d + imgs.length) % imgs.length }
                  );
                return (
                  <>
                    {imgs.length > 1 && (
                      <button
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition-colors z-10"
                        onClick={() => go(-1)}
                      >
                        ‹
                      </button>
                    )}
                    <img src={imgs[idx]} className="max-w-full max-h-full object-contain" />
                    {imgs.length > 1 && (
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition-colors z-10"
                        onClick={() => go(1)}
                      >
                        ›
                      </button>
                    )}
                    {imgs.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {imgs.map((_: any, i: number) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/40"}`} />
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
