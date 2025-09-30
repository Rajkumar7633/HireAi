import { NextResponse, type NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) return NextResponse.json({ message: "Missing token or password" }, { status: 400 });

    const secret = process.env.JWT_SECRET || "dev-secret";
    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch (e: any) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
    }

    if (payload.action !== "setup_password" || !payload.userId || !payload.email) {
      return NextResponse.json({ message: "Invalid token payload" }, { status: 400 });
    }

    await connectDB();
    const u = await (User as any).findOne({ _id: payload.userId, email: payload.email });
    if (!u) return NextResponse.json({ message: "User not found" }, { status: 404 });

    u.passwordHash = await hashPassword(password);
    await u.save();

    // Auto sign-in: create session token and set cookie
    const sessionToken = createSession(String(u._id), u.email, u.name, u.role);
    const res = NextResponse.json({ ok: true });
    res.cookies.set("auth-token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to set up password" }, { status: 500 });
  }
}
