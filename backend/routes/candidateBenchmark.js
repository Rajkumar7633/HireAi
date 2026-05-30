const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const JobApplication = require("../models/JobApplication")
const JobDescription = require("../models/JobDescription")
const Resume = require("../models/Resume")
const User = require("../models/User")

// @route   POST /api/benchmark/candidate
// @desc    Generate candidate benchmark against job requirements
// @access  Private (Recruiter)
router.post("/candidate", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can use this feature." })
  }

  const { applicationId } = req.body

  if (!applicationId) {
    return res.status(400).json({ msg: "Application ID is required" })
  }

  try {
    const application = await JobApplication.findById(applicationId)
      .populate("jobDescriptionId")
      .populate("userId")
      .populate("resumeId")

    if (!application) {
      return res.status(404).json({ msg: "Job application not found" })
    }

    if (application.jobDescriptionId.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to view this application" })
    }

    const benchmark = await generateCandidateBenchmark(application)

    res.json({
      success: true,
      benchmark
    })
  } catch (error) {
    console.error("Candidate benchmark error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/benchmark/batch
// @desc    Generate benchmarks for multiple candidates
// @access  Private (Recruiter)
router.post("/batch", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can use this feature." })
  }

  const { jobDescriptionId } = req.body

  if (!jobDescriptionId) {
    return res.status(400).json({ msg: "Job description ID is required" })
  }

  try {
    const jobDescription = await JobDescription.findById(jobDescriptionId)
    
    if (!jobDescription) {
      return res.status(404).json({ msg: "Job description not found" })
    }

    if (jobDescription.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to view this job description" })
    }

    const applications = await JobApplication.find({ jobDescriptionId })
      .populate("userId")
      .populate("resumeId")

    const benchmarks = await Promise.all(
      applications.map(app => generateCandidateBenchmark(app))
    )

    res.json({
      success: true,
      benchmarks,
      total: benchmarks.length
    })
  } catch (error) {
    console.error("Batch benchmark error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// Generate Candidate Benchmark
async function generateCandidateBenchmark(application) {
  const resumeText = application.resumeId?.parsedText || ""
  const jobDescription = application.jobDescriptionId.description
  const jobSkills = application.jobDescriptionId.skills || []
  const userProfile = application.userId

  const benchmark = {
    applicationId: application._id,
    candidateId: application.userId._id,
    candidateName: userProfile.name,
    jobId: application.jobDescriptionId._id,
    jobTitle: application.jobDescriptionId.title,
    overallMatch: 0,
    skillMatch: { score: 0, matched: [], missing: [], partial: [] },
    experienceMatch: { score: 0, required: 0, has: 0, gap: 0 },
    educationMatch: { score: 0, required: "", has: "", match: false },
    keywordMatch: { score: 0, found: [], missing: [] },
    softSkills: { score: 0, found: [], suggested: [] },
    recommendations: [],
    strengths: [],
    gaps: [],
    visualData: {
      radarChart: [],
      barChart: [],
      progressBars: []
    }
  }

  // Skill Matching
  const resumeLower = resumeText.toLowerCase()
  const matchedSkills = []
  const missingSkills = []
  const partialSkills = []

  jobSkills.forEach(skill => {
    const skillLower = skill.toLowerCase()
    if (resumeLower.includes(skillLower)) {
      matchedSkills.push(skill)
    } else {
      // Check for partial matches
      const skillWords = skillLower.split(" ")
      const partialMatch = skillWords.some(word => resumeLower.includes(word))
      if (partialMatch) {
        partialSkills.push(skill)
      } else {
        missingSkills.push(skill)
      }
    }
  })

  benchmark.skillMatch.matched = matchedSkills
  benchmark.skillMatch.missing = missingSkills
  benchmark.skillMatch.partial = partialSkills
  benchmark.skillMatch.score = jobSkills.length > 0 
    ? Math.round((matchedSkills.length / jobSkills.length) * 100)
    : 0

  // Experience Matching
  const expMatch = matchExperience(resumeText, jobDescription)
  benchmark.experienceMatch = expMatch

  // Education Matching
  const eduMatch = matchEducation(resumeText, jobDescription)
  benchmark.educationMatch = eduMatch

  // Keyword Analysis
  const keywordAnalysis = analyzeKeywords(resumeText, jobDescription)
  benchmark.keywordMatch = keywordAnalysis

  // Soft Skills Analysis
  const softSkillsAnalysis = analyzeSoftSkills(resumeText)
  benchmark.softSkills = softSkillsAnalysis

  // Generate Recommendations
  benchmark.recommendations = generateRecommendations(benchmark)
  benchmark.strengths = generateStrengths(benchmark)
  benchmark.gaps = generateGaps(benchmark)

  // Calculate Overall Match
  benchmark.overallMatch = Math.round(
    (benchmark.skillMatch.score * 0.35) +
    (benchmark.experienceMatch.score * 0.25) +
    (benchmark.educationMatch.score * 0.15) +
    (benchmark.keywordMatch.score * 0.15) +
    (benchmark.softSkills.score * 0.10)
  )

  // Generate Visual Data
  benchmark.visualData = generateVisualData(benchmark)

  return benchmark
}

function matchExperience(resumeText, jobDescription) {
  const resumeLower = resumeText.toLowerCase()
  const jdLower = jobDescription.toLowerCase()

  // Extract required experience from JD
  const expMatch = jdLower.match(/(\d+)\+?\s*(years?|yrs?)/i)
  const requiredYears = expMatch ? parseInt(expMatch[1]) : 0

  // Extract candidate experience from resume
  const resumeExpMatches = resumeLower.match(/(\d+)\+?\s*(years?\s*(of\s*)?(experience|exp)?)/gi)
  let candidateYears = 0
  if (resumeExpMatches) {
    resumeExpMatches.forEach(match => {
      const num = match.match(/\d+/)
      if (num) candidateYears = Math.max(candidateYears, parseInt(num[0]))
    })
  }

  const score = requiredYears > 0 
    ? Math.min(100, Math.round((candidateYears / requiredYears) * 100))
    : 80

  return {
    score,
    required: requiredYears,
    has: candidateYears,
    gap: Math.max(0, requiredYears - candidateYears)
  }
}

function matchEducation(resumeText, jobDescription) {
  const resumeLower = resumeText.toLowerCase()
  const jdLower = jobDescription.toLowerCase()

  const educationLevels = ["phd", "doctorate", "master", "bachelor", "associate", "diploma"]
  
  let requiredLevel = ""
  let candidateLevel = ""

  educationLevels.forEach(level => {
    if (jdLower.includes(level)) {
      requiredLevel = level
    }
    if (resumeLower.includes(level)) {
      candidateLevel = level
    }
  })

  const levelIndex = educationLevels.indexOf(requiredLevel)
  const candidateIndex = educationLevels.indexOf(candidateLevel)

  let score = 50
  if (candidateIndex >= levelIndex) {
    score = 100
  } else if (candidateIndex >= levelIndex - 1) {
    score = 75
  }

  return {
    score,
    required: requiredLevel || "Not specified",
    has: candidateLevel || "Not found",
    match: candidateIndex >= levelIndex
  }
}

function analyzeKeywords(resumeText, jobDescription) {
  const resumeLower = resumeText.toLowerCase()
  const jdLower = jobDescription.toLowerCase()

  // Extract important keywords from JD
  const keywords = jdLower.match(/\b[a-z]{4,}\b/g) || []
  const uniqueKeywords = [...new Set(keywords)].slice(0, 30)

  const found = []
  const missing = []

  uniqueKeywords.forEach(keyword => {
    if (resumeLower.includes(keyword)) {
      found.push(keyword)
    } else {
      missing.push(keyword)
    }
  })

  const score = uniqueKeywords.length > 0 
    ? Math.round((found.length / uniqueKeywords.length) * 100)
    : 0

  return { score, found, missing }
}

function analyzeSoftSkills(resumeText) {
  const resumeLower = resumeText.toLowerCase()

  const softSkills = [
    "communication", "leadership", "teamwork", "problem-solving", "analytical",
    "collaboration", "adaptability", "creativity", "time management", "organization",
    "critical thinking", "interpersonal", "presentation", "negotiation", "mentoring"
  ]

  const found = []
  const suggested = []

  softSkills.forEach(skill => {
    if (resumeLower.includes(skill)) {
      found.push(skill)
    } else {
      suggested.push(skill)
    }
  })

  const score = Math.min(100, Math.round((found.length / 5) * 100))

  return { score, found, suggested: suggested.slice(0, 5) }
}

function generateRecommendations(benchmark) {
  const recommendations = []

  if (benchmark.skillMatch.score < 70) {
    recommendations.push("Candidate is missing key technical skills required for this role")
  }
  if (benchmark.experienceMatch.gap > 2) {
    recommendations.push(`Candidate has ${benchmark.experienceMatch.gap} years less experience than required`)
  }
  if (benchmark.educationMatch.score < 80) {
    recommendations.push("Education level may not meet requirements")
  }
  if (benchmark.keywordMatch.score < 60) {
    recommendations.push("Resume lacks important keywords from job description")
  }
  if (benchmark.softSkills.score < 50) {
    recommendations.push("Consider assessing soft skills during interview")
  }

  if (recommendations.length === 0) {
    recommendations.push("Candidate meets most requirements for this role")
  }

  return recommendations
}

function generateStrengths(benchmark) {
  const strengths = []

  if (benchmark.skillMatch.score >= 80) {
    strengths.push("Strong technical skill alignment")
  }
  if (benchmark.experienceMatch.score >= 80) {
    strengths.push("Meets or exceeds experience requirements")
  }
  if (benchmark.educationMatch.score >= 80) {
    strengths.push("Education matches requirements")
  }
  if (benchmark.keywordMatch.score >= 70) {
    strengths.push("Good keyword match with job description")
  }
  if (benchmark.softSkills.score >= 60) {
    strengths.push("Demonstrates relevant soft skills")
  }

  if (strengths.length === 0) {
    strengths.push("May require additional assessment")
  }

  return strengths
}

function generateGaps(benchmark) {
  const gaps = []

  if (benchmark.skillMatch.missing.length > 0) {
    gaps.push(`Missing skills: ${benchmark.skillMatch.missing.slice(0, 3).join(", ")}`)
  }
  if (benchmark.experienceMatch.gap > 0) {
    gaps.push(`${benchmark.experienceMatch.gap} years experience gap`)
  }
  if (benchmark.keywordMatch.missing.length > 5) {
    gaps.push("Missing several important keywords")
  }

  return gaps
}

function generateVisualData(benchmark) {
  return {
    radarChart: [
      { label: "Skills", value: benchmark.skillMatch.score },
      { label: "Experience", value: benchmark.experienceMatch.score },
      { label: "Education", value: benchmark.educationMatch.score },
      { label: "Keywords", value: benchmark.keywordMatch.score },
      { label: "Soft Skills", value: benchmark.softSkills.score }
    ],
    barChart: [
      { label: "Matched Skills", value: benchmark.skillMatch.matched.length },
      { label: "Missing Skills", value: benchmark.skillMatch.missing.length },
      { label: "Partial Skills", value: benchmark.skillMatch.partial.length }
    ],
    progressBars: [
      { label: "Overall Match", value: benchmark.overallMatch, color: "#3b82f6" },
      { label: "Skill Match", value: benchmark.skillMatch.score, color: "#10b981" },
      { label: "Experience", value: benchmark.experienceMatch.score, color: "#f59e0b" },
      { label: "Education", value: benchmark.educationMatch.score, color: "#8b5cf6" }
    ]
  }
}

module.exports = router
