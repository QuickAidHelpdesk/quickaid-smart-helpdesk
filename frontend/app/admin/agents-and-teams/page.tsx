"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamUsers,
  addUserToTeam,
  removeUserFromTeam,
  apiGet,
} from "@/lib/api";
import { Team, TeamUser } from "@/types/team";
import { User } from "@/types/user";
import { TeamListCard } from "@/components/team-list-card";
import { ErrorState } from "@/components/error-state";
import { Spinner } from "@/components/ui/spinner";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";

const CATEGORIES = [
  "IT Support",
  "Facilities",
  "Academic Services",
  "Library",
  "Finance",
  "General Inquiry",
];

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    category: "General Inquiry",
  });
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [allAgents, setallAgents] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTeams();
      setTeams(res.teams);
    } catch (err: any) {
      console.error("Failed to fetch teams:", err);
      setError(err.message || "Failed to load teams.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      // Fetch all agent and admins to be able to add them to teams
      const res = await apiGet<{ users: User[] }>("/manage/users?role=agent");
      const resAdmin = await apiGet<{ users: User[] }>(
        "/manage/users?role=admin",
      );
      setallAgents([...(res.users || []), ...(resAdmin.users || [])]);
    } catch (err) {
      console.error("Failed to fetch agent:", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchTeams();
      fetchAgents();
    }
  }, [user, fetchTeams, fetchAgents]);

  const handleCreateTeam = async () => {
    try {
      setSubmitting(true);
      await createTeam(formData);
      toast.success("Team created successfully");
      setIsCreateDialogOpen(false);
      setFormData({ name: "", category: "General Inquiry" });
      fetchTeams();
    } catch (err: any) {
      toast.error(err.message || "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!selectedTeam) return;
    try {
      setSubmitting(true);
      await updateTeam(selectedTeam.team_id, formData);
      toast.success("Team updated successfully");
      setIsEditDialogOpen(false);
      fetchTeams();
    } catch (err: any) {
      toast.error(err.message || "Failed to update team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    try {
      setSubmitting(true);
      await deleteTeam(team.team_id);
      toast.success("Team deleted successfully");
      fetchTeams();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManageUsers = async (team: Team) => {
    setSelectedTeam(team);
    setIsManageUsersOpen(true);
    setLoadingUsers(true);
    try {
      const res = await getTeamUsers(team.team_id);
      setTeamUsers(res.users);
    } catch (err: any) {
      toast.error("Failed to load team users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async (userId: string) => {
    if (!selectedTeam) return;
    try {
      await addUserToTeam(selectedTeam.team_id, userId);
      toast.success("User added to team");
      // Refresh team users
      const res = await getTeamUsers(selectedTeam.team_id);
      setTeamUsers(res.users);
    } catch (err: any) {
      toast.error(err.message || "Failed to add user");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedTeam) return;
    try {
      await removeUserFromTeam(selectedTeam.team_id, userId);
      toast.success("User removed from team");
      setTeamUsers(teamUsers.filter((u) => u.user_id !== userId));
    } catch (err: any) {
      toast.error(err.message || "Failed to remove user");
    }
  };

  if (loading && teams.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex flex-col gap-6 p-6">
        <>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Agents & Teams
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage support agent teams and their specialized categories.
            </p>
          </div>

          <TeamListCard
            teams={teams}
            loading={loading}
            onRefresh={fetchTeams}
            onCreateTeam={() => {
              setFormData({ name: "", category: "General Inquiry" });
              setIsCreateDialogOpen(true);
            }}
            onEditTeam={(team) => {
              setSelectedTeam(team);
              setFormData({ name: team.name, category: team.category });
              setIsEditDialogOpen(true);
            }}
            onDeleteTeam={handleDeleteTeam}
            onManageUsers={() => {}}
          />
        </>

        {/* Create Team Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Add a new support team to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="create-name">Team Name</FieldLabel>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter team name..."
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="create-category">Category</FieldLabel>
                  <Select
                    value={formData.category}
                    onValueChange={(val) =>
                      setFormData({ ...formData, category: val })
                    }
                  >
                    <SelectTrigger id="create-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectGroup>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTeam} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Team Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Team</DialogTitle>
              <DialogDescription>
                Update the details for this support team.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="edit-name">Team Name</FieldLabel>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-category">Category</FieldLabel>
                  <Select
                    value={formData.category}
                    onValueChange={(val) =>
                      setFormData({ ...formData, category: val })
                    }
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectGroup>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateTeam} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
