"use client";

import { format } from "date-fns";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  MessageSquare,
  Timer,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TicketComment, formatDuration } from "@/types/ticket";

interface TicketProgressTimelineProps {
  comments: TicketComment[];
  loading: boolean;
}

function authorInitials(name: string, email: string): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function roleLabel(role: TicketComment["author_role"]): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "agent":
      return "Agent";
    default:
      return "User";
  }
}

function roleBadgeVariant(
  role: TicketComment["author_role"]
): "default" | "secondary" | "outline" {
  if (role === "admin") return "default";
  if (role === "agent") return "secondary";
  return "outline";
}

export function TicketProgressTimeline({
  comments,
  loading,
}: TicketProgressTimelineProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            Progress
          </CardTitle>
          <Badge variant="secondary">{comments.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="py-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No progress yet. Be the first to add an update.
          </p>
        ) : (
          <ol className="flex flex-col gap-5">
            {comments.map((c, idx) => {
              const isResolution = c.entry_type === "resolution";
              return (
                <li key={c.comment_id} className="flex flex-col gap-2">
                  {idx > 0 && <Separator className="mb-2" />}
                  <div
                    className={
                      isResolution
                        ? "rounded-lg border border-green-500/40 bg-green-500/5 p-4"
                        : "rounded-lg border bg-card p-4"
                    }
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback
                          className={
                            isResolution
                              ? "bg-green-500/15 text-green-700 dark:text-green-400 text-xs font-semibold"
                              : "bg-primary/10 text-primary text-xs font-semibold"
                          }
                        >
                          {authorInitials(
                            c.author_display_name,
                            c.author_email
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {c.topic}
                          </span>
                          {isResolution ? (
                            <Badge
                              variant="outline"
                              className="border-green-500 text-green-600 bg-green-500/10"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Resolution
                            </Badge>
                          ) : (
                            <Badge variant={roleBadgeVariant(c.author_role)}>
                              {roleLabel(c.author_role)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
                          <span
                            className="truncate max-w-[16rem]"
                            title={c.author_email}
                          >
                            {c.author_display_name || c.author_email}
                          </span>
                          <span>·</span>
                          <span>
                            {format(
                              new Date(c.created_at),
                              "MMM d, yyyy 'at' HH:mm"
                            )}
                          </span>
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                          {c.description}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {c.location && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              <MapPin className="h-3 w-3" />
                              {c.location}
                            </span>
                          )}
                          {isResolution && c.resolved_in_seconds != null && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded">
                              <Timer className="h-3 w-3" />
                              Resolved in {formatDuration(c.resolved_in_seconds)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
