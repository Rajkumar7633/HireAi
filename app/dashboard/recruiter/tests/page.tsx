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
        setTests(data);
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch tests.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching tests:", error);
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
    if (
      !window.confirm(
        "Are you sure you want to delete this test? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Test Deleted",
          description: "The test has been successfully deleted.",
        });
        fetchTests(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast({
          title: "Deletion Failed",
          description:
            errorData.message || "An error occurred while deleting the test.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Delete test error:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading tests...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Tests</h1>
        <Button asChild>
          <Link href="/dashboard/recruiter/tests/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Test
          </Link>
        </Button>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You haven't created any tests yet. Create your first test to
            evaluate candidates!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <Card key={test._id}>
              <CardHeader>
                <CardTitle>{test.title}</CardTitle>
                <CardDescription>
                  Created: {format(new Date(test.createdAt), "MMM dd, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {test.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {test.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    {test.questions.length} Questions
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {test.durationMinutes} min
                  </Badge>
                </div>
                <div className="flex justify-between gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/dashboard/recruiter/tests/${test._id}/preview`}
                    >
                      Preview
                    </Link>
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/dashboard/recruiter/tests/${test._id}/edit`}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTest(test._id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
