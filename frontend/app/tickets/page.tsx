"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Search, Filter, Loader2, ArrowRightIcon } from "lucide-react";
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
import { apiGet } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { VALID_CATEGORIES, VALID_STATUSES } from "@/config/enums";

interface Ticket {
  ticket_id: string;
  email: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

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
      let endpoint = "/tickets";

      if (searchQuery.trim() !== "") {
        endpoint = `/tickets/search?q=${encodeURIComponent(searchQuery)}`;
      } else {
        const queryParams = new URLSearchParams();
        if (statusFilter !== "all") queryParams.append("status", statusFilter);
        if (categoryFilter !== "all")
          queryParams.append("category", categoryFilter);
        if (queryParams.toString()) {
          endpoint += `?${queryParams.toString()}`;
        }
      }

      const res = await apiGet<{ tickets: Ticket[] }>(endpoint);
      setTickets(res.tickets || []);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, categoryFilter, user]);

  useEffect(() => {
    // Add a slight debounce for search
    const timer = setTimeout(() => {
      fetchTickets();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTickets]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "default";
      case "in progress":
        return "secondary";
      case "resolved":
        return "outline";
      case "closed":
        return "secondary";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
        <p className="text-muted-foreground mt-2">
          Manage and track your helpdesk requests.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex flex-col gap-1">
            <CardTitle>All Requests</CardTitle>
            <CardDescription>
              Recent support tickets from your account.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/tickets/new">New Ticket</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by Ticket ID or Subject..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-row gap-4">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
                disabled={!!searchQuery}
              >
                <SelectTrigger className="w-50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {VALID_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
                disabled={!!searchQuery}
              >
                <SelectTrigger className="w-50">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    <SelectItem value="all">All Categories</SelectItem>
                    {VALID_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="text-left pl-3">Ticket ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead className="text-right pr-3">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : tickets.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No tickets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket) => (
                    <TableRow key={ticket.ticket_id}>
                      <TableCell className="font-medium">
                        {ticket.ticket_id.substring(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell
                        className="max-w-50 truncate"
                        title={ticket.subject}
                      >
                        {ticket.subject}
                      </TableCell>
                      <TableCell className="capitalize">
                        {ticket.category}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(ticket.status)}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ticket.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/tickets/${ticket.ticket_id}`}>
                            View <ArrowRightIcon className="w-4 h-4 ml-1" />
                          </Link>
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
  );
}
