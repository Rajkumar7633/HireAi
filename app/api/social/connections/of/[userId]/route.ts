import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialConnection from "@/models/SocialConnection";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await connectDB();
    const { userId } = params;
    const accepted = await SocialConnection.find({
      status: "accepted",
      $or: [{ requesterId: userId }, { addresseeId: userId }],
    })
      .select("requesterId addresseeId")
      .lean();
    const ids = new Set<string>();
    for (const c of accepted) {
      const ra = String(c.requesterId);
      const ad = String(c.addresseeId);
      ids.add(ra === userId ? ad : ra);
    }
    return NextResponse.json({ userId, connections: Array.from(ids) });
  } catch (e) {
    console.error("/api/social/connections/of/[userId] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
