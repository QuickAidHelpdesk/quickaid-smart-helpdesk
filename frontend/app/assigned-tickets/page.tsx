"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { apiGet } from "@/lib/api";
import { TicketListCard, Ticket } from "@/components/ticket-list-card";
import { ErrorState } from "@/components/error-state";
import { Spinner } from "@/components/ui/spinner";

export default function AssignedTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      let endpoint = "/staff/tickets";
      const queryParams = new URLSearchParams();

      if (searchQuery.trim() !== "")
        queryParams.append("q", searchQuery.trim());
      if (statusFilter !== "all") queryParams.append("status", statusFilter);
      if (categoryFilter !== "all")
        queryParams.append("category", categoryFilter);

      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }

      const res = await apiGet<{ tickets: Ticket[] }>(endpoint);
      setTickets(res.tickets || []);
    } catch (err: any) {
      console.error("Failed to fetch assigned tickets:", err);
      if (err?.message?.includes("403")) {
        setError("You do not have permission to view this page.");
        setTickets([]);
      } else if (
        err?.message?.includes("404") ||
        err?.message?.includes("not found")
      ) {
        setTickets([]);
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [searchQuery, statusFilter, categoryFilter, user]);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  if (initialLoad) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {error ? (
        <ErrorState title="Access Denied" message={error} />
      ) : (
        <>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Assigned Tickets
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage and track helpdesk requests assigned to you.
            </p>
          </div>

          <TicketListCard
            title="Your Work Queue"
            description="Tickets assigned to your staff account."
            tickets={tickets}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            onSearch={fetchTickets}
          />
        </>
      )}
    </div>
  );
}
