import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import User from "@/models/User"
import Notification from "@/models/Notification"
import { getFlexTestModel } from "@/lib/flex-test"

// Lightweight schema — stored in Next.js MongoDB
const assignmentSchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, index: true },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
    testTitle: String,
    studentIds: [{ type: String }],
    department: String,
    year: Number,
    batch: String,
    dueDate: Date,
    assignedAt: { type: Date, default: Date.now },
    completions: [
      {
        studentId: String,
        studentName: String,
        completedAt: Date,
        score: Number,
        status: { type: String, default: "assigned" },
      },
    ],
  },
  { strict: false }
)

function getAssignmentModel() {
  return mongoose.models.CollegeTestAssignment ||
    mongoose.model("CollegeTestAssignment", assignmentSchema)
}

// GET — list all assignments for this college
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || (session.role !== "college" && session.role !== "college_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const Model = getAssignmentModel()
    const assignments = await Model.find({ collegeId: session.userId })
      .sort({ assignedAt: -1 })
      .lean()
    return NextResponse.json({ assignments: assignments ?? [] })
  } catch (err) {
    console.error("[assign-test GET]", err)
    return NextResponse.json({ assignments: [] })
  }
}

// POST — create new test assignment
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || (session.role !== "college" && session.role !== "college_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { testId, testTitle, studentIds, department, year, batch, dueDate } = body

  if (!testId || !studentIds?.length) {
    return NextResponse.json({ error: "testId and studentIds are required" }, { status: 400 })
  }

  try {
    await connectDB()
    const Model = getAssignmentModel()
    const FlexTest = getFlexTestModel()
    const collegeOid = new mongoose.Types.ObjectId(session.userId)

    const testDoc = await FlexTest.findOne({
      _id: testId,
      $or: [
        { collegeId: session.userId },
        { collegeId: collegeOid },
        { ownerType: "college", createdBy: collegeOid },
      ],
    }).lean()

    if (!testDoc) {
      return NextResponse.json({ error: "Test not found or not owned by your college" }, { status: 404 })
    }

    const validStudents = await User.find({
      _id: { $in: studentIds },
      role: "job_seeker",
      onboardedByCollege: { $in: [session.userId, collegeOid] },
    }).select("name email").lean()

    if (validStudents.length === 0) {
      return NextResponse.json({ error: "No valid onboarded students selected" }, { status: 400 })
    }

    const validIds = validStudents.map((u) => String(u._id))
    const nameById = new Map(
      validStudents.map((u) => [String(u._id), u.name || "Student"]),
    )

    const finalTitle = testTitle || (testDoc as { title?: string }).title || "Untitled Test"

    const assignment = await Model.create({
      collegeId: session.userId,
      testId: new mongoose.Types.ObjectId(testId),
      testTitle: finalTitle,
      studentIds: validIds,
      department: department || "",
      year: year || null,
      batch: batch || "",
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedAt: new Date(),
      completions: validIds.map((sid) => ({
        studentId: sid,
        studentName: nameById.get(sid) || "",
        status: "assigned",
      })),
    })

    const dueLabel = dueDate
      ? new Date(dueDate).toLocaleDateString()
      : "soon"
    const notifyMessage = `New test assigned: ${finalTitle}. Due ${dueLabel}.`

    await Promise.all(
      validIds.map((sid) =>
        Notification.create({
          userId: sid,
          type: "test_assigned",
          message: notifyMessage,
          relatedEntity: {
            id: new mongoose.Types.ObjectId(testId),
            type: "test",
          },
        }),
      ),
    )

    return NextResponse.json({
      success: true,
      assignmentId: assignment._id,
      assignedCount: validIds.length,
      skippedCount: studentIds.length - validIds.length,
    }, { status: 201 })
  } catch (err: any) {
    console.error("[assign-test POST]", err)
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 })
  }
}

// DELETE — remove assignment
export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session || (session.role !== "college" && session.role !== "college_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  try {
    await connectDB()
    const Model = getAssignmentModel()
    await Model.deleteOne({ _id: id, collegeId: session.userId })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
