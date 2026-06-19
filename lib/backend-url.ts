/** Server-side backend URL for Next.js API routes (Render in production). */
export function getBackendUrl(): string {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:5001"
  ).replace(/\/$/, "")
}
