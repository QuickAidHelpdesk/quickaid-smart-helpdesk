"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { apiGet } from "@/lib/api";
import { UserListCard } from "@/components/user-list-card";
import { User } from "@/types/user";

import { ProtectedRoute } from "@/components/protected-route";

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      let endpoint = "/manage/users";
      const queryParams = new URLSearchParams();

      if (searchQuery.trim() !== "")
        queryParams.append("q", searchQuery.trim());
      if (roleFilter !== "all") queryParams.append("role", roleFilter);

      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }

      const res = await apiGet<{ users: User[] }>(endpoint);
      setUsers(res.users || []);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      if (
        err?.message?.includes("404") ||
        err?.message?.includes("not found")
      ) {
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, user]);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-2">
            Manage all users in the helpdesk system.
          </p>
        </div>

        <UserListCard
          title="All Users"
          description="A list of all users."
          users={users}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          onSearch={fetchUsers}
        />
      </div>
    </ProtectedRoute>
  );
}
