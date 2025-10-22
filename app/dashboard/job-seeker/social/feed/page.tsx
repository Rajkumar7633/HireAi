"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SocialFeedPage() {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]); // data URLs for upload
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [postErr, setPostErr] = useState<string | null>(null);

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

  useEffect(() => {
    loadFeed();
  }, []);

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
          <CardTitle>Your feed</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading feed…</div>
          ) : (
            <div className="space-y-4">
              {feed.map((p: any) => (
                <div key={p._id} className="border rounded p-4 bg-white">
                  <div className="text-sm text-muted-foreground mb-1">{new Date(p.createdAt).toLocaleString()}</div>
                  <div className="whitespace-pre-wrap text-[15px] leading-6">{p.content}</div>
                  {Array.isArray(p.images) && p.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {p.images.map((url: string, idx: number) => (
                        <div key={idx} className="w-full rounded border bg-slate-50 flex items-center justify-center">
                          <img src={url} className="w-full max-h-80 object-contain rounded" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {feed.length === 0 && <div className="text-sm text-muted-foreground">No posts yet.</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
