/**
 * Verifies coding test pipeline files exist and core security helpers work.
 * Run: npm run test:pipeline
 */

import { existsSync } from "fs"
import { join } from "path"

const root = process.cwd()

const REQUIRED_FILES = [
  "app/api/tests/route.ts",
  "app/api/tests/assign/route.ts",
  "app/api/job-seeker/tests/route.ts",
  "app/api/applications/[id]/start-test/route.ts",
  "app/api/applications/[id]/submit-test/route.ts",
  "app/api/code/run-tests/route.ts",
  "app/api/code/validate-hidden/route.ts",
  "app/api/proctoring/event/route.ts",
  "app/api/tests/[id]/submissions/route.ts",
  "app/api/tests/[id]/analytics/route.ts",
  "components/proctor/coding-test-proctor.tsx",
  "components/proctor/face-proctor.tsx",
  "lib/proctor-object-detection.ts",
  "lib/coding-test-security.ts",
  "lib/coding-test-pipeline.ts",
  "pages/api/socket.ts",
]

let failed = 0

console.log("=== HireAI Coding Test Pipeline Verification ===\n")

for (const file of REQUIRED_FILES) {
  const path = join(root, file)
  if (existsSync(path)) {
    console.log(`✓ ${file}`)
  } else {
    console.log(`✗ MISSING: ${file}`)
    failed++
  }
}

// Dynamic import security helpers (Node can load TS via tsx if available, else skip)
try {
  const { computeIntegrityScore } = await import("../lib/coding-test-security.ts")
  const score = computeIntegrityScore(2, [
    { type: "tab_switch", message: "test", at: new Date().toISOString() },
  ], 2)
  if (score >= 0 && score <= 100) {
    console.log(`\n✓ computeIntegrityScore() → ${score}`)
  } else {
    console.log(`\n✗ computeIntegrityScore returned invalid: ${score}`)
    failed++
  }
} catch (e) {
  console.log("\n⚠ Could not run TS module tests (use tsx). File checks only.")
  console.log(`  ${e instanceof Error ? e.message : e}`)
}

console.log("\n--- Pipeline stages ---")
const stages = [
  "1. Recruiter creates test → POST /api/tests",
  "2. Assign candidate → POST /api/tests/assign",
  "3. Candidate lists → GET /api/job-seeker/tests",
  "4. Start session → POST /api/applications/[id]/start-test",
  "5. Proctoring (face + COCO-SSD object AI) → POST /api/proctoring/event",
  "6. Run sample cases → POST /api/code/run-tests",
  "7. Validate hidden → POST /api/code/validate-hidden",
  "8. Submit & score → POST /api/applications/[id]/submit-test",
  "9. Recruiter review → GET /api/tests/[id]/submissions + live socket",
]
stages.forEach(s => console.log(s))

if (failed > 0) {
  console.log(`\nFAILED: ${failed} check(s)\n`)
  process.exit(1)
}

console.log("\nAll pipeline file checks passed.\n")
