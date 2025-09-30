import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import JobDescription from "@/models/JobDescription"
import Company from "@/models/Company"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const job = await JobDescription.findById(params.id)
      .populate("recruiterId", "name email")
      .populate("companyId", "name logoUrl description website")

    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 })
    }

    return NextResponse.json({ jobDescription: job })
  } catch (error) {
    console.error("Error fetching job:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)

    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    if (session.role !== "recruiter") {
      return NextResponse.json({ message: "Only recruiters can update job descriptions" }, { status: 403 })
    }

    await connectDB()

    const job = await JobDescription.findById(params.id)

    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 })
    }

    if (job.recruiterId.toString() !== session.userId) {
      return NextResponse.json({ message: "You can only update your own job descriptions" }, { status: 403 })
    }

    const updates = await request.json()

    // Handle optional company payload
    const companyPayload = updates?.company as
      | { name?: string; logoUrl?: string; description?: string; website?: string }
      | undefined

    // Remove company from direct job updates to avoid unknown props on schema
    if (updates?.company) delete updates.company

    // If no companyId yet for this job and recruiter is updating company info, create one lazily
    if (!job.companyId && companyPayload) {
      const created = await Company.findOneAndUpdate(
        { ownerId: session.userId },
        {
          $setOnInsert: {
            name: companyPayload.name || "Company",
          },
        },
        { new: true, upsert: true },
      )
      job.companyId = created._id
    }

    // If company exists and payload provided, update it
    if (job.companyId && companyPayload) {
      await Company.findByIdAndUpdate(
        job.companyId,
        {
          $set: {
            ...(companyPayload.name ? { name: companyPayload.name } : {}),
            ...(companyPayload.logoUrl ? { logoUrl: companyPayload.logoUrl } : {}),
            ...(companyPayload.description ? { description: companyPayload.description } : {}),
            ...(companyPayload.website ? { website: companyPayload.website } : {}),
          },
        },
        { new: true },
      )
    }

    // If no company payload and job has no companyId yet, attempt to auto-attach existing company for this recruiter
    if (!companyPayload && !job.companyId) {
      const existing = await Company.findOne({ ownerId: session.userId })
      if (existing) {
        job.companyId = existing._id
      }
    }

    // Apply remaining job field updates
    Object.assign(job, updates)
    await job.save()

    const populated = await JobDescription.findById(job._id)
      .populate("recruiterId", "name email")
      .populate("companyId", "name logoUrl description website")

    return NextResponse.json({ message: "Job description updated successfully", jobDescription: populated })
  } catch (error) {
    console.error("Error updating job:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)

    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    if (session.role !== "recruiter") {
      return NextResponse.json({ message: "Only recruiters can delete job descriptions" }, { status: 403 })
    }

    await connectDB()

    const job = await JobDescription.findById(params.id)

    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 })
    }

    if (job.recruiterId.toString() !== session.userId) {
      return NextResponse.json({ message: "You can only delete your own job descriptions" }, { status: 403 })
    }

    await JobDescription.findByIdAndDelete(params.id)

    return NextResponse.json({
      message: "Job description deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting job:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
