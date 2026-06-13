"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Plus, Trash2, Code2, ChevronRight, GripVertical, AlertCircle,
  Eye, EyeOff, TestTube2, FileCode2, X, Copy, CheckCircle2
} from "lucide-react"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

export const CODING_LANGUAGES = [
  { value: "javascript", label: "JavaScript", monacoLang: "javascript", judgeId: 63 },
  { value: "typescript", label: "TypeScript", monacoLang: "typescript", judgeId: 74 },
  { value: "python", label: "Python", monacoLang: "python", judgeId: 71 },
  { value: "java", label: "Java", monacoLang: "java", judgeId: 62 },
  { value: "cpp", label: "C++", monacoLang: "cpp", judgeId: 54 },
  { value: "c", label: "C", monacoLang: "c", judgeId: 50 },
  { value: "go", label: "Go", monacoLang: "go", judgeId: 60 },
  { value: "rust", label: "Rust", monacoLang: "rust", judgeId: 73 },
  { value: "kotlin", label: "Kotlin", monacoLang: "kotlin", judgeId: 78 },
  { value: "swift", label: "Swift", monacoLang: "swift", judgeId: 83 },
]

const STARTER_CODE_TEMPLATES: Record<string, string> = {
  javascript: `function solution(input) {\n  // Write your solution here\n  \n}`,
  typescript: `function solution(input: string): string {\n  // Write your solution here\n  return "";\n}`,
  python: `def solution(input):\n    # Write your solution here\n    pass`,
  java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n    fmt.Println("Hello")\n}`,
  rust: `use std::io;\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_line(&mut input).unwrap();\n    // Write your solution here\n}`,
  kotlin: `fun main() {\n    val input = readLine() ?: ""\n    // Write your solution here\n}`,
  swift: `import Foundation\n\nlet input = readLine() ?? ""\n// Write your solution here`,
}

interface Example {
  id: string
  input: string
  output: string
  explanation: string
}

interface TestCase {
  id: string
  input: string
  expectedOutput: string
  hidden: boolean
  weight: number
}

export interface CodingProblem {
  id: string
  questionText: string
  type: "code_snippet"
  difficulty: "Easy" | "Medium" | "Hard"
  tags: string[]
  constraints: string
  examples: Example[]
  language: string
  starterCode: string
  testCases: TestCase[]
  points: number
  timeLimitMs: number
  memoryLimitMb: number
}

interface CodingTestCreatorProps {
  problems: CodingProblem[]
  onChange: (problems: CodingProblem[]) => void
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-green-100 text-green-800 border-green-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Hard: "bg-red-100 text-red-800 border-red-200",
}

function createEmptyProblem(): CodingProblem {
  return {
    id: `prob_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    questionText: "",
    type: "code_snippet",
    difficulty: "Medium",
    tags: [],
    constraints: "",
    examples: [],
    language: "python",
    starterCode: STARTER_CODE_TEMPLATES["python"],
    testCases: [],
    points: 10,
    timeLimitMs: 2000,
    memoryLimitMb: 256,
  }
}

function createEmptyExample(): Example {
  return { id: `ex_${Date.now()}`, input: "", output: "", explanation: "" }
}

function createEmptyTestCase(): TestCase {
  return { id: `tc_${Date.now()}`, input: "", expectedOutput: "", hidden: false, weight: 1 }
}

export function CodingTestCreator({ problems, onChange }: CodingTestCreatorProps) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [tagInput, setTagInput] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const selected = problems[selectedIdx]

  const updateProblem = useCallback((idx: number, patch: Partial<CodingProblem>) => {
    onChange(problems.map((p, i) => i === idx ? { ...p, ...patch } : p))
  }, [problems, onChange])

  const addProblem = () => {
    const next = [...problems, createEmptyProblem()]
    onChange(next)
    setSelectedIdx(next.length - 1)
  }

  const removeProblem = (idx: number) => {
    if (problems.length === 1) return
    const next = problems.filter((_, i) => i !== idx)
    onChange(next)
    setSelectedIdx(Math.min(selectedIdx, next.length - 1))
  }

  const addExample = () => {
    updateProblem(selectedIdx, { examples: [...(selected.examples || []), createEmptyExample()] })
  }

  const updateExample = (exIdx: number, patch: Partial<Example>) => {
    const examples = selected.examples.map((e, i) => i === exIdx ? { ...e, ...patch } : e)
    updateProblem(selectedIdx, { examples })
  }

  const removeExample = (exIdx: number) => {
    updateProblem(selectedIdx, { examples: selected.examples.filter((_, i) => i !== exIdx) })
  }

  const addTestCase = (hidden = false) => {
    const tc = { ...createEmptyTestCase(), hidden }
    updateProblem(selectedIdx, { testCases: [...(selected.testCases || []), tc] })
  }

  const updateTestCase = (tcIdx: number, patch: Partial<TestCase>) => {
    const testCases = selected.testCases.map((tc, i) => i === tcIdx ? { ...tc, ...patch } : tc)
    updateProblem(selectedIdx, { testCases })
  }

  const removeTestCase = (tcIdx: number) => {
    updateProblem(selectedIdx, { testCases: selected.testCases.filter((_, i) => i !== tcIdx) })
  }

  const addTag = (tag: string) => {
    const t = tag.trim()
    if (!t || selected.tags.includes(t)) return
    updateProblem(selectedIdx, { tags: [...selected.tags, t] })
    setTagInput("")
  }

  const removeTag = (tag: string) => {
    updateProblem(selectedIdx, { tags: selected.tags.filter(t => t !== tag) })
  }

  const handleLanguageChange = (lang: string) => {
    updateProblem(selectedIdx, {
      language: lang,
      starterCode: STARTER_CODE_TEMPLATES[lang] || "",
    })
  }

  const copyStarterCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => { })
    setCopied("starter")
    setTimeout(() => setCopied(null), 1500)
  }

  if (!selected) return null

  const visibleCases = selected.testCases.filter(tc => !tc.hidden)
  const hiddenCases = selected.testCases.filter(tc => tc.hidden)

  return (
    <div className="flex gap-4 h-full min-h-[600px]">
      {/* Sidebar — problem list */}
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
          Problems ({problems.length})
        </div>
        <div className="flex flex-col gap-1 overflow-y-auto flex-1">
          {problems.map((prob, idx) => (
            <div
              key={prob.id}
              onClick={() => setSelectedIdx(idx)}
              className={`group flex items-start gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                idx === selectedIdx
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:border-muted hover:bg-muted/40"
              }`}
            >
              <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0 opacity-40" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {prob.questionText ? prob.questionText.slice(0, 30) + (prob.questionText.length > 30 ? "…" : "") : `Problem ${idx + 1}`}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${DIFFICULTY_COLORS[prob.difficulty]}`}>
                    {prob.difficulty}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{prob.points}pts</span>
                </div>
              </div>
              {problems.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeProblem(idx) }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addProblem} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add Problem
        </Button>
      </div>

      {/* Main editor */}
      <div className="flex-1 min-w-0">
        <Card className="h-full">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  Problem {selectedIdx + 1}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Points</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={selected.points}
                  onChange={e => updateProblem(selectedIdx, { points: parseInt(e.target.value) || 10 })}
                  className="w-16 h-7 text-sm"
                />
                <Select value={selected.difficulty} onValueChange={v => updateProblem(selectedIdx, { difficulty: v as any })}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 overflow-y-auto max-h-[calc(100vh-280px)]">
            <Tabs defaultValue="description">
              <TabsList className="mb-4">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="testcases">
                  Test Cases
                  {selected.testCases.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">
                      {selected.testCases.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="starter">Starter Code</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              {/* ── Description tab ── */}
              <TabsContent value="description" className="space-y-4 mt-0">
                {/* Title / problem statement */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Problem Statement <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={selected.questionText}
                    onChange={e => updateProblem(selectedIdx, { questionText: e.target.value })}
                    placeholder="Describe the problem clearly. E.g. Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
                    rows={5}
                    className="resize-none font-mono text-sm"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {selected.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      placeholder="e.g. Arrays, HashMap, Binary Search"
                      className="h-8 text-sm"
                      onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput) } }}
                    />
                    <Button variant="outline" size="sm" className="h-8" onClick={() => addTag(tagInput)}>
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Press Enter or comma to add a tag</p>
                </div>

                {/* Constraints */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Constraints</Label>
                  <Textarea
                    value={selected.constraints}
                    onChange={e => updateProblem(selectedIdx, { constraints: e.target.value })}
                    placeholder={"1 ≤ nums.length ≤ 10^4\n-10^9 ≤ nums[i] ≤ 10^9\nExactly one valid answer exists."}
                    rows={3}
                    className="resize-none text-sm font-mono"
                  />
                </div>

                {/* Examples (visible sample I/O) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Examples <span className="text-xs text-muted-foreground font-normal">(visible to candidates)</span></Label>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addExample}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Example
                    </Button>
                  </div>
                  {selected.examples.length === 0 && (
                    <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                      Add sample input/output examples that candidates will see during the test
                    </div>
                  )}
                  {selected.examples.map((ex, exIdx) => (
                    <div key={ex.id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Example {exIdx + 1}</span>
                        <button onClick={() => removeExample(exIdx)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Input</Label>
                          <Textarea
                            value={ex.input}
                            onChange={e => updateExample(exIdx, { input: e.target.value })}
                            placeholder="e.g. nums = [2,7,11,15], target = 9"
                            rows={2}
                            className="text-xs font-mono resize-none mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Output</Label>
                          <Textarea
                            value={ex.output}
                            onChange={e => updateExample(exIdx, { output: e.target.value })}
                            placeholder="e.g. [0,1]"
                            rows={2}
                            className="text-xs font-mono resize-none mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Explanation (optional)</Label>
                        <Input
                          value={ex.explanation}
                          onChange={e => updateExample(exIdx, { explanation: e.target.value })}
                          placeholder="Because nums[0] + nums[1] = 9, we return [0, 1]."
                          className="text-xs mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Time Limit (ms)</Label>
                    <Input
                      type="number"
                      min={500}
                      max={10000}
                      step={500}
                      value={selected.timeLimitMs}
                      onChange={e => updateProblem(selectedIdx, { timeLimitMs: parseInt(e.target.value) || 2000 })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Memory Limit (MB)</Label>
                    <Input
                      type="number"
                      min={32}
                      max={512}
                      step={32}
                      value={selected.memoryLimitMb}
                      onChange={e => updateProblem(selectedIdx, { memoryLimitMb: parseInt(e.target.value) || 256 })}
                      className="text-sm"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ── Test Cases tab ── */}
              <TabsContent value="testcases" className="space-y-4 mt-0">
                {/* Visible test cases */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <Label className="text-sm font-medium">Sample Test Cases <span className="text-xs text-muted-foreground font-normal">(visible to candidates)</span></Label>
                      <Badge variant="outline" className="text-xs">{visibleCases.length}</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addTestCase(false)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Sample
                    </Button>
                  </div>
                  {visibleCases.length === 0 && (
                    <div className="border border-dashed rounded-lg p-3 text-center text-xs text-muted-foreground">
                      Sample cases are shown to candidates and used for the "Run Code" button
                    </div>
                  )}
                  {selected.testCases.map((tc, tcIdx) => !tc.hidden && (
                    <TestCaseRow key={tc.id} tc={tc} tcIdx={tcIdx} onUpdate={updateTestCase} onRemove={removeTestCase} />
                  ))}
                </div>

                {/* Hidden test cases */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4 text-orange-500" />
                      <Label className="text-sm font-medium">Hidden Test Cases <span className="text-xs text-muted-foreground font-normal">(used for scoring only)</span></Label>
                      <Badge variant="outline" className="text-xs">{hiddenCases.length}</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addTestCase(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Hidden
                    </Button>
                  </div>
                  {hiddenCases.length === 0 && (
                    <div className="border border-dashed rounded-lg p-3 text-center text-xs text-muted-foreground">
                      Hidden cases are secret — candidates don't see them but they're run for final scoring
                    </div>
                  )}
                  {selected.testCases.map((tc, tcIdx) => tc.hidden && (
                    <TestCaseRow key={tc.id} tc={tc} tcIdx={tcIdx} onUpdate={updateTestCase} onRemove={removeTestCase} />
                  ))}
                </div>

                {selected.testCases.length === 0 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">Add at least one test case to enable automatic scoring. Without test cases, code submissions get 50% by default.</p>
                  </div>
                )}
              </TabsContent>

              {/* ── Starter Code tab ── */}
              <TabsContent value="starter" className="space-y-3 mt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Default Language</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Changing language auto-fills the template below</p>
                  </div>
                  <Select value={selected.language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CODING_LANGUAGES.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Starter Code</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => {
                          updateProblem(selectedIdx, { starterCode: STARTER_CODE_TEMPLATES[selected.language] || "" })
                        }}
                      >
                        <Code2 className="h-3 w-3" /> Reset to template
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => copyStarterCode(selected.starterCode)}
                      >
                        {copied === "starter" ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        {copied === "starter" ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      value={selected.starterCode}
                      onChange={e => updateProblem(selectedIdx, { starterCode: e.target.value })}
                      spellCheck={false}
                      rows={14}
                      className="w-full font-mono text-sm bg-gray-950 text-green-300 border border-gray-800 rounded-lg p-4 resize-y focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 leading-relaxed"
                      placeholder={`// Write starter code for ${selected.language} here…`}
                      style={{ tabSize: 4 }}
                    />
                    {/* Language label overlay */}
                    <div className="absolute top-2 right-3 flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {selected.language}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <Code2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700">
                    This code is pre-filled in the candidate's editor. Candidates can switch to any language — they're not locked to this default.
                  </p>
                </div>
              </TabsContent>

              {/* ── Preview tab ── */}
              <TabsContent value="preview" className="mt-0">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-900 text-white p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${DIFFICULTY_COLORS[selected.difficulty]}`}>{selected.difficulty}</Badge>
                      {selected.tags.map(t => (
                        <Badge key={t} variant="outline" className="text-xs border-gray-600 text-gray-300">{t}</Badge>
                      ))}
                    </div>
                    <div className="text-white font-medium leading-relaxed whitespace-pre-wrap text-sm">
                      {selected.questionText || <span className="text-gray-500 italic">Problem statement will appear here…</span>}
                    </div>
                    {selected.constraints && (
                      <div className="bg-gray-800 rounded p-2">
                        <p className="text-xs font-semibold text-gray-400 mb-1">Constraints:</p>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{selected.constraints}</pre>
                      </div>
                    )}
                    {selected.examples.length > 0 && (
                      <div className="space-y-2">
                        {selected.examples.map((ex, i) => (
                          <div key={ex.id} className="bg-gray-800 rounded p-2 text-xs">
                            <p className="text-gray-400 font-semibold mb-1">Example {i + 1}:</p>
                            <p className="font-mono"><span className="text-gray-400">Input: </span><span className="text-green-300">{ex.input}</span></p>
                            <p className="font-mono"><span className="text-gray-400">Output: </span><span className="text-blue-300">{ex.output}</span></p>
                            {ex.explanation && <p className="text-gray-400 mt-1">{ex.explanation}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border border-dashed border-gray-600 rounded p-3 text-center text-xs text-gray-500">
                      [ Monaco Code Editor — candidate writes solution here ]
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TestCaseRow({
  tc, tcIdx, onUpdate, onRemove,
}: {
  tc: TestCase
  tcIdx: number
  onUpdate: (i: number, p: Partial<TestCase>) => void
  onRemove: (i: number) => void
}) {
  return (
    <div className={`border rounded-lg p-3 space-y-2 ${tc.hidden ? "bg-orange-50/40 border-orange-200" : "bg-blue-50/40 border-blue-200"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TestTube2 className={`h-3.5 w-3.5 ${tc.hidden ? "text-orange-500" : "text-blue-500"}`} />
          <span className="text-xs font-semibold text-muted-foreground">
            {tc.hidden ? "Hidden" : "Sample"} Case
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">Weight</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={tc.weight}
              onChange={e => onUpdate(tcIdx, { weight: parseInt(e.target.value) || 1 })}
              className="w-14 h-6 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Switch
              checked={tc.hidden}
              onCheckedChange={v => onUpdate(tcIdx, { hidden: v })}
              className="scale-75"
            />
            <Label className="text-xs text-muted-foreground">{tc.hidden ? "Hidden" : "Visible"}</Label>
          </div>
          <button onClick={() => onRemove(tcIdx)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Input</Label>
          <Textarea
            value={tc.input}
            onChange={e => onUpdate(tcIdx, { input: e.target.value })}
            placeholder="e.g. 5\n1 2 3 4 5"
            rows={2}
            className="text-xs font-mono resize-none mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Expected Output</Label>
          <Textarea
            value={tc.expectedOutput}
            onChange={e => onUpdate(tcIdx, { expectedOutput: e.target.value })}
            placeholder="e.g. 15"
            rows={2}
            className="text-xs font-mono resize-none mt-1"
          />
        </div>
      </div>
    </div>
  )
}
