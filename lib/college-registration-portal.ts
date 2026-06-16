import crypto from "crypto"
import { connectDB } from "@/lib/mongodb"
import CollegeRegistrationPortal from "@/models/CollegeRegistrationPortal"
import User from "@/models/User"

type LeanCollege = {
  role?: string
  collegeName?: string
  name?: string
  city?: string
  state?: string
  collegeType?: string
}

export async function getOrCreatePortalToken(collegeId: string, regenerate = false) {
  await connectDB()

  if (regenerate) {
    const token = crypto.randomBytes(18).toString("hex")
    return CollegeRegistrationPortal.findOneAndUpdate(
      { collegeId },
      { collegeId, token, active: true },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }

  let portal = await CollegeRegistrationPortal.findOne({ collegeId })
  if (!portal) {
    const token = crypto.randomBytes(18).toString("hex")
    portal = await CollegeRegistrationPortal.create({ collegeId, token, active: true })
  }
  return portal
}

export async function resolvePortalByToken(token: string) {
  await connectDB()
  const portal = await CollegeRegistrationPortal.findOne({ token, active: true })

  if (!portal) return null

  const college = await User.findById(portal.collegeId)
    .select("name collegeName city state departments collegeType role")
    .lean() as LeanCollege | null

  if (!college || (college.role !== "college" && college.role !== "college_admin")) {
    return null
  }

  return {
    portal: portal.toObject(),
    college: {
      id: String(portal.collegeId),
      name: college.collegeName || college.name || "College",
      city: college.city,
      state: college.state,
      type: college.collegeType,
    },
  }
}
