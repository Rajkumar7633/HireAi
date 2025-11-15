import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CameraCapture from "@/models/CameraCapture";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();
        const { dataUrl, mimeType, width, height, userId: userIdBody, sessionId } = body || {};

        // Resolve userId from JWT if present
        let resolvedUserId: string | undefined = undefined;
        try {
            const hdrs = headers();
            const auth = hdrs.get("authorization");
            let token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
            if (!token) {
                const cookieStore = cookies();
                token = cookieStore.get("token")?.value;
            }
            if (token) {
                const session = await verifyTokenEdge(token);
                if (session?.userId) resolvedUserId = session.userId;
            }
        } catch { }

        if (!dataUrl || !mimeType || !width || !height) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // Basic upload security: allow only common image types and enforce a generous size limit
        const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
        if (typeof mimeType !== "string" || !allowedMimeTypes.includes(mimeType)) {
            return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
        }

        const sizeBytes = Math.ceil((dataUrl.length * 3) / 4); // approx
        const maxBytes = 5 * 1024 * 1024; // 5MB, generous for camera stills
        if (sizeBytes > maxBytes) {
            return NextResponse.json({ error: "File too large" }, { status: 400 });
        }

        const doc = await CameraCapture.create({
            dataUrl,
            mimeType,
            width,
            height,
            sizeBytes,
            userId: userIdBody || resolvedUserId || undefined,
            sessionId: sessionId || undefined,
        });

        return NextResponse.json({ ok: true, id: doc._id });
    } catch (err) {
        console.error("/api/camera/upload error", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
