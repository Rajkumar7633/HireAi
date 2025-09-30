const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Resume = require("../models/Resume");
const StructuredResume = require("../models/StructuredResume");
const JobApplication = require("../models/JobApplication");

// @route   GET /api/candidates/talent-pool
// @desc    Get all candidates for talent pool (recruiters only)
// @access  Private (Recruiter)
router.get("/talent-pool", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res
      .status(403)
      .json({ msg: "Access denied. Only recruiters can view talent pool." });
  }

  try {
    const {
      search,
      skills,
      experience,
      location,
      status,
      sortBy = "aiScore",
      order = "desc",
    } = req.query;

    // Build query for job seekers
    const userQuery = { role: "job_seeker" };

    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { "profile.title": { $regex: search, $options: "i" } },
      ];
    }

    if (location) {
      userQuery["profile.location"] = { $regex: location, $options: "i" };
    }

    // Get job seekers with their resumes
    const candidates = await User.find(userQuery)
      .select("name email profile createdAt lastLogin")
      .lean();

    // Enrich with resume and application data
    const enrichedCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        // Get latest resume
        const resume = await Resume.findOne({ userId: candidate._id })
          .sort({ createdAt: -1 })
          .lean();

        // Get structured resume data
        const structuredResume = await StructuredResume.findOne({
          userId: candidate._id,
        }).lean();

        // Get application statistics
        const applicationStats = await JobApplication.aggregate([
          { $match: { jobSeekerId: candidate._id } },
          {
            $group: {
              _id: null,
              totalApplications: { $sum: 1 },
              interviewsScheduled: {
                $sum: {
                  $cond: [{ $eq: ["$status", "Interview Scheduled"] }, 1, 0],
                },
              },
              hired: {
                $sum: { $cond: [{ $eq: ["$status", "Hired"] }, 1, 0] },
              },
              avgTestScore: { $avg: "$testScore" },
            },
          },
        ]);

        const stats = applicationStats[0] || {
          totalApplications: 0,
          interviewsScheduled: 0,
          hired: 0,
          avgTestScore: 0,
        };

        // Calculate AI score based on profile completeness and performance
        let aiScore = 50; // Base score

        if (candidate.profile?.title) aiScore += 10;
        if (candidate.profile?.summary) aiScore += 10;
        if (candidate.profile?.location) aiScore += 5;
        if (resume) aiScore += 15;
        if (structuredResume?.skills?.length > 0) aiScore += 10;
        if (stats.avgTestScore > 0)
          aiScore += Math.min(stats.avgTestScore / 10, 10);

        // Calculate match percentage (simplified)
        const matchPercentage = Math.min(aiScore + Math.random() * 20, 100);

        // Determine status
        let candidateStatus = "available";
        if (stats.hired > 0) candidateStatus = "hired";
        else if (stats.interviewsScheduled > 0)
          candidateStatus = "interviewing";
        else if (stats.totalApplications === 0)
          candidateStatus = "not-interested";

        return {
          id: candidate._id,
          name: candidate.name,
          email: candidate.email,
          position: candidate.profile?.title || "Not specified",
          experience:
            structuredResume?.experience?.[0]?.duration || "Not specified",
          skills: structuredResume?.skills?.slice(0, 8) || [],
          aiScore: Math.round(aiScore),
          matchPercentage: Math.round(matchPercentage),
          status: candidateStatus,
          location: candidate.profile?.location || "Not specified",
          salary: candidate.profile?.expectedSalary || "Not specified",
          lastActive: candidate.lastLogin || candidate.createdAt,
          applicationStats: stats,
          resumeId: resume?._id,
          profileCompleteness: Math.round((aiScore / 100) * 100),
        };
      })
    );

    // Apply filters
    let filteredCandidates = enrichedCandidates;

    if (skills) {
      const skillsArray = skills.split(",").map((s) => s.trim().toLowerCase());
      filteredCandidates = filteredCandidates.filter((candidate) =>
        candidate.skills.some((skill) =>
          skillsArray.some((searchSkill) =>
            skill.toLowerCase().includes(searchSkill)
          )
        )
      );
    }

    if (status && status !== "all") {
      filteredCandidates = filteredCandidates.filter(
        (candidate) => candidate.status === status
      );
    }

    // Sort candidates
    filteredCandidates.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return order === "desc" ? bVal - aVal : aVal - bVal;
    });

    res.json({
      candidates: filteredCandidates,
      total: filteredCandidates.length,
      stats: {
        totalCandidates: enrichedCandidates.length,
        available: enrichedCandidates.filter((c) => c.status === "available")
          .length,
        interviewing: enrichedCandidates.filter(
          (c) => c.status === "interviewing"
        ).length,
        hired: enrichedCandidates.filter((c) => c.status === "hired").length,
        avgScore: Math.round(
          enrichedCandidates.reduce((acc, c) => acc + c.aiScore, 0) /
            enrichedCandidates.length
        ),
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET /api/candidates/:id/profile
// @desc    Get detailed candidate profile
// @access  Private (Recruiter)
router.get("/:id/profile", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res
      .status(403)
      .json({
        msg: "Access denied. Only recruiters can view candidate profiles.",
      });
  }

  try {
    const candidate = await User.findById(req.params.id)
      .select("-password")
      .lean();

    if (!candidate || candidate.role !== "job_seeker") {
      return res.status(404).json({ msg: "Candidate not found" });
    }

    // Get resume data
    const resume = await Resume.findOne({ userId: candidate._id })
      .sort({ createdAt: -1 })
      .lean();

    const structuredResume = await StructuredResume.findOne({
      userId: candidate._id,
    }).lean();

    // Get application history
    const applications = await JobApplication.find({
      jobSeekerId: candidate._id,
    })
      .populate("jobDescriptionId", "title")
      .sort({ applicationDate: -1 })
      .lean();

    res.json({
      candidate,
      resume,
      structuredResume,
      applications,
      applicationCount: applications.length,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/candidates/:id/message
// @desc    Send message to candidate
// @access  Private (Recruiter)
router.post("/:id/message", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res
      .status(403)
      .json({ msg: "Access denied. Only recruiters can message candidates." });
  }

  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ msg: "Subject and message are required" });
  }

  try {
    const candidate = await User.findById(req.params.id);
    const recruiter = await User.findById(req.user.id);

    if (!candidate || candidate.role !== "job_seeker") {
      return res.status(404).json({ msg: "Candidate not found" });
    }

    // In a real app, you'd save this to a messages collection
    // For now, we'll just send an email
    const sendEmail = require("../utils/emailService");

    await sendEmail({
      to: candidate.email,
      subject: `Message from ${recruiter.name || "Recruiter"}: ${subject}`,
      html: `
        <p>Dear ${candidate.name || "Candidate"},</p>
        <p>You have received a message from <strong>${
          recruiter.name || "a recruiter"
        }</strong>:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        </div>
        <p>You can reply to this message by logging into your HireAI dashboard.</p>
        <p>Best regards,<br>The HireAI Team</p>
      `,
    });

    res.json({ msg: "Message sent successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
