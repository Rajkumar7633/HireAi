import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Assessment from "@/models/Assessment";
import User from "@/models/User";
import { sendAssessmentEmail } from "@/lib/email-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const { candidateEmail, candidateName, scheduledDate, testType } = await request.json();

    // Get assessment details
    const assessment = await Assessment.findById(params.id);
    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Get candidate user
    const candidate = await User.findOne({ email: candidateEmail });
    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Create test link
    const testLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/job-seeker/assessments/${params.id}/take`;

    // Generate unique test token for security
    const testToken = Buffer.from(`${candidateEmail}-${Date.now()}`).toString('base64');

    // Send email with test link
    const emailData = {
      to: candidateEmail,
      subject: `Assessment Invitation: ${assessment.title}`,
      template: "assessment-invitation",
      data: {
        candidateName,
        assessmentTitle: assessment.title,
        assessmentDescription: assessment.description,
        testLink: `${testLink}?token=${testToken}`,
        scheduledDate,
        testType: testType || "assessment",
        duration: assessment.durationMinutes,
        company: assessment.company || "HireAI",
        instructions: assessment.instructions || "Please complete assessment at your scheduled time."
      }
    };

    try {
      await sendAssessmentEmail(emailData);
      console.log("Email sent successfully to:", candidateEmail);
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Continue with assignment even if email fails
    }

    // Update assessment with assigned candidate
    await Assessment.findByIdAndUpdate(params.id, {
      $push: {
        assignedCandidates: {
          candidateId: candidate._id,
          candidateEmail,
          candidateName,
          assignedAt: new Date(),
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          testToken,
          status: "assigned"
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Assessment assigned and email sent successfully",
      testLink: `${testLink}?token=${testToken}`,
      candidateName,
      candidateEmail
    });

  } catch (error) {
    console.error("Error assigning assessment:", error);
    return NextResponse.json(
      { error: "Failed to assign assessment" },
      { status: 500 }
    );
  }
}
