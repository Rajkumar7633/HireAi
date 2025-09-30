"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowLeft,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

interface Question {
  questionText: string;
  type: "multiple-choice" | "true-false" | "short-answer";
  options?: string[];
  correctAnswer: string;
  points: number;
}

interface Test {
  _id: string;
  title: string;
  description?: string;
  questions: Question[];
  durationMinutes: number;
  createdAt: string;
}

export default function TestPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading test preview...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Test not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Test Preview</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">{test.title}</CardTitle>
          <CardDescription>
            Created: {format(new Date(test.createdAt), "MMM dd, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {test.description && (
            <p className="text-muted-foreground">{test.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {test.questions.length} Questions
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {test.durationMinutes} minutes
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {test.questions.map((question, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">
                Question {index + 1}
                <Badge variant="outline" className="ml-2">
                  {question.points} points
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-medium">{question.questionText}</p>

              {question.type === "multiple-choice" && question.options && (
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`p-3 rounded-lg border ${
                        option === question.correctAnswer
                          ? "bg-green-50 border-green-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {option === question.correctAnswer ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span>{option}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {question.type === "true-false" && (
                <div className="space-y-2">
                  {["True", "False"].map((option) => (
                    <div
                      key={option}
                      className={`p-3 rounded-lg border ${
                        option === question.correctAnswer
                          ? "bg-green-50 border-green-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {option === question.correctAnswer ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span>{option}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {question.type === "short-answer" && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">
                    Expected Answer: {question.correctAnswer}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
