"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Plus, Trash2, Code, FileText, Video, Hash,
  CheckCircle2, GripVertical, ChevronDown, ChevronUp, Lightbulb,
} from "lucide-react"

interface QuestionData {
  id: string
  questionText: string
  type: "multiple_choice" | "short_answer" | "code_snippet" | "video_response"
  options: string[]
  correctAnswer: string
  points: number
  difficulty: "Easy" | "Medium" | "Hard"
  timeLimit?: number
  tags: string[]
  hint?: string
  examples: Array<{ input: string; output: string; explanation?: string }>
  testCases: Array<{ id: string; input: string; expectedOutput: string; description?: string; isHidden?: boolean }>
}

interface Props {
  question: QuestionData
  onChange: (q: QuestionData) => void
  onRemove?: () => void
  questionNumber: number
}

const TYPE_CONFIG = {
  multiple_choice: { label: "Multiple Choice", icon: Hash, color: "bg-blue-100 text-blue-700" },
  short_answer: { label: "Short Answer", icon: FileText, color: "bg-purple-100 text-purple-700" },
  code_snippet: { label: "Coding", icon: Code, color: "bg-orange-100 text-orange-700" },
  video_response: { label: "Video", icon: Video, color: "bg-pink-100 text-pink-700" },
}

const DIFF_CONFIG = {
  Easy: "bg-green-100 text-green-700 border-green-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Hard: "bg-red-100 text-red-700 border-red-200",
}

export function QuestionBuilder({ question, onChange, onRemove, questionNumber }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [showHint, setShowHint] = useState(false)

  const update = (field: keyof QuestionData, value: any) =>
    onChange({ ...question, [field]: value })

  const updateOption = (idx: number, val: string) => {
    const opts = [...question.options]
    const wasCorrect = question.correctAnswer === opts[idx]
    opts[idx] = val
    onChange({
      ...question,
      options: opts,
      // keep correctAnswer in sync if user edits the correct option text
      correctAnswer: wasCorrect ? val : question.correctAnswer,
    })
  }

  const addOption = () => {
    if (question.options.length < 6) update("options", [...question.options, ""])
  }

  const removeOption = (idx: number) => {
    const opts = question.options.filter((_, i) => i !== idx)
    onChange({
      ...question,
      options: opts,
      correctAnswer: question.correctAnswer === question.options[idx] ? "" : question.correctAnswer,
    })
  }

  const selectCorrect = (opt: string) => {
    if (opt.trim()) update("correctAnswer", opt)
  }

  const TypeIcon = TYPE_CONFIG[question.type]?.icon || FileText
  const isValid =
    question.questionText.trim() &&
    question.correctAnswer.trim() &&
    (question.type !== "multiple_choice" || question.options.every((o) => o.trim()))

  return (
    <Card
      className={`border-l-4 transition-all ${
        isValid ? "border-l-green-500" : "border-l-yellow-400"
      }`}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
          {questionNumber}
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CONFIG[question.type]?.color}`}>
          <TypeIcon className="h-3 w-3" />
          {TYPE_CONFIG[question.type]?.label}
        </div>
        <Badge variant="outline" className={`text-xs ${DIFF_CONFIG[question.difficulty]}`}>
          {question.difficulty}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {question.points} pts
        </Badge>
        <p className="flex-1 text-sm text-muted-foreground truncate">
          {question.questionText || <span className="italic">No question text yet…</span>}
        </p>
        {isValid && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 hover:text-red-600"
            onClick={(e) => { e.stopPropagation(); onRemove() }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* ── Body ── */}
      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 space-y-4 border-t">
          {/* Question text */}
          <div className="space-y-1 pt-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Question *
            </Label>
            <Textarea
              value={question.questionText}
              onChange={(e) => update("questionText", e.target.value)}
              placeholder="Type your question here…"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Type / Difficulty / Points row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</Label>
              <Select value={question.type} onValueChange={(v) => update("type", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                  <SelectItem value="code_snippet">Coding Challenge</SelectItem>
                  <SelectItem value="video_response">Video Response</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Difficulty</Label>
              <Select
                value={question.difficulty}
                onValueChange={(v) => update("difficulty", v as "Easy" | "Medium" | "Hard")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Points</Label>
              <Input
                type="number"
                value={question.points}
                onChange={(e) => update("points", parseInt(e.target.value) || 1)}
                min={1}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* ── MCQ Options ── */}
          {question.type === "multiple_choice" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Answer Options
                  <span className="ml-2 font-normal normal-case text-muted-foreground">
                    — click an option row to mark it correct
                  </span>
                </Label>
                {question.correctAnswer && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Correct answer set
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {question.options.map((opt, i) => {
                  const isCorrect = question.correctAnswer === opt && opt.trim() !== ""
                  return (
                    <div
                      key={i}
                      onClick={() => selectCorrect(opt)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                        isCorrect
                          ? "border-green-500 bg-green-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      {/* Radio indicator */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isCorrect ? "border-green-500 bg-green-500" : "border-slate-300"
                        }`}
                      >
                        {isCorrect && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>

                      {/* Letter badge */}
                      <span
                        className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center shrink-0 ${
                          isCorrect ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>

                      {/* Option input */}
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        className={`flex-1 border-none shadow-none focus-visible:ring-0 h-7 text-sm p-0 bg-transparent ${
                          isCorrect ? "font-medium text-green-800" : ""
                        }`}
                      />

                      {isCorrect && (
                        <span className="text-xs text-green-600 font-medium shrink-0">✓ Correct</span>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-40 hover:opacity-100 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); removeOption(i) }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )
                })}
              </div>

              {question.options.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-full border-dashed text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Option ({question.options.length}/6)
                </Button>
              )}

              {!question.correctAnswer && question.options.some((o) => o.trim()) && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  ⚠ Click an option row above to mark the correct answer
                </p>
              )}
            </div>
          )}

          {/* ── Short Answer ── */}
          {question.type === "short_answer" && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Expected Answer *
              </Label>
              <Input
                value={question.correctAnswer}
                onChange={(e) => update("correctAnswer", e.target.value)}
                placeholder="Type the expected correct answer…"
                className={question.correctAnswer ? "border-green-400 bg-green-50" : ""}
              />
              {question.correctAnswer && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Answer set
                </p>
              )}
            </div>
          )}

          {/* ── Coding Challenge ── */}
          {question.type === "code_snippet" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Expected Output / Model Answer *
                </Label>
                <Textarea
                  value={question.correctAnswer}
                  onChange={(e) => update("correctAnswer", e.target.value)}
                  placeholder="Describe the expected output or provide a model solution…"
                  rows={3}
                  className={question.correctAnswer ? "border-green-400 bg-green-50" : ""}
                />
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                For coding questions, describe the expected behavior or provide a sample solution for grader reference.
              </div>
            </div>
          )}

          {/* ── Video Response ── */}
          {question.type === "video_response" && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Evaluation Criteria *
              </Label>
              <Textarea
                value={question.correctAnswer}
                onChange={(e) => update("correctAnswer", e.target.value)}
                placeholder="Describe what a good video response should include…"
                rows={3}
                className={question.correctAnswer ? "border-green-400 bg-green-50" : ""}
              />
            </div>
          )}

          {/* ── Hint (collapsible) ── */}
          <div>
            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              {showHint ? "Hide hint" : "Add hint for candidates (optional)"}
            </button>
            {showHint && (
              <Textarea
                value={question.hint || ""}
                onChange={(e) => update("hint", e.target.value)}
                placeholder="Give candidates a helpful nudge without revealing the answer…"
                rows={2}
                className="mt-2 text-sm"
              />
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
