import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyTokenEdge } from "@/lib/auth-edge"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log("🔍 Middleware executing for:", pathname)

  // Public paths that don't require authentication
  const publicPaths = ["/", "/login", "/signup", "/about", "/contact"]

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Read token once for potential smart redirects
  const cookieToken = request.cookies.get("auth-token")?.value

  // If user is already authenticated, redirect away from landing/login/signup to role dashboard
  if (publicPaths.includes(pathname)) {
    try {
      if (cookieToken) {
        const session = await verifyTokenEdge(cookieToken)
        if (session?.userId) {
          const url = new URL("/dashboard", request.url)
          if (session.role === "recruiter") url.pathname = "/dashboard/recruiter"
          else if (session.role === "job_seeker") url.pathname = "/dashboard/job-seeker"
          else if (session.role === "admin") url.pathname = "/dashboard/admin"
          console.log("➡️ Authenticated user on public page, redirecting to:", url.pathname)
          return NextResponse.redirect(url)
        }
      }
    } catch (e) {
      console.log("⚠️ Smart redirect check failed:", e)
    }
    console.log("✅ Public path, allowing access")
    return NextResponse.next()
  }

  // Check for authentication token for protected routes
  const token = cookieToken || request.cookies.get("auth-token")?.value
  console.log("🍪 Token from cookies:", token ? `${token.substring(0, 20)}...` : "NOT FOUND")

  if (!token) {
    console.log("❌ No token found, redirecting to login")
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Use Edge-safe token verification
    const session = await verifyTokenEdge(token)
    console.log("🔐 Token verification result:", session ? "SUCCESS" : "FAILED")

    if (!session || !session.userId) {
      console.log("❌ Invalid session or missing userId")
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }

    console.log("✅ Valid session found:", {
      userId: session.userId,
      role: session.role,
      email: session.email,
    })

    if (session.role) {
      if (pathname === "/dashboard/recruiter/complete-profile" && session.role === "recruiter") {
        console.log("✅ Allowing access to profile completion page")
        return NextResponse.next()
      }

      // Role-based access control
      if (pathname.startsWith("/dashboard/recruiter") && session.role !== "recruiter") {
        console.log("❌ Role mismatch: user has", session.role, "but trying to access recruiter dashboard")
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }

      if (pathname.startsWith("/dashboard/job-seeker") && session.role !== "job_seeker") {
        console.log("❌ Role mismatch: user has", session.role, "but trying to access job-seeker dashboard")
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }

      if (pathname.startsWith("/dashboard/admin") && session.role !== "admin") {
        console.log("❌ Role mismatch: user has", session.role, "but trying to access admin dashboard")
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }

    console.log("✅ Allowing access to:", pathname)
    return NextResponse.next()
  } catch (error) {
    console.log("❌ Token verification failed:", error)
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
