import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyTokenEdge } from "@/lib/auth-edge"
import SecurityCenterClient from "./SecurityCenterClient"

export default async function SecurityCenterPage() {
  const token = cookies().get("auth-token")?.value || ""
  const session = token ? await verifyTokenEdge(token) : null
  const role = session?.role || "viewer"
  if (role !== "admin") {
    redirect("/dashboard")
  }
  return <SecurityCenterClient initialRole={role} />
}
