import { NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, role } = body

    // Validate company email for recruiter role (block personal email providers)
    if (role === "recruiter" && email) {
      if (!isValidCompanyEmail(email)) {
        return NextResponse.json({
          message: "Recruiters must use a company domain email (not @gmail.com, @yahoo.com, etc.)"
        }, { status: 400 })
      }
    }

    const r = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    const data = await r.json()

    const response = NextResponse.json(data, { status: r.status })

    // If login succeeded, set the JWT as an HttpOnly cookie so
    // getSession() (which reads "auth-token" cookie) works for all API routes
    if (r.ok) {
      const token: string | undefined =
        data.token || data.accessToken || data.jwt || data.access_token

      if (token) {
        // 7-day expiry, HttpOnly, SameSite=Lax so it's sent on same-origin requests
        response.cookies.set("auth-token", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: "/",
        })
      }
    }

    return response
  } catch (err) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
