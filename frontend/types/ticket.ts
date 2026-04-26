export interface TicketComment {
  comment_id: string;
  ticket_id: string;
  entry_type: "comment" | "resolution";
  topic: string;
  description: string;
  location?: string | null;
  author_email: string;
  author_role: "user" | "agent" | "admin";
  author_display_name: string;
  created_at: string;
  resolved_in_seconds?: number | null;
}

export interface TicketDetails {
  ticket_id: string;
  email: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}
