import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"

function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

function getTestModel() {
  const schema = new mongoose.Schema({}, { strict: false })
  return mongoose.models.CollegeOwnedTest || mongoose.model("CollegeOwnedTest", schema, "tests")
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const TestModel = getTestModel()
    const result = await TestModel.deleteOne({
      _id: params.id,
      $or: [
        { collegeId: session!.userId },
        { collegeId: new mongoose.Types.ObjectId(session!.userId) },
      ],
    })
    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[college/tests DELETE]", error)
    return NextResponse.json({ message: "Failed to delete" }, { status: 500 })
  }
}
