// lib/auth.ts
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { promisify } from "util"
import type { NextRequest } from "next/server"

const _JWT_SECRET = process.env.JWT_SECRET
if (!_JWT_SECRET) throw new Error("JWT_SECRET environment variable is required")
const JWT_SECRET: string = _JWT_SECRET


// Promisify bcrypt methods (Node.js only)
const hashAsync = promisify(bcrypt.hash)
const compareAsync = promisify(bcrypt.compare)

export interface Session {
  userId: string
  email: string
  name: string
  role: "job_seeker" | "recruiter" | "admin" | "college" | "college_admin"
}

function normalizeUserId(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw === "object" && raw !== null && "toString" in raw) {
    const s = String((raw as { toString(): string }).toString())
    return s || null
  }
  const s = String(raw).trim()
  return s || null
}

export async function hashPassword(password: string): Promise<string> {
  return (await hashAsync(password, 12)) as string
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return (await compareAsync(password, hashedPassword)) as boolean
}

export function generateToken(payload: Session): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

// Edge-compatible token verification using Web Crypto API
export async function verifyTokenEdge(token: string): Promise<Session | null> {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) {
      throw new Error("Invalid token format")
    }

    const [header, payload, signature] = parts

    const decodedPayload = JSON.parse(atob(payload))

    if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
      return null
    }

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(`${header}.${payload}`)
    const secretKey = encoder.encode(JWT_SECRET)

    // Import the secret key
    const key = await crypto.subtle.importKey("raw", secretKey, { name: "HMAC", hash: "SHA-256" }, false, ["verify"])

    // Convert base64url signature to ArrayBuffer
    const signatureBuffer = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
      c.charCodeAt(0),
    )

    // Verify the signature
    const isValid = await crypto.subtle.verify("HMAC", key, signatureBuffer, data)

    if (!isValid) return null
    return decodedPayload as Session
  } catch {
    return null
  }
}

export function verifyToken(token: string): Session | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded as unknown as Session
  } catch {
    return null
  }
}

// Detect runtime and use appropriate verification method
export async function verifyTokenUniversal(token: string): Promise<Session | null> {
  // Check if we're in Edge Runtime
  if (typeof (globalThis as any).EdgeRuntime !== "undefined" || !process.versions?.node) {
    return await verifyTokenEdge(token)
  } else {
    return verifyToken(token)
  }
}

export async function getSession(request: NextRequest): Promise<Session | null> {
  try {
    // 1) Authorization header (preferred - sent by authFetch helper)
    const auth = request.headers.get("authorization") || request.headers.get("Authorization")
    let token: string | undefined
    if (auth && auth.startsWith("Bearer ")) token = auth.slice(7)

    // 2) Check multiple cookie names (auth-token is our primary, token is common backend name)
    if (!token) token = request.cookies.get("auth-token")?.value
    if (!token) token = request.cookies.get("token")?.value
    if (!token) token = request.cookies.get("jwt")?.value
    if (!token) token = request.cookies.get("access_token")?.value

    if (!token) {
      console.log("No auth token in header or cookies")
      return null
    }

    // Verify
    const session = await verifyTokenUniversal(token)
    if (!session) {
      console.log("Token verification failed")
      return null
    }

    const raw = session as Session & { user?: { id?: string } }
    const userId = normalizeUserId(raw.userId ?? raw.user?.id)
    if (!userId) {
      console.log("Token missing userId")
      return null
    }

    return {
      userId,
      email: raw.email ?? "",
      name: raw.name ?? "",
      role: raw.role,
    }
  } catch (error) {
    console.error("getSession error:", error)
    return null
  }
}

export function createSessionToken(
  userId: string,
  email: string,
  name: string,
  role: "job_seeker" | "recruiter" | "admin" | "college" | "college_admin",
): string {
  const session: Session = {
    userId,
    email,
    name,
    role,
  }

  const token = generateToken(session)
  return token
}

export function createSession(
  userId: string,
  email: string,
  name: string,
  role: "job_seeker" | "recruiter" | "admin" | "college" | "college_admin",
): string {
  return createSessionToken(userId, email, name, role)
}
