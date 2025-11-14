import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialConnection from "@/models/SocialConnection";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ items: [] });

    const { searchParams } = new URL(req.url);
    const ids = (searchParams.get("ids") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ items: [] });

    // Fetch accepted connections that involve me or any of the ids
    const actors = Array.from(new Set([me, ...ids]));
    const edges = await SocialConnection.find({
      status: "accepted",
      $or: actors.map((id) => ({ $or: [{ requesterId: id }, { addresseeId: id }] })),
    })
      .select("requesterId addresseeId")
      .lean();

    // Build adjacency map
    const adj: Record<string, Set<string>> = {};
    const add = (a: any, b: any) => {
      const A = String(a), B = String(b);
      if (!adj[A]) adj[A] = new Set();
      adj[A].add(B);
    };
    for (const e of edges) {
      add(e.requesterId, e.addresseeId);
      add(e.addresseeId, e.requesterId);
    }

    const myFriends = adj[String(me)] || new Set<string>();

    const items = ids.map((id) => {
      const theirs = adj[String(id)] || new Set<string>();
      let mutuals = 0;
      Array.from(theirs).forEach((f) => {
        if (myFriends.has(String(f))) mutuals++;
      });
      return { userId: id, mutuals };
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error("/api/social/mutuals error", e);
    return NextResponse.json({ items: [] });
  }
}
