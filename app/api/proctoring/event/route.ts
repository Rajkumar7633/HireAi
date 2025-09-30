import { NextResponse, type NextRequest } from "next/server";

// Minimal proctoring event collector.
// In production, persist to your database/storage with proper auth and rate limiting.
// Expected payload:
// {
//   assessmentId: string,
//   candidateId: string,
//   type: string,            // e.g., 'no_face', 'multi_face', 'movement', 'off_screen'
//   message: string,
//   at: string,              // ISO timestamp
//   snapshot?: string        // optional dataURL (image/jpeg)
// }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.assessmentId || !body?.candidateId || !body?.type) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    // TODO: plug into your DB layer. For now, just log.
    console.log("[proctor]", {
      assessmentId: body.assessmentId,
      candidateId: body.candidateId,
      type: body.type,
      at: body.at || new Date().toISOString(),
      hasSnapshot: !!body.snapshot,
      message: body.message,
    });

    // If you want to limit body size for snapshots, consider stripping snapshot here or truncating.

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("Proctoring event error", e);
    return NextResponse.json({ message: "Failed to record proctoring event" }, { status: 500 });
  }
}
