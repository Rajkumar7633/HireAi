export interface EligibilityCriteria {
  minCGPA?: number
  maxCGPA?: number
  minMarks10th?: number
  minMarks12th?: number
  maxBacklogs?: number
  departments?: string[]
  batches?: string[]
  branches?: string[]
  requiredSkills?: string[]
  onlyUnplaced?: boolean
}

export interface StudentRecord {
  _id: string
  name: string
  email: string
  phone?: string
  department?: string
  batch?: string
  cgpa?: number | null
  marks10th?: number | null
  marks12th?: number | null
  backlogs?: number | null
  skills?: string[]
  placementStatus?: string
}

export interface EligibilityResult {
  eligible: boolean
  reasons: string[]
  missingFields: string[]
}

export function evaluateStudent(
  student: StudentRecord,
  criteria: EligibilityCriteria,
): EligibilityResult {
  const reasons: string[] = []
  const missingFields: string[] = []

  if (criteria.onlyUnplaced && student.placementStatus === "placed") {
    reasons.push("Already placed")
  }

  if (criteria.minCGPA != null && criteria.minCGPA > 0) {
    if (student.cgpa == null) missingFields.push("CGPA")
    else if (student.cgpa < criteria.minCGPA) reasons.push(`CGPA below ${criteria.minCGPA}`)
  }

  if (criteria.maxCGPA != null && criteria.maxCGPA > 0 && student.cgpa != null) {
    if (student.cgpa > criteria.maxCGPA) reasons.push(`CGPA above ${criteria.maxCGPA}`)
  }

  if (criteria.minMarks10th != null && criteria.minMarks10th > 0) {
    if (student.marks10th == null) missingFields.push("10th marks")
    else if (student.marks10th < criteria.minMarks10th) reasons.push(`10th marks below ${criteria.minMarks10th}%`)
  }

  if (criteria.minMarks12th != null && criteria.minMarks12th > 0) {
    if (student.marks12th == null) missingFields.push("12th marks")
    else if (student.marks12th < criteria.minMarks12th) reasons.push(`12th marks below ${criteria.minMarks12th}%`)
  }

  if (criteria.maxBacklogs != null && criteria.maxBacklogs >= 0) {
    if (student.backlogs == null) missingFields.push("Backlog count")
    else if (student.backlogs > criteria.maxBacklogs) reasons.push(`Backlogs exceed ${criteria.maxBacklogs}`)
  }

  const deptList = criteria.departments?.filter(Boolean) ?? []
  const branchList = criteria.branches?.filter(Boolean) ?? []
  const deptOrBranch = [...deptList, ...branchList]
  if (deptOrBranch.length > 0) {
    const dept = (student.department || "").toLowerCase()
    const match = deptOrBranch.some((d) => dept.includes(d.toLowerCase()) || d.toLowerCase().includes(dept))
    if (!match) reasons.push("Department/branch not eligible")
  }

  if (criteria.batches?.length) {
    if (!student.batch) missingFields.push("Batch")
    else if (!criteria.batches.includes(student.batch)) reasons.push("Batch not eligible")
  }

  if (criteria.requiredSkills?.length) {
    const studentSkills = (student.skills || []).map((s) => s.toLowerCase())
    const missingSkills = criteria.requiredSkills.filter(
      (sk) => !studentSkills.some((ss) => ss.includes(sk.toLowerCase()) || sk.toLowerCase().includes(ss)),
    )
    if (missingSkills.length > 0) reasons.push(`Missing skills: ${missingSkills.join(", ")}`)
  }

  const eligible = reasons.length === 0 && missingFields.length === 0
  return { eligible, reasons, missingFields }
}

export function criteriaFromDrive(drive: {
  eligibility?: {
    minCGPA?: number
    branches?: string[]
    batches?: string[]
    years?: number[]
    semesters?: number[]
    skills?: string[]
    backlogsAllowed?: boolean
  }
  companyName?: string
  role?: string
}): EligibilityCriteria {
  const e = drive.eligibility || {}
  return {
    minCGPA: e.minCGPA && e.minCGPA > 0 ? e.minCGPA : undefined,
    branches: e.branches || [],
    batches: e.batches || [],
    requiredSkills: e.skills || [],
    maxBacklogs: e.backlogsAllowed ? undefined : 0,
    onlyUnplaced: true,
  }
}
