import { format } from "date-fns";
import { Search, Loader2, Plus, Users, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Team } from "@/types/team";
import { useState } from "react";

interface TeamListCardProps {
  teams: Team[];
  loading: boolean;
  onRefresh: () => void;
  onCreateTeam: () => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (team: Team) => void;
  onManageUsers: (team: Team) => void;
}

export function TeamListCard({
  teams,
  loading,
  onRefresh,
  onCreateTeam,
  onEditTeam,
  onDeleteTeam,
  onManageUsers,
}: TeamListCardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Agents & Teams</CardTitle>
          <CardDescription>Manage support teams and their members.</CardDescription>
        </div>
        <Button onClick={onCreateTeam} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> New Team
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Team Name or Category..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-left pl-4">Team Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredTeams.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No teams found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeams.map((team) => (
                  <TableRow key={team.team_id}>
                    <TableCell className="font-medium pl-4 py-3">
                      {team.name}
                    </TableCell>
                    <TableCell>
                      {team.category}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(
                        new Date(team.created_at || new Date()),
                        "MMM d, yyyy",
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onManageUsers(team)} title="Manage Users">
                          <Users className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEditTeam(team)} title="Edit Team">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteTeam(team)} className="text-destructive hover:text-destructive" title="Delete Team">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
