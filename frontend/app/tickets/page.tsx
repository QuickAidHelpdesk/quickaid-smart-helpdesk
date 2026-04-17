"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TicketListCard, Ticket } from "@/components/ticket-list-card";

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      let endpoint = searchQuery.trim() !== "" ? "/tickets/search" : "/tickets";
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
      console.error("Failed to fetch tickets:", err);
      if (
        err?.message?.includes("404") ||
        err?.message?.includes("not found")
      ) {
        setTickets([]);
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, categoryFilter, user]);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
        <p className="text-muted-foreground mt-2">
          Manage and track your helpdesk requests.
        </p>
      </div>

      <TicketListCard
        title="All Requests"
        description="Recent support tickets from your account."
        tickets={tickets}
        loading={loading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        onSearch={fetchTickets}
        actionButton={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/tickets/new">New Ticket</Link>
          </Button>
        }
      />
    </div>
  );
}
