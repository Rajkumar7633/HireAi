import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getOrCreatePortalToken } from "@/lib/college-registration-portal"

function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const portal = await getOrCreatePortalToken(session!.userId)
    const origin = new URL(request.url).origin
    const shareUrl = `${origin}/register/college/${portal!.token}`

    return NextResponse.json({
      token: portal!.token,
      shareUrl,
      active: portal!.active,
    })
  } catch (error) {
    console.error("[registration-portal GET]", error)
    return NextResponse.json({ message: "Failed to load registration link" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const regenerate = Boolean((body as { regenerate?: boolean }).regenerate)
    const portal = await getOrCreatePortalToken(session!.userId, regenerate)
    const origin = new URL(request.url).origin
    const shareUrl = `${origin}/register/college/${portal!.token}`

    return NextResponse.json({
      token: portal!.token,
      shareUrl,
      regenerated: regenerate,
    })
  } catch (error) {
    console.error("[registration-portal POST]", error)
    return NextResponse.json({ message: "Failed to update registration link" }, { status: 500 })
  }
}
