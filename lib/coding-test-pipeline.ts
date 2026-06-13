/**
 * Coding test E2E pipeline — stage definitions for create → assign → take → submit → review.
 */

export const CODING_TEST_PIPELINE = [
  {
    id: "create",
    label: "Create test",
    recruiterPath: "/dashboard/recruiter/tests/create/coding",
    api: "POST /api/tests",
  },
  {
    id: "assign",
    label: "Assign to candidate",
    recruiterPath: "/dashboard/recruiter/tests/[id]/assign",
    api: "POST /api/tests/assign",
  },
  {
    id: "list",
    label: "Candidate sees assignment",
    candidatePath: "/dashboard/job-seeker/tests",
    api: "GET /api/job-seeker/tests",
  },
  {
    id: "start",
    label: "Start secure session",
    candidatePath: "/dashboard/job-seeker/tests/[applicationId]",
    api: "POST /api/applications/[id]/start-test",
  },
  {
    id: "proctor",
    label: "8-layer proctoring + object AI",
    components: ["CodingTestProctor", "FaceProctor", "ProctorObjectDetector"],
    api: "POST /api/proctoring/event",
  },
  {
    id: "run",
    label: "Run sample cases",
    api: "POST /api/code/run-tests",
  },
  {
    id: "validate",
    label: "Validate hidden cases",
    api: "POST /api/code/validate-hidden",
  },
  {
    id: "submit",
    label: "Submit & score",
    api: "POST /api/applications/[id]/submit-test",
  },
  {
    id: "review",
    label: "Recruiter results + live monitor",
    recruiterPath: "/dashboard/recruiter/tests/[id]/results",
    api: "GET /api/tests/[id]/submissions",
  },
] as const

export type PipelineStageId = typeof CODING_TEST_PIPELINE[number]["id"]

export const PIPELINE_FILE_CHECKS = [
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
  "pages/api/socket.ts",
] as const
