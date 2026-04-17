"use client";

import { useEffect, useState, useCallback, use } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TicketDetails {
  ticket_id: string;
  email: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  assigned_to_name?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export default function TicketDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;

  const { user } = useAuth();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!user || !ticketId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiGet<TicketDetails>(`/tickets/${ticketId}`);
      setTicket(res);
    } catch (err: any) {
      console.error("Failed to fetch ticket:", err);
      setError(err.message || "Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  }, [ticketId, user]);

  useEffect(() => {
    if (user) {
      fetchTicket();
    }
  }, [fetchTicket, user]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
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
    switch (priority?.toLowerCase()) {
      case "critical":
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <div className="bg-destructive/10 p-4 rounded-full">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Ticket Not Found</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {error ||
            "We couldn't find the ticket you're looking for. It may have been deleted or you might not have permission to view it."}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/tickets">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tickets
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto w-full mt-4">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/tickets" className="flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Tickets
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{ticket.ticket_id}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {ticket.subject}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Opened {format(new Date(ticket.created_at), "MMM d, yyyy")}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Updated {format(new Date(ticket.updated_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant={getStatusColor(ticket.status)}
              className="px-3 py-1 text-sm font-medium capitalize"
            >
              {ticket.status.replace("_", " ")}
            </Badge>
            {ticket.status.toLowerCase() === "resolved" &&
              ticket.resolved_at && (
                <Badge
                  variant="outline"
                  className="px-3 py-1 text-sm font-medium border-green-500 text-green-600 bg-green-500/10"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Resolved
                </Badge>
              )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  Description
                </CardTitle>
                <Badge
                  variant={getPriorityColor(ticket.priority)}
                  className="capitalize"
                >
                  {ticket.priority} Priority
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 py-3">
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed">
                {ticket.description}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Information */}
        <div className="flex flex-col gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-muted-foreground" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 py-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Reporter
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary text-xs font-bold">
                      {ticket.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span
                    className="text-sm font-medium truncate"
                    title={ticket.email}
                  >
                    {ticket.email}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Assignee
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {ticket.assigned_to_name ? (
                      <span className="text-muted-foreground text-xs font-bold">
                        {ticket.assigned_to_name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {ticket.assigned_to_name
                      ? ticket.assigned_to_name
                      : "Unassigned"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Category
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium capitalize">
                    {ticket.category}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
