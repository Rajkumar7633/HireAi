"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { useSocialRealtime } from "@/hooks/use-social-realtime";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Link from "next/link";

export default function SocialFeedPage() {
  const { session } = useSession() as any;
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]); // data URLs for upload
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
  const hidePost = async (postId: string) => {
    await fetch(`/api/social/posts/${postId}/hide`, { method: "POST" });
    setFeed((prev) => prev.filter((p) => String(p._id) !== String(postId)));
  };
  const reportPost = async (postId: string) => {
    await fetch(`/api/social/posts/${postId}/report`, { method: "POST" });
    // keep visible; optionally toast
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
  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };
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
    if (res.ok) {
      setFeed((prev) => prev.filter((p) => String(p._id) !== String(postId)));
    }
  };

  // Linkify helper
  const LinkifiedText = ({ text }: { text: string }) => {
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
            <a key={i} href={part.url} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline break-all">
              {part.url}
            </a>
          )
        )}
      </>
    );
  };

  // Image grids
  const ImagesBlock = ({ imgs, onOpen }: { imgs: string[]; onOpen?: (index: number) => void }) => {
    const n = imgs.length;
    if (n === 1) {
      return (
        <div className="mt-3">
          <div className="rounded border bg-slate-50 flex items-center justify-center">
            <img onClick={() => onOpen?.(0)} src={imgs[0]} className="w-full max-h-[560px] object-contain rounded cursor-zoom-in" />
          </div>
        </div>
      );
    }
    if (n === 2) {
      return (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {imgs.map((u, i) => (
            <div key={i} className="rounded border bg-slate-50 flex items-center justify-center">
              <img onClick={() => onOpen?.(i)} src={u} className="w-full h-[320px] object-contain rounded cursor-zoom-in" />
            </div>
          ))}
        </div>
      );
    }
    if (n === 3) {
      return (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="col-span-2 rounded border bg-slate-50 flex items-center justify-center">
            <img onClick={() => onOpen?.(0)} src={imgs[0]} className="w-full h-[360px] object-contain rounded cursor-zoom-in" />
          </div>
          <div className="col-span-1 grid grid-rows-2 gap-2">
            <div className="rounded border bg-slate-50 flex items-center justify-center">
              <img onClick={() => onOpen?.(1)} src={imgs[1]} className="w-full h-[178px] object-contain rounded cursor-zoom-in" />
            </div>
            <div className="rounded border bg-slate-50 flex items-center justify-center">
              <img onClick={() => onOpen?.(2)} src={imgs[2]} className="w-full h-[178px] object-contain rounded cursor-zoom-in" />
            </div>
          </div>
        </div>
      );
    }
    // 4 or more -> show first 4 in 2x2
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        {imgs.slice(0, 4).map((u, i) => (
          <div key={i} className="rounded border bg-slate-50 flex items-center justify-center">
            <img onClick={() => onOpen?.(i)} src={u} className="w-full h-[260px] object-contain rounded cursor-zoom-in" />
          </div>
        ))}
      </div>
    );
  };

  // Helpers
  const likeSummary = (likedByMe: boolean, likes: number | undefined) => {
    const n = likes || 0;
    if (n === 0) return "";
    if (likedByMe) {
      const others = Math.max(0, n - 1);
      return others === 0 ? "You like this" : `You and ${others} other${others > 1 ? "s" : ""} like this`;
    }
    return `${n} like${n > 1 ? "s" : ""}`;
  };

  const sharePost = async (postId: string) => {
    try {
      const url = `${window.location.origin}/dashboard/job-seeker/social/feed#${postId}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(postId);
      setTimeout(() => setCopiedId((v) => (v === postId ? null : v)), 1600);
    } catch {}
  };

  // Likes
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
          String(p._id) === String(postId)
            ? { ...p, likes: j.likes, likedByMe: j.liked }
            : p
        )
      );
    } catch {}
  };

  // Comments
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
      setFeed((prev) => prev.map((p) => (String(p._id) === String(postId) ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p)));
    } catch {}
  };

  useEffect(() => {
    loadFeed();
  }, []);

  // Realtime listeners
  useSocialRealtime({
    onLike: ({ postId, likes }) => {
      setFeed((prev) => prev.map((p) => (String(p._id) === String(postId) ? { ...p, likes } : p)));
    },
    onComment: ({ postId, commentsCount, comment }) => {
      setFeed((prev) => prev.map((p) => (String(p._id) === String(postId) ? { ...p, commentsCount } : p)));
      // If thread open and comments loaded
      setComments((map) => (map[postId] ? { ...map, [postId]: [comment, ...map[postId]] } : map));
    },
  });

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
            const maxDim = 1280; // limit long edge
            let { width, height } = img;
            if (width > height && width > maxDim) {
              height = (height * maxDim) / width;
              width = maxDim;
            } else if (height > width && height > maxDim) {
              width = (width * maxDim) / height;
              height = maxDim;
            }
            canvas.width = Math.round(width);
            canvas.height = Math.round(height);
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("canvas error"));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const quality = 0.82; // decent quality
            const out = canvas.toDataURL("image/jpeg", quality);
            resolve(out);
          };
          img.onerror = () => reject(new Error("image decode error"));
          img.src = reader.result as string;
        };
        reader.onerror = () => reject(new Error("read error"));
        reader.readAsDataURL(file);
      });
    try {
      const dataUrls = await Promise.all(arr.map(toCompressedDataUrl));
      setImages(dataUrls);
    } catch (e: any) {
      setPreviewErr(e?.message || "Unable to preview images");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Share an achievement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={3} placeholder="I just shipped a new feature..." value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="flex items-center gap-3">
            <Input type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="max-w-xs" />
            <span className="text-xs text-muted-foreground">Up to 4 images</span>
          </div>
          {previewErr && <div className="text-xs text-red-600">{previewErr}</div>}
          {postErr && <div className="text-xs text-red-600">{postErr}</div>}
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {images.map((src, i) => (
                <div key={i} className="w-full rounded border bg-slate-50 flex items-center justify-center">
                  <img src={src} className="w-full max-h-64 object-contain rounded" />
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={createPost} disabled={busy || (!content.trim() && images.length === 0)}>Post</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feed</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded p-4 bg-white animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200" />
                    <div className="flex-1">
                      <div className="h-3 w-40 bg-slate-200 rounded mb-2" />
                      <div className="h-2 w-64 bg-slate-200 rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-5/6 bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-2/3 bg-slate-200 rounded mb-4" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-32 bg-slate-200 rounded" />
                    <div className="h-32 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {feed.map((p: any) => (
                <div key={p._id} id={p._id} className="border rounded p-4 bg-white">
                  {/* Author header */}
                  <div className="flex items-start gap-3 mb-2">
                    <a href={p.author?.userId ? `/dashboard/job-seeker/profile/${p.author.userId}` : undefined} className="shrink-0">
                      <img
                        src={p.author?.profileImage || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent((p.author?.firstName||'')+' '+(p.author?.lastName||''))}`}
                        alt="avatar"
                        className="w-10 h-10 rounded-full border object-cover"
                      />
                    </a>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium leading-5">
                        {p.author?.userId ? (
                          <a href={`/dashboard/job-seeker/profile/${p.author.userId}`} className="hover:underline">
                            {`${p.author?.firstName || ''} ${p.author?.lastName || ''}`.trim() || 'User'}
                          </a>
                        ) : (
                          <>{`${p.author?.firstName || ''} ${p.author?.lastName || ''}`.trim() || 'User'}</>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                        <span className="truncate max-w-[220px]">{p.author?.currentTitle}</span>
                        {p.author?.location && <span>• {p.author.location}</span>}
                        <span>• {new Date(p.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {/* Owner menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {session?.id && String(p.authorId) === String(session.id) ? (
                          <>
                            <DropdownMenuItem onClick={() => startEdit(p)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit post
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deletePost(p._id)} className="text-red-600 focus:text-red-600">
                              <Trash className="h-4 w-4 mr-2" /> Delete post
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => hidePost(p._id)}>Hide post</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => reportPost(p._id)}>Report post</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {editingId === p._id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea rows={3} value={editingText} onChange={(e) => setEditingText(e.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(p._id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap text-[15px] leading-6">
                        {(() => {
                          const full = p.content || "";
                          const limit = 220;
                          const isLong = full.length > limit;
                          const showFull = !!expanded[p._id];
                          const text = !isLong || showFull ? full : full.slice(0, limit) + "…";
                          return (
                            <>
                              <LinkifiedText text={text} />
                              {isLong && (
                                <button
                                  onClick={() => setExpanded((e) => ({ ...e, [p._id]: !e[p._id] }))}
                                  className="ml-2 text-teal-700 text-sm hover:underline"
                                >
                                  {showFull ? "See less" : "See more"}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {Array.isArray(p.images) && p.images.length > 0 && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <ImagesBlock
                            imgs={p.images}
                            onOpen={(idx) => setLightbox({ postId: p._id, index: idx })}
                          />
                        </div>
                      )}
                    </>
                  )}
                  {/* Action bar */}
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <button
                      onClick={() => toggleLike(p._id)}
                      className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded hover:bg-slate-50 transition ${p.likedByMe ? "text-teal-700" : "hover:text-teal-700"}`}
                    >
                      <Heart className={`h-4 w-4 ${p.likedByMe ? "fill-teal-600 text-teal-600" : ""}`} />
                      <span className="font-medium">Like</span>
                      <span>• {p.likes || 0}</span>
                    </button>
                    <button
                      onClick={() => {
                        setOpenComments((prev) => ({ ...prev, [p._id]: !prev[p._id] }));
                        if (!openComments[p._id]) loadComments(p._id);
                      }}
                      className="group inline-flex items-center gap-2 px-3 py-1.5 rounded hover:bg-slate-50 transition hover:text-teal-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="font-medium">Comment</span>
                      <span>• {p.commentsCount || 0}</span>
                    </button>
                    <button onClick={() => sharePost(p._id)} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded hover:bg-slate-50 transition hover:text-teal-700">
                      <Share2 className="h-4 w-4" />
                      <span className="font-medium">{copiedId === p._id ? "Link copied" : "Share"}</span>
                    </button>
                  </div>
                  {/* Like summary */}
                  {likeSummary(p.likedByMe, p.likes) && (
                    <div className="mt-1 text-xs text-muted-foreground">{likeSummary(p.likedByMe, p.likes)}</div>
                  )}

                  {/* Comments */}
                  {openComments[p._id] && (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Write a comment..."
                          value={commentDrafts[p._id] || ""}
                          onChange={(e) => setCommentDrafts((d) => ({ ...d, [p._id]: e.target.value }))}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={() => sendComment(p._id)}>Post</Button>
                      </div>
                      <div className="space-y-2">
                        {(comments[p._id] || []).map((c: any) => (
                          <div key={c._id} className="flex items-start gap-2">
                            <img
                              src={c.author?.profileImage || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent((c.author?.firstName||'')+' '+(c.author?.lastName||''))}`}
                              className="w-8 h-8 rounded-full border object-cover"
                            />
                            <div className="bg-slate-50 rounded px-3 py-2">
                              <div className="text-xs font-medium">
                                {c.author ? `${c.author.firstName||''} ${c.author.lastName||''}`.trim() : "User"}
                                <span className="text-muted-foreground font-normal ml-2">{new Date(c.createdAt).toLocaleString()}</span>
                              </div>
                              <div className="text-sm whitespace-pre-wrap">{c.text}</div>
                            </div>
                          </div>
                        ))}
                        {(!comments[p._id] || comments[p._id].length === 0) && (
                          <div className="text-xs text-muted-foreground">No comments yet.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {feed.length === 0 && <div className="text-sm text-muted-foreground">No posts yet.</div>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightbox && (
        <Dialog open={true} onOpenChange={(o) => !o && setLightbox(null)}>
          <DialogContent className="max-w-4xl p-0 bg-black">
            <div className="relative w-[85vw] max-w-4xl h-[80vh] flex items-center justify-center">
              {(() => {
                const p = feed.find((x) => String(x._id) === String(lightbox.postId));
                const imgs = p?.images || [];
                const idx = lightbox.index;
                const go = (d: number) => setLightbox((s) => (!s || imgs.length === 0 ? null : { postId: s.postId, index: (s.index + d + imgs.length) % imgs.length }));
                return (
                  <>
                    <button className="absolute left-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white" onClick={() => go(-1)} aria-label="Prev">‹</button>
                    <img src={imgs[idx]} className="max-w-full max-h-full object-contain" />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white" onClick={() => go(1)} aria-label="Next">›</button>
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
