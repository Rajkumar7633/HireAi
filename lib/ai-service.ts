// NOTE: We avoid static imports of 'ai' and '@ai-sdk/groq' so the app works even
// when those packages are not installed. We'll dynamically import them only if
// available, otherwise we fall back to heuristic scoring.

export interface ResumeAnalysisResult {
  score: number
  strengths: string[]
  weaknesses: string[]
  skillsMatch: string[]
  experienceMatch: string
  recommendations: string[]
  atsScore: number
  suggestions: string[]
}

export interface JobMatchResult {
  matchScore: number
  skillsAlignment: number
  experienceAlignment: number
  culturalFit: number
  recommendations: string[]
  topSkills: string[]
  missingSkills: string[]
}

export interface InterviewQuestion {
  id: string
  question: string
  category: "technical" | "behavioral" | "situational" | "cultural"
  difficulty: "easy" | "medium" | "hard"
  expectedAnswer?: string
  followUpQuestions?: string[]
  tags: string[]
}

export class AIService {
  private static instance: AIService
  private groqModel: any = null
  private textGen: any = null

  private async ensureModel() {
    if (this.groqModel && this.textGen) return { generateText: this.textGen, model: this.groqModel }
    // Enable SDK if either flag is on OR a Groq API key is present
    const hasKey = !!process.env.GROQ_API_KEY
    const explicitlyEnabled = process.env.ENABLE_AI_SDK === "true"
    const shouldEnable = explicitlyEnabled || hasKey
    if (!shouldEnable) return null
    try {
      // Use runtime dynamic import to avoid bundler resolving at build time.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const importDyn = new Function("m", "return import(m)") as (m: string) => Promise<any>
      const ai = await importDyn("ai")
      const groqPkg = await importDyn("@ai-sdk/groq")
      const modelId = process.env.GROQ_MODEL || "llama-3.2-90b-text-preview"
      this.groqModel = groqPkg.groq(modelId)
      this.textGen = ai.generateText
      return { generateText: this.textGen, model: this.groqModel }
    } catch (e) {
      // If dynamic import fails, return null to trigger fallbacks
      return null
    }
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  async analyzeResume(
    resumeText: string,
    jobRequirements: string,
    requiredSkills: string[],
  ): Promise<ResumeAnalysisResult> {
    try {
      const prompt = `
        Analyze this resume against the job requirements and provide a detailed assessment:

        RESUME:
        ${resumeText}

        JOB REQUIREMENTS:
        ${jobRequirements}

        REQUIRED SKILLS:
        ${requiredSkills.join(", ")}

        Please provide a JSON response with the following structure:
        {
          "score": number (0-100),
          "strengths": string[],
          "weaknesses": string[],
          "skillsMatch": string[],
          "experienceMatch": string,
          "recommendations": string[],
          "atsScore": number (0-100),
          "suggestions": string[]
        }

        Focus on:
        1. Overall match percentage
        2. Skills alignment
        3. Experience relevance
        4. ATS optimization score
        5. Specific improvement suggestions
      `

      const mdl = await this.ensureModel()
      if (!mdl) throw new Error("AI SDK unavailable")
      const { text } = await mdl.generateText({
        model: this.groqModel,
        prompt,
        temperature: 0.3,
      })

      // Parse the AI response
      const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim()
      const result = JSON.parse(cleanedText)

      return {
        score: Math.min(100, Math.max(0, result.score || 0)),
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        skillsMatch: result.skillsMatch || [],
        experienceMatch: result.experienceMatch || "Not specified",
        recommendations: result.recommendations || [],
        atsScore: Math.min(100, Math.max(0, result.atsScore || 0)),
        suggestions: result.suggestions || [],
      }
    } catch (error) {
      console.error("AI Resume Analysis Error:", error)
      // Fallback to basic analysis
      return this.fallbackResumeAnalysis(resumeText, jobRequirements, requiredSkills)
    }
  }

  async generateJobMatch(candidateProfile: any, jobDescription: string, jobSkills: string[]): Promise<JobMatchResult> {
    try {
      const prompt = `
        Analyze the job match between this candidate and job position:

        CANDIDATE PROFILE:
        Skills: ${candidateProfile.skills?.join(", ") || "Not specified"}
        Experience: ${candidateProfile.experience || "Not specified"}
        Education: ${candidateProfile.education?.join(", ") || "Not specified"}
        Summary: ${candidateProfile.professionalSummary || "Not provided"}

        JOB DESCRIPTION:
        ${jobDescription}

        REQUIRED SKILLS:
        ${jobSkills.join(", ")}

        Provide a JSON response with:
        {
          "matchScore": number (0-100),
          "skillsAlignment": number (0-100),
          "experienceAlignment": number (0-100),
          "culturalFit": number (0-100),
          "recommendations": string[],
          "topSkills": string[],
          "missingSkills": string[]
        }
      `

      const mdl = await this.ensureModel()
      if (!mdl) throw new Error("AI SDK unavailable")
      const { text } = await mdl.generateText({
        model: this.groqModel,
        prompt,
        temperature: 0.3,
      })

      const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim()
      const result = JSON.parse(cleanedText)

      return {
        matchScore: Math.min(100, Math.max(0, result.matchScore || 0)),
        skillsAlignment: Math.min(100, Math.max(0, result.skillsAlignment || 0)),
        experienceAlignment: Math.min(100, Math.max(0, result.experienceAlignment || 0)),
        culturalFit: Math.min(100, Math.max(0, result.culturalFit || 0)),
        recommendations: result.recommendations || [],
        topSkills: result.topSkills || [],
        missingSkills: result.missingSkills || [],
      }
    } catch (error) {
      console.error("AI Job Match Error:", error)
      return this.fallbackJobMatch(candidateProfile, jobSkills)
    }
  }

  async generateInterviewQuestions(
    jobTitle: string,
    skills: string[],
    experienceLevel: string,
    questionCount = 10,
  ): Promise<InterviewQuestion[]> {
    try {
      const prompt = `
        Generate ${questionCount} interview questions for a ${jobTitle} position with ${experienceLevel} experience level.

        Required skills: ${skills.join(", ")}

        Create a mix of:
        - Technical questions (40%)
        - Behavioral questions (30%)
        - Situational questions (20%)
        - Cultural fit questions (10%)

        Provide a JSON array with this structure:
        [
          {
            "id": "unique_id",
            "question": "question text",
            "category": "technical|behavioral|situational|cultural",
            "difficulty": "easy|medium|hard",
            "expectedAnswer": "brief expected answer",
            "followUpQuestions": ["follow up 1", "follow up 2"],
            "tags": ["tag1", "tag2"]
          }
        ]

        Make questions specific to the role and skills mentioned.
      `

      const mdl = await this.ensureModel()
      if (!mdl) throw new Error("AI SDK unavailable")
      const { text } = await mdl.generateText({
        model: this.groqModel,
        prompt,
        temperature: 0.7,
      })

      const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim()
      const questions = JSON.parse(cleanedText)

      return questions.map((q: any, index: number) => ({
        id: q.id || `q_${Date.now()}_${index}`,
        question: q.question || "",
        category: q.category || "technical",
        difficulty: q.difficulty || "medium",
        expectedAnswer: q.expectedAnswer,
        followUpQuestions: q.followUpQuestions || [],
        tags: q.tags || [],
      }))
    } catch (error) {
      console.error("AI Interview Questions Error:", error)
      return this.fallbackInterviewQuestions(jobTitle, skills, experienceLevel)
    }
  }

  async generateJobRecommendations(candidateProfile: any, availableJobs: any[]): Promise<any[]> {
    try {
      const prompt = `
        Recommend the best job matches for this candidate:

        CANDIDATE:
        Skills: ${candidateProfile.skills?.join(", ") || "Not specified"}
        Experience: ${candidateProfile.experience || "Not specified"}
        Preferences: ${candidateProfile.jobPreferences || "Not specified"}

        AVAILABLE JOBS:
        ${availableJobs
          .map(
            (job, i) => `
        ${i + 1}. ${job.title}
        Skills: ${job.skills?.join(", ") || "Not specified"}
        Experience: ${job.experienceLevel || "Not specified"}
        Location: ${job.location || "Not specified"}
        `,
          )
          .join("\n")}

        Rank jobs by match quality and provide match scores (0-100) with reasons.
        Return JSON array with job rankings and match explanations.
      `

      const mdl = await this.ensureModel()
      if (!mdl) throw new Error("AI SDK unavailable")
      const { text } = await mdl.generateText({
        model: this.groqModel,
        prompt,
        temperature: 0.3,
      })

      const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim()
      return JSON.parse(cleanedText)
    } catch (error) {
      console.error("AI Job Recommendations Error:", error)
      return availableJobs.map((job, index) => ({
        ...job,
        matchScore: Math.max(50, 100 - index * 10),
        matchReason: "Basic compatibility analysis",
      }))
    }
  }

  // Fallback methods for when AI fails
  private fallbackResumeAnalysis(
    resumeText: string,
    jobRequirements: string,
    requiredSkills: string[],
  ): ResumeAnalysisResult {
    const words = resumeText.toLowerCase().split(/\s+/)
    const skillsMatch = requiredSkills.filter((skill) => resumeText.toLowerCase().includes(skill.toLowerCase()))

    const score = Math.min(100, (skillsMatch.length / requiredSkills.length) * 80 + 20)

    return {
      score: Math.round(score),
      strengths: skillsMatch.length > 0 ? [`Matches ${skillsMatch.length} required skills`] : [],
      weaknesses: skillsMatch.length < requiredSkills.length ? ["Missing some required skills"] : [],
      skillsMatch,
      experienceMatch: words.some((w) => w.includes("year")) ? "Relevant experience found" : "Experience unclear",
      recommendations: score > 70 ? ["Strong candidate"] : ["Consider for screening"],
      atsScore: Math.round(score * 0.9),
      suggestions: ["Optimize resume with more relevant keywords"],
    }
  }

  private fallbackJobMatch(candidateProfile: any, jobSkills: string[]): JobMatchResult {
    const candidateSkills = candidateProfile.skills || []
    const matchingSkills = candidateSkills.filter((skill: string) =>
      jobSkills.some(
        (jobSkill) =>
          skill.toLowerCase().includes(jobSkill.toLowerCase()) || jobSkill.toLowerCase().includes(skill.toLowerCase()),
      ),
    )

    const matchScore = jobSkills.length > 0 ? (matchingSkills.length / jobSkills.length) * 100 : 50

    return {
      matchScore: Math.round(matchScore),
      skillsAlignment: Math.round(matchScore),
      experienceAlignment: 75,
      culturalFit: 70,
      recommendations: ["Review candidate profile for detailed assessment"],
      topSkills: matchingSkills.slice(0, 5),
      missingSkills: jobSkills.filter((skill) => !matchingSkills.includes(skill)),
    }
  }

  private fallbackInterviewQuestions(jobTitle: string, skills: string[], experienceLevel: string): InterviewQuestion[] {
    return [
      {
        id: "fallback_1",
        question: `Tell me about your experience with ${skills[0] || "the technologies"} relevant to this ${jobTitle} role.`,
        category: "technical",
        difficulty: "medium",
        tags: skills.slice(0, 3),
      },
      {
        id: "fallback_2",
        question: "Describe a challenging project you worked on and how you overcame obstacles.",
        category: "behavioral",
        difficulty: "medium",
        tags: ["problem-solving", "experience"],
      },
      {
        id: "fallback_3",
        question: `How would you approach learning new technologies in a ${jobTitle} role?`,
        category: "situational",
        difficulty: "easy",
        tags: ["learning", "adaptability"],
      },
    ]
  }
}

export const aiService = AIService.getInstance()
