export const VALID_CATEGORIES = [
  "IT Support",
  "Facilities",
  "Academic Services",
  "Library",
  "Finance",
  "General Inquiry",
] as const;

export const VALID_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

export const VALID_STATUSES = [
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
] as const;

// SLA response-time thresholds in hours per priority level.
// Applied only to tickets with status Open or In Progress.
export const SLA_HOURS: Record<string, number> = {
  Critical: 4,
  High: 24,
  Medium: 72,
  Low: 168,
};
