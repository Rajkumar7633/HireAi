"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  PlusCircle,
  Edit,
  Trash2,
  Clock,
  FileText,
  Code2,
  Eye,
  BarChart3,
  ListOrdered,
  Layers,
  Zap,
  Users,
} from "lucide-react";
import { format } from "date-fns";

interface Test {
  _id: string;
  title: string;
  description?: string;
  questions: any[];
  durationMinutes: number;
  createdAt: string;
}

export default function RecruiterTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/tests/my-tests");
      if (response.ok) {
        const data = await response.json();
        setTests(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch tests.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Network error. Failed to fetch tests.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!window.confirm("Delete this test? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/tests/${testId}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Deleted", description: "Test deleted successfully." });
        fetchTests();
      } else {
        const errorData = await response.json();
        toast({ title: "Error", description: errorData.message || "Failed to delete.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    }
  };

  // Stats
  const codingTests = tests.filter(t =>
    t.questions.length > 0 && t.questions.every((q: any) => q.type === "code_snippet")
  );
  const mixedTests = tests.filter(t =>
    t.questions.some((q: any) => q.type === "code_snippet") && !codingTests.includes(t)
  );
  const mcqTests = tests.filter(t =>
    t.questions.length > 0 && !t.questions.some((q: any) => q.type === "code_snippet")
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-muted-foreground">Loading tests…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Tests</h1>
          <p className="text-muted-foreground mt-1">Create and manage coding challenges and MCQ assessments</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link href="/dashboard/recruiter/tests/create">
              <ListOrdered className="mr-2 h-4 w-4" />
              MCQ / Mixed Test
            </Link>
          </Button>
          <Button asChild className="bg-purple-600 hover:bg-purple-700">
            <Link href="/dashboard/recruiter/tests/create/coding">
              <Code2 className="mr-2 h-4 w-4" />
              Coding Challenge
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Stats row ── */}
      {tests.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Layers className="h-5 w-5 text-purple-500" />} label="Total Tests" value={tests.length} color="purple" />
          <StatCard icon={<Code2 className="h-5 w-5 text-blue-500" />} label="Coding Challenges" value={codingTests.length} color="blue" />
          <StatCard icon={<ListOrdered className="h-5 w-5 text-green-500" />} label="MCQ Tests" value={mcqTests.length} color="green" />
          <StatCard icon={<Zap className="h-5 w-5 text-orange-500" />} label="Mixed Tests" value={mixedTests.length} color="orange" />
        </div>
      )}

      {/* ── Empty state ── */}
      {tests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-4">
              <Code2 className="h-10 w-10 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tests yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create a coding challenge or MCQ test to evaluate candidates automatically with Judge0 scoring.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" asChild>
                <Link href="/dashboard/recruiter/tests/create">
                  <PlusCircle className="mr-2 h-4 w-4" /> MCQ / Mixed Test
                </Link>
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700" asChild>
                <Link href="/dashboard/recruiter/tests/create/coding">
                  <Code2 className="mr-2 h-4 w-4" /> Coding Challenge
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tests.map((test) => (
            <TestCard key={test._id} test={test} onDelete={handleDeleteTest} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: "purple" | "blue" | "green" | "orange"
}) {
  const bg: Record<string, string> = {
    purple: "bg-purple-50 border-purple-100",
    blue: "bg-blue-50 border-blue-100",
    green: "bg-green-50 border-green-100",
    orange: "bg-orange-50 border-orange-100",
  }
  return (
    <Card className={`${bg[color]} border`}>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0">{icon}</div>
          <div>
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Test card ─────────────────────────────────────────────────────────────────

function TestCard({ test, onDelete }: { test: Test; onDelete: (id: string) => void }) {
  const isCodingChallenge = test.questions.length > 0 && test.questions.every((q: any) => q.type === "code_snippet")
  const hasCoding = test.questions.some((q: any) => q.type === "code_snippet")
  const codingCount = test.questions.filter((q: any) => q.type === "code_snippet").length
  const mcqCount = test.questions.filter((q: any) => q.type === "multiple_choice" || q.type === "multiple-choice").length
  const totalPoints = test.questions.reduce((s: number, q: any) => s + (q.points || 1), 0)

  return (
    <Card className={`flex flex-col hover:shadow-md transition-shadow ${isCodingChallenge ? "border-purple-200" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isCodingChallenge
                ? <Code2 className="h-4 w-4 text-purple-500 shrink-0" />
                : <FileText className="h-4 w-4 text-blue-500 shrink-0" />
              }
              <CardTitle className="text-base leading-tight truncate">{test.title}</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Created {format(new Date(test.createdAt), "MMM d, yyyy")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {test.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{test.description}</p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs gap-1">
            <FileText className="h-3 w-3" />{test.questions.length} questions
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="h-3 w-3" />{test.durationMinutes} min
          </Badge>
          <Badge variant="outline" className="text-xs">{totalPoints} pts</Badge>
          {isCodingChallenge && (
            <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-200 gap-1">
              <Code2 className="h-3 w-3" /> Coding Challenge
            </Badge>
          )}
          {!isCodingChallenge && hasCoding && (
            <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-200 gap-1">
              <Zap className="h-3 w-3" /> Mixed
            </Badge>
          )}
        </div>

        {/* Question breakdown */}
        {(codingCount > 0 || mcqCount > 0) && !isCodingChallenge && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            {codingCount > 0 && <span className="flex items-center gap-1"><Code2 className="h-3 w-3 text-purple-400" />{codingCount} coding</span>}
            {mcqCount > 0 && <span className="flex items-center gap-1"><ListOrdered className="h-3 w-3" />{mcqCount} MCQ</span>}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <div className="flex gap-1.5 flex-wrap">
            <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1" asChild>
              <Link href={`/dashboard/recruiter/tests/${test._id}/assign`}>
                <Users className="h-3 w-3" /> Assign
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50" asChild>
              <Link href={`/dashboard/recruiter/tests/${test._id}/analytics`}>
                <BarChart3 className="h-3 w-3" /> Analytics
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <Link href={`/dashboard/recruiter/tests/${test._id}/preview`}>
                <Eye className="h-3 w-3 mr-1" /> Preview
              </Link>
            </Button>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <Link href={`/dashboard/recruiter/tests/${test._id}/edit`}>
                <Edit className="h-3 w-3 mr-1" /> Edit
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onDelete(test._id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
