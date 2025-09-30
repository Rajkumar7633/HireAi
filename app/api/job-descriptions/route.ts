import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import JobDescription from "@/models/JobDescription"
import Company from "@/models/Company"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const jobs = await JobDescription.find({ status: "active", isActive: true })
      .populate("recruiterId", "name email companyName")
      .populate("companyId", "name logoUrl description website")
      .sort({ createdAt: -1 })

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error("Error fetching jobs:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)

    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    if (session.role !== "recruiter") {
      return NextResponse.json({ message: "Only recruiters can create job descriptions" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, skills, requirements, responsibilities, location, salary, employmentType, experience,
      experienceLevel, remotePolicy, visaSponsorship, benefits, screeningQuestions, applicationMode } = body

    if (!title || !description || !location || !employmentType) {
      return NextResponse.json(
        {
          message: "Title, description, location, and employment type are required",
        },
        { status: 400 },
      )
    }

    await connectDB()

    const jobTypeMapping: { [key: string]: string } = {
      "Full-time": "full-time",
      "Part-time": "part-time",
      Contract: "contract",
      Temporary: "contract",
      Internship: "internship",
    }

    // If a company payload is provided, upsert the Company for this recruiter and attach to the job
    let companyIdToAttach: string | undefined
    const companyPayload = body?.company as
      | { name?: string; logoUrl?: string; description?: string; website?: string }
      | undefined

    if (companyPayload && Object.keys(companyPayload).length > 0) {
      const upserted = await Company.findOneAndUpdate(
        { ownerId: session.userId },
        {
          $setOnInsert: {
            name: companyPayload.name || "Company",
            ownerId: session.userId,
          },
          $set: {
            ...(companyPayload.name ? { name: companyPayload.name } : {}),
            ...(companyPayload.logoUrl ? { logoUrl: companyPayload.logoUrl } : {}),
            ...(companyPayload.description ? { description: companyPayload.description } : {}),
            ...(companyPayload.website ? { website: companyPayload.website } : {}),
          },
        },
        { new: true, upsert: true },
      )
      companyIdToAttach = upserted._id.toString()
    } else {
      // No payload; try to attach an existing company for this recruiter automatically
      const existing = await Company.findOne({ ownerId: session.userId })
      if (existing) {
        companyIdToAttach = existing._id.toString()
      }
    }

    const jobDescription = new JobDescription({
      recruiterId: session.userId,
      title,
      description,
      skillsRequired: Array.isArray(skills) ? skills : skills ? [skills] : [],
      requirements: Array.isArray(requirements) ? requirements : requirements ? [requirements] : [],
      responsibilities: Array.isArray(responsibilities) ? responsibilities : responsibilities ? [responsibilities] : [],
      location,
      salary: salary || "Competitive",
      jobType: jobTypeMapping[employmentType] || "full-time",
      employmentType: employmentType,
      experience: experience || "Not specified",
      experienceLevel: experienceLevel || undefined,
      remotePolicy: remotePolicy || undefined,
      visaSponsorship: typeof visaSponsorship === "boolean" ? visaSponsorship : false,
      benefits: Array.isArray(benefits) ? benefits : benefits ? [benefits] : [],
      screeningQuestions: Array.isArray(screeningQuestions) ? screeningQuestions : screeningQuestions ? [screeningQuestions] : [],
      applicationMode: applicationMode || "resume_plus_form",
      isActive: true,
      status: "active",
      postedDate: new Date(),
      ...(companyIdToAttach ? { companyId: companyIdToAttach } : {}),
    })

    await jobDescription.save()

    console.log("[v0] Job created successfully:", {
      id: jobDescription._id,
      title: jobDescription.title,
      recruiterId: session.userId,
    })

    return NextResponse.json({
      message: "Job description created successfully",
      job: jobDescription,
    })
  } catch (error) {
    console.error("Error creating job description:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
