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
  proctoringData?: {
    score?: number;
    tabSwitchCount?: number;
    screenShareStops?: number;
    securityViolations?: any[];
  };
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

  const getIntegrityBadge = (score?: number) => {
    if (score === undefined) return <span className="text-muted-foreground">—</span>;
    if (score >= 80) {
      return (
        <Badge className="bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 font-medium">
          Secure ({score}%)
        </Badge>
      );
    }
    if (score >= 60) {
      return (
        <Badge className="bg-amber-950/40 text-amber-400 border border-amber-800/30 font-medium">
          Warning ({score}%)
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-950/40 text-red-400 border border-red-800/30 animate-pulse font-medium">
        High Risk ({score}%)
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessment Submissions</h1>
          <p className="text-sm text-muted-foreground">Review candidate solutions and proctoring analytics</p>
        </div>
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

      <Card className="border-gray-800 bg-gray-900 text-white shadow-xl">
        <CardHeader>
          <CardTitle>Submissions ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground font-medium">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-purple-500" /> Loading submissions...
            </div>
          ) : error ? (
            <div className="text-red-500 text-sm py-4">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No applications found for this assessment yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-gray-800 text-gray-400">
                    <th className="py-3 px-4 font-semibold">Candidate</th>
                    <th className="py-3 px-4 font-semibold">Job Description</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Score</th>
                    <th className="py-3 px-4 font-semibold">Proctoring Score</th>
                    <th className="py-3 px-4 font-semibold">Violations</th>
                    <th className="py-3 px-4 font-semibold">Completed</th>
                    <th className="py-3 px-4 font-semibold text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {rows.map((r) => {
                    const totalViolations = (r.proctoringData?.securityViolations?.length || 0) +
                      (r.proctoringData?.tabSwitchCount || 0) +
                      (r.proctoringData?.screenShareStops || 0);

                    return (
                      <tr key={r._id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-semibold text-gray-200">{r.jobSeekerId?.name || "-"}</p>
                            <p className="text-xs text-muted-foreground">{r.jobSeekerId?.email || "-"}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-300">{r.jobDescriptionId?.title || "-"}</td>
                        <td className="py-3.5 px-4">
                          <Badge variant={r.status === "Assessment Completed" ? "default" : "secondary"}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-green-400">
                          {typeof r.score === "number" ? `${r.score}%` : "-"}
                        </td>
                        <td className="py-3.5 px-4">
                          {getIntegrityBadge(r.proctoringData?.score)}
                        </td>
                        <td className="py-3.5 px-4">
                          {totalViolations > 0 ? (
                            <Badge className="bg-red-950/30 text-red-500 border border-red-900/30 font-medium">
                              {totalViolations} Alert(s)
                            </Badge>
                          ) : (
                            <span className="text-emerald-500 font-medium text-xs">Clear</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-400">
                          {r.completedAt ? new Date(r.completedAt).toLocaleString() : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Button variant="outline" size="sm" asChild className="border-gray-700 bg-gray-900 text-purple-400 hover:bg-gray-850 hover:text-purple-300">
                            <Link href={`/dashboard/recruiter/assessments/${assessmentId}/applications/${r._id}`}>
                              View Audit
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
