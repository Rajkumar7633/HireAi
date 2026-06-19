import { type NextRequest, NextResponse } from "next/server"
export { dynamic } from "@/lib/api-dynamic"


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

async function handleProxy(req: NextRequest) {
  const token = req.cookies.get("auth-token")?.value
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api\/mock-interview/, "")
  const search = url.search

  const targetUrl = `${BACKEND_URL}/api/mock-interview${path}${search}`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 35_000)

    const fetchOpts: RequestInit = {
      method: req.method,
      headers,
      signal: controller.signal,
    }

    if (req.method === "POST" || req.method === "PUT") {
      const body = await req.json().catch(() => ({}))
      fetchOpts.body = JSON.stringify(body)
    }

    const response = await fetch(targetUrl, fetchOpts)
    clearTimeout(timeoutId)

    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    if (error.name === "AbortError") {
      return NextResponse.json({ message: "Request timed out" }, { status: 504 })
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handleProxy(req)
}

export async function POST(req: NextRequest) {
  return handleProxy(req)
}
