/**
 * Client-side auth helpers for adding the Authorization header to fetch calls.
 */

export function persistAuthToken(token: string | null | undefined) {
  if (typeof window === "undefined" || !token) return
  sessionStorage.setItem("auth-token", token)
}

export function clearAuthToken() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem("auth-token")
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = sessionStorage.getItem("auth-token")
  if (token) return { Authorization: `Bearer ${token}` }
  return {}
}

/** Sync httpOnly cookie token into sessionStorage for Authorization header fallback. */
export async function syncClientAuthToken(): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const res = await fetch("/api/auth/client-token", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data?.token) {
      persistAuthToken(data.token)
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const doFetch = () =>
    fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.headers || {}),
        ...getAuthHeaders(),
      },
    })

  let response = await doFetch()

  if (response.status === 401 && typeof window !== "undefined") {
    const synced = await syncClientAuthToken()
    if (synced) {
      response = await doFetch()
    }
  }

  return response
}
