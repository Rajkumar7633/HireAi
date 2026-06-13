"use client";

import { useSession } from "@/hooks/use-session";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Briefcase,
  FileText,
  BarChart3,
  TrendingUp,
} from "lucide-react";

const STAT_ICONS = [Users, Briefcase, FileText, BarChart3];

interface StatCard {
  label: string;
  value: string;
  change: string;
}

export default function DashboardPage() {
  const { user, loading } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "recruiter") {
        router.replace("/dashboard/recruiter");
      } else if (user.role === "job_seeker") {
        router.replace("/dashboard/job-seeker");
      } else if (user.role === "admin") {
        router.replace("/dashboard/admin");
      } else if (user.role === "college" || user.role === "college_admin") {
        router.replace("/dashboard/college");
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/dashboard/stats")
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data) => setStats(data.stats || []))
      .catch(() => setStats([]))
      .finally(() => setStatsLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user.name}!</h1>
        <p className="text-muted-foreground">
          Redirecting to your dashboard…
        </p>
      </div>

      {statsLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading live stats…</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = STAT_ICONS[i] || TrendingUp;
            return (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
