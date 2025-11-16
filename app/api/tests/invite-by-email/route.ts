import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import Resume from "@/models/Resume"
import User from "@/models/User"

export async function POST(request: NextRequest) {
    try {
        const session = await getSession(request)
        if (!session || session.role !== "recruiter") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const { jobId, testId, email } = await request.json()

        if (!jobId || !testId || !email) {
            return NextResponse.json(
                { message: "jobId, testId and candidate email are required" },
                { status: 400 },
            )
        }

        await connectDB()

        const normalizedEmail = String(email).toLowerCase().trim()
        const user = (await User.findOne({ email: normalizedEmail, role: "job_seeker" }).lean()) as any

        if (!user || !user._id) {
            return NextResponse.json({ message: "No job seeker found with this email" }, { status: 404 })
        }

        // Find existing application for this job + candidate
        let application = (await Application.findOne({
            jobDescriptionId: jobId,
            jobSeekerId: user._id,
        })) as any

        if (!application) {
            // Fall back to creating a lightweight application similar to bulk assign
            const latestResume = (await Resume.findOne({ userId: user._id, status: "processed" })
                .sort({ uploadedAt: -1 })
                .select("_id")
                .lean()) as any

            application = (await Application.create({
                jobDescriptionId: jobId,
                jobSeekerId: user._id,
                applicantId: user._id,
                resumeId: latestResume?._id,
                status: "Pending",
                applicationDate: new Date(),
                appliedAt: new Date(),
            })) as any
        }

        await Application.updateOne(
            { _id: application._id },
            {
                $set: {
                    testId,
                    status: "Test Assigned",
                    assignedBy: session.userId,
                    assignedAt: new Date(),
                },
            },
        )

        return NextResponse.json(
            {
                message: "Test assigned successfully",
                applicationId: application._id,
                candidateEmail: normalizedEmail,
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("invite-by-email error", error)
        return NextResponse.json(
            { message: error?.message || "Failed to assign test by email" },
            { status: 500 },
        )
    }
}
