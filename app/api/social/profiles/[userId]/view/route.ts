import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";
import ProfileView from "@/models/ProfileView";

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
  return null;
}

// POST /api/social/profiles/[userId]/view — record a profile view
export async function POST(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await connectDB();
    const viewer = await getUserId();
    const { userId } = params;

    // Don't count self-views
    if (viewer && String(viewer) === userId) {
      return NextResponse.json({ ok: true });
    }

    await ProfileView.create({
      profileUserId: userId,
      viewerUserId: viewer || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Silently absorb — view tracking is best-effort
    return NextResponse.json({ ok: true });
  }
}
