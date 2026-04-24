export interface Team {
  id: string;
  team_id: string;
  name: string;
  category: string;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TeamUser {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
}

export interface CreateTeamData {
  name: string;
  category: string;
}

export interface UpdateTeamData {
  name?: string;
  category?: string;
}
