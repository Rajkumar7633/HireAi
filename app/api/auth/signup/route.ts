import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/backend-url"

// Block personal email providers for recruiters
const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "mail.com", "protonmail.com", "yandex.com", "zoho.com",
  "live.com", "msn.com", "comcast.net", "verizon.net", "att.net",
  "sbcglobal.net", "bellsouth.net", "charter.net", "cox.net"
]

const isValidCompanyEmail = (email: string) => {
  const emailLower = email.trim().toLowerCase()
  const domain = emailLower.split("@")[1]
  if (!domain) return false
  // Block personal email domains
  if (PERSONAL_EMAIL_DOMAINS.includes(domain)) return false
  return true
}

export async function POST(request: NextRequest) {
  try {
    console.log("Signup attempt started")
    const body = await request.json()
    const { name, email, password, role } = body

    console.log("Signup request body:", { name, email, role })

    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 })
    }

    if (!["job_seeker", "recruiter", "admin", "college", "college_admin"].includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 })
    }

    // Validate company email for recruiter role (block personal email providers)
    if (role === "recruiter") {
      if (!isValidCompanyEmail(email)) {
        return NextResponse.json({
          message: "Recruiters must use a company domain email (not @gmail.com, @yahoo.com, etc.)"
        }, { status: 400 })
      }
    }

    // Call backend API
    const response = await fetch(`${getBackendUrl()}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password, role }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Backend signup error:", data)
      return NextResponse.json({ message: data.message || "Signup failed" }, { status: response.status })
    }

    console.log("User created successfully:", data)

    const apiResponse = NextResponse.json({
      message: "User created successfully",
      token: data.token,
      user: data.user,
    })

    const token = data.token || data.accessToken
    if (token) {
      apiResponse.cookies.set("auth-token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
    }

    return apiResponse
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
