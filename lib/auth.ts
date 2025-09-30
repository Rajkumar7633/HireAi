// lib/auth.ts
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { promisify } from "util"
import type { NextRequest } from "next/server"
import { EdgeRuntime } from "next/dist/compiled/edge-runtime"

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET environment variable is not set!")
  throw new Error("JWT_SECRET environment variable is required")
}

console.log("✅ JWT_SECRET loaded successfully")

// Promisify bcrypt methods (Node.js only)
const hashAsync = promisify(bcrypt.hash)
const compareAsync = promisify(bcrypt.compare)

export interface Session {
  userId: string
  email: string
  name: string
  role: "job_seeker" | "recruiter" | "admin"
}

export async function hashPassword(password: string): Promise<string> {
  return await hashAsync(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await compareAsync(password, hashedPassword)
}

export function generateToken(payload: Session): string {
  console.log("🔑 Generating token with JWT_SECRET:", JWT_SECRET.substring(0, 10) + "...")
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

// Edge-compatible token verification using Web Crypto API
export async function verifyTokenEdge(token: string): Promise<Session | null> {
  try {
    console.log("🔑 Edge: Verifying token with Web Crypto API")

    // Split the JWT token
    const parts = token.split(".")
    if (parts.length !== 3) {
      throw new Error("Invalid token format")
    }

    const [header, payload, signature] = parts

    // Decode header and payload
    const decodedHeader = JSON.parse(atob(header))
    const decodedPayload = JSON.parse(atob(payload))

    // Check if token is expired
    if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
      console.log("❌ Edge: Token expired")
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

    if (!isValid) {
      console.log("❌ Edge: Invalid signature")
      return null
    }

    console.log("✅ Edge: Token verified successfully")
    return decodedPayload as Session
  } catch (error) {
    console.error("❌ Edge: Token verification error:", error)
    return null
  }
}

// Node.js compatible token verification
export function verifyToken(token: string): Session | null {
  try {
    console.log("🔑 Node: Verifying token with JWT_SECRET:", JWT_SECRET.substring(0, 10) + "...")
    return jwt.verify(token, JWT_SECRET) as Session
  } catch (error) {
    console.error("❌ Node: Token verification error:", error.message)
    return null
  }
}

// Detect runtime and use appropriate verification method
export async function verifyTokenUniversal(token: string): Promise<Session | null> {
  // Check if we're in Edge Runtime
  if (typeof EdgeRuntime !== "undefined" || !process.versions?.node) {
    return await verifyTokenEdge(token)
  } else {
    return verifyToken(token)
  }
}

export async function getSession(request: NextRequest): Promise<Session | null> {
  try {
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      console.log("No auth token found in cookies")
      return null
    }

    // Use universal verification method
    const session = await verifyTokenUniversal(token)
    console.log("Session verification result:", session ? "SUCCESS" : "FAILED")

    if (session) {
      console.log("Session details:", {
        userId: session.userId,
        email: session.email,
        role: session.role,
      })
    }

    return session
  } catch (error) {
    console.error("getSession error:", error)
    return null
  }
}

export function createSessionToken(
  userId: string,
  email: string,
  name: string,
  role: "job_seeker" | "recruiter" | "admin",
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
  role: "job_seeker" | "recruiter" | "admin",
): string {
  return createSessionToken(userId, email, name, role)
}




// // lib/auth.ts
// import jwt from "jsonwebtoken"
// import bcrypt from "bcryptjs"
// import { promisify } from "util"
// import type { NextRequest } from "next/server"
// import { EdgeRuntime } from "next/dist/compiled/edge-runtime"

// const JWT_SECRET = process.env.JWT_SECRET

// if (!JWT_SECRET) {
//   console.error("❌ JWT_SECRET environment variable is not set!")
//   throw new Error("JWT_SECRET environment variable is required")
// }

// console.log("✅ JWT_SECRET loaded successfully")

// // Promisify bcrypt methods (Node.js only)
// const hashAsync = promisify(bcrypt.hash)
// const compareAsync = promisify(bcrypt.compare)

// export interface Session {
//   userId: string
//   email: string
//   name: string
//   role: "job_seeker" | "recruiter" | "admin"
// }

// export async function hashPassword(password: string): Promise<string> {
//   return await hashAsync(password, 12)
// }

// export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
//   return await compareAsync(password, hashedPassword)
// }

// export function generateToken(payload: Session): string {
//   console.log("🔑 Generating token with JWT_SECRET:", JWT_SECRET.substring(0, 10) + "...")
//   return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
// }

// // Edge-compatible token verification using Web Crypto API
// export async function verifyTokenEdge(token: string): Promise<Session | null> {
//   try {
//     console.log("🔑 Edge: Verifying token with Web Crypto API")

//     // Split the JWT token
//     const parts = token.split(".")
//     if (parts.length !== 3) {
//       throw new Error("Invalid token format")
//     }

//     const [header, payload, signature] = parts

//     // Decode header and payload
//     const decodedHeader = JSON.parse(atob(header))
//     const decodedPayload = JSON.parse(atob(payload))

//     // Check if token is expired
//     if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
//       console.log("❌ Edge: Token expired")
//       return null
//     }

//     // Verify signature using Web Crypto API
//     const encoder = new TextEncoder()
//     const data = encoder.encode(`${header}.${payload}`)
//     const secretKey = encoder.encode(JWT_SECRET)

//     // Import the secret key
//     const key = await crypto.subtle.importKey("raw", secretKey, { name: "HMAC", hash: "SHA-256" }, false, ["verify"])

//     // Convert base64url signature to ArrayBuffer
//     const signatureBuffer = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
//       c.charCodeAt(0),
//     )

//     // Verify the signature
//     const isValid = await crypto.subtle.verify("HMAC", key, signatureBuffer, data)

//     if (!isValid) {
//       console.log("❌ Edge: Invalid signature")
//       return null
//     }

//     console.log("✅ Edge: Token verified successfully")
//     return decodedPayload as Session
//   } catch (error) {
//     console.error("❌ Edge: Token verification error:", error)
//     return null
//   }
// }

// // Node.js compatible token verification
// export function verifyToken(token: string): Session | null {
//   try {
//     console.log("🔑 Node: Verifying token with JWT_SECRET:", JWT_SECRET.substring(0, 10) + "...")
//     return jwt.verify(token, JWT_SECRET) as Session
//   } catch (error) {
//     console.error("❌ Node: Token verification error:", error.message)
//     return null
//   }
// }

// // Detect runtime and use appropriate verification method
// export async function verifyTokenUniversal(token: string): Promise<Session | null> {
//   // Check if we're in Edge Runtime
//   if (typeof EdgeRuntime !== "undefined" || !process.versions?.node) {
//     return await verifyTokenEdge(token)
//   } else {
//     return verifyToken(token)
//   }
// }

// // Extract token from request
// export function getTokenFromRequest(request: NextRequest): string | null {
//   // Check Authorization header first
//   const authHeader = request.headers.get('authorization')
//   if (authHeader && authHeader.startsWith('Bearer ')) {
//     return authHeader.substring(7)
//   }

//   // Check various cookie names
//   const tokenFromCookie = request.cookies.get('token')?.value ||
//                          request.cookies.get('authToken')?.value ||
//                          request.cookies.get('auth-token')?.value ||
//                          request.cookies.get('accessToken')?.value

//   return tokenFromCookie || null
// }

// export async function getSession(request: NextRequest): Promise<Session | null> {
//   try {
//     const token = getTokenFromRequest(request)

//     if (!token) {
//       console.log("No auth token found in cookies or headers")
//       return null
//     }

//     // Use universal verification method
//     const session = await verifyTokenUniversal(token)
//     console.log("Session verification result:", session ? "SUCCESS" : "FAILED")

//     if (session) {
//       console.log("Session details:", {
//         userId: session.userId,
//         email: session.email,
//         role: session.role,
//       })
//     }

//     return session
//   } catch (error) {
//     console.error("getSession error:", error)
//     return null
//   }
// }

// export function createSessionToken(
//   userId: string,
//   email: string,
//   name: string,
//   role: "job_seeker" | "recruiter" | "admin",
// ): string {
//   const session: Session = {
//     userId,
//     email,
//     name,
//     role,
//   }

//   const token = generateToken(session)
//   return token
// }

// export function createSession(
//   userId: string,
//   email: string,
//   name: string,
//   role: "job_seeker" | "recruiter" | "admin",
// ): string {
//   return createSessionToken(userId, email, name, role)
// }

// // Client-side token management
// export const TokenManager = {
//   // Get token from browser storage
//   getToken(): string | null {
//     if (typeof window === 'undefined') return null

//     return localStorage.getItem('token') ||
//            localStorage.getItem('authToken') ||
//            localStorage.getItem('accessToken') ||
//            sessionStorage.getItem('token') ||
//            this.getTokenFromCookie()
//   },

//   // Get token from cookies
//   getTokenFromCookie(): string | null {
//     if (typeof document === 'undefined') return null

//     const cookies = document.cookie.split('; ')
//     const tokenCookie = cookies.find(cookie =>
//       cookie.startsWith('token=') ||
//       cookie.startsWith('authToken=') ||
//       cookie.startsWith('auth-token=') ||
//       cookie.startsWith('accessToken=')
//     )

//     return tokenCookie ? tokenCookie.split('=')[1] : null
//   },

//   // Set token in storage
//   setToken(token: string): void {
//     if (typeof window === 'undefined') return

//     localStorage.setItem('token', token)
//   },

//   // Remove token from storage
//   removeToken(): void {
//     if (typeof window === 'undefined') return

//     localStorage.removeItem('token')
//     localStorage.removeItem('authToken')
//     localStorage.removeItem('accessToken')
//     sessionStorage.removeItem('token')
//   }
// }

// // Make authenticated API requests
// export async function makeAuthenticatedRequest(
//   url: string,
//   options: RequestInit = {}
// ): Promise<Response> {
//   const token = TokenManager.getToken()

//   if (!token) {
//     throw new Error('No authentication token found. Please log in.')
//   }

//   return fetch(url, {
//     ...options,
//     headers: {
//       ...options.headers,
//       'Authorization': `Bearer ${token}`,
//       'Content-Type': 'application/json',
//     },
//   })
// }