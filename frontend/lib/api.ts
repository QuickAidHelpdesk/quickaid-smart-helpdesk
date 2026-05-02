const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7071/api";

const STORAGE_KEY = "quickaid_user";

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user?.email) {
          headers["X-User-Email"] = user.email;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  return headers;
}

async function parseError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => null);
  const message =
    body?.error || body?.message || `API error: ${res.status}`;
  const err = new Error(message) as Error & { status?: number };
  err.status = res.status;
  return err;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

// Ticket Assignment (FR-10-02)
import { TicketDetails } from "../types/ticket";

export async function assignTicket(ticketId: string, agentEmail: string) {
  return apiPatch<{ success: boolean; ticket: TicketDetails }>(
    `/manage/tickets/${ticketId}/assign`,
    { assigned_to: agentEmail }
  );
}

// Teams Management
import { Team, TeamUser, CreateTeamData, UpdateTeamData } from "../types/team";

export async function getTeams() {
  return apiGet<{ teams: Team[] }>("/manage/teams");
}

export async function createTeam(data: CreateTeamData) {
  return apiPost<{ success: boolean; team: Team }>("/manage/teams", data);
}

export async function updateTeam(teamId: string, data: UpdateTeamData) {
  return apiPatch<{ success: boolean; team: Team }>(`/manage/teams/${teamId}`, data);
}

export async function deleteTeam(teamId: string) {
  return apiDelete<{ success: boolean; message: string }>(`/manage/teams/${teamId}`);
}

export async function getTeamUsers(teamId: string) {
  return apiGet<{ users: TeamUser[] }>(`/manage/teams/${teamId}/users`);
}

export async function addUserToTeam(teamId: string, userId: string) {
  return apiPost<{ success: boolean }>(`/manage/teams/${teamId}/users/${userId}`, {});
}

export async function removeUserFromTeam(teamId: string, userId: string) {
  return apiDelete<{ success: boolean }>(`/manage/teams/${teamId}/users/${userId}`);
}

// Notifications
import type { Notification } from "../types/notification";

export async function getNotifications(unreadOnly = false) {
  return apiGet<{ notifications: Notification[] }>(
    `/notifications${unreadOnly ? "?unread_only=true" : ""}`
  );
}

export async function markNotificationRead(notificationId: string) {
  return apiPatch<{ success: boolean }>(`/notifications/${notificationId}/read`, {});
}

export async function markAllNotificationsRead() {
  return apiPost<{ success: boolean; updated: number }>("/notifications/mark-all-read", {});
}
