import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
  const session = await getSession(req)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const token = req.cookies.get("auth-token")?.value
  if (!token) {
    return NextResponse.json({ message: "No token found" }, { status: 401 })
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(`${BACKEND_URL}/api/tests/my-tests`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to fetch tests" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching tests:", error)

    if (error.name === "AbortError") {
      return NextResponse.json(
        {
          message: `Backend server timeout. Please check if your backend is running on ${BACKEND_URL}`,
        },
        { status: 504 },
      )
    }

    if (error.code === "ECONNREFUSED") {
      return NextResponse.json(
        {
          message: `Cannot connect to backend server at ${BACKEND_URL}. Please ensure it's running.`,
        },
        { status: 503 },
      )
    }

    return NextResponse.json(
      {
        message: `Backend connection error: ${error.message}`,
      },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const token = req.cookies.get("auth-token")?.value
  if (!token) {
    return NextResponse.json({ message: "No token found" }, { status: 401 })
  }

  try {
    const body = await req.json()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(`${BACKEND_URL}/api/tests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to create test" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ message: data.msg, test: data.test }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating test:", error)

    if (error.name === "AbortError") {
      return NextResponse.json(
        {
          message: `Backend server timeout. Please check if your backend is running on ${BACKEND_URL}`,
        },
        { status: 504 },
      )
    }

    if (error.code === "ECONNREFUSED") {
      return NextResponse.json(
        {
          message: `Cannot connect to backend server at ${BACKEND_URL}. Please ensure it's running.`,
        },
        { status: 503 },
      )
    }

    return NextResponse.json(
      {
        message: `Backend connection error: ${error.message}`,
      },
      { status: 500 },
    )
  }
}
