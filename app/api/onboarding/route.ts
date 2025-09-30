import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await connectDB();
    const u = await (User as any).findById(session.userId).lean();
    return NextResponse.json({ onboardingSteps: u?.onboardingSteps || {}, onboardingCompleted: !!u?.onboardingCompleted });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { step, value } = await request.json();
    if (!step) return NextResponse.json({ message: "Missing step" }, { status: 400 });
    await connectDB();
    const u = await (User as any).findById(session.userId);
    if (!u) return NextResponse.json({ message: "User not found" }, { status: 404 });
    u.onboardingSteps = { ...(u.onboardingSteps || {}), [step]: !!value };
    const steps = u.onboardingSteps || {};
    u.onboardingCompleted = !!(steps.profile && steps.branding && steps.firstJob && steps.inviteTeam);
    await u.save();
    return NextResponse.json({ ok: true, onboardingSteps: u.onboardingSteps, onboardingCompleted: u.onboardingCompleted });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}
