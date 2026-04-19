"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { ExternalLinkIcon } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { ErrorState } from "@/components/error-state";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { apiGet } from "@/lib/api";
import type { InsightsResponse } from "@/types/insights";

const STATUS_COLORS: Record<string, string> = {
  Open: "var(--chart-1)",
  "In Progress": "var(--chart-2)",
  Resolved: "var(--chart-3)",
  Closed: "var(--chart-4)",
  Unknown: "var(--chart-5)",
};

const statusConfig: ChartConfig = {
  count: { label: "Tickets" },
};

const dailyConfig: ChartConfig = {
  count: { label: "Submissions", color: "var(--chart-1)" },
};

const categoryConfig: ChartConfig = {
  count: { label: "Tickets", color: "var(--chart-2)" },
};

const priorityConfig: ChartConfig = {
  count: { label: "Tickets", color: "var(--chart-4)" },
};

function formatDateTick(value: string): string {
  const d = new Date(value);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function AdminInsightsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <InsightsContent />
    </ProtectedRoute>
  );
}

function InsightsContent() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiGet<InsightsResponse>("/manage/insights?days=30");
        if (active) setData(res);
      } catch (err) {
        if (active) {
          const message =
            err instanceof Error ? err.message : "Failed to load insights.";
          setError(message);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState title="Unable to load insights" message={error} />
      </div>
    );
  }

  if (!data) return null;

  const { totals, by_status, by_category, by_priority, daily_submissions, portal_url } = data;

  const statusChartData = by_status.map((row) => ({
    ...row,
    fill: STATUS_COLORS[row.key] ?? "var(--chart-5)",
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insights & Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Ticket activity for the last {data.window_days} days. Raw telemetry —
            request rates, error rates, dependency failures — lives in Application
            Insights.
          </p>
        </div>
        {portal_url ? (
          <Button asChild variant="outline">
            <a href={portal_url} target="_blank" rel="noreferrer">
              Open in Azure Portal
              <ExternalLinkIcon className="ml-2 h-4 w-4" />
            </a>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total tickets" value={totals.total} />
        <KpiCard label="Open" value={totals.open} />
        <KpiCard label="Resolved" value={totals.resolved} />
        <KpiCard
          label="Avg resolution"
          value={
            totals.avg_resolution_hours != null
              ? `${totals.avg_resolution_hours} h`
              : "—"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily submissions</CardTitle>
            <CardDescription>
              Tickets created per day over the selected window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={dailyConfig} className="h-[280px] w-full">
              <LineChart data={daily_submissions} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatDateTick}
                  minTickGap={20}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status distribution</CardTitle>
            <CardDescription>Share of tickets by current status.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusConfig} className="h-[280px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
                <Pie
                  data={statusChartData}
                  dataKey="count"
                  nameKey="key"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {statusChartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tickets by category</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryConfig} className="h-[280px] w-full">
              <BarChart data={by_category} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="key" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets by priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={priorityConfig} className="h-[280px] w-full">
              <BarChart data={by_priority} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="key" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
