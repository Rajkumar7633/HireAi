import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Invite from "@/models/Invite";
import { sendEmail } from "@/lib/email-service";
import { buildProfessionalTemplate } from "@/lib/email-templates";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const invites = await (Invite as any).find({ inviterId: session.userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ invites });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to fetch invites" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { email, role = "recruiter" } = await request.json();
    if (!email) return NextResponse.json({ message: "Missing email" }, { status: 400 });

    await connectDB();
    // Domain restriction
    const allowEnv = process.env.INVITE_ALLOWED_DOMAINS || "";
    const allowed = allowEnv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const domain = (email.split("@")[1] || "").toLowerCase();
    if (allowed.length && !allowed.includes(domain)) {
      return NextResponse.json({ message: `Invites are restricted. Allowed domains: ${allowed.join(", ")}` }, { status: 400 });
    }

    // Rate limiting based on created invites
    const now = Date.now();
    const minuteAgo = new Date(now - 60_000);
    const dayAgo = new Date(now - 86_400_000);
    const perMinute = await (Invite as any).countDocuments({ inviterId: session.userId, createdAt: { $gte: minuteAgo } });
    const perDay = await (Invite as any).countDocuments({ inviterId: session.userId, createdAt: { $gte: dayAgo } });
    const MAX_PER_MIN = parseInt(process.env.INVITE_RATE_PER_MIN || "5", 10);
    const MAX_PER_DAY = parseInt(process.env.INVITE_RATE_PER_DAY || "50", 10);
    if (perMinute >= MAX_PER_MIN) {
      return NextResponse.json({ message: `Rate limit exceeded. Try again in a minute.` }, { status: 429 });
    }
    if (perDay >= MAX_PER_DAY) {
      return NextResponse.json({ message: `Daily invite limit reached.` }, { status: 429 });
    }

    const token = crypto.randomUUID();
    const doc = await (Invite as any).create({ email, role, inviterId: session.userId, token, status: "pending" });

    // send invite email
    const origin = new URL(request.url).origin;
    const acceptUrl = `${origin}/api/recruiter/invites/accept?token=${encodeURIComponent(token)}`;
    const html = buildProfessionalTemplate({
      recipientName: email,
      heading: "Hello",
      messageHtml: `You have been invited to collaborate on <strong>HireAI</strong>. Click the button below to accept your invitation and join the team.`,
      ctaUrl: acceptUrl,
      ctaLabel: "Accept Invite",
      preheader: "You have a new team invitation",
      details: { InvitedBy: session.name || session.email || "Recruiter", Role: role },
    });
    const subject = `You're invited to collaborate on HireAI`;
    await sendEmail({ to: email, subject, html });

    return NextResponse.json({ invite: doc });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to create invite" }, { status: 500 });
  }
}
