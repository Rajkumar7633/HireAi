import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialPost from "@/models/SocialPost";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";
import { uploadDataUrl } from "@/utils/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getUserId() {
  const auth = headers().get("authorization");
  let token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) token = cookies().get("token")?.value;
  if (!token) token = cookies().get("auth-token")?.value;
  if (token) {
    const s = await verifyTokenEdge(token);
    if (s?.userId) return s.userId;
  }
  // Fallback: ask our own auth endpoint using the same cookies
  try {
    const cookieHeader = cookies()
      .getAll()
      .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
      .join("; ");
    const hdrs = headers();
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") || "http";
    if (host) {
      const origin = `${proto}://${host}`;
      const res = await fetch(`${origin}/api/auth/me`, {
        method: "GET",
        headers: { Cookie: cookieHeader },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const uid = data?.user?.id || data?.id;
        if (uid) return String(uid);
      }
    }
  } catch { }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { content, images } = await req.json();
    if (!content || !content.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });

    let imageUrls: string[] = [];
    if (Array.isArray(images) && images.length) {
      const uploads = await Promise.all(
        images.slice(0, 4).map(async (dataUrl: string) => {
          try {
            if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
              const url = await uploadDataUrl(dataUrl);
              return url;
            }
          } catch (err) {
            // Fallback: store data URL directly so feed still shows images
            if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
              return dataUrl;
            }
            return null;
          }
        })
      );
      imageUrls = uploads.filter(Boolean) as string[];
    }

    const post = await SocialPost.create({ authorId: me, content: content.trim(), images: imageUrls });
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    console.error("/api/social/posts error", e);
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
