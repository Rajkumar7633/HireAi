// routes/videoInterview.js
const express = require("express");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/auth");
const router = express.Router();

// Mock database - replace with your actual database model
let interviews = [
  {
    _id: "66f123456789abcdef123456",
    recruiterId: "68be6d213718b65df76e91e5",
    candidateId: "66f987654321fedcba987654",
    candidateName: "John Doe",
    candidateEmail: "john.doe@example.com",
    position: "Software Engineer",
    scheduledDate: new Date("2024-01-15T10:00:00Z"),
    duration: 60,
    interviewType: "video",
    status: "scheduled",
    questions: [
      "Tell me about yourself",
      "Why do you want this position?",
      "What are your strengths and weaknesses?",
    ],
    createdAt: new Date("2024-01-10T09:00:00Z"),
    updatedAt: new Date("2024-01-10T09:00:00Z"),
  },
  {
    _id: "66f123456789abcdef123457",
    recruiterId: "68be6d213718b65df76e91e5",
    candidateId: "66f987654321fedcba987655",
    candidateName: "Jane Smith",
    candidateEmail: "jane.smith@example.com",
    position: "Frontend Developer",
    scheduledDate: new Date("2024-01-16T14:00:00Z"),
    duration: 45,
    interviewType: "video",
    status: "completed",
    questions: [
      "Describe your React experience",
      "How do you handle state management?",
      "What's your favorite CSS framework?",
    ],
    createdAt: new Date("2024-01-11T10:00:00Z"),
    updatedAt: new Date("2024-01-16T15:00:00Z"),
  },
];

// Get recruiter's interviews
router.get("/my-interviews", auth, async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== "recruiter") {
      return res
        .status(403)
        .json({ msg: "Access denied. Recruiter role required." });
    }

    // Filter interviews by recruiter ID
    const recruiterInterviews = interviews.filter(
      (interview) => interview.recruiterId === userId
    );

    console.log(
      `Found ${recruiterInterviews.length} interviews for recruiter ${userId}`
    );

    res.json(recruiterInterviews);
  } catch (error) {
    console.error("Error fetching recruiter interviews:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get candidate's interviews
router.get("/candidate-interviews", auth, async (req, res) => {
  try {
    const { userId } = req.user;

    // Filter interviews by candidate ID
    const candidateInterviews = interviews.filter(
      (interview) => interview.candidateId === userId
    );

    console.log(
      `Found ${candidateInterviews.length} interviews for candidate ${userId}`
    );

    res.json(candidateInterviews);
  } catch (error) {
    console.error("Error fetching candidate interviews:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Create new video interview
router.post("/", auth, async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== "recruiter") {
      return res
        .status(403)
        .json({ msg: "Access denied. Recruiter role required." });
    }

    const {
      candidateId,
      candidateName,
      candidateEmail,
      position,
      scheduledDate,
      duration,
      questions,
      interviewType,
    } = req.body;

    // Validate required fields
    if (!candidateId || !scheduledDate || !candidateName || !position) {
      return res.status(400).json({
        msg: "Missing required fields: candidateId, candidateName, position, scheduledDate",
      });
    }

    // Create new interview
    const newInterview = {
      _id: new Date().getTime().toString(), // Simple ID generation
      recruiterId: userId,
      candidateId,
      candidateName,
      candidateEmail: candidateEmail || "",
      position,
      scheduledDate: new Date(scheduledDate),
      duration: duration || 60,
      interviewType: interviewType || "video",
      status: "scheduled",
      questions: questions || [
        "Tell me about yourself",
        "Why are you interested in this position?",
        "What are your career goals?",
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to mock database
    interviews.push(newInterview);

    console.log("Created new interview:", newInterview._id);

    // Emit socket notification if available
    if (global.io) {
      global.io.to(`user_${candidateId}`).emit("interview_scheduled", {
        interviewId: newInterview._id,
        recruiterId: userId,
        scheduledDate: newInterview.scheduledDate,
        position: position,
      });
    }

    res.status(201).json({
      msg: "Interview scheduled successfully",
      interview: newInterview,
    });
  } catch (error) {
    console.error("Error creating interview:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Update interview status
router.patch("/:interviewId/status", auth, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { status } = req.body;
    const { userId } = req.user;

    // Valid status values
    const validStatuses = [
      "scheduled",
      "in-progress",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ msg: "Invalid status value" });
    }

    // Find interview
    const interviewIndex = interviews.findIndex(
      (interview) =>
        interview._id === interviewId && interview.recruiterId === userId
    );

    if (interviewIndex === -1) {
      return res.status(404).json({ msg: "Interview not found" });
    }

    // Update interview
    interviews[interviewIndex].status = status;
    interviews[interviewIndex].updatedAt = new Date();

    console.log(`Updated interview ${interviewId} status to ${status}`);

    res.json({
      msg: "Interview status updated successfully",
      interview: interviews[interviewIndex],
    });
  } catch (error) {
    console.error("Error updating interview status:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Delete interview
router.delete("/:interviewId", auth, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { userId, role } = req.user;

    if (role !== "recruiter") {
      return res
        .status(403)
        .json({ msg: "Access denied. Recruiter role required." });
    }

    // Find interview index
    const interviewIndex = interviews.findIndex(
      (interview) =>
        interview._id === interviewId && interview.recruiterId === userId
    );

    if (interviewIndex === -1) {
      return res.status(404).json({ msg: "Interview not found" });
    }

    // Remove interview
    interviews.splice(interviewIndex, 1);

    console.log(`Deleted interview ${interviewId}`);

    res.json({ msg: "Interview deleted successfully" });
  } catch (error) {
    console.error("Error deleting interview:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
