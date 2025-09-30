"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Save,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Question {
  questionText: string;
  type: "multiple_choice" | "short_answer" | "code_snippet";
  options: string[];
  correctAnswer: string;
  points?: number;
}

interface Test {
  _id: string;
  title: string;
  description?: string;
  questions: Question[];
  durationMinutes: number;
  createdAt: string;
}

export default function TestEditPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [questions, setQuestions] = useState<Question[]>([
    {
      questionText: "",
      type: "multiple_choice",
      options: ["", "", "", ""],
      correctAnswer: "",
    },
  ]);

  useEffect(() => {
    if (params.id) {
      fetchTest();
    }
  }, [params.id]);

  const fetchTest = async () => {
    try {
      const response = await fetch(`/api/tests/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTest(data);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setDurationMinutes(data.durationMinutes || 60);
        setQuestions(
          data.questions?.length > 0
            ? data.questions.map((q: any) => ({
                questionText: q.questionText || "",
                type: q.type || "multiple_choice",
                options: q.options || ["", "", "", ""],
                correctAnswer: q.correctAnswer || "",
              }))
            : [
                {
                  questionText: "",
                  type: "multiple_choice",
                  options: ["", "", "", ""],
                  correctAnswer: "",
                },
              ]
        );
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch test details.",
          variant: "destructive",
        });
        router.push("/dashboard/recruiter/tests");
      }
    } catch (error) {
      console.error("Error fetching test:", error);
      toast({
        title: "Error",
        description: "Network error. Failed to fetch test.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: "",
        type: "multiple_choice",
        options: ["", "", "", ""],
        correctAnswer: "",
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(updatedQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !durationMinutes || questions.some((q) => !q.questionText)) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const testData = {
        title,
        description,
        durationMinutes,
        questions: questions.filter((q) => q.questionText.trim() !== ""),
      };

      const response = await fetch(`/api/tests/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      });

      if (response.ok) {
        toast({
          title: "Test Updated",
          description: "Your test has been successfully updated.",
        });
        router.push("/dashboard/recruiter/tests");
      } else {
        const errorData = await response.json();
        toast({
          title: "Update Failed",
          description: errorData.message || "Failed to update test.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating test:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="premium-edit-container">
        <div className="flex items-center justify-center h-screen">
          <div className="premium-edit-card p-8">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-lg font-medium text-slate-700">
                Loading test details...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="premium-edit-container">
        <div className="p-6 max-w-4xl mx-auto">
          <Card className="premium-edit-card">
            <CardContent className="py-12 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <Edit3 className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700">
                  Test Not Found
                </h3>
                <p className="text-slate-500">
                  The test you're looking for doesn't exist or has been removed.
                </p>
                <Button
                  onClick={() => router.push("/dashboard/recruiter/tests")}
                  className="premium-button-primary"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Tests
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-edit-container">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="premium-edit-card">
          <div className="premium-edit-header p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="text-white hover:bg-white/20 border border-white/30"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Edit Test</h1>
                  <p className="text-cyan-100 text-sm">
                    Update your assessment details and questions
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white border-white/30"
                >
                  {questions.length} Question{questions.length !== 1 ? "s" : ""}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white border-white/30"
                >
                  {durationMinutes} min
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="premium-form-section">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Test Configuration
                </h2>
                <p className="text-slate-600 text-sm">
                  Set up the basic details for your assessment
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="premium-label">
                  Test Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Senior Frontend Developer Assessment"
                  className="premium-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="premium-label">
                  Duration (Minutes) *
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(Number.parseInt(e.target.value) || 60)
                  }
                  min="5"
                  max="180"
                  className="premium-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="premium-label">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a brief description of what this test evaluates and any special instructions..."
                rows={3}
                className="premium-input"
              />
            </div>
          </div>

          <div className="premium-form-section">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Questions
                  </h2>
                  <p className="text-slate-600 text-sm">
                    Create and manage your test questions
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={addQuestion}
                className="premium-button-secondary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>

            <div className="space-y-6">
              {questions.map((question, questionIndex) => (
                <div key={questionIndex} className="premium-question-card p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">
                            {questionIndex + 1}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">
                          Question {questionIndex + 1}
                        </h3>
                      </div>
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeQuestion(questionIndex)}
                          className="hover:bg-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2 space-y-2">
                        <Label className="premium-label">Question Text *</Label>
                        <Textarea
                          value={question.questionText}
                          onChange={(e) =>
                            updateQuestion(
                              questionIndex,
                              "questionText",
                              e.target.value
                            )
                          }
                          placeholder="Enter your question here..."
                          className="premium-input"
                          rows={3}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="premium-label">Question Type</Label>
                        <Select
                          value={question.type}
                          onValueChange={(value) =>
                            updateQuestion(questionIndex, "type", value)
                          }
                        >
                          <SelectTrigger className="premium-input">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple_choice">
                              Multiple Choice
                            </SelectItem>
                            <SelectItem value="short_answer">
                              Short Answer
                            </SelectItem>
                            <SelectItem value="code_snippet">
                              Code Snippet
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {question.type === "multiple_choice" && (
                      <div className="space-y-4">
                        <Label className="premium-label">Answer Options</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {question.options.map((option, optionIndex) => (
                            <Input
                              key={optionIndex}
                              value={option}
                              onChange={(e) =>
                                updateOption(
                                  questionIndex,
                                  optionIndex,
                                  e.target.value
                                )
                              }
                              placeholder={`Option ${optionIndex + 1}`}
                              className="premium-input"
                            />
                          ))}
                        </div>
                        <div className="space-y-2">
                          <Label className="premium-label">
                            Correct Answer
                          </Label>
                          <Select
                            value={question.correctAnswer}
                            onValueChange={(value) =>
                              updateQuestion(
                                questionIndex,
                                "correctAnswer",
                                value
                              )
                            }
                          >
                            <SelectTrigger className="premium-input">
                              <SelectValue placeholder="Select correct answer" />
                            </SelectTrigger>
                            <SelectContent>
                              {question.options.map(
                                (option, idx) =>
                                  option && (
                                    <SelectItem key={idx} value={option}>
                                      {option}
                                    </SelectItem>
                                  )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {(question.type === "short_answer" ||
                      question.type === "code_snippet") && (
                      <div className="space-y-2">
                        <Label className="premium-label">
                          {question.type === "code_snippet"
                            ? "Expected Code Solution"
                            : "Sample Answer"}
                        </Label>
                        <Textarea
                          value={question.correctAnswer}
                          onChange={(e) =>
                            updateQuestion(
                              questionIndex,
                              "correctAnswer",
                              e.target.value
                            )
                          }
                          placeholder={
                            question.type === "code_snippet"
                              ? "Enter expected code solution..."
                              : "Enter expected answer or keywords..."
                          }
                          rows={question.type === "code_snippet" ? 6 : 3}
                          className="premium-input font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-form-section">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-slate-600">
                  <span className="font-medium">{questions.length}</span>{" "}
                  question{questions.length !== 1 ? "s" : ""} •
                  <span className="font-medium ml-1">{durationMinutes}</span>{" "}
                  minutes
                </div>
              </div>
              <Button
                type="submit"
                className="premium-button-primary px-8 py-3"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Test...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Test
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
