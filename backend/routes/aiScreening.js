const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const JobApplication = require("../models/JobApplication");
const JobDescription = require("../models/JobDescription");

router.post("/screen-resume", auth, async (req, res) => {
  try {
    const { applicationId, resumeText, jobId } = req.body;

    // Get job requirements
    const job = await JobDescription.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Get application
    const application = await JobApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // AI Analysis using job requirements
    const analysis = await analyzeResumeWithJobRequirements(
      resumeText || application.resumeText,
      job.requirements,
      job.skills || []
    );

    // Update application with AI score
    application.aiScore = analysis.score;
    application.aiAnalysis = {
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      skillsMatch: analysis.skillsMatch,
      recommendations: analysis.recommendations,
    };
    await application.save();

    res.json(analysis);
  } catch (error) {
    console.error("AI Screening Error:", error);
    res.status(500).json({ message: "Failed to analyze resume" });
  }
});

async function analyzeResumeWithJobRequirements(
  resumeText,
  jobRequirements,
  requiredSkills
) {
  const words = resumeText.toLowerCase().split(/\s+/);
  const reqWords = jobRequirements.toLowerCase().split(/\s+/);

  // Skill matching
  const skillsMatch = requiredSkills.filter((skill) =>
    resumeText.toLowerCase().includes(skill.toLowerCase())
  );

  // Experience analysis
  const experienceKeywords = [
    "years",
    "experience",
    "worked",
    "developed",
    "managed",
    "led",
    "created",
    "built",
  ];
  const experienceScore = experienceKeywords.reduce((score, keyword) => {
    return score + words.filter((word) => word.includes(keyword)).length * 5;
  }, 0);

  // Keyword relevance
  const relevantKeywords = reqWords.filter(
    (word) => word.length > 3 && words.includes(word)
  );

  // Calculate scores
  const skillScore =
    requiredSkills.length > 0
      ? (skillsMatch.length / requiredSkills.length) * 40
      : 20;
  const keywordScore =
    reqWords.length > 0
      ? Math.min((relevantKeywords.length / reqWords.length) * 35, 35)
      : 15;
  const expScore = Math.min(experienceScore, 25);

  const totalScore = Math.round(skillScore + keywordScore + expScore);

  return {
    score: Math.min(totalScore, 100),
    strengths: [
      ...(skillsMatch.length > 0
        ? [`Strong skills match: ${skillsMatch.slice(0, 3).join(", ")}`]
        : []),
      ...(experienceScore > 20
        ? ["Relevant work experience demonstrated"]
        : []),
      ...(relevantKeywords.length > 5
        ? ["Good keyword alignment with job requirements"]
        : []),
    ],
    weaknesses: [
      ...(skillsMatch.length < requiredSkills.length
        ? [
            `Missing skills: ${requiredSkills
              .filter((s) => !skillsMatch.includes(s))
              .slice(0, 3)
              .join(", ")}`,
          ]
        : []),
      ...(experienceScore < 10
        ? ["Limited relevant experience mentioned"]
        : []),
      ...(relevantKeywords.length < 3
        ? ["Low alignment with job requirements"]
        : []),
    ],
    skillsMatch,
    experienceMatch:
      experienceScore > 25 ? "High" : experienceScore > 15 ? "Medium" : "Low",
    recommendations:
      totalScore > 75
        ? ["Excellent candidate - recommend immediate interview"]
        : totalScore > 60
        ? ["Good candidate - schedule screening call"]
        : totalScore > 40
        ? ["Moderate fit - consider for phone screening"]
        : ["Low match - may not meet requirements"],
  };
}

module.exports = router;
