import { User } from "@/types/user";
import { TeamUser } from "@/types/team";
import { Loader2, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

interface AgentListsCardProps {
  teamUsers: TeamUser[];
  allAgents: User[];
  loading: boolean;
  onAddUser: (userId: string) => void;
  onRemoveUser: (userId: string) => void;
}

export function AgentListsCard({
  teamUsers,
  allAgents,
  loading,
  onAddUser,
  onRemoveUser,
}: AgentListsCardProps) {
  const [membersSearchInput, setMembersSearchInput] = useState("");
  const [membersSearchQuery, setMembersSearchQuery] = useState("");
  const [agentsSearchInput, setAgentsSearchInput] = useState("");
  const [agentsSearchQuery, setAgentsSearchQuery] = useState("");

  const handleMembersSearch = () => {
    setMembersSearchQuery(membersSearchInput);
  };

  const handleAgentsSearch = () => {
    setAgentsSearchQuery(agentsSearchInput);
  };

  const availableAgents = allAgents.filter(
    (s) => !teamUsers.some((tu) => tu.user_id === s.user_id),
  );

  const filteredTeamUsers = teamUsers.filter(
    (u) =>
      u.display_name.toLowerCase().includes(membersSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(membersSearchQuery.toLowerCase()),
  );

  const filteredAvailableAgents = availableAgents.filter(
    (s) =>
      s.display_name.toLowerCase().includes(agentsSearchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(agentsSearchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Team Members */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Current Members</CardTitle>
            <CardDescription>Users currently within this team.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search members..."
                  className="pl-8"
                  value={membersSearchInput}
                  onChange={(e) => setMembersSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleMembersSearch()}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleMembersSearch} className="w-full sm:w-auto">
                  Search
                </Button>
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="pl-4">Agent</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeamUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {membersSearchQuery
                          ? "No matching members found."
                          : "No members in this team."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeamUsers.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium pl-4 py-3">
                          {u.display_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.email}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveUser(u.user_id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Available Agents */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Available Agents</CardTitle>
            <CardDescription>
              Agents and admins that can be added.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search available agents..."
                  className="pl-8"
                  value={agentsSearchInput}
                  onChange={(e) => setAgentsSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAgentsSearch()}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleAgentsSearch} className="w-full sm:w-auto">
                  Search
                </Button>
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="pl-4">Agent</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAvailableAgents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {agentsSearchQuery
                          ? "No matching agents found."
                          : "No more agents available to add."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAvailableAgents.map((s) => (
                      <TableRow key={s.user_id}>
                        <TableCell className="font-medium pl-4 py-3">
                          {s.display_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {s.email}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onAddUser(s.user_id)}
                          >
                            <Plus className="w-4 h-4" />
                            <span className="sr-only">Add</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
