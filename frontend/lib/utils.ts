import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SLA_HOURS } from "@/config/enums"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Hours elapsed since a ticket was created. */
export function getTicketAgeHours(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
}

/**
 * Returns true when an Open or In-Progress ticket has exceeded its
 * priority-based SLA threshold (SLA_HOURS).
 */
export function isSlaBreached(ticket: {
  status: string;
  created_at: string;
  priority: string;
}): boolean {
  if (!["Open", "In Progress"].includes(ticket.status)) return false;
  const ageHours = getTicketAgeHours(ticket.created_at);
  return ageHours > (SLA_HOURS[ticket.priority] ?? SLA_HOURS["Low"]);
}
