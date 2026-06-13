import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";
import JobSeekerProfile from "@/models/JobSeekerProfile";

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

// PUT /api/social/profiles/[userId]/open-to-work
// Body: { openToWork: boolean }
export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (String(me) !== params.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const openToWork = Boolean(body.openToWork);

    const profile = await JobSeekerProfile.findOneAndUpdate(
      { userId: me },
      { openToWork },
      { new: true, select: "openToWork" }
    );

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    return NextResponse.json({ openToWork: profile.openToWork });
  } catch (e) {
    console.error("/api/social/profiles/open-to-work error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
