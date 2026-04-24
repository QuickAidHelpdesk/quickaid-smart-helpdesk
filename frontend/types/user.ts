export interface User {
  user_id: string;
  display_name: string;
  email: string;
  role: "user" | "agent" | "admin";
  created_at: string;
  updated_at: string;
}
