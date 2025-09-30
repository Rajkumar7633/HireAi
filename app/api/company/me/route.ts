import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Company from "@/models/Company"
import User from "@/models/User"

// GET current recruiter's company profile
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Load recruiter user to access branding fields from their profile
    const user = (await User.findById(session.userId).lean()) as any

    // Try to find an existing company
    let companyDoc = await Company.findOne({ ownerId: session.userId })

    // If no company exists, create one using user's branding if available
    if (!companyDoc) {
      companyDoc = new Company({
        ownerId: session.userId,
        name: user?.companyName?.trim() || "Company",
        logoUrl: user?.companyLogo?.trim() || undefined,
        description: user?.companyDescription?.trim() || undefined,
        website: user?.website?.trim() || undefined,
      })
      await companyDoc.save()
    } else {
      // Mirror non-empty user branding fields into company doc (profile is source of truth)
      const updates: any = {}
      if (user?.companyName && user.companyName.trim() && user.companyName.trim() !== (companyDoc.name || "").trim()) {
        updates.name = user.companyName.trim()
      }
      if (user?.companyLogo && user.companyLogo.trim() && user.companyLogo.trim() !== (companyDoc.logoUrl || "").trim()) {
        updates.logoUrl = user.companyLogo.trim()
      }
      if (
        user?.companyDescription &&
        user.companyDescription.trim() &&
        user.companyDescription.trim() !== (companyDoc.description || "").trim()
      ) {
        updates.description = user.companyDescription.trim()
      }
      if (user?.website && user.website.trim() && user.website.trim() !== (companyDoc.website || "").trim()) {
        updates.website = user.website.trim()
      }
      if (Object.keys(updates).length > 0) {
        await Company.updateOne({ _id: companyDoc._id }, { $set: updates })
        // refresh document
        companyDoc = await Company.findById(companyDoc._id)
      }
    }

    return NextResponse.json({ success: true, company: companyDoc.toObject() })
  } catch (err: any) {
    console.error("[company][me][GET] error", err)
    return NextResponse.json({ success: false, message: err.message || "Failed" }, { status: 500 })
  }
}

// PATCH current recruiter's company profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, logoUrl, description, website } = body || {}

    await connectDB()

    const updated = await Company.findOneAndUpdate(
      { ownerId: session.userId },
      { $set: { name, logoUrl, description, website } },
      { new: true, upsert: true },
    ).lean()

    return NextResponse.json({ success: true, company: updated })
  } catch (err: any) {
    console.error("[company][me][PATCH] error", err)
    return NextResponse.json({ success: false, message: err.message || "Failed" }, { status: 500 })
  }
}
