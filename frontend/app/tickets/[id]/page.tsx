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
  RotateCcw,
  Trash2,
  TriangleAlert,
  TrendingUp,
  UserCheck,
  TimerOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiGet, apiDelete } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TicketProgressTimeline } from "@/components/ticket-progress-timeline";
import { TicketCommentForm } from "@/components/ticket-comment-form";
import { TicketResolveDialog } from "@/components/ticket-resolve-dialog";
import { TicketReopenDialog } from "@/components/ticket-reopen-dialog";
import { TicketAdminNotes } from "@/components/ticket-admin-notes";
import { TicketAssignDialog } from "@/components/ticket-assign-dialog";
import { TicketComment, TicketDetails, formatDuration } from "@/types/ticket";
import { isSlaBreached, getTicketAgeHours } from "@/lib/utils";
import { SLA_HOURS } from "@/config/enums";

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
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!user || !ticketId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiGet<TicketDetails>(`/tickets/${ticketId}`);
      setTicket(res);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load ticket details.";
      console.error("Failed to fetch ticket:", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [ticketId, user]);

  const fetchComments = useCallback(async () => {
    if (!user || !ticketId) return;
    try {
      setCommentsLoading(true);
      const res = await apiGet<{ comments: TicketComment[] }>(
        `/tickets/${ticketId}/comments`
      );
      setComments(res.comments || []);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [ticketId, user]);

  useEffect(() => {
    if (user) {
      fetchTicket();
      fetchComments();
    }
  }, [fetchTicket, fetchComments, user]);

  const isOwner = !!user && !!ticket && user.email.toLowerCase() === ticket.email.toLowerCase();
  const isAdmin = user?.role === "admin";
  const isAgent = user?.role === "agent";
  const canPost = isOwner || isAdmin || isAgent;
  const canFinish = (isAdmin || isAgent) && !isOwner;
  const canDelete = isOwner && !ticket?.is_deleted;
  const canReopen =
    isOwner && !ticket?.is_deleted && ticket?.status === "Resolved";
  const isResolvable = ticket
    ? ["Open", "In Progress"].includes(ticket.status)
    : false;
  const showDeletedBanner = !!ticket?.is_deleted && (isAdmin || isAgent);

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

  async function handleDelete() {
    if (!ticket) return;
    try {
      setDeleting(true);
      await apiDelete(`/tickets/${ticket.ticket_id}`);
      toast.success("Ticket deleted.");
      router.push("/tickets");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete ticket.";
      toast.error(msg);
      setDeleting(false);
    }
  }

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
      {/* Header */}
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

          <div className="flex flex-wrap items-center gap-2">
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

            {isAdmin && !ticket.is_deleted && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAssignOpen(true)}
                className="ml-1"
              >
                <UserCheck className="h-4 w-4" />
                Assign
              </Button>
            )}

            {canFinish && isResolvable && (
              <Button
                size="sm"
                onClick={() => setResolveOpen(true)}
                className="ml-1"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Resolved
              </Button>
            )}

            {canReopen && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReopenOpen(true)}
                className="ml-1 border-blue-500 text-blue-700 hover:bg-blue-500/10 dark:text-blue-400"
              >
                <RotateCcw className="h-4 w-4" />
                Re-open
              </Button>
            )}

            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label="Delete ticket"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this ticket?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your support team will still be able to see it as deleted.
                      You won&apos;t see it in your tickets list anymore.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      {deleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      {deleting ? "Deleting..." : "Delete ticket"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {showDeletedBanner && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Deleted by user</AlertTitle>
          <AlertDescription>
            {ticket.deleted_by} deleted this ticket on{" "}
            {ticket.deleted_at &&
              format(new Date(ticket.deleted_at), "MMM d, yyyy 'at' HH:mm")}
            . It is hidden from the user&apos;s list but visible to your team.
          </AlertDescription>
        </Alert>
      )}

      {isSlaBreached(ticket) && (
        <Alert variant="destructive">
          <TimerOff className="h-4 w-4" />
          <AlertTitle>SLA Breach</AlertTitle>
          <AlertDescription>
            This ticket has been open for{" "}
            <strong>{formatDuration(Math.floor(getTicketAgeHours(ticket.created_at) * 3600))}</strong>
            , exceeding the{" "}
            <strong>{SLA_HOURS[ticket.priority] ?? SLA_HOURS["Low"]}h</strong> SLA for{" "}
            {ticket.priority.toLowerCase()} priority tickets.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main column */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  Description
                </CardTitle>
                <div className="flex items-center gap-2">
                  {(ticket.escalation_count ?? 0) > 0 && (
                    <Badge
                      variant="outline"
                      className="border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-500/10"
                      title={
                        ticket.last_escalated_at
                          ? `Last escalated ${format(
                              new Date(ticket.last_escalated_at),
                              "MMM d, yyyy 'at' HH:mm"
                            )}`
                          : undefined
                      }
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Escalated x{ticket.escalation_count}
                    </Badge>
                  )}
                  <Badge
                    variant={getPriorityColor(ticket.priority)}
                    className="capitalize"
                  >
                    {ticket.priority} Priority
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 py-3">
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed">
                {ticket.description}
              </div>
            </CardContent>
          </Card>

          <TicketProgressTimeline
            comments={comments}
            loading={commentsLoading}
          />

          {canPost && !ticket.is_deleted && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Add an update
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <TicketCommentForm
                  ticketId={ticket.ticket_id}
                  onPosted={fetchComments}
                />
              </CardContent>
            </Card>
          )}

          {isAdmin && <TicketAdminNotes ticketId={ticket.ticket_id} />}
        </div>

        {/* Sidebar */}
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

              {ticket.assigned_to && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Assigned to
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <span
                      className="text-sm font-medium truncate"
                      title={ticket.assigned_to}
                    >
                      {ticket.assigned_to_name || ticket.assigned_to}
                    </span>
                  </div>
                </div>
              )}

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

              {["Open", "In Progress"].includes(ticket.status) && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Age
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock
                      className={`h-4 w-4 ${isSlaBreached(ticket) ? "text-destructive" : "text-muted-foreground"}`}
                    />
                    <span
                      className={`text-sm font-medium ${isSlaBreached(ticket) ? "text-destructive" : ""}`}
                    >
                      {formatDuration(Math.floor(getTicketAgeHours(ticket.created_at) * 3600))}
                    </span>
                    {isSlaBreached(ticket) && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <TimerOff className="h-3 w-3" />
                        SLA Breach
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {ticket.resolved_at && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resolved
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">
                      {format(
                        new Date(ticket.resolved_at),
                        "MMM d, yyyy 'at' HH:mm"
                      )}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TicketResolveDialog
        ticketId={ticket.ticket_id}
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        onResolved={() => {
          fetchTicket();
          fetchComments();
        }}
      />

      <TicketReopenDialog
        ticketId={ticket.ticket_id}
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        onReopened={() => {
          fetchTicket();
          fetchComments();
        }}
      />

      <TicketAssignDialog
        ticketId={ticket.ticket_id}
        ticketCategory={ticket.category}
        currentAssignee={ticket.assigned_to}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssigned={fetchTicket}
      />
    </div>
  );
}
