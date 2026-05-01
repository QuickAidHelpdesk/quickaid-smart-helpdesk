export interface TicketComment {
  comment_id: string;
  ticket_id: string;
  entry_type: "comment" | "resolution" | "escalation" | "reopen";
  topic: string;
  description: string;
  location?: string | null;
  author_email: string;
  author_role: "user" | "agent" | "admin" | "system";
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
  last_escalated_at?: string | null;
  escalation_count?: number;
  reopened_at?: string | null;
  reopened_by?: string | null;
  reopen_count?: number;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
}

export interface AdminNote {
  note_id: string;
  ticket_id: string;
  author_id: string;
  author_email: string;
  author_display_name: string;
  content: string;
  created_at: string;
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
