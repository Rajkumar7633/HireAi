"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Code, FileText, Video, Hash, Clock, Star } from "lucide-react";

interface Question {
  _id: string;
  questionText: string;
  type: "multiple_choice" | "short_answer" | "code_snippet" | "video_response";
  options?: string[];
  points: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  timeLimit?: number;
  tags?: string[];
  hint?: string;
  examples?: Array<{ input: string; output: string; explanation?: string }>;
}

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  showMetadata?: boolean;
}

const getDifficultyColor = (difficulty?: string) => {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return "bg-green-100 text-green-800 border-green-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "hard":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getTypeIcon = (type: string) => {
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

const getTypeLabel = (type: string) => {
  switch (type) {
    case "multiple_choice":
      return "Multiple Choice";
    case "short_answer":
      return "Short Answer";
    case "code_snippet":
      return "Coding Problem";
    case "video_response":
      return "Video Response";
    default:
      return "Question";
  }
};

export function QuestionDisplay({ 
  question, 
  questionNumber, 
  totalQuestions, 
  showMetadata = true 
}: QuestionDisplayProps) {
  // Ensure question has all required properties with defaults
  const safeQuestion = {
    ...question,
    difficulty: question.difficulty || "Medium",
    tags: question.tags || [],
    hint: question.hint || "",
    examples: question.examples || [],
    testCases: question.testCases || []
  };

  const formatQuestionText = (text: string) => {
    // Convert markdown-like formatting to HTML
    let formatted = text;
    
    // Bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic text
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code blocks
    formatted = formatted.replace(/```(.*?)```/gs, '<pre class="bg-gray-100 p-3 rounded-md overflow-x-auto"><code>$1</code></pre>');
    
    // Inline code
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');
    
    // Line breaks
    formatted = formatted.replace(/\n\n/g, '</p><p class="mt-4">');
    formatted = formatted.replace(/\n/g, '<br />');
    
    return formatted;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                Question {questionNumber} of {totalQuestions}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {getTypeIcon(safeQuestion.type)}
                <span>{getTypeLabel(safeQuestion.type)}</span>
              </div>
              <Badge className={getDifficultyColor(safeQuestion.difficulty)}>
                {safeQuestion.difficulty}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {safeQuestion.points} points
              </Badge>
              {safeQuestion.timeLimit && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {safeQuestion.timeLimit} min
                </Badge>
              )}
            </div>
            
            {showMetadata && safeQuestion.tags && safeQuestion.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {safeQuestion.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Question Text */}
        <div className="prose prose-sm max-w-none">
          <div 
            className="text-base leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: `<p class="text-base">${formatQuestionText(safeQuestion.questionText)}</p>` 
            }} 
          />
        </div>

        {/* Examples (for coding questions) */}
        {safeQuestion.examples && safeQuestion.examples.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Examples
            </h4>
            <div className="space-y-3">
              {safeQuestion.examples.map((example, index) => (
                <div key={index} className="bg-gray-50 border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Input:</label>
                      <pre className="mt-1 p-2 bg-white border rounded text-sm font-mono">
                        {example.input}
                      </pre>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Output:</label>
                      <pre className="mt-1 p-2 bg-white border rounded text-sm font-mono">
                        {example.output}
                      </pre>
                    </div>
                  </div>
                  {example.explanation && (
                    <div className="mt-3 pt-3 border-t">
                      <label className="text-sm font-medium">Explanation:</label>
                      <p className="mt-1 text-sm text-gray-600">{example.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hint */}
        {safeQuestion.hint && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 mt-0.5">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-800">Hint</h4>
                <p className="mt-1 text-sm text-blue-700">{safeQuestion.hint}</p>
              </div>
            </div>
          </div>
        )}

        {/* Multiple Choice Options Preview (if applicable) */}
        {safeQuestion.type === "multiple_choice" &&
          safeQuestion.options && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Options
            </h4>
            <div className="space-y-2">
              {safeQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm font-medium">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-sm">{option}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Response Info (if applicable) */}
        {safeQuestion.type === "video_response" && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Video className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-purple-800">Video Response Required</h4>
                <p className="mt-1 text-sm text-purple-700">
                  Please record a video response (maximum 3 minutes) answering this question. 
                  Make sure your camera and microphone are working properly.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
