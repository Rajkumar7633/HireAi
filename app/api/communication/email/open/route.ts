import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import EmailLog from "@/models/EmailLog";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return new NextResponse("Missing id", { status: 400 });

    await connectDB();
    await (EmailLog as any).findByIdAndUpdate(
      id,
      { $inc: { opens: 1 }, $set: { lastOpenedAt: new Date() } },
      { new: true }
    );

    // return a 1x1 transparent pixel
    const pixel = Buffer.from(
      "R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=",
      "base64"
    );
    return new NextResponse(pixel, {
      status: 200,
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" },
    });
  } catch (e: any) {
    return new NextResponse("", { status: 200 });
  }
}
