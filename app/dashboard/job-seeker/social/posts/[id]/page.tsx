import { notFound } from "next/navigation";
import type { Metadata } from "next";

async function getPost(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/social/posts/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const j = await res.json();
  return j.post as any;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const post = await getPost(params.id);
  if (!post) return { title: "Post not found" };
  const title = post.author ? `${post.author.firstName || ""} ${post.author.lastName || ""}`.trim() + " on HireAI" : "HireAI Post";
  const description = (post.content || "").slice(0, 140);
  const images = Array.isArray(post.images) && post.images.length > 0 ? [{ url: post.images[0] }] : [];
  return { title, description, openGraph: { title, description, images } };
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  if (!post) notFound();

  return (
    <div className="p-6">
      {/* This page can reuse the feed component structure; for brevity we render simple preview */}
      <div className="max-w-2xl mx-auto border rounded p-4 bg-white">
        <div className="text-xs text-muted-foreground mb-2">{new Date(post.createdAt).toLocaleString()}</div>
        <div className="font-semibold mb-1">{post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() : "User"}</div>
        <div className="whitespace-pre-wrap text-[15px] leading-6 mb-3">{post.content}</div>
        {Array.isArray(post.images) && post.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {post.images.map((src: string, i: number) => (
              <img key={i} src={src} className="w-full h-[220px] object-contain rounded border" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
