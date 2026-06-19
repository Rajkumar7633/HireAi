import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
export { dynamic } from "@/lib/api-dynamic"


export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") || "").trim()

    const filter: Record<string, unknown> = { role: "recruiter" }

    if (q) {
      filter.$or = [
        { companyName: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { businessLocation: { $regex: q, $options: "i" } },
      ]
    }

    const recruiters = await User.find(filter)
      .select(
        "name email companyName companyDescription businessLocation website linkedinUrl isProfileComplete",
      )
      .sort({ companyName: 1, name: 1 })
      .limit(100)
      .lean()

    return NextResponse.json({
      recruiters: recruiters.map((r: any) => ({
        _id: r._id.toString(),
        name: r.name,
        email: r.email,
        companyName: r.companyName || r.name,
        companyDescription: r.companyDescription || "",
        businessLocation: r.businessLocation || "",
        website: r.website || "",
        linkedinUrl: r.linkedinUrl || "",
        isProfileComplete: Boolean(r.isProfileComplete),
      })),
    })
  } catch (error) {
    console.error("[college/recruiters GET]", error)
    return NextResponse.json({ message: "Failed to fetch recruiters" }, { status: 500 })
  }
}
