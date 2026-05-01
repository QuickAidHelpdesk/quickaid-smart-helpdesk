"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  TicketIcon,
  CircleDotIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  PlusCircleIcon,
  InboxIcon,
  BarChart3Icon,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { apiGet } from "@/lib/api";
import { isSlaBreached } from "@/lib/utils";
import { ProtectedRoute } from "@/components/protected-route";
import { ErrorState } from "@/components/error-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Ticket } from "@/components/ticket-list-card";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

function getStatusColor(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case "open":        return "default";
    case "in progress": return "secondary";
    case "resolved":    return "outline";
    case "closed":      return "secondary";
    default:            return "default";
  }
}

function getPriorityColor(priority: string): BadgeVariant {
  switch (priority.toLowerCase()) {
    case "critical": return "destructive";
    case "high":     return "destructive";
    case "medium":   return "default";
    case "low":      return "secondary";
    default:         return "default";
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    const endpointByRole: Record<string, string> = {
      user: "/tickets",
      agent: "/agent/tickets",
      admin: "/manage/tickets",
    };
    const ep = endpointByRole[user.role] ?? "/tickets";
    try {
      setLoading(true);
      setError(null);
      const res = await apiGet<{ tickets: Ticket[] }>(ep);
      setTickets(res.tickets || []);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        setTickets([]);
      } else {
        setError("Failed to load dashboard data.");
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchTickets();
  }, [user, fetchTickets]);

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Good morning" :
    greetingHour < 18 ? "Good afternoon" :
    "Good evening";

  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === "Open").length;
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;
  const slaBreachCount = tickets.filter(isSlaBreached).length;

  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const roleLinks: Record<string, string> = {
    user: "/tickets",
    agent: "/assigned-tickets",
    admin: "/admin/insights",
  };
  const viewAllLink = user ? (roleLinks[user.role] ?? "/tickets") : "/tickets";
  const slaLink = viewAllLink;

  const roleLabels: Record<string, string> = {
    user: "User",
    agent: "Agent",
    admin: "Admin",
  };

  type QuickAction = { label: string; href: string; icon: React.ReactNode; description: string };
  const quickActionByRole: Record<string, QuickAction> = {
    user: {
      label: "Submit New Ticket",
      href: "/tickets/new",
      icon: <PlusCircleIcon className="h-4 w-4" />,
      description: "Submit a new support request.",
    },
    agent: {
      label: "View My Queue",
      href: "/assigned-tickets",
      icon: <InboxIcon className="h-4 w-4" />,
      description: "Go to your assigned ticket queue.",
    },
    admin: {
      label: "View Admin Insights",
      href: "/admin/insights",
      icon: <BarChart3Icon className="h-4 w-4" />,
      description: "View platform-wide ticket insights.",
    },
  };
  const quickAction = user
    ? (quickActionByRole[user.role] ?? quickActionByRole["user"])
    : quickActionByRole["user"];

  return (
    <ProtectedRoute>
      {initialLoad ? (
        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : error ? (
        <div className="p-6">
          <ErrorState title="Dashboard Error" message={error} />
        </div>
      ) : (
        <div className="flex flex-col gap-6 p-6">

          {/* Section 1: Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold tracking-tight">
                  {greeting}, {user?.display_name}
                </h1>
                <Badge variant="secondary" className="capitalize">
                  {user ? roleLabels[user.role] : ""}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                Here&apos;s an overview of your helpdesk activity.
              </p>
            </div>
            {loading && <Spinner className="h-5 w-5 text-muted-foreground shrink-0" />}
          </div>

          <Separator />

          {/* Section 2: Stats Grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>Total Tickets</CardDescription>
                  <TicketIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-3xl">{totalCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>Open</CardDescription>
                  <CircleDotIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-3xl">{openCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>In Progress</CardDescription>
                  <ClockIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-3xl">{inProgressCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>Resolved</CardDescription>
                  <CheckCircle2Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-3xl">{resolvedCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Section 3: SLA Breach Alert */}
          {slaBreachCount > 0 && (
            <Alert variant="destructive">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertTitle>SLA Threshold Breached</AlertTitle>
              <AlertDescription>
                {slaBreachCount} ticket{slaBreachCount !== 1 ? "s are" : " is"} breaching SLA
                thresholds.{" "}
                <Link href={slaLink} className="underline underline-offset-2 font-medium">
                  View tickets
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {/* Section 4: Recent Tickets */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Tickets</CardTitle>
              <CardDescription>Your 5 most recently created tickets.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="pl-3">Ticket ID</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="pr-3">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTickets.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No tickets found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentTickets.map((ticket) => (
                        <TableRow key={ticket.ticket_id}>
                          <TableCell className="font-medium pl-3">
                            {ticket.ticket_id.substring(0, 8).toUpperCase()}
                          </TableCell>
                          <TableCell
                            className="max-w-[200px] truncate"
                            title={ticket.subject}
                          >
                            {ticket.subject}
                          </TableCell>
                          <TableCell className="capitalize">
                            {ticket.category}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(ticket.status)}>
                              {ticket.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground pr-3">
                            {format(new Date(ticket.created_at), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {recentTickets.length > 0 && (
                <div className="mt-3 text-right">
                  <Link
                    href={viewAllLink}
                    className="text-sm text-primary hover:underline underline-offset-2 font-medium inline-flex items-center gap-1"
                  >
                    View all tickets →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 5: Quick Action Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border bg-muted/50 p-4">
            <div className="flex-1">
              <p className="text-sm font-medium">Quick Action</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {quickAction.description}
              </p>
            </div>
            <Button asChild>
              <Link href={quickAction.href} className="flex items-center gap-2">
                {quickAction.icon}
                {quickAction.label}
              </Link>
            </Button>
          </div>

        </div>
      )}
    </ProtectedRoute>
  );
}
