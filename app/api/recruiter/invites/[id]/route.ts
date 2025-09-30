import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Invite from "@/models/Invite";
import { sendEmail } from "@/lib/email-service";
import { buildProfessionalTemplate } from "@/lib/email-templates";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== "recruiter") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await connectDB();
    const invite = await (Invite as any).findOne({ _id: params.id, inviterId: session.userId });
    if (!invite) return NextResponse.json({ message: "Invite not found" }, { status: 404 });

    const { action } = await request.json();
    if (action === "resend") {
      const origin = new URL(request.url).origin;
      const acceptUrl = `${origin}/api/recruiter/invites/accept?token=${encodeURIComponent(invite.token)}`;
      const html = buildProfessionalTemplate({
        recipientName: invite.email,
        heading: "Hello",
        messageHtml: `Reminder: You have been invited to collaborate on <strong>HireAI</strong>. Click below to accept your invitation.`,
        ctaUrl: acceptUrl,
        ctaLabel: "Accept Invite",
        preheader: "Reminder to accept invite",
        details: { InvitedBy: session.name || session.email || "Recruiter", Role: invite.role },
      });
      const subject = `Reminder: Invite to collaborate on HireAI`;
      await sendEmail({ to: invite.email, subject, html });
      return NextResponse.json({ ok: true });
    } else if (action === "revoke") {
      invite.status = "revoked";
      await invite.save();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== "recruiter") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await connectDB();
    await (Invite as any).deleteOne({ _id: params.id, inviterId: session.userId });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}
