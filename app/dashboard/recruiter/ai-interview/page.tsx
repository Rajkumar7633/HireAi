"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  Sparkles,
  Copy,
  RefreshCw,
  Save,
  Download,
  Edit,
  CheckCircle,
  Clock,
  Target,
} from "lucide-react";

interface Question {
  id: string;
  question: string;
  category: "technical" | "behavioral" | "situational" | "cultural";
  difficulty: "easy" | "medium" | "hard";
  expectedAnswer?: string;
  followUpQuestions?: string[];
  tags: string[];
}

interface QuestionSet {
  id: string;
  name: string;
  position: string;
  questions: Question[];
  createdAt: string;
  aiGenerated: boolean;
}

export default function AIInterviewPage() {
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [position, setPosition] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const STORAGE_KEY = "ai-interview:sets";

  useEffect(() => {
    // Load saved sets from localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: QuestionSet[] = JSON.parse(raw);
        setQuestionSets(parsed);
        setSelectedSet(parsed[0] || null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Persist sets to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(questionSets));
    } catch {}
  }, [questionSets]);

  const handleSaveSet = () => {
    if (!selectedSet) return;
    // Ensure selected set is in the collection (replace or insert)
    setQuestionSets((prev) => {
      const idx = prev.findIndex((s) => s.id === selectedSet.id);
      if (idx >= 0) {
        const copy = prev.slice();
        copy[idx] = selectedSet;
        return copy;
      }
      return [selectedSet, ...prev];
    });
  };

  const handleExportSet = () => {
    if (!selectedSet) return;
    const blob = new Blob([JSON.stringify(selectedSet, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedSet.name.replace(/[^a-z0-9\-_]+/gi, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const generateQuestions = async () => {
    if (!position.trim()) return;
    setGenerating(true);
    try {
      // Map free-text experience to a coarse level for the API
      const level = /senior/i.test(experience)
        ? "Senior"
        : /junior|entry/i.test(experience)
          ? "Junior"
          : "Mid";

      const resp = await fetch("/api/ai/interview-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: position,
          skills: skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          experienceLevel: level,
          questionCount: Math.max(1, Math.min(50, questionCount)),
          preferredCategories: ["technical", "situational"],
        }),
      });
      if (!resp.ok) throw new Error("Failed to generate questions");
      const data = await resp.json();

      // Prefer fullQuestions if available; otherwise flatten categorized sets
      const full: any[] = data?.questions?.fullQuestions || [];
      let items: Question[] = [];
      if (full.length > 0) {
        items = full.map((q: any, idx: number) => ({
          id: q.id || `q_${Date.now()}_${idx}`,
          question: q.question || String(q),
          category: q.category || "technical",
          difficulty: q.difficulty || "medium",
          expectedAnswer: q.expectedAnswer,
          followUpQuestions: q.followUpQuestions || [],
          tags: q.tags || [],
        }));
      } else {
        const tech: string[] = data?.questions?.technical || [];
        const beh: string[] = data?.questions?.behavioral || [];
        const situ: string[] = data?.questions?.roleSpecific || [];
        const cult: string[] = data?.questions?.general || [];
        const fromCategory = (arr: string[], cat: Question["category"]) =>
          arr.map((q, i) => ({ id: `${cat}_${Date.now()}_${i}` , question: q, category: cat, difficulty: "medium" as const, tags: [] as string[] }));
        items = [
          ...fromCategory(tech, "technical"),
          ...fromCategory(beh, "behavioral"),
          ...fromCategory(situ, "situational"),
          ...fromCategory(cult, "cultural"),
        ];
      }

      const newSet: QuestionSet = {
        id: `set${Date.now()}`,
        name: `${position} Interview Questions`,
        position,
        questions: items.slice(0, questionCount),
        createdAt: new Date().toISOString(),
        aiGenerated: true,
      };

      setQuestionSets((prev) => [newSet, ...prev]);
      setSelectedSet(newSet);
    } catch (error) {
      console.error("Error generating questions:", error);
    } finally {
      setGenerating(false);
    }
  };

  const copyQuestion = (question: string) => {
    navigator.clipboard.writeText(question);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "technical":
        return "bg-blue-100 text-blue-800";
      case "behavioral":
        return "bg-green-100 text-green-800";
      case "situational":
        return "bg-orange-100 text-orange-800";
      case "cultural":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            AI Interview Questions
          </h1>
          <p className="text-gray-600 mt-1">
            Generate intelligent interview questions tailored to specific roles
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Brain className="w-4 h-4 mr-2" />
          AI Assistant
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question Generator */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Generate Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Position
              </label>
              <Input
                placeholder="e.g., Senior Frontend Developer"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Experience Level
              </label>
              <Input
                placeholder="e.g., 3-5 years"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Key Skills
              </label>
              <Input
                placeholder="e.g., React, TypeScript, Node.js"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Number of Questions
              </label>
              <Input
                type="number"
                min="5"
                max="20"
                value={questionCount}
                onChange={(e) =>
                  setQuestionCount(Number.parseInt(e.target.value) || 10)
                }
              />
            </div>

            <Button
              onClick={generateQuestions}
              disabled={generating || !position.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Questions
                </>
              )}
            </Button>

            {generating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Analyzing requirements...</span>
                  <span>75%</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Sets List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Question Sets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questionSets.map((set) => (
              <div
                key={set.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSet?.id === set.id
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => setSelectedSet(set)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 text-sm">
                    {set.name}
                  </h3>
                  {set.aiGenerated && (
                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                      <Brain className="w-3 h-3 mr-1" />
                      AI
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-2">{set.position}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {set.questions.length} questions
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(set.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}

            {questionSets.length === 0 && (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-sm">No question sets yet</p>
                <p className="text-gray-500 text-xs">
                  Generate your first set using AI
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Question Details</CardTitle>
              {selectedSet && (
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={handleSaveSet}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportSet}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedSet ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    {selectedSet.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedSet.position}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      {selectedSet.questions.length} questions
                    </Badge>
                    {selectedSet.aiGenerated && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Brain className="w-3 h-3 mr-1" />
                        AI Generated
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedSet.questions.map((question, index) => (
                    <div key={question.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-gray-500">
                          Question {index + 1}
                        </span>
                        <div className="flex space-x-1">
                          <Badge
                            className={getCategoryColor(question.category)}
                            variant="secondary"
                          >
                            {question.category}
                          </Badge>
                          <Badge
                            className={getDifficultyColor(question.difficulty)}
                            variant="secondary"
                          >
                            {question.difficulty}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-gray-900 mb-3">
                        {question.question}
                      </p>

                      {question.expectedAnswer && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            Expected Answer:
                          </p>
                          <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
                            {question.expectedAnswer}
                          </p>
                        </div>
                      )}

                      {question.followUpQuestions &&
                        question.followUpQuestions.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              Follow-up Questions:
                            </p>
                            <ul className="text-xs text-gray-700 space-y-1">
                              {question.followUpQuestions.map(
                                (followUp, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-gray-400 mr-1">
                                      •
                                    </span>
                                    {followUp}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                      <div className="flex justify-between items-center">
                        <div className="flex flex-wrap gap-1">
                          {question.tags.map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyQuestion(question.question)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Select a question set to view details
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Or generate new questions using AI
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Question Sets
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {questionSets.length}
                </p>
              </div>
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Questions
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {questionSets.reduce(
                    (acc, set) => acc + set.questions.length,
                    0
                  )}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  AI Generated
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {questionSets.filter((set) => set.aiGenerated).length}
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-orange-600">
                  {questionSets.length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
