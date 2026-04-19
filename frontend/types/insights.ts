export interface InsightsTotals {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  avg_resolution_hours: number | null;
}

export interface InsightsCount {
  key: string;
  count: number;
}

export interface DailySubmission {
  date: string;
  count: number;
}

export interface InsightsResponse {
  window_days: number;
  totals: InsightsTotals;
  by_status: InsightsCount[];
  by_category: InsightsCount[];
  by_priority: InsightsCount[];
  daily_submissions: DailySubmission[];
  portal_url?: string;
}
