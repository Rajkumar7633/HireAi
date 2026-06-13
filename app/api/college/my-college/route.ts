import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import mongoose from "mongoose"

// Called by job-seekers to get info about their college + tests assigned to them
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()

    // Get the student's own record to find their college
    const student = await (User as any)
      .findById(session.userId)
      .select("onboardedByCollege department batch cgpa placementStatus companyPlacedAt packageLPA skills")
      .lean()

    if (!student?.onboardedByCollege) {
      return NextResponse.json({ college: null, tests: [], drives: [] })
    }

    // Get the college admin profile
    const college = await (User as any)
      .findById(student.onboardedByCollege)
      .select("name collegeName collegeLocation collegeWebsite email phone profileImage")
      .lean()

    // Get tests assigned to this student by their college
    const AssignmentModel = mongoose.models.CollegeTestAssignment ||
      mongoose.model("CollegeTestAssignment", new mongoose.Schema({}, { strict: false }))

    const assignments = await (AssignmentModel as any)
      .find({
        collegeId: String(student.onboardedByCollege),
        "completions.studentId": session.userId,
      })
      .lean()

    const tests = assignments.map((a: any) => {
      const completion = a.completions?.find((c: any) => String(c.studentId) === session.userId)
      return {
        assignmentId: String(a._id),
        testId: String(a.testId),
        testTitle: a.testTitle || "Untitled Test",
        assignedAt: a.assignedAt,
        dueDate: a.dueDate || null,
        status: completion?.status || "assigned",
        score: completion?.score ?? null,
        completedAt: completion?.completedAt ?? null,
      }
    })

    return NextResponse.json({
      college: {
        _id: String(college?._id || student.onboardedByCollege),
        name: college?.collegeName || college?.name || "Your College",
        location: college?.collegeLocation || "",
        website: college?.collegeWebsite || "",
        email: college?.email || "",
        phone: college?.phone || "",
        logo: college?.profileImage || null,
      },
      studentInfo: {
        department: student.department || "",
        batch: student.batch || "",
        cgpa: student.cgpa || null,
        placementStatus: student.placementStatus || "unplaced",
        companyPlacedAt: student.companyPlacedAt || "",
        packageLPA: student.packageLPA || null,
        skills: student.skills || [],
      },
      tests,
    })
  } catch (err) {
    console.error("[my-college]", err)
    return NextResponse.json({ college: null, tests: [], drives: [] })
  }
}
