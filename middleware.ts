import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyTokenEdge } from "@/lib/auth-edge"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths that don't require authentication
  const publicPaths = [
    "/",
    "/login",
    "/signup",
    "/about",
    "/contact",
    "/terms",
    "/privacy",
  ]

  const isPublicPath =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/auth/")

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
  if (isPublicPath) {
    try {
      if (cookieToken) {
        const session = await verifyTokenEdge(cookieToken)
        if (session?.userId) {
          const url = new URL("/dashboard", request.url)
          if (session.role === "recruiter") url.pathname = "/dashboard/recruiter"
          else if (session.role === "job_seeker") url.pathname = "/dashboard/job-seeker"
          else if (session.role === "admin") url.pathname = "/dashboard/admin"
          else if (session.role === "college" || session.role === "college_admin") url.pathname = "/dashboard/college"
          return NextResponse.redirect(url)
        }
      }
    } catch {}
    return NextResponse.next()
  }

  // Check for authentication token for protected routes
  const token = cookieToken

  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const session = await verifyTokenEdge(token)

    if (!session || !session.userId) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (session.role) {
      if (pathname === "/dashboard/recruiter/complete-profile" && session.role === "recruiter") {
        return NextResponse.next()
      }

      const isCollegeRole = session.role === "college" || session.role === "college_admin"

      // Role-based access control
      if (pathname.startsWith("/dashboard/recruiter") && session.role !== "recruiter") {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }

      if (pathname.startsWith("/dashboard/job-seeker") && session.role !== "job_seeker") {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }

      if (pathname.startsWith("/dashboard/admin") && session.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }

      if (pathname.startsWith("/dashboard/college") && !isCollegeRole) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }

    return NextResponse.next()
  } catch (error) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
