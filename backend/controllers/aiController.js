const axios = require("axios")

class AIController {
  static async analyzeResume(resumeText, jobDescription = null) {
    try {
      // Simulate AI analysis - replace with actual AI service call
      const skills = this.extractSkills(resumeText)
      const experience = this.extractExperience(resumeText)
      const education = this.extractEducation(resumeText)

      const atsScore = Math.floor(Math.random() * 40) + 60 // 60-100
      let matchScore = 0

      if (jobDescription) {
        matchScore = this.calculateMatchScore(resumeText, jobDescription)
      }

      return {
        skills,
        experience,
        education,
        atsScore,
        matchScore,
        suggestions: this.generateSuggestions(skills, atsScore),
        keywordDensity: this.calculateKeywordDensity(resumeText),
      }
    } catch (error) {
      console.error("AI Analysis Error:", error)
      throw new Error("Failed to analyze resume")
    }
  }

  static extractSkills(text) {
    const commonSkills = [
      "JavaScript",
      "Python",
      "React",
      "Node.js",
      "AWS",
      "Docker",
      "MongoDB",
      "SQL",
      "Git",
      "Agile",
      "Scrum",
      "Leadership",
      "Communication",
      "Problem Solving",
      "Team Management",
    ]

    return commonSkills.filter((skill) => text.toLowerCase().includes(skill.toLowerCase()))
  }

  static extractExperience(text) {
    const experienceRegex = /(\d+)\s*(years?|yrs?)\s*(of\s*)?(experience|exp)/gi
    const matches = text.match(experienceRegex)

    if (matches && matches.length > 0) {
      const years = matches[0].match(/\d+/)
      return years ? `${years[0]} years` : "Not specified"
    }

    return "Not specified"
  }

  static extractEducation(text) {
    const educationKeywords = ["Bachelor", "Master", "PhD", "Doctorate", "Degree", "University", "College", "Institute"]

    const foundEducation = educationKeywords.find((keyword) => text.toLowerCase().includes(keyword.toLowerCase()))

    return foundEducation ? `${foundEducation} degree mentioned` : "Not specified"
  }

  static calculateMatchScore(resumeText, jobDescription) {
    const resumeWords = resumeText.toLowerCase().split(/\s+/)
    const jobWords = jobDescription.toLowerCase().split(/\s+/)

    const commonWords = resumeWords.filter((word) => jobWords.includes(word) && word.length > 3)

    const matchPercentage = (commonWords.length / jobWords.length) * 100
    return Math.min(Math.floor(matchPercentage * 2), 100) // Scale and cap at 100
  }

  static generateSuggestions(skills, atsScore) {
    const suggestions = []

    if (atsScore < 70) {
      suggestions.push("Add more relevant keywords from the job description")
      suggestions.push("Include quantifiable achievements and metrics")
    }

    if (skills.length < 5) {
      suggestions.push("Add more technical skills relevant to your field")
    }

    suggestions.push("Use action verbs to describe your accomplishments")
    suggestions.push("Ensure consistent formatting throughout the document")

    return suggestions
  }

  static calculateKeywordDensity(text) {
    const words = text.toLowerCase().split(/\s+/)
    const wordCount = {}

    words.forEach((word) => {
      if (word.length > 3) {
        wordCount[word] = (wordCount[word] || 0) + 1
      }
    })

    // Convert to Map for MongoDB compatibility
    const densityMap = new Map()
    Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([word, count]) => {
        densityMap.set(word, count)
      })

    return densityMap
  }
}

module.exports = AIController
