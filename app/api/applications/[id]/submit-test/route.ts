// import { type NextRequest, NextResponse } from "next/server"
// import { getSession } from "@/lib/auth"

// const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

// export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
//   const session = await getSession(req)

//   if (!session || session.role !== "job_seeker") {
//     return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
//   }

//   try {
//     const { id } = params
//     const body = await req.json() // Should contain answers
//     const response = await fetch(`${BACKEND_URL}/api/applications/${id}/submit-test`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${session.userId}`,
//       },
//       body: JSON.stringify(body),
//     })

//     if (!response.ok) {
//       const errorData = await response.json()
//       return NextResponse.json({ message: errorData.msg || "Failed to submit test" }, { status: response.status })
//     }

//     const data = await response.json()
//     return NextResponse.json({ message: data.msg, application: data.application, score: data.score }, { status: 200 })
//   } catch (error) {
//     console.error("Error submitting test:", error)
//     return NextResponse.json({ message: "Internal server error" }, { status: 500 })
//   }
// }


import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import Test from "@/models/Test"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const application = await Application.findById(params.id)
    if (!application) {
      return NextResponse.json({ message: "Application not found" }, { status: 404 })
    }

    if (application.jobSeekerId.toString() !== session.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    if (application.status !== "Test Assigned") {
      return NextResponse.json({ message: "Test is not assigned or already completed" }, { status: 400 })
    }

    const body = await request.json()
    const { answers } = body

    // Get the test
    const test = await Test.findById(application.testId)
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    // Calculate score
    let correctAnswers = 0
    const totalQuestions = test.questions.length

    test.questions.forEach((question: any, index: number) => {
      const userAnswer = answers.find((a: any) => a.questionId === question._id.toString())
      if (userAnswer && question.correctAnswer) {
        if (question.type === "multiple_choice") {
          if (userAnswer.answer === question.correctAnswer) {
            correctAnswers++
          }
        } else if (question.type === "short_answer" || question.type === "code_snippet") {
          // For short answer and code, we'll give partial credit based on keyword matching
          const userAnswerLower = userAnswer.answer.toLowerCase()
          const correctAnswerLower = question.correctAnswer.toLowerCase()
          if (userAnswerLower.includes(correctAnswerLower) || correctAnswerLower.includes(userAnswerLower)) {
            correctAnswers += 0.5 // Partial credit
          }
        }
      }
    })

    const score = Math.round((correctAnswers / totalQuestions) * 100)

    // Update application
    application.testScore = score
    application.testAnswers = answers
    application.testCompletedAt = new Date()
    application.status = score >= 60 ? "Test Passed" : "Test Failed"

    await application.save()

    return NextResponse.json({
      message: "Test submitted successfully",
      score,
      status: application.status,
    })
  } catch (error) {
    console.error("Error submitting test:", error)
    return NextResponse.json({ message: "Failed to submit test" }, { status: 500 })
  }
}
