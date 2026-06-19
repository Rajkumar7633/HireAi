import { NextResponse } from "next/server";
export { dynamic } from "@/lib/api-dynamic"


export async function GET() {
  const hasKey = !!process.env.GEMINI_API_KEY;
  const enabled = hasKey || process.env.ENABLE_AI_SDK === "true";
  const model = enabled ? (process.env.GEMINI_MODEL || "gemini-1.5-pro") : "fallback";
  return NextResponse.json({ enabled, model });
}
