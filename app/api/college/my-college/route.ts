import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import CampusDrive from "@/models/CampusDrive"
import CampusDriveApplication from "@/models/CampusDriveApplication"
import Notification from "@/models/Notification"
import { CollegeMeeting } from "@/models/CollegeMeeting"
import mongoose from "mongoose"
import { getCollegeAssignmentModel, getFlexTestModel } from "@/lib/flex-test"
import {
export { dynamic } from "@/lib/api-dynamic"

  checkCampusDriveEligibility,
  resolveStudentYear,
  resolveStudentSemester,
  shouldShowDriveToStudent,
  type CampusDriveStudent,
} from "@/lib/campus-drive-eligibility"

type LeanStudent = CampusDriveStudent & {
  _id: mongoose.Types.ObjectId
  onboardedByCollege?: mongoose.Types.ObjectId
  placementStatus?: string
  companyPlacedAt?: string
  packageLPA?: number | null
  skills?: string[]
}

function computeReadiness(opts: {
  student: LeanStudent
  testsTotal: number
  testsCompleted: number
  drivesApplied: number
  hasSkills: boolean
}) {
  let score = 0
  if (opts.student.department) score += 15
  if (opts.student.batch) score += 15
  if (opts.student.cgpa != null) score += 15
  if (opts.hasSkills) score += 15
  if (opts.testsTotal > 0) {
    score += Math.round((opts.testsCompleted / opts.testsTotal) * 30)
  } else {
    score += 10
  }
  if (opts.drivesApplied > 0) score += 10
  return Math.min(100, score)
}

function pipelineStage(student: LeanStudent, testsCompleted: number, drivesApplied: number) {
  if (student.placementStatus === "placed") return "placed"
  if (student.placementStatus === "offer_received") return "offer"
  if (drivesApplied > 0) return "applying"
  if (testsCompleted > 0) return "assessed"
  return "registered"
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const userId = session.userId

    const student = await User.findById(userId)
      .select(
        "onboardedByCollege department batch currentYear semester cgpa placementStatus companyPlacedAt packageLPA skills backlogs",
      )
      .lean() as LeanStudent | null

    if (!student?.onboardedByCollege) {
      return NextResponse.json({ college: null, tests: [], drives: [], meetings: [], pipeline: null })
    }

    const collegeId = student.onboardedByCollege

    const college = await User.findById(collegeId)
      .select(
        "name collegeName collegeLocation city state collegeWebsite email phone profileImage placementCellEmail placementCellPhone",
      )
      .lean() as {
      _id?: mongoose.Types.ObjectId
      name?: string
      collegeName?: string
      collegeLocation?: string
      city?: string
      state?: string
      collegeWebsite?: string
      email?: string
      phone?: string
      profileImage?: string
      placementCellEmail?: string
      placementCellPhone?: string
    } | null

    const AssignmentModel = getCollegeAssignmentModel()
    const assignments = await AssignmentModel.find({
      studentIds: { $in: [userId, String(userId)] },
    }).lean() as Array<{
      _id: unknown
      testId?: unknown
      testTitle?: string
      assignedAt?: Date
      dueDate?: Date
      completions?: Array<{
        studentId?: string
        status?: string
        score?: number
        completedAt?: Date
      }>
    }>

    const testIds = assignments.map((a) => a.testId).filter(Boolean)
    const FlexTest = getFlexTestModel()
    const testDocs = testIds.length
      ? await FlexTest.find({ _id: { $in: testIds } }).select("title type").lean()
      : []
    const testTitleMap: Record<string, string> = {}
    for (const t of testDocs) {
      testTitleMap[String((t as { _id: unknown })._id)] =
        (t as { title?: string }).title || "College Test"
    }

    const tests = assignments.map((a) => {
      const tid = String(a.testId)
      const completion = (a.completions || []).find(
        (c) => String(c.studentId) === userId,
      )
      const status = completion?.status || "assigned"
      return {
        assignmentId: String(a._id),
        testId: tid,
        testTitle: a.testTitle || testTitleMap[tid] || "Untitled Test",
        assignedAt: a.assignedAt,
        dueDate: a.dueDate || null,
        status: status === "completed" ? "completed" : status === "in_progress" ? "in_progress" : "assigned",
        score: completion?.score ?? null,
        completedAt: completion?.completedAt ?? null,
      }
    })

    const drivesRaw = (await CampusDrive.find({
      collegeId: new mongoose.Types.ObjectId(String(collegeId)),
      status: { $in: ["active", "completed"] },
    })
      .sort({ driveDate: 1 })
      .limit(20)
      .lean()) as unknown as Array<{
      _id: mongoose.Types.ObjectId
      companyName: string
      role: string
      driveDate: Date
      applicationDeadline: Date
      packageMin?: number
      packageMax?: number
      jobType?: string
      status: string
      eligibility?: import("@/lib/campus-drive-eligibility").CampusDriveEligibility
    }>

    const driveIds = drivesRaw.map((d) => d._id)
    const myApps = await CampusDriveApplication.find({
      studentId: userId,
      driveId: { $in: driveIds },
    }).lean()

    const appMap: Record<string, { status?: string; _id: unknown }> = {}
    for (const app of myApps) {
      appMap[String(app.driveId)] = app
    }

    const now = new Date()
    const drives = drivesRaw
      .map((driveDoc) => {
        const applied = appMap[String(driveDoc._id)]
        const { eligible, reasons } = checkCampusDriveEligibility(student, driveDoc)
        const deadlinePassed = new Date(driveDoc.applicationDeadline) < now
        return {
          _id: String(driveDoc._id),
          companyName: driveDoc.companyName,
          role: driveDoc.role,
          driveDate: driveDoc.driveDate,
          applicationDeadline: driveDoc.applicationDeadline,
          packageMin: driveDoc.packageMin,
          packageMax: driveDoc.packageMax,
          jobType: driveDoc.jobType,
          status: driveDoc.status,
          eligible,
          eligibilityReasons: reasons,
          applied: !!applied,
          applicationStatus: applied?.status || null,
          deadlinePassed,
          canApply: eligible && !applied && !deadlinePassed && driveDoc.status === "active",
          _driveDoc: driveDoc,
        }
      })
      .filter((d) => shouldShowDriveToStudent(student, d._driveDoc, d.applied))
      .map(({ _driveDoc, ...rest }) => rest)

    const meetings = await CollegeMeeting.find({
      invitedStudentIds: { $in: [userId, String(userId)] },
      status: { $ne: "cancelled" },
      startTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .sort({ startTime: 1 })
      .limit(5)
      .lean()

    const meetingItems = meetings.map((m) => ({
      _id: String(m._id),
      title: m.title,
      meetingType: m.meetingType,
      startTime: m.startTime,
      endTime: m.endTime,
      venue: m.venue,
      meetingLink: m.meetingLink,
      status: m.status,
    }))

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean()

    const notifItems = notifications
      .filter((n) =>
        ["campus_drive_published", "campus_drive_application", "test_assigned", "test_completed", "application_status_update"].includes(
          n.type,
        ),
      )
      .map((n) => ({
        _id: String(n._id),
        type: n.type,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
      }))

    const testsCompleted = tests.filter((t) => t.status === "completed").length
    const drivesApplied = drives.filter((d) => d.applied).length
    const openDrives = drives.filter((d) => d.canApply).length

    const readiness = computeReadiness({
      student,
      testsTotal: tests.length,
      testsCompleted,
      drivesApplied,
      hasSkills: (student.skills?.length || 0) > 0,
    })

    const location = [college?.city, college?.state].filter(Boolean).join(", ") ||
      college?.collegeLocation ||
      ""

    return NextResponse.json({
      college: {
        _id: String(college?._id || collegeId),
        name: college?.collegeName || college?.name || "Your College",
        location,
        website: college?.collegeWebsite || "",
        email: college?.placementCellEmail || college?.email || "",
        phone: college?.placementCellPhone || college?.phone || "",
        logo: college?.profileImage || null,
      },
      studentInfo: {
        department: student.department || "",
        batch: student.batch || "",
        currentYear: resolveStudentYear(student),
        semester: resolveStudentSemester(student),
        cgpa: student.cgpa ?? null,
        placementStatus: student.placementStatus || "unplaced",
        companyPlacedAt: student.companyPlacedAt || "",
        packageLPA: student.packageLPA ?? null,
        skills: student.skills || [],
        backlogs: student.backlogs ?? 0,
      },
      tests,
      drives,
      meetings: meetingItems,
      notifications: notifItems,
      pipeline: {
        stage: pipelineStage(student, testsCompleted, drivesApplied),
        readiness,
        testsTotal: tests.length,
        testsCompleted,
        testsPending: tests.filter((t) => t.status !== "completed").length,
        drivesOpen: openDrives,
        drivesApplied,
        upcomingMeetings: meetingItems.filter((m) => new Date(m.startTime) > now).length,
      },
    })
  } catch (err) {
    console.error("[my-college]", err)
    return NextResponse.json({ college: null, tests: [], drives: [], meetings: [], pipeline: null })
  }
}
