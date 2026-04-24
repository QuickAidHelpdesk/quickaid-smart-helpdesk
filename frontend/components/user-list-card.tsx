import { format } from "date-fns";
import { Search, Loader2, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { User } from "@/types/user";
import { VALID_ROLES } from "@/config/enums";

export interface TeamSummary {
  name: string;
  category: string;
}

interface UserListCardProps {
  title: string;
  description: string;
  users: User[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  roleFilter: string;
  setRoleFilter: (val: string) => void;
  onSearch: () => void;
  actionButton?: React.ReactNode;
  onRoleChange?: (userId: string, newRole: User["role"]) => void | Promise<void>;
  onTeamChange?: (
    userId: string,
    newTeamId: string | null,
  ) => void | Promise<void>;
  updatingUserIds?: Set<string>;
  teamById?: Map<string, TeamSummary>;
}

export function UserListCard({
  title,
  description,
  users,
  loading,
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  onSearch,
  actionButton,
  onRoleChange,
  onTeamChange,
  updatingUserIds,
  teamById,
}: UserListCardProps) {
  const teamOptions = teamById
    ? Array.from(teamById.entries())
        .map(([team_id, t]) => ({ team_id, ...t }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const roleColorClass: Record<string, string> = {
    admin:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
    agent:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
    staff:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    student:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  };

  const getRoleColorClass = (role: string) =>
    roleColorClass[role.toLowerCase()] ?? "";

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
        <div className="flex flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {actionButton && <div className="w-full sm:w-auto">{actionButton}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Name or Email..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button onClick={onSearch} className="w-full sm:w-auto">
              Search
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-left pl-4">User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Date Joined</TableHead>
                <TableHead className="text-right pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const team =
                    user.role === "agent" && user.team_id
                      ? teamById?.get(user.team_id)
                      : undefined;
                  return (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium pl-4 py-3">
                      {user.display_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {onRoleChange ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={user.role}
                            disabled={updatingUserIds?.has(user.user_id)}
                            onValueChange={(val) =>
                              onRoleChange(
                                user.user_id,
                                val as User["role"],
                              )
                            }
                          >
                            <SelectTrigger
                              className={`w-32 capitalize font-medium ${getRoleColorClass(user.role)}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              <SelectGroup>
                                {VALID_ROLES.map((r) => (
                                  <SelectItem
                                    key={r}
                                    value={r}
                                    className={`capitalize font-medium my-0.5 ${getRoleColorClass(r)}`}
                                  >
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          {updatingUserIds?.has(user.user_id) && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`capitalize ${getRoleColorClass(user.role as string)}`}
                        >
                          {user.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.role === "agent" ? (
                        onTeamChange ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={user.team_id || "none"}
                              disabled={updatingUserIds?.has(user.user_id)}
                              onValueChange={(val) =>
                                onTeamChange(
                                  user.user_id,
                                  val === "none" ? null : val,
                                )
                              }
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select team">
                                  {team ? (
                                    <div className="flex flex-col leading-tight text-left">
                                      <span className="font-medium">
                                        {team.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {team.category}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="italic text-muted-foreground">
                                      Unassigned
                                    </span>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent position="popper">
                                <SelectGroup>
                                  <SelectItem value="none">
                                    <span className="italic text-muted-foreground">
                                      Unassigned
                                    </span>
                                  </SelectItem>
                                  {teamOptions.map((t) => (
                                    <SelectItem
                                      key={t.team_id}
                                      value={t.team_id}
                                    >
                                      <div className="flex flex-col leading-tight">
                                        <span className="font-medium">
                                          {t.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {t.category}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            {updatingUserIds?.has(user.user_id) && (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        ) : team ? (
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium">{team.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {team.category}
                            </span>
                          </div>
                        ) : (
                          <span className="italic text-muted-foreground text-sm">
                            Unassigned
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(
                        new Date(user.created_at || new Date()),
                        "MMM d, yyyy",
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/users/${user.user_id}`}>
                          View <ArrowRightIcon className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
