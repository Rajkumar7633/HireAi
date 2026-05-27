/**
 * lib/api-client.ts
 *
 * Centralized fetch wrapper for all frontend API calls.
 * Handles: auth token injection, response parsing, error standardization.
 *
 * Usage:
 *   const data = await apiClient.get('/api/tests/my-tests')
 *   const res  = await apiClient.post('/api/tests/assign', { testId, applicationId })
 */

type RequestOptions = Omit<RequestInit, "method" | "body"> & {
  data?: unknown
  timeout?: number
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T = unknown>(
  method: string,
  url: string,
  { data, timeout = 15_000, ...options }: RequestOptions = {}
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
      cache: "no-store",
      ...options,
    })

    clearTimeout(timeoutId)

    // Try to parse JSON regardless of status
    let parsed: unknown
    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      parsed = await res.json().catch(() => ({}))
    } else {
      parsed = await res.text().catch(() => "")
    }

    if (!res.ok) {
      const message =
        typeof parsed === "object" && parsed !== null
          ? ((parsed as any).message || (parsed as any).msg || `HTTP ${res.status}`)
          : `HTTP ${res.status}`
      throw new ApiError(res.status, message, parsed)
    }

    return parsed as T
  } catch (err: any) {
    clearTimeout(timeoutId)

    if (err instanceof ApiError) throw err

    if (err.name === "AbortError") {
      throw new ApiError(504, "Request timed out. Please try again.")
    }
    if (err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED")) {
      throw new ApiError(503, "Cannot connect to server. Is the backend running?")
    }
    throw new ApiError(0, err.message || "Network error")
  }
}

export const apiClient = {
  get:    <T = unknown>(url: string, options?: RequestOptions) => request<T>("GET",    url, options),
  post:   <T = unknown>(url: string, data?: unknown, options?: RequestOptions) => request<T>("POST",   url, { ...options, data }),
  put:    <T = unknown>(url: string, data?: unknown, options?: RequestOptions) => request<T>("PUT",    url, { ...options, data }),
  patch:  <T = unknown>(url: string, data?: unknown, options?: RequestOptions) => request<T>("PATCH",  url, { ...options, data }),
  delete: <T = unknown>(url: string, options?: RequestOptions) => request<T>("DELETE", url, options),
}

/**
 * Convenience: extract a human-readable error message from any thrown value.
 * Works with ApiError, standard Error, and unknown objects.
 *
 * @example
 *   try { await apiClient.post(...) }
 *   catch(e) { toast({ description: getErrorMessage(e), variant: "destructive" }) }
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  return "An unexpected error occurred"
}
