import { NextResponse, type NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import Application from "@/models/Application";

interface TokenPayload {
  applicationId: string;
  response: "yes" | "no";
  by?: string; // candidate email (optional)
  exp: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) return new NextResponse("Missing token", { status: 400 });

    const secret = process.env.JWT_SECRET || "dev-secret";
    let payload!: TokenPayload;
    try {
      payload = jwt.verify(token, secret) as TokenPayload;
    } catch (e: any) {
      return new NextResponse("Invalid or expired link", { status: 400 });
    }

    const { applicationId, response } = payload;
    if (!applicationId) return new NextResponse("Bad token payload", { status: 400 });

    await connectDB();

    const app = await Application.findOne({ _id: applicationId });
    if (!app) return new NextResponse("Application not found", { status: 404 });

    const now = new Date();
    if (response === "yes") {
      // Mark as interview scheduled; append a note
      app.status = "Interview Scheduled" as any;
      const note = `Candidate confirmed interview at ${now.toISOString()}`;
      app.notes = app.notes ? `${app.notes}\n${note}` : note;
    } else {
      const note = `Candidate declined interview at ${now.toISOString()}`;
      app.notes = app.notes ? `${app.notes}\n${note}` : note;
    }
    await app.save();

    // Simple HTML confirmation page
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Thanks</title></head><body style="font-family:Arial,sans-serif;padding:24px;text-align:center"><h2>Thanks!</h2><p>Your response has been recorded: <strong>${response === "yes" ? "Confirmed" : "Declined"}</strong>.</p><p>You may close this tab.</p></body></html>`;
    return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (e: any) {
    console.error("confirm error", e);
    return NextResponse.json({ ok: false, message: e?.message || "Failed" }, { status: 500 });
  }
}
