import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/backend-url"

export { dynamic } from "@/lib/api-dynamic"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${getBackendUrl()}/api/advanced-analytics`, {
      method: "GET",
      headers: {
        Authorization: request.headers.get("Authorization") || "",
      },
      cache: "no-store",
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Advanced analytics error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
