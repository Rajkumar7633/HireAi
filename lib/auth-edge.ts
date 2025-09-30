// lib/auth-edge.ts
// Edge-safe JWT verify using Web Crypto API (no Node-only imports)

export interface Session {
  userId: string
  email: string
  name: string
  role: "job_seeker" | "recruiter" | "admin"
}

const JWT_SECRET = process.env.JWT_SECRET as string

export async function verifyTokenEdge(token: string): Promise<Session | null> {
  try {
    if (!JWT_SECRET) return null
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const [header, payload, signature] = parts

    // base64url decode helper
    const b64urlToB64 = (s: string) => s.replace(/-/g, "+").replace(/_/g, "/")

    const enc = new TextEncoder()
    const data = enc.encode(`${header}.${payload}`)
    const keyRaw = enc.encode(JWT_SECRET)
    const key = await crypto.subtle.importKey(
      "raw",
      keyRaw,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )

    const sigBytes = Uint8Array.from(atob(b64urlToB64(signature)), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, data)
    if (!valid) return null

    const decoded = JSON.parse(atob(b64urlToB64(payload)))
    if (decoded.exp && Date.now() >= decoded.exp * 1000) return null
    return decoded as Session
  } catch {
    return null
  }
}
