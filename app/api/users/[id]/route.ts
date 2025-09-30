// import { type NextRequest, NextResponse } from "next/server"
// import { getSession } from "@/lib/auth"

// const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

// export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
//   const session = await getSession(req)

//   if (!session) {
//     return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
//   }

//   try {
//     const { id } = params
//     const response = await fetch(`${BACKEND_URL}/api/user/${id}`, {
//       // Assuming a backend route to get user by ID
//       headers: {
//         Authorization: `Bearer ${session.userId}`, // Admin or authorized user can fetch
//       },
//       cache: "no-store",
//     })

//     if (!response.ok) {
//       const errorData = await response.json()
//       return NextResponse.json({ message: errorData.msg || "Failed to fetch user" }, { status: response.status })
//     }

//     const data = await response.json()
//     return NextResponse.json({ user: data }, { status: 200 })
//   } catch (error) {
//     console.error("Error fetching user by ID:", error)
//     return NextResponse.json({ message: "Internal server error" }, { status: 500 })
//   }
// }


import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import JobSeekerProfile from "@/models/JobSeekerProfile"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(req)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { id } = params

    const user = await User.findById(id).select("-passwordHash")

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    let jobSeekerProfile = null
    if (user.role === "job_seeker") {
      jobSeekerProfile = await JobSeekerProfile.findOne({ userId: id })
    }

    const userData = {
      ...user.toObject(),
      jobSeekerProfile: jobSeekerProfile?.toObject() || null,
    }

    return NextResponse.json({ user: userData }, { status: 200 })
  } catch (error) {
    console.error("Error fetching user by ID:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
