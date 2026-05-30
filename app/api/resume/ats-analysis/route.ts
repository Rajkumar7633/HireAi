import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { aiService } from "@/lib/ai-service"

// Real-time NLP utilities for ATS analysis
class TextProcessor {
  // Tokenize and normalize text
  static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9+.#\-\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
  }

  // Extract important terms using TF-IDF-like scoring
  static extractImportantTerms(text: string, topN: number = 20): string[] {
    const tokens = this.tokenize(text)
    const frequency: Record<string, number> = {}

    tokens.forEach(token => {
      frequency[token] = (frequency[token] || 0) + 1
    })

    // Filter out common stop words dynamically
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will', 'with', 'this', 'that', 'from', 'they', 'would', 'there', 'their', 'what', 'about', 'which', 'when', 'make', 'like', 'just', 'over', 'such', 'into', 'year', 'your', 'some', 'them', 'than', 'then', 'look', 'only', 'come', 'could', 'after', 'also', 'should'])

    const filtered = Object.entries(frequency)
      .filter(([word]) => !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word]) => word)

    return filtered
  }

  // Calculate TF-IDF score for a term in a document
  static calculateTF(term: string, document: string): number {
    const tokens = this.tokenize(document)
    const termCount = tokens.filter(t => t === term.toLowerCase()).length
    return termCount / tokens.length
  }

  // Calculate cosine similarity between two texts
  static cosineSimilarity(text1: string, text2: string): number {
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

  // Extract skills dynamically from text using patterns
  static extractSkillsFromText(text: string): string[] {
    const tokens = this.tokenize(text)

    // Look for technical terms (capitalized words, acronyms, tech-sounding words)
    const skillPatterns = [
      /\b[A-Z]{2,}\b/g, // Acronyms like AWS, API, SQL
      /\b[a-z]+\.js\b/gi, // JavaScript frameworks
      /\b[a-z]+\.[a-z]{2,4}\b/gi, // File extensions
      /\b\d+\+?\s*(years?|yrs?)\s+(of\s+)?(experience|exp)\b/gi, // Experience indicators
    ]

    const potentialSkills: string[] = []

    // Extract based on patterns
    skillPatterns.forEach(pattern => {
      const matches = text.match(pattern) || []
      potentialSkills.push(...matches)
    })

    // Extract important terms that might be skills
    const importantTerms = this.extractImportantTerms(text, 30)
    potentialSkills.push(...importantTerms)

    // Filter and deduplicate
    return Array.from(new Set(
      potentialSkills
        .map(s => s.trim())
        .filter(s => s.length > 2 && s.length < 50)
    ))
  }
}

// Real-time heuristic analyzer using NLP techniques
function heuristicAnalysis(resumeText: string, jobDescription: string) {
  const text = String(resumeText || "");
  const lower = text.toLowerCase();
  const jdLower = String(jobDescription || "").toLowerCase();

  // Contact information analysis
  const emailOk = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const phoneOk = /\+?[0-9][0-9\-()\s]{7,}[0-9]/.test(text);
  const contact = Math.min(100, (emailOk ? 60 : 0) + (phoneOk ? 40 : 0)) || 40;
  const contactFeedback = emailOk && phoneOk ? "Complete contact information" : !emailOk ? "Add a professional email" : "Add a reachable phone number";

  // Education analysis - dynamic detection
  const educationKeywords = ["bachelor", "master", "phd", "doctorate", "university", "college", "institute", "school", "degree", "diploma", "certification", "coursework"];
  const educationHits = educationKeywords.filter(k => lower.includes(k)).length;
  const education = Math.min(100, 50 + educationHits * 8);
  const educationFeedback = educationHits > 0 ? "Education section detected" : "Consider adding an Education section";

  // Formatting analysis
  const lines = text.split(/\r?\n/);
  const longLines = lines.filter(l => l.length > 120).length;
  const bullets = (text.match(/[•\-\*] /g) || []).length;
  const formatting = Math.max(50, 100 - longLines * 2 - (bullets < 5 ? 10 : 0));
  const formatIssues: string[] = [];
  if (longLines > 0) formatIssues.push("Break long lines into bullet points");
  if (bullets < 5) formatIssues.push("Use more bullet points for readability");

  // Dynamic keyword extraction from job description
  const jdKeywords = TextProcessor.extractImportantTerms(jdLower, 40);
  const keywordFrequency: Record<string, number> = {};

  for (const keyword of jdKeywords) {
    const re = new RegExp(`\\b${keyword.replace(/[.+*?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const matches = text.match(re);
    if (matches && matches.length) keywordFrequency[keyword] = matches.length;
  }
  const keywordsFound = Object.keys(keywordFrequency);

  // Real-time semantic matching using cosine similarity
  const semanticMatchScore = Math.round(TextProcessor.cosineSimilarity(text, jdLower) * 100);

  // Word-level matching
  const jdWords = TextProcessor.tokenize(jdLower);
  const uniqJd = Array.from(new Set(jdWords));
  const hits = uniqJd.filter(w => lower.includes(w)).length;
  const wordMatchScore = uniqJd.length ? Math.round((hits / uniqJd.length) * 100) : 0;

  // Combined match score
  const matchScore = Math.round((semanticMatchScore * 0.6) + (wordMatchScore * 0.4));

  // Length analysis
  const wordCount = (text.match(/\b\w+\b/g) || []).length;
  const estimatedPages = Math.max(1, Math.round(lines.length / 45));
  const length = { words: wordCount, pages: estimatedPages };

  // Duplicate analysis
  const duplicates = {
    repeatedWords: Object.entries(keywordFrequency).filter(([, v]) => v >= 5).length,
    totalUniqueWords: Array.from(new Set(TextProcessor.tokenize(text))).length
  };

  // Dynamic suggestions based on actual analysis
  const suggestions: string[] = [];
  if (matchScore < 50 && jdLower) suggestions.push(`Tailor your resume to include more keywords from the job description (current match: ${matchScore}%)`);
  if (!emailOk || !phoneOk) suggestions.push("Ensure contact info includes both email and phone number");
  if (longLines > 2) suggestions.push("Shorten long paragraphs; convert to concise bullet points");
  if (estimatedPages > 2) suggestions.push("Keep resume to 1–2 pages for most roles");
  if (keywordsFound.length < 5 && jdKeywords.length > 10) suggestions.push("Include more relevant keywords from the job description");

  // Dynamic recommendations based on resume content
  const recommendations: string[] = [];
  if (!text.includes("%") && !text.includes("$")) recommendations.push("Quantify achievements with numbers (%, $, time saved)");
  if (!text.includes("github") && !text.includes("portfolio") && !text.includes("linkedin")) recommendations.push("Include links to GitHub/Portfolio/LinkedIn");
  if (educationHits === 0) recommendations.push("Add your educational background and certifications");
  if (bullets < 8) recommendations.push("Use more bullet points to highlight key achievements");
  if (recommendations.length === 0) recommendations.push("Continue optimizing for specific job requirements");

  // Overall score calculation
  const keywordScore = Math.min(100, keywordsFound.length * 6);
  const overall = Math.round(
    (contact * 0.15) +
    (education * 0.10) +
    (formatting * 0.15) +
    (keywordScore * 0.25) +
    (matchScore * 0.35)
  );

  return {
    overall,
    keywordsFound,
    keywordFrequency,
    contact,
    contactFeedback,
    education,
    educationFeedback,
    formatting,
    formatIssues,
    suggestions,
    recommendations,
    matchScore,
    semanticMatchScore,
    wordMatchScore,
    length,
    duplicates,
    extractedSkills: TextProcessor.extractSkillsFromText(text)
  };
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { resumeText, jobDescription } = await req.json()

  if (!resumeText) {
    return NextResponse.json({ message: "Resume text is required" }, { status: 400 })
  }

  const jobRequirements = jobDescription || ""
  const requiredSkills = jobDescription
    ? TextProcessor.extractSkillsFromText(jobDescription).slice(0, 15)
    : []

  try {
    const aiAnalysis = await aiService.analyzeResume(resumeText, jobRequirements, requiredSkills)

    // Heuristic scoring to complement AI
    const heur = heuristicAnalysis(resumeText, jobDescription || "")

    // Transform AI analysis to match expected ATS format
    const analysis = {
      atsScore: Math.round((aiAnalysis.atsScore * 0.6) + (heur.overall * 0.4)),
      keywordMatches: requiredSkills.map((skill) => ({
        keyword: skill,
        found: aiAnalysis.skillsMatch.includes(skill) || heur.keywordsFound.includes(skill.toLowerCase()),
        frequency: heur.keywordFrequency[skill.toLowerCase()] || 0,
      })),
      strengths: aiAnalysis.strengths || [],
      improvements: Array.from(new Set([...(aiAnalysis.suggestions || []), ...heur.suggestions])).slice(0, 10),
      sections: {
        contact: { score: heur.contact, feedback: heur.contactFeedback },
        summary: { score: Math.max(60, aiAnalysis.score - 15), feedback: "Professional summary analysis" },
        experience: { score: Math.max(65, aiAnalysis.score - 10), feedback: aiAnalysis.experienceMatch || "Work experience analysis" },
        skills: {
          score: requiredSkills.length > 0
            ? Math.max(50, Math.round((aiAnalysis.skillsMatch.length / requiredSkills.length) * 100))
            : heur.overall,
          feedback: `${aiAnalysis.skillsMatch.length} of ${requiredSkills.length} required skills found`,
        },
        education: { score: heur.education, feedback: heur.educationFeedback },
      },
      formatting: {
        score: heur.formatting,
        issues: Array.from(new Set([...(aiAnalysis.weaknesses || []).slice(0, 2), ...heur.formatIssues])).slice(0, 4),
      },
      recommendations: Array.from(new Set([...(aiAnalysis.recommendations || []), ...heur.recommendations])).slice(0, 10),
      matchScore: heur.matchScore,
      semanticMatchScore: heur.semanticMatchScore,
      wordMatchScore: heur.wordMatchScore,
      length: heur.length,
      duplicates: heur.duplicates,
      extractedSkills: heur.extractedSkills,
    }

    return NextResponse.json({ analysis }, { status: 200 })
  } catch (error) {
    console.error("ATS analysis error:", error)

    // Real-time fallback using heuristic analysis only (no hardcoded data)
    const heur = heuristicAnalysis(resumeText, jobDescription || "")
    const requiredSkills = jobDescription ? TextProcessor.extractSkillsFromText(jobDescription).slice(0, 15) : []

    const fallbackAnalysis = {
      atsScore: heur.overall,
      keywordMatches: requiredSkills.map((skill) => ({
        keyword: skill,
        found: heur.keywordsFound.includes(skill.toLowerCase()),
        frequency: heur.keywordFrequency[skill.toLowerCase()] || 0,
      })),
      strengths: [
        heur.contact > 80 ? "Complete contact information" : null,
        heur.education > 70 ? "Education section present" : null,
        heur.matchScore > 60 ? "Good keyword alignment with job description" : null,
        heur.formatting > 70 ? "Well-formatted document" : null,
        heur.extractedSkills.length > 10 ? "Diverse skill set detected" : null,
      ].filter(Boolean) as string[],
      improvements: heur.suggestions,
      sections: {
        contact: { score: heur.contact, feedback: heur.contactFeedback },
        summary: { score: Math.max(60, heur.overall - 10), feedback: "Professional summary analysis" },
        experience: { score: Math.max(65, heur.overall - 5), feedback: "Work experience analysis" },
        skills: {
          score: requiredSkills.length > 0
            ? Math.round((heur.keywordsFound.length / Math.max(requiredSkills.length, 1)) * 100)
            : heur.overall,
          feedback: `${heur.keywordsFound.length} relevant keywords found`,
        },
        education: { score: heur.education, feedback: heur.educationFeedback },
      },
      formatting: {
        score: heur.formatting,
        issues: heur.formatIssues,
      },
      recommendations: heur.recommendations,
      matchScore: heur.matchScore,
      semanticMatchScore: heur.semanticMatchScore,
      wordMatchScore: heur.wordMatchScore,
      length: heur.length,
      duplicates: heur.duplicates,
      extractedSkills: heur.extractedSkills,
    }

    return NextResponse.json({ analysis: fallbackAnalysis }, { status: 200 })
  }
}

