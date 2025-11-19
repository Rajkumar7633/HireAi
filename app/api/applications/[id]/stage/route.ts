import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getSession(request)
        if (!session || session.role !== "recruiter") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const body = (await request.json().catch(() => ({}))) as any
        const { currentStage, roundStage: rawRoundStage, roundStatus, notes } = body || {}

        const application = await Application.findById(params.id)
        if (!application) {
            return NextResponse.json({ message: "Application not found" }, { status: 404 })
        }

        // Update high-level currentStage if provided
        if (typeof currentStage === "string" && currentStage.trim()) {
            ; (application as any).currentStage = currentStage.trim()
        }

        const roundStage =
            typeof rawRoundStage === "string" && rawRoundStage.trim() ? rawRoundStage.trim() : null

        if (roundStage) {
            if (!Array.isArray((application as any).rounds)) {
                ; (application as any).rounds = []
            }

            const rounds: any[] = (application as any).rounds
            let round = rounds.find((r) => r && r.stageKey === roundStage)
            if (!round) {
                round = {
                    roundName: "Round",
                    stageKey: roundStage,
                    submissions: [],
                    status: "pending",
                }
                rounds.push(round)
            }

            if (typeof roundStatus === "string" && roundStatus.trim()) {
                round.status = roundStatus.trim()
            }

            if (typeof notes === "string" && notes.trim()) {
                round.notes = notes.trim()
            }
        }

        await application.save()

        return NextResponse.json({
            message: "Application stage updated",
            application,
        })
    } catch (error) {
        console.error("Error updating application stage:", error)
        return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
}
