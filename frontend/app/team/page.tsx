"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { apiGet } from "@/lib/api";
import { TicketListCard, Ticket } from "@/components/ticket-list-card";
import {
  TeamMembersCard,
  TeamMember,
} from "@/components/team-members-card";
import { ReassignTicketDialog } from "@/components/reassign-ticket-dialog";
import { ProtectedRoute } from "@/components/protected-route";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BuildingIcon, UsersIcon, ListIcon } from "lucide-react";

interface Team {
  team_id: string;
  name: string;
  category: string;
  created_at?: string;
}

interface TeamResponse {
  team: Team | null;
  members: TeamMember[];
}

export default function TeamPage() {
  const { user } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [teamLoading, setTeamLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [error, setError] = useState<string | null>(null);
  const [dialogTicket, setDialogTicket] = useState<Ticket | null>(null);

  const isAdmin = user?.role === "admin";
  const isAgent = user?.role === "agent";

  const fetchTeam = useCallback(async () => {
    if (!user) return;
    try {
      setTeamLoading(true);
      const res = await apiGet<TeamResponse>("/staff/team");
      setTeam(res.team);
      setMembers(res.members || []);
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status !== 404) {
        setError(e.message || "Failed to load team.");
      }
      setTeam(null);
      setMembers([]);
    } finally {
      setTeamLoading(false);
    }
  }, [user]);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    try {
      setTicketsLoading(true);
      const queryParams = new URLSearchParams();
      if (statusFilter !== "all") queryParams.append("status", statusFilter);

      const endpoint = queryParams.toString()
        ? `/staff/tickets?${queryParams.toString()}`
        : "/staff/tickets";

      const res = await apiGet<{ tickets: Ticket[] }>(endpoint);
      setTickets(res.tickets || []);
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 403) {
        setError("You do not have permission to view this page.");
        setTickets([]);
      } else if (e.status === 404) {
        setTickets([]);
      } else {
        setError(e.message || "Failed to load tickets.");
      }
    } finally {
      setTicketsLoading(false);
      setInitialLoad(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    if (!user) return;
    fetchTeam();
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Client-side filter: search + category (team is already filtered server-side
  // for agents; staff only see their assigned tickets).
  const displayedTickets = useMemo(() => {
    let list = tickets;
    if (categoryFilter !== "all") {
      list = list.filter((t) => t.category === categoryFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.ticket_id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q),
      );
    }
    return list;
  }, [tickets, searchQuery, categoryFilter]);

  const handleReassigned = useCallback((updated: Ticket) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.ticket_id === updated.ticket_id ? { ...t, ...updated } : t,
      ),
    );
    setDialogTicket(null);
  }, []);

  const ticketCardTitle = isAgent
    ? "Team Queue"
    : isAdmin
      ? "Handler Queue"
      : "My Tickets";

  const ticketCardDescription = isAgent
    ? "Every ticket in your team's category, plus anything directly assigned to you."
    : isAdmin
      ? "All tickets currently visible to ticket handlers."
      : "Tickets assigned to you. Use Reassign to pass a ticket to a teammate.";

  return (
    <ProtectedRoute allowedRoles={["staff", "agent", "admin"]}>
      {initialLoad ? (
        <div className="flex flex-1 items-center justify-center min-h-[50vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <div className="flex flex-col gap-6 p-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Agents &amp; Teams
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your team&apos;s queue and distribute tickets among teammates.
            </p>
          </div>

          {error ? (
            <ErrorState title="Something went wrong" message={error} />
          ) : (
            <>
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-muted p-2 mt-1">
                        <BuildingIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">
                          {teamLoading
                            ? "Loading team…"
                            : team
                              ? team.name
                              : "No team assigned"}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {team ? (
                            <>
                              Category{" "}
                              <Badge variant="secondary" className="ml-1">
                                {team.category}
                              </Badge>
                            </>
                          ) : (
                            "You are not currently a member of any team."
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    {team && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UsersIcon className="h-4 w-4" />
                        <span>
                          {members.length}{" "}
                          {members.length === 1 ? "member" : "members"}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                {!team && !teamLoading && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {isAdmin
                        ? "Admins don't belong to a single team. You can still manage teams and assignments from the Management area."
                        : "Ask an admin to add you to a team so you can collaborate on tickets."}
                    </p>
                  </CardContent>
                )}
              </Card>

              {team && (
                <TeamMembersCard
                  members={members}
                  loading={teamLoading}
                  currentUserEmail={user?.email}
                />
              )}

              <TicketListCard
                title={ticketCardTitle}
                description={ticketCardDescription}
                tickets={displayedTickets}
                loading={ticketsLoading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                onSearch={fetchTickets}
                showAssigneeColumn
                renderRowAction={
                  team
                    ? (t) => (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDialogTicket(t)}
                        >
                          <ListIcon className="h-4 w-4 mr-1" />
                          Reassign
                        </Button>
                      )
                    : undefined
                }
              />

              {dialogTicket && (
                <ReassignTicketDialog
                  ticket={dialogTicket}
                  open
                  onOpenChange={(o) => !o && setDialogTicket(null)}
                  onReassigned={handleReassigned}
                  currentUserEmail={user?.email}
                />
              )}
            </>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
