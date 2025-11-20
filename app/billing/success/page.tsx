"use client"

export const dynamic = "force-dynamic"

import { Suspense } from "react"
import BillingSuccessClient from "./SuccessClient"

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Payment Successful</h1>
        <p className="text-sm text-muted-foreground">Finalizing your subscription…</p>
      </div>
    }>
      <BillingSuccessClient />
    </Suspense>
  )
}
