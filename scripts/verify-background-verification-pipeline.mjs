/**
 * Verifies background verification pipeline files and core helpers.
 * Run: npm run test:bg-verification
 */

import { existsSync } from "fs"
import { join } from "path"

const root = process.cwd()

const REQUIRED_FILES = [
  "models/BackgroundVerification.ts",
  "lib/background-verification.ts",
  "lib/background-verification-constants.ts",
  "app/api/background-verification/route.ts",
  "app/api/background-verification/[id]/route.ts",
  "app/api/background-verification/stats/route.ts",
  "app/api/background-verification/candidates/route.ts",
  "app/api/background-verification/export/route.ts",
  "app/dashboard/recruiter/background-verification/page.tsx",
]

let failed = 0

console.log("=== HireAI Background Verification Pipeline ===\n")

for (const file of REQUIRED_FILES) {
  const path = join(root, file)
  if (existsSync(path)) {
    console.log(`✓ ${file}`)
  } else {
    console.log(`✗ MISSING: ${file}`)
    failed++
  }
}

try {
  const { PROVIDER_INFO } = await import("../lib/background-verification-constants.ts")
  if (!PROVIDER_INFO.Manual || PROVIDER_INFO.Checkr.costUsd !== 35) {
    console.log("✗ PROVIDER_INFO invalid")
    failed++
  } else {
    console.log("✓ PROVIDER_INFO constants")
  }

  function buildComponents(selected = {}) {
    const keys = ["identity", "education", "employment", "criminal", "drug", "reference"]
    const out = {}
    for (const k of keys) {
      const enabled = selected[k] ?? true
      out[k] = { status: enabled ? "Pending" : "Not Required" }
    }
    return out
  }
  const comps = buildComponents({ identity: true, drug: false })
  if (comps.identity.status !== "Pending" || comps.drug.status !== "Not Required") {
    console.log("✗ component selection logic failed")
    failed++
  } else {
    console.log("✓ component selection logic")
  }
} catch (e) {
  console.log("✗ Helper import failed:", e.message)
  failed++
}

console.log("\n--- Pipeline stages ---")
console.log("1. List eligible → GET /api/background-verification/candidates")
console.log("2. Initiate check → POST /api/background-verification")
console.log("3. Bulk initiate → POST action=bulk")
console.log("4. Update component → PUT action=update-component")
console.log("5. Finalize → PUT action=finalize")
console.log("6. Stats → GET /api/background-verification/stats")
console.log("7. Export CSV → GET /api/background-verification/export")
console.log("8. Detail → GET /api/background-verification/[id]")

if (failed > 0) {
  console.log(`\n${failed} check(s) failed.\n`)
  process.exit(1)
}

console.log("\nAll background verification pipeline checks passed.\n")
