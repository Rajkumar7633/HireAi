import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
export { dynamic } from "@/lib/api-dynamic"


export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { platform, ...data } = body

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = "/api/social-import"

    if (platform === "linkedin") {
      endpoint += "/linkedin"
    } else if (platform === "github") {
      endpoint += "/github"
    } else {
      return NextResponse.json({ message: "Invalid platform" }, { status: 400 })
    }

    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const responseData = await response.json()
    if (!response.ok) {
      return NextResponse.json({ message: responseData.msg || "Import failed" }, { status: response.status })
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error("Social import API error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const platform = searchParams.get("platform")
    const username = searchParams.get("username")

    if (platform === "github" && username) {
      const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
      const response = await fetch(`${backendUrl}/api/social-import/github/${username}`)
      const data = await response.json()

      if (!response.ok) {
        return NextResponse.json({ message: data.msg || "Request failed" }, { status: response.status })
      }

      return NextResponse.json(data, { status: 200 })
    }

    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("Get social import error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
