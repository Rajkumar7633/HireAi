import { NextResponse } from "next/server";

export async function GET() {
  const hasKey = !!process.env.GROQ_API_KEY;
  const enabled = hasKey || process.env.ENABLE_AI_SDK === "true";
  const model = enabled ? (process.env.GROQ_MODEL || "llama-3.2-90b-text-preview") : "fallback";
  return NextResponse.json({ enabled, model });
}
