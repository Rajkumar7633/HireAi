const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const JobApplication = require("../models/JobApplication")
const JobDescription = require("../models/JobDescription")
const Resume = require("../models/Resume")
const axios = require("axios") // For calling ML service

// Real-time NLP utilities for ATS analysis
class TextProcessor {
  // Tokenize and normalize text
  static tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9+.#\-\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
  }

  // Extract important terms using frequency analysis
  static extractImportantTerms(text, topN = 20) {
    const tokens = this.tokenize(text)
    const frequency = {}
    
    tokens.forEach(token => {
      frequency[token] = (frequency[token] || 0) + 1
    })

    // Filter out common stop words
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will', 'with', 'this', 'that', 'from', 'they', 'would', 'there', 'their', 'what', 'about', 'which', 'when', 'make', 'like', 'just', 'over', 'such', 'into', 'year', 'your', 'some', 'them', 'than', 'then', 'look', 'only', 'come', 'could', 'after', 'also', 'should'])
    
    const filtered = Object.entries(frequency)
      .filter(([word]) => !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word]) => word)

    return filtered
  }

  // Calculate cosine similarity between two texts
  static cosineSimilarity(text1, text2) {
    const tokens1 = this.tokenize(text1)
    const tokens2 = this.tokenize(text2)
    
    const allTokens = Array.from(new Set([...tokens1, ...tokens2]))
    
    const vector1 = allTokens.map(token => tokens1.filter(t => t === token).length)
    const vector2 = allTokens.map(token => tokens2.filter(t => t === token).length)
    
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0)
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0))
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0))
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0
    return dotProduct / (magnitude1 * magnitude2)
  }

  // Extract skills dynamically from text
  static extractSkillsFromText(text) {
    const tokens = this.tokenize(text)
    
    // Look for technical terms using patterns
    const skillPatterns = [
      /\b[A-Z]{2,}\b/g, // Acronyms
      /\b[a-z]+\.js\b/gi, // JavaScript frameworks
      /\b[a-z]+\.[a-z]{2,4}\b/gi, // File extensions
    ]
    
    const potentialSkills = []
    
    skillPatterns.forEach(pattern => {
      const matches = String(text || "").match(pattern) || []
      potentialSkills.push(...matches)
    })
    
    // Extract important terms
    const importantTerms = this.extractImportantTerms(text, 30)
    potentialSkills.push(...importantTerms)
    
    // Filter and deduplicate
    return Array.from(new Set(
      potentialSkills
        .map(s => s.trim())
        .filter(s => s.length > 2 && s.length < 50)
    ))
  }

  // Real-time ATS analysis without hardcoded data
  static analyzeATS(resumeText, jobDescription) {
    const text = String(resumeText || "")
    const jdLower = String(jobDescription || "").toLowerCase()

    // Extract keywords from job description dynamically
    const jdKeywords = this.extractImportantTerms(jdLower, 40)
    const keywordFrequency = {}
    
    for (const keyword of jdKeywords) {
      const re = new RegExp(`\\b${keyword.replace(/[.+*?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")
      const matches = text.match(re)
      if (matches && matches.length) keywordFrequency[keyword] = matches.length
    }
    const keywordsFound = Object.keys(keywordFrequency)

    // Semantic matching using cosine similarity
    const semanticMatchScore = Math.round(this.cosineSimilarity(text, jdLower) * 100)
    
    // Word-level matching
    const jdWords = this.tokenize(jdLower)
    const uniqJd = Array.from(new Set(jdWords))
    const hits = uniqJd.filter(w => text.toLowerCase().includes(w)).length
    const wordMatchScore = uniqJd.length ? Math.round((hits / uniqJd.length) * 100) : 0

    // Combined match score
    const matchScore = Math.round((semanticMatchScore * 0.6) + (wordMatchScore * 0.4))

    // Extract skills from both documents
    const resumeSkills = this.extractSkillsFromText(text)
    const jdSkills = this.extractSkillsFromText(jdLower)
    const matchedSkills = resumeSkills.filter(skill => 
      jdSkills.some(jdSkill => jdSkill.toLowerCase() === skill.toLowerCase())
    )

    // Generate dynamic suggestions
    const suggestions = []
    if (matchScore < 50) suggestions.push(`Resume has low keyword match (${matchScore}%) with job description`)
    if (matchedSkills.length < 3) suggestions.push("Add more relevant skills from the job description")
    if (keywordsFound.length < 5) suggestions.push("Include more keywords from the job requirements")

    return {
      ats_score: matchScore,
      matched_skills: matchedSkills,
      suggestions,
      keywords_found: keywordsFound,
      keyword_frequency: keywordFrequency,
      semantic_match: semanticMatchScore,
      word_match: wordMatchScore,
      extracted_skills: resumeSkills
    }
  }
}

// @route   POST /api/ats/process-application
// @desc    Real-time ATS processing for a job application using NLP
// @access  Private (Recruiter)
router.post("/process-application", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can trigger ATS processing." })
  }

  const { applicationId } = req.body

  try {
    const application = await JobApplication.findById(applicationId).populate("jobDescriptionId").populate("resumeId")

    if (!application) {
      return res.status(404).json({ msg: "Job application not found" })
    }

    // Ensure recruiter owns the job description associated with this application
    if (application.jobDescriptionId.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to process this application" })
    }

    // Use real-time NLP analysis instead of external ML service
    const atsAnalysis = TextProcessor.analyzeATS(
      application.resumeId.parsedText,
      application.jobDescriptionId.description
    )

    // Try to call ML service if available, otherwise use real-time analysis
    let mlResult = null
    if (process.env.ML_SERVICE_URL) {
      try {
        const mlServiceUrl = process.env.ML_SERVICE_URL
        const mlResponse = await axios.post(`${mlServiceUrl}/match`, {
          resume_text: application.resumeId.parsedText,
          job_description_text: application.jobDescriptionId.description,
          job_skills: application.jobDescriptionId.skills,
        })
        mlResult = mlResponse.data
      } catch (mlError) {
        console.log("ML service unavailable, using real-time NLP analysis")
      }
    }

    // Combine results: prefer ML service if available, otherwise use real-time analysis
    const finalAtsScore = mlResult ? mlResult.ats_score : atsAnalysis.ats_score
    const finalMatchedSkills = mlResult ? mlResult.matched_skills : atsAnalysis.matched_skills
    const finalSuggestions = mlResult ? mlResult.suggestions : atsAnalysis.suggestions

    // Update the application with ATS results
    application.status = "Reviewed"
    application.atsScore = finalAtsScore
    application.matchedSkills = finalMatchedSkills
    application.atsSuggestions = finalSuggestions

    await application.save()

    res.json({
      msg: "ATS processing completed successfully",
      application,
      atsScore: finalAtsScore,
      matchedSkills: finalMatchedSkills,
      suggestions: finalSuggestions,
      analysisDetails: {
        keywordsFound: atsAnalysis.keywords_found,
        keywordFrequency: atsAnalysis.keyword_frequency,
        semanticMatch: atsAnalysis.semantic_match,
        wordMatch: atsAnalysis.word_match,
        extractedSkills: atsAnalysis.extracted_skills,
        usedMLService: !!mlResult
      }
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
