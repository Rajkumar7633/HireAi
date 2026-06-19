import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

/**
 * POST /api/ai/generate-problem
 * Generates a coding problem from a prompt using AI (Gemini/OpenAI).
 * Falls back to a template-based generation if AI is not available.
 */
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 })
  }

  const { prompt } = body
  if (!prompt?.trim()) {
    return NextResponse.json({ message: "Prompt is required" }, { status: 400 })
  }

  // Try Gemini (fastest, free tier available)
  if (GEMINI_API_KEY) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-1.5-pro"}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert competitive programming problem setter. Generate a coding problem based on the user's description.
Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "title": "Problem Title",
  "statement": "Full problem statement (2-3 paragraphs)",
  "constraints": "Bullet-point constraints (use newlines)",
  "difficulty": "Easy|Medium|Hard",
  "tags": ["Tag1", "Tag2"],
  "examples": [
    { "input": "example input", "output": "example output", "explanation": "optional explanation" }
  ],
  "testCases": [
    { "input": "test input 1", "output": "expected output 1", "hidden": false },
    { "input": "test input 2", "output": "expected output 2", "hidden": true }
  ],
  "starterCode": "Python starter code using sys.stdin"
}

Generate a coding problem for: ${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        }),
        signal: AbortSignal.timeout(15_000),
      })

      if (res.ok) {
        const data = await res.json()
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const problem = JSON.parse(jsonMatch[0])
          return NextResponse.json({ problem }, { status: 200 })
        }
      }
    } catch (e) {
      console.error("[generate-problem] Gemini error:", e)
    }
  }

  // Try OpenAI
  if (OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `Generate a coding problem as JSON with fields: title, statement, constraints, difficulty (Easy/Medium/Hard), tags (array), examples (array of {input,output,explanation}), testCases (array of {input,output,hidden}), starterCode (Python). Return ONLY JSON.`,
            },
            { role: "user", content: `Create a coding problem about: ${prompt}` },
          ],
          temperature: 0.7, max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(20_000),
      })
      if (res.ok) {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content || ""
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const problem = JSON.parse(jsonMatch[0])
          return NextResponse.json({ problem }, { status: 200 })
        }
      }
    } catch (e) {
      console.error("[generate-problem] OpenAI error:", e)
    }
  }

  // Intelligent fallback: generate based on prompt keywords
  const lowerPrompt = prompt.toLowerCase()
  let difficulty: "Easy" | "Medium" | "Hard" = "Medium"
  if (lowerPrompt.includes("easy") || lowerPrompt.includes("beginner") || lowerPrompt.includes("simple")) difficulty = "Easy"
  if (lowerPrompt.includes("hard") || lowerPrompt.includes("difficult") || lowerPrompt.includes("senior") || lowerPrompt.includes("advanced")) difficulty = "Hard"

  const tags: string[] = []
  if (lowerPrompt.includes("array") || lowerPrompt.includes("list")) tags.push("Arrays")
  if (lowerPrompt.includes("string") || lowerPrompt.includes("text")) tags.push("Strings")
  if (lowerPrompt.includes("graph") || lowerPrompt.includes("bfs") || lowerPrompt.includes("dfs")) tags.push("Graphs")
  if (lowerPrompt.includes("tree") || lowerPrompt.includes("binary")) tags.push("Trees")
  if (lowerPrompt.includes("dp") || lowerPrompt.includes("dynamic")) tags.push("Dynamic Programming")
  if (lowerPrompt.includes("sort")) tags.push("Sorting")
  if (lowerPrompt.includes("hash") || lowerPrompt.includes("map") || lowerPrompt.includes("dict")) tags.push("HashMap")
  if (lowerPrompt.includes("recursi") || lowerPrompt.includes("backtrack")) tags.push("Recursion")
  if (tags.length === 0) tags.push("General")

  const problem = {
    title: `[AI Draft] ${prompt.slice(0, 50)}`,
    statement: `${prompt}\n\nGiven the input described above, write an efficient solution to solve the problem.\n\nYour solution should handle all edge cases and work within the given constraints.`,
    constraints: "1 ≤ n ≤ 10^5\nValues are within valid integer range\nTime limit: 2 seconds",
    difficulty,
    tags,
    examples: [
      { input: "Sample input", output: "Expected output", explanation: "Brief explanation of this example" }
    ],
    testCases: [
      { input: "test1", output: "output1", hidden: false },
      { input: "test2", output: "output2", hidden: true },
    ],
    starterCode: `import sys\ninput_data = sys.stdin.read().strip()\n# Write your solution here\nprint("Your output here")`,
  }

  return NextResponse.json({ problem }, { status: 200 })
}

