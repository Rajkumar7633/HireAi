"use client";

import { CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Users,
  RefreshCw,
  Clock,
  DollarSign,
  Target,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,  
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  LabelList,
} from "recharts";

interface AnalyticsData {
  totalJobDescriptions: number;
  totalApplications: number;
  applicationsByStatus: { _id: string; count: number }[];
  topSkills: { _id: string; count: number }[];
  averageMatchScore: number;
}

interface AdvancedMetrics {
  hiringFunnel: {
    applied: number;
    screened: number;
    interviewed: number;
    offered: number;
    hired: number;
  };
  sourcePerformance: Array<{
    source: string;
    applications: number;
    hires: number;
    conversionRate: number;
  }>;
  timeToHire: {
    average: number;
    byPosition: Array<{
      position: string;
      days: number;
    }>;
  };
  costPerHire: {
    total: number;
    breakdown: {
      jobBoards: number;
      recruiting: number;
      interviews: number;
      onboarding: number;
    };
  };
  monthlyTrends: Array<{
    month: string;
    applications: number;
    hires: number;
    interviews: number;
  }>;
  candidateQuality: {
    averageScore: number;
    scoreDistribution: Array<{
      range: string;
      count: number;
    }>;
  };
}

const COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

export default function RecruiterAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [advancedMetrics, setAdvancedMetrics] =
    useState<AdvancedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("6months");
  const [normalizeFunnel, setNormalizeFunnel] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
    fetchAdvancedMetrics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/recruiter-dashboard", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
        setError(null);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to fetch analytics data" }));
        setError(
          errorData.message ||
            `HTTP ${response.status}: Failed to fetch analytics data`
        );
      }
    } catch (error) {
      console.error("Network error fetching analytics:", error);
      setError("Network error. Please check if the backend server is running.");
    }
  };

  const fetchAdvancedMetrics = async () => {
    try {
      const response = await fetch(
        `/api/analytics/advanced-metrics?timeRange=${timeRange}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAdvancedMetrics(data);
      }
    } catch (error) {
      console.error("Error fetching advanced metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Normalize funnel to avoid increasing values downstream
  const rawFunnel = advancedMetrics
    ? [
        { name: "Applied", value: advancedMetrics.hiringFunnel.applied, fill: COLORS[0] },
        { name: "Screened", value: advancedMetrics.hiringFunnel.screened, fill: COLORS[1] },
        { name: "Interviewed", value: advancedMetrics.hiringFunnel.interviewed, fill: COLORS[2] },
        { name: "Offered", value: advancedMetrics.hiringFunnel.offered, fill: COLORS[3] },
        { name: "Hired", value: advancedMetrics.hiringFunnel.hired, fill: COLORS[4] },
      ]
    : [];
  const normalized = rawFunnel.reduce((acc: any[], stage) => {
    const prev = acc.length ? acc[acc.length - 1].value : stage.value;
    acc.push({ ...stage, value: Math.min(stage.value, prev) });
    return acc;
  }, [] as any[]);
  const funnelData = normalizeFunnel ? normalized : rawFunnel;

  // Simple targets for each step (percent of previous stage)
  const TARGETS: Record<string, number> = {
    Screened: 80,
    Interviewed: 60,
    Offered: 30,
    Hired: 20,
  };

  const downloadFunnelCsv = () => {
    const rows = [
      ["Stage", "Raw", "Normalized", "% from Prev", "% from Applied"],
      ...rawFunnel.map((stage, idx) => {
        const prevRaw = idx > 0 ? rawFunnel[idx - 1].value : stage.value;
        const fromPrev = prevRaw > 0 ? (stage.value / prevRaw) * 100 : 0;
        const applied = rawFunnel[0]?.value || 0;
        const fromApplied = applied > 0 ? (stage.value / applied) * 100 : 0;
        const normVal = funnelData[idx]?.value ?? stage.value;
        return [
          stage.name,
          String(stage.value),
          String(normVal),
          fromPrev.toFixed(1),
          fromApplied.toFixed(1),
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hiring_funnel_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const costBreakdownData = advancedMetrics
    ? [
        {
          name: "Job Boards",
          value: advancedMetrics.costPerHire.breakdown.jobBoards,
          fill: COLORS[0],
        },
        {
          name: "Recruiting",
          value: advancedMetrics.costPerHire.breakdown.recruiting,
          fill: COLORS[1],
        },
        {
          name: "Interviews",
          value: advancedMetrics.costPerHire.breakdown.interviews,
          fill: COLORS[2],
        },
        {
          name: "Onboarding",
          value: advancedMetrics.costPerHire.breakdown.onboarding,
          fill: COLORS[3],
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mx-auto mb-2" />
          <p className="text-lg">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Advanced Analytics</h1>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Normalize Funnel</span>
            <Switch checked={normalizeFunnel} onCheckedChange={setNormalizeFunnel} />
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              fetchAnalytics();
              fetchAdvancedMetrics();
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={downloadFunnelCsv} size="sm">
            Download CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Hiring Funnel</TabsTrigger>
          <TabsTrigger value="sources">Source Performance</TabsTrigger>
          <TabsTrigger value="timing">Time & Cost</TabsTrigger>
          <TabsTrigger value="quality">Candidate Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Applications
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData?.totalApplications || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Time to Hire
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {advancedMetrics?.timeToHire.average || 0} days
                </div>
                <p className="text-xs text-muted-foreground">
                  -3 days from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cost per Hire
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${advancedMetrics?.costPerHire.total || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  -8% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Conversion Rate
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {advancedMetrics
                    ? (
                        (advancedMetrics.hiringFunnel.applied > 0
                          ? (advancedMetrics.hiringFunnel.hired /
                              advancedMetrics.hiringFunnel.applied) * 100
                          : 0)
                      ).toFixed(1)
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">
                  +2.1% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>
                  Applications, interviews, and hires over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {advancedMetrics?.monthlyTrends ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={advancedMetrics.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="applications"
                        stroke={COLORS[0]}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="interviews"
                        stroke={COLORS[1]}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="hires"
                        stroke={COLORS[2]}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No trend data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Applications by Status</CardTitle>
                <CardDescription>
                  Current distribution of application statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData?.applicationsByStatus.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.applicationsByStatus.map(
                          (item, index) => ({
                            name: item._id,
                            value: item.count,
                            fill: COLORS[index % COLORS.length],
                          })
                        )}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                      >
                        <LabelList dataKey="name" position="outside" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No application data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Hiring Funnel Analysis</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">Toggle “Normalize Funnel” to enforce a decreasing funnel (each stage cannot exceed the previous). Turn off to see raw counts.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription>
                Track candidate progression through your hiring process
              </CardDescription>
            </CardHeader>
            <CardContent>
              {advancedMetrics?.hiringFunnel ? (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={funnelData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-5 gap-4">
                    {funnelData.map((stage, index) => (
                      <div key={stage.name} className="text-center">
                        <div
                          className="text-2xl font-bold"
                          style={{ color: stage.fill }}
                        >
                          {stage.value}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {stage.name}
                        </div>
                        {index > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {(
                              funnelData[index - 1].value > 0
                                ? (stage.value / funnelData[index - 1].value) * 100
                                : 0
                            ).toFixed(1)}
                            % conversion
                          </div>
                        )}
                        {index > 0 && TARGETS[stage.name] !== undefined && (
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Target: {TARGETS[stage.name]}% of previous
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Status mapping used: applied → screened("screening") → interviewed("interview") → offered("offered") → hired("hired").
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No funnel data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Source Performance Analysis</CardTitle>
              <CardDescription>
                Compare effectiveness of different recruitment sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {advancedMetrics?.sourcePerformance ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={advancedMetrics.sourcePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="applications"
                      fill={COLORS[0]}
                      name="Applications"
                    />
                    <Bar dataKey="hires" fill={COLORS[1]} name="Hires" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No source performance data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Time to Hire by Position</CardTitle>
                <CardDescription>
                  Average days to complete hiring process
                </CardDescription>
              </CardHeader>
              <CardContent>
                {advancedMetrics?.timeToHire.byPosition ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={advancedMetrics.timeToHire.byPosition}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="position" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="days" fill={COLORS[2]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No time-to-hire data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost per Hire Breakdown</CardTitle>
                <CardDescription>
                  Distribution of hiring costs by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {advancedMetrics?.costPerHire ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={costBreakdownData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                      >
                        {costBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `$${value}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No cost breakdown data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Quality Distribution</CardTitle>
              <CardDescription>
                Distribution of candidate scores across different ranges
              </CardDescription>
            </CardHeader>
            <CardContent>
              {advancedMetrics?.candidateQuality ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-600">
                      {advancedMetrics.candidateQuality.averageScore}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Average Candidate Score
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={advancedMetrics.candidateQuality.scoreDistribution}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS[4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No candidate quality data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
