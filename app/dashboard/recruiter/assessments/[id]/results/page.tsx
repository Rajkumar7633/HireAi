"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface Row {
  _id: string;
  jobSeekerId: { _id: string; name: string; email: string };
  jobDescriptionId?: { _id: string; title: string };
  status: string;
  score?: number;
  completedAt?: string;
  timeSpent?: number;
  candidateReview?: { rating: number; comment?: string; submittedAt: string } | null;
}

export default function AssessmentResultsTablePage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRows();
  }, [assessmentId]);

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/assessments/${assessmentId}/applications`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || "Failed to load applications");
      setRows(data.applications || []);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assessment Submissions</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchRows}>Refresh</Button>
          <Button
            onClick={async () => {
              const resp = await fetch(`/api/assessments/${assessmentId}/applications/export`);
              if (!resp.ok) return;
              const blob = await resp.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `assessment_${assessmentId}_submissions.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading submissions...
            </div>
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No applications found for this assessment yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Candidate</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Job</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Completed</th>
                    <th className="py-2 pr-4">Review</th>
                    <th className="py-2 pr-4">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r._id} className="border-b hover:bg-muted/40">
                      <td className="py-2 pr-4">{r.jobSeekerId?.name || "-"}</td>
                      <td className="py-2 pr-4">{r.jobSeekerId?.email || "-"}</td>
                      <td className="py-2 pr-4">{r.jobDescriptionId?.title || "-"}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={r.status === "Assessment Completed" ? "default" : "secondary"}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">{typeof r.score === "number" ? `${r.score}%` : "-"}</td>
                      <td className="py-2 pr-4">{r.completedAt ? new Date(r.completedAt).toLocaleString() : "-"}</td>
                      <td className="py-2 pr-4">
                        {r.candidateReview ? (
                          <div className="text-xs">
                            <div>⭐ {r.candidateReview.rating}/5</div>
                            {r.candidateReview.comment ? (
                              <div className="text-muted-foreground truncate max-w-xs" title={r.candidateReview.comment}>
                                {r.candidateReview.comment}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <Link className="text-blue-600 underline" href={`/dashboard/recruiter/assessments/${assessmentId}/applications/${r._id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
