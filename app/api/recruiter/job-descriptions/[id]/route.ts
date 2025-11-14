import { NextResponse, type NextRequest } from "next/server"

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BASE}/api/recruiter/job-descriptions/${params.id}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("authorization") || "",
        Cookie: req.headers.get("cookie") || "",
      },
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "failed" }, { status: 500 })
  }
}
