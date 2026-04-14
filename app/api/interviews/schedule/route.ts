import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Interview from "@/models/Interview";
import User from "@/models/User";
import { sendInterviewEmail } from "@/lib/email-service";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const {
      candidateEmail,
      candidateName,
      interviewTitle,
      interviewDescription,
      scheduledDate,
      duration,
      interviewType,
      interviewerName,
      interviewerEmail,
      meetingLink,
      company
    } = await request.json();

    // Get candidate user
    const candidate = await User.findOne({ email: candidateEmail });
    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Create interview
    const interview = new Interview({
      title: interviewTitle,
      description: interviewDescription,
      candidateId: candidate._id,
      candidateEmail,
      candidateName,
      scheduledDate: new Date(scheduledDate),
      duration: duration || 60,
      type: interviewType || "video",
      interviewerName,
      interviewerEmail,
      meetingLink,
      company: company || "HireAI",
      status: "scheduled",
      createdAt: new Date()
    });

    await interview.save();

    // Generate unique interview token
    const interviewToken = Buffer.from(`${candidateEmail}-${Date.now()}`).toString('base64');

    // Send email with interview link
    const emailData = {
      to: candidateEmail,
      subject: `Interview Invitation: ${interviewTitle}`,
      template: "interview-invitation",
      data: {
        candidateName,
        interviewTitle,
        interviewDescription,
        interviewLink: meetingLink || `${process.env.NEXT_PUBLIC_APP_URL}/interview/${interview._id}?token=${interviewToken}`,
        scheduledDate: new Date(scheduledDate).toLocaleString(),
        duration: duration || 60,
        interviewType: interviewType || "Video Interview",
        interviewerName,
        interviewerEmail,
        company: company || "HireAI",
        instructions: "Please join the interview at the scheduled time using the provided link."
      }
    };

    await sendInterviewEmail(emailData);

    // Update interview with token
    await Interview.findByIdAndUpdate(interview._id, {
      interviewToken,
      status: "invitation_sent"
    });

    return NextResponse.json({
      success: true,
      message: "Interview scheduled and email sent successfully",
      interviewId: interview._id,
      interviewLink: meetingLink || `${process.env.NEXT_PUBLIC_APP_URL}/interview/${interview._id}?token=${interviewToken}`,
      candidateName,
      candidateEmail,
      scheduledDate
    });

  } catch (error) {
    console.error("Error scheduling interview:", error);
    return NextResponse.json(
      { error: "Failed to schedule interview" },
      { status: 500 }
    );
  }
}
