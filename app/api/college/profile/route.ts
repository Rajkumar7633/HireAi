import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

function requireCollegeSession(req: NextRequest) {
  return getSession(req).then((session) => {
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return null
    }
    return session
  })
}

function shapeProfile(user: Record<string, any>) {
  return {
    name: user.collegeName || user.name || "",
    code: user.collegeCode || "",
    address: user.address || "",
    city: user.city || "",
    state: user.state || "",
    country: user.country || "",
    zipCode: user.zipCode || "",
    phone: user.phone || "",
    email: user.email || "",
    website: user.website || user.collegeWebsite || "",
    description: user.description || user.companyDescription || "",
    establishedYear: user.establishedYear ? String(user.establishedYear) : "",
    accreditation: user.accreditation || "",
    type: user.collegeType || "Engineering",
    studentCapacity: user.studentCapacity != null ? String(user.studentCapacity) : "",
    placementCellHead: user.placementCellHead || "",
    placementCellEmail: user.placementCellEmail || "",
    placementCellPhone: user.placementCellPhone || "",
    departments: Array.isArray(user.departments) ? user.departments : [],
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireCollegeSession(req)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const user = await User.findById(session.userId).lean()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ profile: shapeProfile(user as Record<string, any>) })
  } catch (error) {
    console.error("Error fetching college profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireCollegeSession(req)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    await connectDB()

    const user = await User.findById(session.userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (body.name != null) {
      user.name = body.name
      user.collegeName = body.name
    }
    if (body.code != null) user.collegeCode = body.code
    if (body.address != null) user.address = body.address
    if (body.city != null) user.city = body.city
    if (body.state != null) user.state = body.state
    if (body.country != null) user.country = body.country
    if (body.zipCode != null) user.zipCode = body.zipCode
    if (body.phone != null) user.phone = body.phone
    if (body.website != null) {
      user.website = body.website
      user.collegeWebsite = body.website
    }
    if (body.description != null) user.description = body.description
    if (body.establishedYear != null) user.establishedYear = String(body.establishedYear)
    if (body.accreditation != null) user.accreditation = body.accreditation
    if (body.type != null) user.collegeType = body.type
    if (body.studentCapacity != null) user.studentCapacity = String(body.studentCapacity)
    if (body.placementCellHead != null) user.placementCellHead = body.placementCellHead
    if (body.placementCellEmail != null) user.placementCellEmail = body.placementCellEmail
    if (body.placementCellPhone != null) user.placementCellPhone = body.placementCellPhone
    if (Array.isArray(body.departments)) user.departments = body.departments

    const locationParts = [body.city, body.state, body.country].filter(Boolean)
    if (locationParts.length > 0) {
      user.collegeLocation = locationParts.join(", ")
    }

    user.isProfileComplete = Boolean(body.name && body.code && body.address && body.city)

    await user.save()

    const profile = shapeProfile(user.toObject())

    return NextResponse.json({
      message: "Profile updated successfully",
      profile,
    })
  } catch (error) {
    console.error("Error updating college profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
