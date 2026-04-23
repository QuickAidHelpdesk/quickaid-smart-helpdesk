export interface User {
  user_id: string;
  display_name: string;
  email: string;
  role: "student" | "staff" | "admin" | "agent";
  team_id?: string | null;
  created_at: string;
  updated_at: string;
}
