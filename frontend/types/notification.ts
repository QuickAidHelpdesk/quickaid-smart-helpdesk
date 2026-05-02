export type NotificationType =
  | "ticket_created"
  | "ticket_updated"
  | "ticket_assigned"
  | "ticket_assigned_to_me"
  | "status_changed"
  | "ticket_resolved"
  | "ticket_deleted"
  | "ticket_reopened"
  | "ticket_escalated"
  | "new_ticket"
  | "new_user_registered";

export interface Notification {
  notification_id: string;
  recipient_email: string;
  type: NotificationType;
  title: string;
  message: string;
  ticket_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  ticket_created: "Ticket Submitted",
  ticket_updated: "Ticket Updated",
  ticket_assigned: "Ticket Assigned",
  ticket_assigned_to_me: "Assigned to You",
  status_changed: "Status Changed",
  ticket_resolved: "Ticket Resolved",
  ticket_deleted: "Ticket Cancelled",
  ticket_reopened: "Ticket Re-opened",
  ticket_escalated: "Priority Escalated",
  new_ticket: "New Ticket",
  new_user_registered: "New User",
};
