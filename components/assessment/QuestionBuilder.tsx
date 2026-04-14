"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Trash2, 
  Code, 
  FileText, 
  Video, 
  Hash, 
  Clock, 
  Star, 
  Lightbulb,
  TestTube,
  Settings
} from "lucide-react";

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description?: string;
  isHidden?: boolean;
}

interface Example {
  input: string;
  output: string;
  explanation?: string;
}

interface QuestionData {
  id: string;
  questionText: string;
  type: "multiple_choice" | "short_answer" | "code_snippet" | "video_response";
  options: string[];
  correctAnswer: string;
  points: number;
  difficulty: "Easy" | "Medium" | "Hard";
  timeLimit?: number;
  tags: string[];
  hint?: string;
  examples: Example[];
  testCases: TestCase[];
}

interface QuestionBuilderProps {
  question: QuestionData;
  onChange: (question: QuestionData) => void;
  onRemove?: () => void;
  questionNumber: number;
}

export function QuestionBuilder({ question, onChange, onRemove, questionNumber }: QuestionBuilderProps) {
  const [newOption, setNewOption] = useState("");
  const [newTag, setNewTag] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

  const updateQuestion = (field: keyof QuestionData, value: any) => {
    onChange({ ...question, [field]: value });
  };

  const addOption = () => {
    if (newOption.trim()) {
      updateQuestion("options", [...question.options, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (index: number) => {
    updateQuestion("options", question.options.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !question.tags.includes(newTag.trim())) {
      updateQuestion("tags", [...question.tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateQuestion("tags", question.tags.filter(tag => tag !== tagToRemove));
  };

  const addTestCase = () => {
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      input: "",
      expectedOutput: "",
      description: "",
      isHidden: false
    };
    updateQuestion("testCases", [...question.testCases, newTestCase]);
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const updatedTestCases = [...question.testCases];
    updatedTestCases[index] = { ...updatedTestCases[index], [field]: value };
    updateQuestion("testCases", updatedTestCases);
  };

  const removeTestCase = (index: number) => {
    updateQuestion("testCases", question.testCases.filter((_, i) => i !== index));
  };

  const addExample = () => {
    const newExample: Example = { input: "", output: "", explanation: "" };
    updateQuestion("examples", [...question.examples, newExample]);
  };

  const updateExample = (index: number, field: keyof Example, value: any) => {
    const updatedExamples = [...question.examples];
    updatedExamples[index] = { ...updatedExamples[index], [field]: value };
    updateQuestion("examples", updatedExamples);
  };

  const removeExample = (index: number) => {
    updateQuestion("examples", question.examples.filter((_, i) => i !== index));
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case "multiple_choice":
        return <Hash className="h-4 w-4" />;
      case "short_answer":
        return <FileText className="h-4 w-4" />;
      case "code_snippet":
        return <Code className="h-4 w-4" />;
      case "video_response":
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800 border-green-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Hard":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              Question {questionNumber}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              {getQuestionIcon(question.type)}
              <span>{question.type.replace("_", " ")}</span>
            </div>
            <Badge className={getDifficultyColor(question.difficulty)}>
              {question.difficulty}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {question.points} pts
            </Badge>
            {question.timeLimit && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {question.timeLimit} min
              </Badge>
            )}
          </div>
          {onRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="tests">Test Cases</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea
                value={question.questionText}
                onChange={(e) => updateQuestion("questionText", e.target.value)}
                placeholder="Enter your question here... You can use **bold**, *italic*, and `code` formatting"
                rows={4}
              />
              <div className="text-xs text-muted-foreground">
                Supports markdown: **bold**, *italic*, `inline code`, ```code blocks```
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={question.type} onValueChange={(value) => updateQuestion("type", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                    <SelectItem value="code_snippet">Code Challenge</SelectItem>
                    <SelectItem value="video_response">Video Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={question.difficulty} onValueChange={(value) => updateQuestion("difficulty", value as "Easy" | "Medium" | "Hard")}>
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
                  onChange={(e) => updateQuestion("points", parseInt(e.target.value) || 0)}
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time Limit (minutes)</Label>
                <Input
                  type="number"
                  value={question.timeLimit || ""}
                  onChange={(e) => updateQuestion("timeLimit", parseInt(e.target.value) || undefined)}
                  placeholder="Optional"
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label>Correct Answer (for grading)</Label>
                <Input
                  value={question.correctAnswer}
                  onChange={(e) => updateQuestion("correctAnswer", e.target.value)}
                  placeholder="For reference only"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hint (optional)</Label>
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 mt-2 text-muted-foreground" />
                <Textarea
                  value={question.hint || ""}
                  onChange={(e) => updateQuestion("hint", e.target.value)}
                  placeholder="Provide a hint for the candidate..."
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {question.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-xs hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => e.key === "Enter" && addTag()}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            {question.type === "multiple_choice" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Answer Options</Label>
                  <div className="text-sm text-muted-foreground">
                    {question.options.length} options
                  </div>
                </div>
                
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm font-medium">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...question.options];
                        newOptions[index] = e.target.value;
                        updateQuestion("options", newOptions);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="New option..."
                    onKeyPress={(e) => e.key === "Enter" && addOption()}
                  />
                  <Button type="button" variant="outline" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            {question.type !== "multiple_choice" && (
              <div className="text-center py-8 text-muted-foreground">
                Options are only available for multiple choice questions
              </div>
            )}
          </TabsContent>

          <TabsContent value="examples" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Examples</Label>
              <Button type="button" variant="outline" size="sm" onClick={addExample}>
                <Plus className="h-4 w-4 mr-1" />
                Add Example
              </Button>
            </div>

            {question.examples.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No examples added. Examples help candidates understand the expected input/output format.
              </div>
            ) : (
              question.examples.map((example, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Example {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExample(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Input</Label>
                        <Textarea
                          value={example.input}
                          onChange={(e) => updateExample(index, "input", e.target.value)}
                          placeholder="Example input..."
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Output</Label>
                        <Textarea
                          value={example.output}
                          onChange={(e) => updateExample(index, "output", e.target.value)}
                          placeholder="Example output..."
                          rows={3}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Explanation (optional)</Label>
                      <Textarea
                        value={example.explanation || ""}
                        onChange={(e) => updateExample(index, "explanation", e.target.value)}
                        placeholder="Explain why this input produces this output..."
                        rows={2}
                      />
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="tests" className="space-y-4">
            {question.type === "code_snippet" && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TestTube className="h-4 w-4" />
                    <Label>Test Cases</Label>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Test Case
                  </Button>
                </div>

                {question.testCases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    No test cases added. Test cases are used to automatically validate code submissions.
                  </div>
                ) : (
                  question.testCases.map((testCase, index) => (
                    <Card key={testCase.id} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Test Case {index + 1}</h4>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={testCase.isHidden}
                                onCheckedChange={(checked) => updateTestCase(index, "isHidden", checked)}
                              />
                              <Label className="text-sm">Hidden</Label>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTestCase(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Description (optional)</Label>
                          <Input
                            value={testCase.description || ""}
                            onChange={(e) => updateTestCase(index, "description", e.target.value)}
                            placeholder="Describe what this test case checks..."
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Input</Label>
                            <Textarea
                              value={testCase.input}
                              onChange={(e) => updateTestCase(index, "input", e.target.value)}
                              placeholder="Test input..."
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Expected Output</Label>
                            <Textarea
                              value={testCase.expectedOutput}
                              onChange={(e) => updateTestCase(index, "expectedOutput", e.target.value)}
                              placeholder="Expected output..."
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </>
            )}

            {question.type !== "code_snippet" && (
              <div className="text-center py-8 text-muted-foreground">
                Test cases are only available for code challenges
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
