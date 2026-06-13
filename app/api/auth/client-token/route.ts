import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

/** Returns the current access token for client-side Authorization headers (sessionStorage sync). */
export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const token =
    request.cookies.get("auth-token")?.value ||
    request.cookies.get("token")?.value ||
    request.cookies.get("jwt")?.value

  if (!token) {
    return NextResponse.json({ message: "No token in session" }, { status: 401 })
  }

  return NextResponse.json({ token })
}
