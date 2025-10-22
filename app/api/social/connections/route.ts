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
  if (!token) return null;
  const s = await verifyTokenEdge(token);
  return s?.userId || null;
}

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pending = await SocialConnection.find({ addresseeId: me, status: "pending" }).lean();
    const outgoing = await SocialConnection.find({ requesterId: me, status: "pending" }).lean();
    const accepted = await SocialConnection.find({
      status: "accepted",
      $or: [{ requesterId: me }, { addresseeId: me }],
    }).lean();

    return NextResponse.json({ pending, outgoing, accepted });
  } catch (e) {
    console.error("/api/social/connections GET error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
