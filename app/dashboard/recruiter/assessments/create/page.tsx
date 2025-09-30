"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Shield,
  Camera,
  Mic,
  Monitor,
  Eye,
  Brain,
  Clock,
  FileText,
  Settings,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
} from "lucide-react";

interface SecurityFeature {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  required?: boolean;
}

interface Question {
  id: string;
  questionText: string;
  type: "multiple_choice" | "short_answer" | "code_snippet" | "video_response";
  options: string[];
  correctAnswer: string;
  points: number;
  difficulty: "Easy" | "Medium" | "Hard";
  timeLimit?: number;
}

export default function CreateAdvancedAssessmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  // Basic Configuration
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [passingScore, setPassingScore] = useState(70);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(
    "Medium"
  );

  // Security & Proctoring Features
  const [securityFeatures, setSecurityFeatures] = useState<SecurityFeature[]>([
    {
      id: "face_recognition",
      name: "AI Face Recognition",
      description: "Verify candidate identity and detect face changes",
      icon: Camera,
      enabled: true,
      required: true,
    },
    {
      id: "multi_face_detection",
      name: "Multi-Face Detection",
      description: "Alert when multiple people are detected",
      icon: Eye,
      enabled: true,
    },
    {
      id: "audio_monitoring",
      name: "Audio Monitoring",
      description: "Detect conversations and background noise",
      icon: Mic,
      enabled: true,
    },
    {
      id: "screen_recording",
      name: "Screen Recording",
      description: "Record entire screen activity during assessment",
      icon: Monitor,
      enabled: true,
      required: true,
    },
    {
      id: "tab_switching",
      name: "Tab Switch Detection",
      description: "Monitor and flag tab switching attempts",
      icon: AlertTriangle,
      enabled: true,
    },
    {
      id: "copy_paste_prevention",
      name: "Copy-Paste Prevention",
      description: "Disable copy-paste functionality",
      icon: Shield,
      enabled: true,
    },
    {
      id: "keystroke_analysis",
      name: "Keystroke Biometrics",
      description: "Analyze typing patterns to detect impersonation",
      icon: Brain,
      enabled: false,
    },
    {
      id: "environment_scan",
      name: "360° Environment Scan",
      description: "Require candidate to show their environment",
      icon: Camera,
      enabled: false,
    },
  ]);

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);

  // Advanced Settings
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeAnswers, setRandomizeAnswers] = useState(true);
  const [allowReview, setAllowReview] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [autoSubmit, setAutoSubmit] = useState(true);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: generateId(),
      questionText: "",
      type: "multiple_choice",
      options: ["", "", "", ""],
      correctAnswer: "",
      points: 10,
      difficulty: "Medium",
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const toggleSecurityFeature = (id: string) => {
    setSecurityFeatures(
      securityFeatures.map((feature) =>
        feature.id === id ? { ...feature, enabled: !feature.enabled } : feature
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || questions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a title and at least one question.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const assessmentData = {
        title,
        description,
        durationMinutes,
        passingScore,
        difficulty,
        questions: questions.map((q) => ({
          questionId: q.id,
          questionText: q.questionText,
          type: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
          difficulty: q.difficulty,
          timeLimit: q.timeLimit,
        })),
        securityFeatures: securityFeatures
          .filter((f) => f.enabled)
          .map((f) => f.name),
        settings: {
          randomizeQuestions,
          randomizeAnswers,
          allowReview,
          showResults,
          autoSubmit,
        },
        requiresProctoring: securityFeatures.some((f) => f.enabled),
        totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
      };

      console.log("[v0] Creating assessment with data:", assessmentData);

      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assessmentData),
      });

      if (response.ok) {
        toast({
          title: "Assessment Created",
          description:
            "Your advanced assessment has been created successfully.",
        });
        router.push("/dashboard/recruiter/assessments");
      } else {
        const errorData = await response.json();
        console.error("[v0] Assessment creation error:", errorData);
        toast({
          title: "Creation Failed",
          description: errorData.message || "Failed to create assessment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[v0] Assessment creation network error:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const enabledSecurityFeatures = securityFeatures.filter((f) => f.enabled);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-3xl flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="h-8 w-8" />
              </div>
              Advanced Assessment Builder
            </CardTitle>
            <CardDescription className="text-blue-100 text-lg">
              Create enterprise-level assessments with AI proctoring and
              advanced security features
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <FileText className="h-5 w-5" />
                  <span className="font-medium">Questions</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {questions.length}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-700">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Duration</span>
                </div>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {durationMinutes}m
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Total Points</span>
                </div>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {totalPoints}
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-700">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Security</span>
                </div>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {enabledSecurityFeatures.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Setup</TabsTrigger>
            <TabsTrigger value="security">Security & Proctoring</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
          </TabsList>

          {/* Basic Setup Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Configuration</CardTitle>
                <CardDescription>
                  Set up the basic details for your assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Assessment Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Senior Full Stack Developer Assessment"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select
                      value={difficulty}
                      onValueChange={(value: any) => setDifficulty(value)}
                    >
                      <SelectTrigger>
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

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this assessment evaluates and any special instructions..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (Minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={durationMinutes}
                      onChange={(e) =>
                        setDurationMinutes(
                          Number.parseInt(e.target.value) || 90
                        )
                      }
                      min="15"
                      max="300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passingScore">Passing Score (%)</Label>
                    <Input
                      id="passingScore"
                      type="number"
                      value={passingScore}
                      onChange={(e) =>
                        setPassingScore(Number.parseInt(e.target.value) || 70)
                      }
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security & Proctoring Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  AI Proctoring & Security Features
                </CardTitle>
                <CardDescription>
                  Configure advanced security measures to ensure assessment
                  integrity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {securityFeatures.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          feature.enabled
                            ? "border-blue-200 bg-blue-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                feature.enabled
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-400 text-white"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{feature.name}</h4>
                                {feature.required && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={feature.enabled}
                            onCheckedChange={() =>
                              !feature.required &&
                              toggleSecurityFeature(feature.id)
                            }
                            disabled={feature.required}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">
                        Security Notice
                      </h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Enabled security features will be clearly communicated
                        to candidates before they start the assessment. All
                        monitoring is conducted in compliance with privacy
                        regulations.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Assessment Questions</CardTitle>
                    <CardDescription>
                      Create and manage your assessment questions
                    </CardDescription>
                  </div>
                  <Button
                    onClick={addQuestion}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No questions yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Add your first question to get started
                    </p>
                    <Button onClick={addQuestion}>Add Question</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <Card
                        key={question.id}
                        className="border-l-4 border-l-blue-500"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Q{index + 1}</Badge>
                              <Badge variant="secondary">
                                {question.type.replace("_", " ")}
                              </Badge>
                              <Badge variant="outline">
                                {question.difficulty}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {question.points} pts
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQuestion(question.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Question Text</Label>
                            <Textarea
                              value={question.questionText}
                              onChange={(e) =>
                                updateQuestion(
                                  question.id,
                                  "questionText",
                                  e.target.value
                                )
                              }
                              placeholder="Enter your question here..."
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Question Type</Label>
                              <Select
                                value={question.type}
                                onValueChange={(value) =>
                                  updateQuestion(question.id, "type", value)
                                }
                              >
                                <SelectTrigger>
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
                                    Code Challenge
                                  </SelectItem>
                                  <SelectItem value="video_response">
                                    Video Response
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Difficulty</Label>
                              <Select
                                value={question.difficulty}
                                onValueChange={(value) =>
                                  updateQuestion(
                                    question.id,
                                    "difficulty",
                                    value
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Easy">Easy</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="Hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Points</Label>
                              <Input
                                type="number"
                                value={question.points}
                                onChange={(e) =>
                                  updateQuestion(
                                    question.id,
                                    "points",
                                    Number.parseInt(e.target.value) || 10
                                  )
                                }
                                min="1"
                                max="100"
                              />
                            </div>
                          </div>

                          {question.type === "multiple_choice" && (
                            <div className="space-y-3">
                              <Label>Answer Options</Label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {question.options.map((option, optionIndex) => (
                                  <Input
                                    key={optionIndex}
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...question.options];
                                      newOptions[optionIndex] = e.target.value;
                                      updateQuestion(
                                        question.id,
                                        "options",
                                        newOptions
                                      );
                                    }}
                                    placeholder={`Option ${optionIndex + 1}`}
                                  />
                                ))}
                              </div>
                              <div className="space-y-2">
                                <Label>Correct Answer</Label>
                                <Select
                                  value={question.correctAnswer}
                                  onValueChange={(value) =>
                                    updateQuestion(
                                      question.id,
                                      "correctAnswer",
                                      value
                                    )
                                  }
                                >
                                  <SelectTrigger>
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
                              <Label>
                                Expected Answer (for scoring reference)
                              </Label>
                              <Textarea
                                value={question.correctAnswer}
                                onChange={(e) =>
                                  updateQuestion(
                                    question.id,
                                    "correctAnswer",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter expected answer or keywords..."
                                rows={question.type === "code_snippet" ? 6 : 3}
                                className={
                                  question.type === "code_snippet"
                                    ? "font-mono"
                                    : ""
                                }
                              />
                            </div>
                          )}

                          {question.type === "video_response" && (
                            <div className="space-y-2">
                              <Label>Video Response Guidelines</Label>
                              <Textarea
                                value={question.correctAnswer}
                                onChange={(e) =>
                                  updateQuestion(
                                    question.id,
                                    "correctAnswer",
                                    e.target.value
                                  )
                                }
                                placeholder="Provide guidelines for what the candidate should cover in their video response..."
                                rows={3}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Advanced Assessment Settings
                </CardTitle>
                <CardDescription>
                  Configure advanced behavior and candidate experience options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Question Behavior</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Randomize Question Order</Label>
                          <p className="text-sm text-muted-foreground">
                            Present questions in random order
                          </p>
                        </div>
                        <Switch
                          checked={randomizeQuestions}
                          onCheckedChange={setRandomizeQuestions}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Randomize Answer Options</Label>
                          <p className="text-sm text-muted-foreground">
                            Shuffle multiple choice options
                          </p>
                        </div>
                        <Switch
                          checked={randomizeAnswers}
                          onCheckedChange={setRandomizeAnswers}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Allow Question Review</Label>
                          <p className="text-sm text-muted-foreground">
                            Let candidates review answers before submit
                          </p>
                        </div>
                        <Switch
                          checked={allowReview}
                          onCheckedChange={setAllowReview}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Results & Submission</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Show Results to Candidate</Label>
                          <p className="text-sm text-muted-foreground">
                            Display score after completion
                          </p>
                        </div>
                        <Switch
                          checked={showResults}
                          onCheckedChange={setShowResults}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Auto-Submit on Time Limit</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically submit when time expires
                          </p>
                        </div>
                        <Switch
                          checked={autoSubmit}
                          onCheckedChange={setAutoSubmit}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Button */}
        <Card>
          <CardContent className="p-6">
            <Button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-6"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              <Sparkles className="mr-2 h-5 w-5" />
              Create Advanced Assessment
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Assessment will be created with {enabledSecurityFeatures.length}{" "}
              security features enabled
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
