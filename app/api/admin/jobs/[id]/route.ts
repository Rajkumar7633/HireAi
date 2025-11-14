import { NextResponse, type NextRequest } from "next/server"

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BASE}/api/admin/jobs/${params.id}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("authorization") || "",
        Cookie: req.headers.get("cookie") || "",
      },
    })
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(data, { status: res.status })
    }
    // Fallback 1: recruiter backend proxy
    const rec = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/recruiter/job-descriptions/${params.id}`, { cache: "no-store" }).catch(()=>null)
    if (rec && rec.ok) {
      const d = await rec.json().catch(()=>({}))
      const job = d.job || d.jobDescription || d
      return NextResponse.json({ job }, { status: 200 })
    }
    // Fallback 2: local recruiter DB route
    const local = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/job-descriptions/${params.id}`, { cache: "no-store" }).catch(()=>null)
    if (local && local.ok) {
      const jd = await local.json().catch(()=>({}))
      const job = jd.job || jd.jobDescription || jd
      return NextResponse.json({ job }, { status: 200 })
    }
    return NextResponse.json({ message: "Job not found" }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "failed" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const res = await fetch(`${BASE}/api/admin/jobs/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("authorization") || "",
        Cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BASE}/api/admin/jobs/${params.id}`, {
      method: "DELETE",
      headers: {
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
