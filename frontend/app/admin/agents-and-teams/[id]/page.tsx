"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  getTeamUsers,
  addUserToTeam,
  removeUserFromTeam,
  apiGet,
} from "@/lib/api";
import { TeamUser } from "@/types/team";
import { User } from "@/types/user";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AgentListsCard } from "@/components/agent-lists-card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function ManageTeamUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const teamId = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();

  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [allAgents, setallAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [teamRes, agentsRes, adminsRes] = await Promise.all([
        getTeamUsers(teamId),
        apiGet<{ users: User[] }>("/manage/users?role=agent"),
        apiGet<{ users: User[] }>("/manage/users?role=admin"),
      ]);
      setTeamUsers(teamRes.users);
      setallAgents([...(agentsRes.users || []), ...(adminsRes.users || [])]);
    } catch (err: any) {
      toast.error("Failed to load users data");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddUser = async (userId: string) => {
    try {
      await addUserToTeam(teamId, userId);
      toast.success("User added to team");
      const res = await getTeamUsers(teamId);
      setTeamUsers(res.users);
    } catch (err: any) {
      toast.error(err.message || "Failed to add user");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      await removeUserFromTeam(teamId, userId);
      toast.success("User removed from team");
      setTeamUsers(teamUsers.filter((u) => u.user_id !== userId));
    } catch (err: any) {
      toast.error(err.message || "Failed to remove user");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href="/admin/agents-and-teams"
                    className="flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Teams
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{teamId}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Manage Team Members
            </h1>
            <p className="text-muted-foreground mt-2">
              Add or remove agents and admins from this support team.
            </p>
          </div>
        </div>

        <AgentListsCard
          teamUsers={teamUsers}
          allAgents={allAgents}
          loading={loading}
          onAddUser={handleAddUser}
          onRemoveUser={handleRemoveUser}
        />
      </div>
    </ProtectedRoute>
  );
}
