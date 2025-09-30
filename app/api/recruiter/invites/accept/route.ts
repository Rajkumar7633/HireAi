import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invite from "@/models/Invite";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { sendEmail } from "@/lib/email-service";
import { buildProfessionalTemplate } from "@/lib/email-templates";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) return new NextResponse("Missing token", { status: 400 });

    await connectDB();
    const invite = await (Invite as any).findOne({ token });
    if (!invite || invite.status !== "pending") {
      return new NextResponse("Invite not found or expired.", { status: 400 });
    }

    // Upsert user account
    const existing = await (User as any).findOne({ email: invite.email });
    let userId: string;
    if (existing) {
      // Ensure role is at least the invited role
      if (existing.role !== invite.role) {
        existing.role = invite.role;
        await existing.save();
      }
      userId = String(existing._id);
    } else {
      const name = invite.email.split("@")[0];
      const temp = Math.random().toString(36).slice(2, 10) + "!Aa1";
      const passwordHash = await hashPassword(temp);
      const created = await (User as any).create({ name, email: invite.email, passwordHash, role: invite.role });
      userId = String(created._id);
    }

    invite.status = "accepted";
    invite.acceptedAt = new Date();
    await invite.save();

    // Create setup token and redirect to setup page
    const secret = process.env.JWT_SECRET || "dev-secret";
    const setupToken = jwt.sign({ userId, email: invite.email, action: "setup_password" }, secret, { expiresIn: "3d" });
    const origin = new URL(request.url).origin;
    const setupUrl = `${origin}/auth/setup?token=${encodeURIComponent(setupToken)}`;

    // Send welcome email
    try {
      const welcomeHtml = buildProfessionalTemplate({
        recipientName: invite.email,
        heading: "Welcome",
        messageHtml: `Your invitation to <strong>HireAI</strong> has been accepted. Click below to complete your account setup by setting a password.`,
        ctaUrl: setupUrl,
        ctaLabel: "Complete Setup",
        preheader: "Finish setting up your account",
      });
      await sendEmail({ to: invite.email, subject: "Welcome to HireAI", html: welcomeHtml });
    } catch { }

    return NextResponse.redirect(setupUrl, { status: 302 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to accept invite" }, { status: 500 });
  }
}
