import { NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/backend-url"

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
  if (PERSONAL_EMAIL_DOMAINS.includes(domain)) return false
  return true
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, role } = body

    if (role === "recruiter" && email) {
      if (!isValidCompanyEmail(email)) {
        return NextResponse.json({
          message: "Recruiters must use a company domain email (not @gmail.com, @yahoo.com, etc.)"
        }, { status: 400 })
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)

    const r = await fetch(`${getBackendUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    const data = await r.json()
    const response = NextResponse.json(data, { status: r.status })

    if (r.ok) {
      const token: string | undefined =
        data.token || data.accessToken || data.jwt || data.access_token

      if (token) {
        response.cookies.set("auth-token", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        })
      }
    }

    return response
  } catch (err: unknown) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Login timed out. The server may be waking up — please try again."
        : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
