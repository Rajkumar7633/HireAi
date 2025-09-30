import { NextResponse, type NextRequest } from "next/server";
export const dynamic = "force-dynamic";
import { connectDB } from "@/lib/mongodb";
import EmailLog from "@/models/EmailLog";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const target = url.searchParams.get("target");
    if (!id || !target) return NextResponse.redirect(target || "/", { status: 302 });

    await connectDB();
    await (EmailLog as any).findByIdAndUpdate(
      id,
      { $inc: { clicks: 1 }, $set: { lastClickedAt: new Date() } },
      { new: true }
    );

    return NextResponse.redirect(target, { status: 302 });
  } catch (e: any) {
    return NextResponse.redirect("/", { status: 302 });
  }
}
