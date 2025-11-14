import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialConnection from "@/models/SocialConnection";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";
import { emitSocial } from "@/lib/socket-server";

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
  try {
    const cookieHeader = cookies().getAll().map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
    const hdrs = headers();
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") || "http";
    if (host) {
      const origin = `${proto}://${host}`;
      const res = await fetch(`${origin}/api/auth/me`, { headers: { Cookie: cookieHeader }, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const uid = data?.user?.id || data?.id;
        if (uid) return String(uid);
      }
    }
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { toUserId } = await req.json();
    if (!toUserId) return NextResponse.json({ error: "toUserId required" }, { status: 400 });
    if (toUserId === me) return NextResponse.json({ error: "Cannot connect to self" }, { status: 400 });

    // If reverse pending exists, accept it immediately
    const reverse = await SocialConnection.findOne({ requesterId: toUserId, addresseeId: me, status: "pending" });
    if (reverse) {
      reverse.status = "accepted";
      await reverse.save();
      emitSocial("connection:update", { type: "accepted", users: [String(me), String(toUserId)] });
      return NextResponse.json({ ok: true, status: "accepted", connection: reverse });
    }

    const doc = await SocialConnection.findOneAndUpdate(
      { requesterId: me, addresseeId: toUserId },
      { $setOnInsert: { status: "pending" } },
      { upsert: true, new: true }
    );
    emitSocial("connection:update", { type: "requested", users: [String(me), String(toUserId)] });
    return NextResponse.json({ ok: true, status: doc.status, connection: doc });
  } catch (e) {
    console.error("/api/social/connections/request error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
