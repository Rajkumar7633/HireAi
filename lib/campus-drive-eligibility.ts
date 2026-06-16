/**
 * Shared campus drive eligibility — used by college notifications, job seeker listing, and apply API.
 */

export interface CampusDriveStudent {
  cgpa?: number | null
  department?: string | null
  batch?: string | null
  currentYear?: number | null
  semester?: number | null
  skills?: string[]
  backlogs?: number | null
  placementStatus?: string | null
}

export interface CampusDriveEligibility {
  minCGPA?: number
  branches?: string[]
  years?: number[]
  batches?: string[]
  semesters?: number[]
  skills?: string[]
  backlogsAllowed?: boolean
}

const BRANCH_ALIASES: Record<string, string[]> = {
  cse: ["cse", "cs", "computer science", "computer engineering"],
  it: ["it", "information technology"],
  ece: ["ece", "electronics", "electronics and communication", "electronics & communication"],
  eee: ["eee", "electrical", "electrical engineering"],
  mechanical: ["mechanical", "mech"],
  civil: ["civil"],
  chemical: ["chemical"],
  biotechnology: ["biotechnology", "biotech"],
  mba: ["mba"],
  mca: ["mca"],
  other: ["other"],
}

function norm(s: string) {
  return s.trim().toLowerCase()
}

function normBatch(batch?: string | null) {
  if (!batch) return ""
  const digits = String(batch).replace(/\D/g, "")
  return digits || norm(batch)
}

function branchMatches(studentDept: string, allowedBranches: string[]) {
  const dept = norm(studentDept)
  if (!dept) return false
  return allowedBranches.some((branch) => {
    const b = norm(branch)
    if (dept === b || dept.includes(b) || b.includes(dept)) return true
    const aliases = BRANCH_ALIASES[b] || [b]
    return aliases.some((a) => dept === a || dept.includes(a) || a.includes(dept))
  })
}

/** Infer study year (1–4) from passing batch when currentYear is not stored on profile. */
export function deriveCurrentYearFromBatch(batch?: string | null): number | null {
  const gradYear = parseInt(normBatch(batch), 10)
  if (!gradYear || gradYear < 2000) return null
  const calendarYear = new Date().getFullYear()
  const yearOfStudy = calendarYear - gradYear + 5
  if (yearOfStudy < 1 || yearOfStudy > 4) return null
  return yearOfStudy
}

export function resolveStudentYear(student: CampusDriveStudent): number | null {
  if (student.currentYear != null && student.currentYear >= 1 && student.currentYear <= 4) {
    return student.currentYear
  }
  return deriveCurrentYearFromBatch(student.batch)
}

/** Rough semester from calendar month when not on profile (Jul–Dec = odd, Jan–Jun = even). */
export function deriveSemesterFromDate(): number {
  const m = new Date().getMonth() + 1
  return m >= 7 || m <= 1 ? 1 : 2
}

export function resolveStudentSemester(student: CampusDriveStudent): number | null {
  if (student.semester != null && student.semester >= 1 && student.semester <= 8) {
    return student.semester
  }
  return deriveSemesterFromDate()
}

export function checkCampusDriveEligibility(
  student: CampusDriveStudent,
  drive: { eligibility?: CampusDriveEligibility },
): { eligible: boolean; reasons: string[]; missingFields: string[] } {
  const reasons: string[] = []
  const missingFields: string[] = []
  const e = drive.eligibility || {}

  if (e.minCGPA != null && e.minCGPA > 0) {
    if (student.cgpa == null) missingFields.push("CGPA")
    else if (student.cgpa < e.minCGPA) {
      reasons.push(`Min CGPA required: ${e.minCGPA} (yours: ${student.cgpa})`)
    }
  }

  const branches = (e.branches || []).filter(Boolean)
  if (branches.length > 0) {
    if (!student.department) missingFields.push("Department")
    else if (!branchMatches(student.department, branches)) {
      reasons.push(`Branch not eligible (allowed: ${branches.join(", ")})`)
    }
  }

  const batches = (e.batches || []).map(normBatch).filter(Boolean)
  if (batches.length > 0) {
    const studentBatch = normBatch(student.batch)
    if (!studentBatch) missingFields.push("Batch")
    else if (!batches.includes(studentBatch)) {
      reasons.push(`Batch not eligible (allowed: ${(e.batches || []).join(", ")})`)
    }
  }

  const years = (e.years || []).filter((y) => y >= 1 && y <= 4)
  if (years.length > 0) {
    const studentYear = resolveStudentYear(student)
    if (studentYear == null) missingFields.push("Academic year")
    else if (!years.includes(studentYear)) {
      reasons.push(`Year ${studentYear} not eligible (allowed: Year ${years.join(", ")})`)
    }
  }

  const semesters = (e.semesters || []).filter((s) => s >= 1 && s <= 8)
  if (semesters.length > 0) {
    const studentSem = resolveStudentSemester(student)
    if (studentSem == null) missingFields.push("Semester")
    else if (!semesters.includes(studentSem)) {
      reasons.push(`Semester ${studentSem} not eligible (allowed: Sem ${semesters.join(", ")})`)
    }
  }

  if (e.backlogsAllowed === false) {
    if (student.backlogs == null) missingFields.push("Backlog count")
    else if (student.backlogs > 0) reasons.push("Active backlogs not allowed")
  }

  const requiredSkills = (e.skills || []).filter(Boolean)
  if (requiredSkills.length > 0) {
    const studentSkills = (student.skills || []).map((s) => norm(s))
    const missing = requiredSkills.filter(
      (sk) => !studentSkills.some((ss) => ss.includes(norm(sk)) || norm(sk).includes(ss)),
    )
    if (missing.length > 0) reasons.push(`Missing skills: ${missing.join(", ")}`)
  }

  const eligible = reasons.length === 0 && missingFields.length === 0
  return { eligible, reasons, missingFields }
}

/** Student dashboard: show only drives they qualify for (or already applied to). */
export function shouldShowDriveToStudent(
  student: CampusDriveStudent,
  drive: { eligibility?: CampusDriveEligibility; status?: string },
  applied: boolean,
): boolean {
  if (applied) return true
  const { eligible } = checkCampusDriveEligibility(student, drive)
  return eligible
}

export function studentMatchesDriveQuery(
  student: CampusDriveStudent,
  drive: { eligibility?: CampusDriveEligibility },
): boolean {
  return checkCampusDriveEligibility(student, drive).eligible
}
