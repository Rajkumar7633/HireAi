import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
export { dynamic } from "@/lib/api-dynamic"


export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") || "").trim().toLowerCase()
    const location = (searchParams.get("location") || "").trim().toLowerCase()

    const filter: Record<string, unknown> = {
      role: { $in: ["college", "college_admin"] },
    }

    if (q) {
      filter.$or = [
        { collegeName: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ]
    }

    if (location) {
      filter.collegeLocation = { $regex: location, $options: "i" }
    }

    const colleges = await User.find(filter)
      .select("name email collegeName collegeLocation collegeWebsite totalStudents placementRate")
      .sort({ collegeName: 1, name: 1 })
      .limit(100)
      .lean()

    return NextResponse.json({
      colleges: colleges.map((c: any) => ({
        _id: c._id.toString(),
        name: c.name,
        email: c.email,
        collegeName: c.collegeName || c.name,
        collegeLocation: c.collegeLocation || "",
        collegeWebsite: c.collegeWebsite || "",
        totalStudents: c.totalStudents || 0,
        placementRate: c.placementRate || 0,
      })),
    })
  } catch (error) {
    console.error("[recruiter/colleges GET]", error)
    return NextResponse.json({ message: "Failed to fetch colleges" }, { status: 500 })
  }
}
