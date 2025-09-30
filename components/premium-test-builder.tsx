"use client";

import type React from "react";
import { useState, useRef, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Trash2,
  Eye,
  Save,
  Clock,
  FileText,
  Code,
  CheckCircle,
  Edit3,
  Sparkles,
  Target,
  Zap,
  Brain,
  GripVertical,
  Copy,
  Settings,
} from "lucide-react";

interface Question {
  id: string;
  questionText: string;
  type: "multiple_choice" | "short_answer" | "code_snippet";
  options: string[];
  correctAnswer: string;
  points: number;
}

interface TestTemplate {
  id: string;
  name: string;
  description: string;
  questions: Omit<Question, "id">[];
  durationMinutes: number;
  category: string;
}

const TEST_TEMPLATES: TestTemplate[] = [
  {
    id: "frontend-dev",
    name: "Frontend Developer",
    description: "Comprehensive assessment for React/JavaScript developers",
    category: "Development",
    durationMinutes: 90,
    questions: [
      {
        questionText: "What is the purpose of React hooks?",
        type: "multiple_choice",
        options: [
          "State management",
          "Component lifecycle",
          "Side effects",
          "All of the above",
        ],
        correctAnswer: "All of the above",
        points: 10,
      },
      {
        questionText:
          "Explain the difference between let, const, and var in JavaScript.",
        type: "short_answer",
        correctAnswer:
          "let and const are block-scoped, var is function-scoped. const cannot be reassigned.",
        points: 15,
      },
    ],
  },
  {
    id: "backend-dev",
    name: "Backend Developer",
    description: "Server-side development and API design assessment",
    category: "Development",
    durationMinutes: 120,
    questions: [
      {
        questionText:
          "Write a function to implement a basic REST API endpoint.",
        type: "code_snippet",
        correctAnswer:
          "app.get('/api/users', (req, res) => { res.json(users); });",
        points: 20,
      },
    ],
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    description: "Statistical analysis and data interpretation skills",
    category: "Analytics",
    durationMinutes: 75,
    questions: [
      {
        questionText:
          "What is the difference between correlation and causation?",
        type: "short_answer",
        correctAnswer:
          "Correlation shows relationship, causation shows cause-effect relationship.",
        points: 15,
      },
    ],
  },
];

const QUESTION_TYPES = [
  {
    type: "multiple_choice" as const,
    name: "Multiple Choice",
    icon: CheckCircle,
    description: "Single or multiple correct answers",
    color: "bg-blue-500",
  },
  {
    type: "short_answer" as const,
    name: "Short Answer",
    icon: Edit3,
    description: "Text-based responses",
    color: "bg-green-500",
  },
  {
    type: "code_snippet" as const,
    name: "Code Challenge",
    icon: Code,
    description: "Programming problems",
    color: "bg-purple-500",
  },
];

interface PremiumTestBuilderProps {
  onSubmit: (testData: any) => Promise<void>;
  loading: boolean;
}

export default function PremiumTestBuilder({
  onSubmit,
  loading,
}: PremiumTestBuilderProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("builder");

  // Test metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [category, setCategory] = useState("");

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionType, setSelectedQuestionType] =
    useState<Question["type"]>("multiple_choice");

  // Drag and drop
  const [draggedQuestion, setDraggedQuestion] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addQuestion = useCallback(
    (type: Question["type"] = selectedQuestionType) => {
      const newQuestion: Question = {
        id: generateId(),
        questionText: "",
        type,
        options: type === "multiple_choice" ? ["", "", "", ""] : [],
        correctAnswer: "",
        points: 10,
      };
      setQuestions((prev) => [...prev, newQuestion]);
    },
    [selectedQuestionType]
  );

  const removeQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const updateQuestion = useCallback(
    (id: string, field: keyof Question, value: any) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
      );
    },
    []
  );

  const duplicateQuestion = useCallback(
    (id: string) => {
      const question = questions.find((q) => q.id === id);
      if (question) {
        const duplicated = { ...question, id: generateId() };
        setQuestions((prev) => [...prev, duplicated]);
      }
    },
    [questions]
  );

  const loadTemplate = useCallback(
    (template: TestTemplate) => {
      setTitle(template.name + " Assessment");
      setDescription(template.description);
      setDurationMinutes(template.durationMinutes);
      setCategory(template.category);

      const templateQuestions: Question[] = template.questions.map((q) => ({
        ...q,
        id: generateId(),
      }));
      setQuestions(templateQuestions);
      setActiveTab("builder");

      toast({
        title: "Template Loaded",
        description: `${template.name} template loaded with ${template.questions.length} questions.`,
      });
    },
    [toast]
  );

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

    const testData = {
      title,
      description,
      durationMinutes,
      questions: questions.map(({ id, ...q }) => q),
    };

    await onSubmit(testData);
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Premium Test Builder</h1>
                <p className="text-white/90 text-lg">
                  Create sophisticated assessments with advanced features
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  <span className="font-medium">Questions</span>
                </div>
                <p className="text-2xl font-bold mt-1">{questions.length}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Duration</span>
                </div>
                <p className="text-2xl font-bold mt-1">{durationMinutes}m</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <span className="font-medium">Total Points</span>
                </div>
                <p className="text-2xl font-bold mt-1">{totalPoints}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  <span className="font-medium">Difficulty</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {totalPoints < 50
                    ? "Easy"
                    : totalPoints < 100
                    ? "Medium"
                    : "Hard"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card className="test-builder-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Quick Start Templates
                </CardTitle>
                <CardDescription>
                  Choose from professionally designed templates to get started
                  quickly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TEST_TEMPLATES.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {template.name}
                            </CardTitle>
                            <Badge variant="secondary" className="mt-1">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                          <span>{template.questions.length} questions</span>
                          <span>{template.durationMinutes} minutes</span>
                        </div>
                        <Button
                          onClick={() => loadTemplate(template)}
                          className="w-full premium-gradient"
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Test Configuration */}
              <Card className="test-builder-card">
                <CardHeader>
                  <CardTitle>Test Configuration</CardTitle>
                  <CardDescription>
                    Set up the basic details for your assessment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Test Title *</Label>
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
                      <Label htmlFor="duration">Duration (Minutes) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={durationMinutes}
                        onChange={(e) =>
                          setDurationMinutes(
                            Number.parseInt(e.target.value) || 60
                          )
                        }
                        min="5"
                        max="300"
                        className="premium-input"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what this test evaluates and any special instructions..."
                      rows={3}
                      className="premium-input"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Question Builder */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Question Types Palette */}
                <Card className="test-builder-card lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-lg">Question Types</CardTitle>
                    <CardDescription>
                      Drag or click to add questions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {QUESTION_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <div
                          key={type.type}
                          className={`question-palette-item ${
                            selectedQuestionType === type.type ? "active" : ""
                          }`}
                          onClick={() => {
                            setSelectedQuestionType(type.type);
                            addQuestion(type.type);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${type.color} text-white`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{type.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {type.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Questions List */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">
                      Questions ({questions.length})
                    </h3>
                    <Button
                      type="button"
                      onClick={() => addQuestion()}
                      className="premium-gradient"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Question
                    </Button>
                  </div>

                  {questions.length === 0 ? (
                    <Card className="drag-drop-area">
                      <CardContent className="text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          No questions yet
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Click on a question type from the palette or use a
                          template to get started
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((question, index) => (
                        <Card key={question.id} className="test-builder-card">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                  <Badge variant="outline">Q{index + 1}</Badge>
                                </div>
                                <Badge variant="secondary">
                                  {
                                    QUESTION_TYPES.find(
                                      (t) => t.type === question.type
                                    )?.name
                                  }
                                </Badge>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Zap className="h-3 w-3" />
                                  {question.points} pts
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => duplicateQuestion(question.id)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeQuestion(question.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="md:col-span-3 space-y-2">
                                <Label>Question Text *</Label>
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
                                  className="premium-input"
                                  required
                                />
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
                                  className="premium-input"
                                />
                              </div>
                            </div>

                            {question.type === "multiple_choice" && (
                              <div className="space-y-3">
                                <Label>Answer Options</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {question.options.map(
                                    (option, optionIndex) => (
                                      <Input
                                        key={optionIndex}
                                        value={option}
                                        onChange={(e) => {
                                          const newOptions = [
                                            ...question.options,
                                          ];
                                          newOptions[optionIndex] =
                                            e.target.value;
                                          updateQuestion(
                                            question.id,
                                            "options",
                                            newOptions
                                          );
                                        }}
                                        placeholder={`Option ${
                                          optionIndex + 1
                                        }`}
                                        className="premium-input"
                                      />
                                    )
                                  )}
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
                                    <SelectTrigger className="premium-input">
                                      <SelectValue placeholder="Select correct answer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {question.options.map(
                                        (option, idx) =>
                                          option && (
                                            <SelectItem
                                              key={idx}
                                              value={option}
                                            >
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
                                  rows={
                                    question.type === "code_snippet" ? 6 : 3
                                  }
                                  className="premium-input font-mono"
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Card className="test-builder-card">
                <CardContent className="pt-6">
                  <Button
                    type="submit"
                    className="w-full premium-gradient text-lg py-6"
                    disabled={loading}
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    )}
                    <Save className="mr-2 h-5 w-5" />
                    Create Premium Test
                  </Button>
                </CardContent>
              </Card>
            </form>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card className="test-builder-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Test Preview
                </CardTitle>
                <CardDescription>
                  See how your test will appear to candidates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {title ? (
                  <div className="space-y-6">
                    <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                      <h2 className="text-2xl font-bold mb-2">{title}</h2>
                      {description && (
                        <p className="text-muted-foreground mb-4">
                          {description}
                        </p>
                      )}
                      <div className="flex items-center justify-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{durationMinutes} minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{questions.length} questions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <span>{totalPoints} points</span>
                        </div>
                      </div>
                    </div>

                    {questions.map((question, index) => (
                      <Card
                        key={question.id}
                        className="border-l-4 border-l-primary"
                      >
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Question {index + 1} ({question.points} points)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="mb-4 whitespace-pre-wrap">
                            {question.questionText}
                          </p>

                          {question.type === "multiple_choice" && (
                            <div className="space-y-2">
                              {question.options.map(
                                (option, idx) =>
                                  option && (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2"
                                    >
                                      <div className="w-4 h-4 border border-border rounded-full" />
                                      <span>{option}</span>
                                    </div>
                                  )
                              )}
                            </div>
                          )}

                          {question.type === "short_answer" && (
                            <div className="border border-border rounded-lg p-4 bg-muted/50">
                              <p className="text-sm text-muted-foreground">
                                Answer area
                              </p>
                            </div>
                          )}

                          {question.type === "code_snippet" && (
                            <div className="border border-border rounded-lg p-4 bg-black text-green-400 font-mono text-sm">
                              <p className="text-muted-foreground">
                                Code editor area
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Configure your test in the Builder tab to see the preview
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
