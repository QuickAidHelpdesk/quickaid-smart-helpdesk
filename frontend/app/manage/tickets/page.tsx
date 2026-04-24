"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { apiGet } from "@/lib/api";
import { TicketListCard, Ticket } from "@/components/ticket-list-card";
import { AssignTicketDialog } from "@/components/assign-ticket-dialog";
import { ProtectedRoute } from "@/components/protected-route";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function ManageTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [dialogTicket, setDialogTicket] = useState<Ticket | null>(null);

  const isAdmin = user?.role === "admin";

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const base = isAdmin ? "/manage/tickets" : "/staff/tickets";
      const queryParams = new URLSearchParams();

      if (statusFilter !== "all") queryParams.append("status", statusFilter);
      if (categoryFilter !== "all")
        queryParams.append("category", categoryFilter);
      if (!isAdmin && searchQuery.trim() !== "") {
        queryParams.append("q", searchQuery.trim());
      }

      const endpoint = queryParams.toString()
        ? `${base}?${queryParams.toString()}`
        : base;

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
        setError(e.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [isAdmin, searchQuery, statusFilter, categoryFilter, user]);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const displayedTickets = useMemo(() => {
    if (!isAdmin) return tickets;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        t.ticket_id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q),
    );
  }, [tickets, searchQuery, isAdmin]);

  const handleAssigned = useCallback((updated: Ticket) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.ticket_id === updated.ticket_id ? { ...t, ...updated } : t,
      ),
    );
    setDialogTicket(null);
  }, []);

  return (
    <ProtectedRoute allowedRoles={["admin", "agent"]}>
      {initialLoad ? (
        <div className="flex flex-1 items-center justify-center min-h-[50vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <div className="flex flex-col gap-6 p-6">
          {error ? (
            <ErrorState title="Access Denied" message={error} />
          ) : (
            <>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {isAdmin ? "Manage Tickets" : "Team Queue"}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {isAdmin
                    ? "Assign and track every ticket across the helpdesk."
                    : "Tickets in your team's category and anything assigned directly to you."}
                </p>
              </div>

              <TicketListCard
                title={isAdmin ? "Ticket Queue" : "Your Team Queue"}
                description={
                  isAdmin
                    ? "Every ticket submitted across the system."
                    : "Tickets visible to your team."
                }
                tickets={displayedTickets}
                loading={loading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                onSearch={fetchTickets}
                showAssigneeColumn={isAdmin}
                renderRowAction={
                  isAdmin
                    ? (t) => (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDialogTicket(t)}
                        >
                          {t.assigned_to ? "Reassign" : "Assign"}
                        </Button>
                      )
                    : undefined
                }
              />

              {dialogTicket && (
                <AssignTicketDialog
                  ticket={dialogTicket}
                  open
                  onOpenChange={(o) => !o && setDialogTicket(null)}
                  onAssigned={handleAssigned}
                />
              )}
            </>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
