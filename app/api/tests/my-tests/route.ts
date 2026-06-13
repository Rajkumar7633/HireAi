import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Test from "@/models/Test"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
  const session = await getSession(req)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const token = req.cookies.get("auth-token")?.value

  // Try Express backend first
  if (token) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8_000)

    try {
      const response = await fetch(`${BACKEND_URL}/api/tests/my-tests`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data, { status: 200 })
      }
    } catch {
      clearTimeout(timeoutId)
      // Fall through to MongoDB fallback
    }
  }

  // MongoDB fallback — recruiterID field matches backend schema
  try {
    await connectDB()
    const tests = await (Test as any).find({ recruiterId: session.userId })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(tests ?? [], { status: 200 })
  } catch (error: any) {
    console.error("[tests/my-tests] MongoDB fallback error:", error)
    return NextResponse.json(
      { message: "Failed to fetch tests." },
      { status: 500 }
    )
  }
}
