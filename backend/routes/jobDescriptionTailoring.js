const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const JobDescription = require("../models/JobDescription")
const axios = require("axios")

// @route   POST /api/job-description/tailor
// @desc    AI-powered job description improvement suggestions
// @access  Private (Recruiter)
router.post("/tailor", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can use this feature." })
  }

  const { jobDescription, title, industry, experienceLevel } = req.body

  if (!jobDescription) {
    return res.status(400).json({ msg: "Job description is required" })
  }

  try {
    // AI analysis for job description improvement
    const analysis = await analyzeJobDescription(jobDescription, title, industry, experienceLevel)

    res.json({
      success: true,
      analysis
    })
  } catch (error) {
    console.error("Job description tailoring error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/job-description/optimize
// @desc    Apply AI suggestions to optimize job description
// @access  Private (Recruiter)
router.post("/optimize", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can use this feature." })
  }

  const { jobDescriptionId, optimizedDescription, suggestionsApplied } = req.body

  try {
    const jobDesc = await JobDescription.findById(jobDescriptionId)
    
    if (!jobDesc) {
      return res.status(404).json({ msg: "Job description not found" })
    }

    if (jobDesc.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to modify this job description" })
    }

    jobDesc.description = optimizedDescription
    jobDesc.aiOptimized = true
    jobDesc.aiSuggestionsApplied = suggestionsApplied
    jobDesc.optimizedAt = Date.now()

    await jobDesc.save()

    res.json({
      success: true,
      jobDescription: jobDesc,
      msg: "Job description optimized successfully"
    })
  } catch (error) {
    console.error("Job description optimization error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// AI Analysis Function
async function analyzeJobDescription(jobDescription, title, industry, experienceLevel) {
  const jd = jobDescription.toLowerCase()
  
  // Analyze current JD quality
  const analysis = {
    overallScore: 0,
    clarity: { score: 0, issues: [], suggestions: [] },
    inclusivity: { score: 0, issues: [], suggestions: [] },
    completeness: { score: 0, missing: [], suggestions: [] },
    effectiveness: { score: 0, issues: [], suggestions: [] },
    keywords: { found: [], suggested: [], missing: [] },
    optimizedVersion: "",
    priorityActions: []
  }

  // Clarity Analysis
  const clarityIssues = []
  const claritySuggestions = []
  
  if (jd.length < 200) {
    clarityIssues.push("Job description is too brief")
    claritySuggestions.push("Expand the description to provide more details about the role")
  }
  
  if (!jd.includes("responsibilities") && !jd.includes("what you'll do")) {
    clarityIssues.push("Missing clear responsibilities section")
    claritySuggestions.push("Add a 'What You'll Do' or 'Responsibilities' section")
  }
  
  if (!jd.includes("requirements") && !jd.includes("qualifications")) {
    clarityIssues.push("Missing clear requirements section")
    claritySuggestions.push("Add a 'Requirements' or 'Qualifications' section")
  }

  const jargon = ["synergy", "leverage", "paradigm", "bandwidth", "circle back"]
  const foundJargon = jargon.filter(word => jd.includes(word))
  if (foundJargon.length > 0) {
    clarityIssues.push(`Contains corporate jargon: ${foundJargon.join(", ")}`)
    claritySuggestions.push("Replace jargon with clear, simple language")
  }

  analysis.clarity.score = Math.max(0, 100 - (clarityIssues.length * 15))
  analysis.clarity.issues = clarityIssues
  analysis.clarity.suggestions = claritySuggestions

  // Inclusivity Analysis
  const inclusivityIssues = []
  const inclusivitySuggestions = []
  
  const biasedTerms = ["ninja", "rockstar", "guru", "dominant", "aggressive"]
  const foundBiased = biasedTerms.filter(term => jd.includes(term))
  if (foundBiased.length > 0) {
    inclusivityIssues.push(`Contains potentially biased terms: ${foundBiased.join(", ")}`)
    inclusivitySuggestions.push("Use gender-neutral language (e.g., 'expert' instead of 'ninja')")
  }

  if (!jd.includes("equal opportunity") && !jd.includes("diversity")) {
    inclusivityIssues.push("Missing diversity statement")
    inclusivitySuggestions.push("Add an equal opportunity employer statement")
  }

  analysis.inclusivity.score = Math.max(0, 100 - (inclusivityIssues.length * 20))
  analysis.inclusivity.issues = inclusivityIssues
  analysis.inclusivity.suggestions = inclusivitySuggestions

  // Completeness Analysis
  const missing = []
  const completenessSuggestions = []
  
  const requiredSections = [
    { key: "salary", terms: ["salary", "compensation", "pay", "range"], name: "Salary/Compensation" },
    { key: "benefits", terms: ["benefits", "perks", "insurance", "401k"], name: "Benefits" },
    { key: "location", terms: ["location", "remote", "hybrid", "on-site"], name: "Location/Work Arrangement" },
    { key: "company", terms: ["about us", "company", "culture", "mission"], name: "Company Information" },
    { key: "growth", terms: ["growth", "development", "learning", "career"], name: "Growth Opportunities" }
  ]

  requiredSections.forEach(section => {
    const hasSection = section.terms.some(term => jd.includes(term))
    if (!hasSection) {
      missing.push(section.name)
      completenessSuggestions.push(`Add ${section.name} section`)
    }
  })

  analysis.completeness.score = Math.max(0, 100 - (missing.length * 12))
  analysis.completeness.missing = missing
  analysis.completeness.suggestions = completenessSuggestions

  // Effectiveness Analysis
  const effectivenessIssues = []
  const effectivenessSuggestions = []
  
  if (!jd.includes("experience") && !jd.includes("years")) {
    effectivenessIssues.push("Missing experience requirements")
    effectivenessSuggestions.push("Specify required years of experience")
  }

  if (!/\d+/.test(jd)) {
    effectivenessIssues.push("Lacks specific metrics or numbers")
    effectivenessSuggestions.push("Add specific numbers (e.g., '5+ years', 'team of 10')")
  }

  const skillIndicators = ["skill", "technology", "stack", "proficient", "experience with"]
  const hasSkills = skillIndicators.some(indicator => jd.includes(indicator))
  if (!hasSkills) {
    effectivenessIssues.push("Missing specific skill requirements")
    effectivenessSuggestions.push("List required technical and soft skills")
  }

  analysis.effectiveness.score = Math.max(0, 100 - (effectivenessIssues.length * 15))
  analysis.effectiveness.issues = effectivenessIssues
  analysis.effectiveness.suggestions = effectivenessSuggestions

  // Keyword Analysis
  const commonSkills = [
    "javascript", "python", "java", "react", "node.js", "aws", "docker", "kubernetes",
    "sql", "mongodb", "git", "agile", "scrum", "communication", "leadership",
    "problem-solving", "teamwork", "analytical", "project management"
  ]

  const foundKeywords = commonSkills.filter(skill => jd.includes(skill))
  const suggestedKeywords = commonSkills.filter(skill => !jd.includes(skill)).slice(0, 5)
  
  analysis.keywords.found = foundKeywords
  analysis.keywords.suggested = suggestedKeywords
  analysis.keywords.missing = suggestedKeywords

  // Generate optimized version
  analysis.optimizedVersion = generateOptimizedVersion(jobDescription, analysis)

  // Calculate overall score
  analysis.overallScore = Math.round(
    (analysis.clarity.score * 0.25) +
    (analysis.inclusivity.score * 0.2) +
    (analysis.completeness.score * 0.25) +
    (analysis.effectiveness.score * 0.3)
  )

  // Priority actions
  analysis.priorityActions = [
    ...analysis.clarity.issues.slice(0, 2).map(issue => ({ type: "critical", issue })),
    ...analysis.completeness.missing.slice(0, 2).map(missing => ({ type: "high", issue: `Add ${missing}` })),
    ...analysis.effectiveness.issues.slice(0, 1).map(issue => ({ type: "medium", issue }))
  ]

  return analysis
}

function generateOptimizedVersion(originalJD, analysis) {
  let optimized = originalJD
  
  // Add missing sections if critical
  if (analysis.completeness.missing.includes("Company Information")) {
    optimized += "\n\n**About Us**\nWe are a dynamic company committed to innovation and excellence."
  }
  
  if (analysis.completeness.missing.includes("Benefits")) {
    optimized += "\n\n**Benefits**\n- Competitive salary\n- Health insurance\n- Professional development opportunities\n- Flexible work arrangements"
  }

  // Replace biased terms
  const replacements = {
    "ninja": "expert",
    "rockstar": "professional",
    "guru": "specialist",
    "dominant": "strong",
    "aggressive": "driven"
  }

  Object.entries(replacements).forEach(([biased, neutral]) => {
    optimized = optimized.replace(new RegExp(biased, 'gi'), neutral)
  })

  return optimized
}

module.exports = router
