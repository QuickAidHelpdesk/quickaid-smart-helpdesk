import { Loader2 } from "lucide-react";
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

export interface TeamMember {
  user_id: string;
  display_name: string;
  email: string;
  role: "staff" | "agent";
  team_id?: string | null;
}

interface TeamMembersCardProps {
  title?: string;
  description?: string;
  members: TeamMember[];
  loading: boolean;
  currentUserEmail?: string | null;
}

const roleColorClass: Record<string, string> = {
  agent:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  staff:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
};

export function TeamMembersCard({
  title = "Team Members",
  description = "Everyone on your team — agents lead the queue, staff help resolve tickets.",
  members,
  loading,
  currentUserEmail,
}: TeamMembersCardProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-left pl-4">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No team members yet.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => {
                  const isYou =
                    !!currentUserEmail &&
                    m.email.toLowerCase() === currentUserEmail.toLowerCase();
                  return (
                    <TableRow key={m.user_id}>
                      <TableCell className="font-medium pl-4 py-3">
                        {m.display_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${roleColorClass[m.role] ?? ""}`}
                        >
                          {m.role === "agent" ? "Agent · Lead" : "Staff"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        {isYou ? (
                          <Badge variant="secondary">You</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Member
                          </span>
                        )}
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
