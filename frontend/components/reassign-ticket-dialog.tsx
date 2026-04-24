"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/api";
import { Ticket } from "@/components/ticket-list-card";
import { TeamMember } from "@/components/team-members-card";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Team {
  team_id: string;
  name: string;
  category: string;
}

interface TeamResponse {
  team: Team | null;
  members: TeamMember[];
}

interface ReassignTicketDialogProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReassigned: (updated: Ticket) => void;
  currentUserEmail?: string | null;
}

export function ReassignTicketDialog({
  ticket,
  open,
  onOpenChange,
  onReassigned,
  currentUserEmail,
}: ReassignTicketDialogProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSearchQuery("");
    setSelectedEmail(null);
    setSubmitError(null);

    apiGet<TeamResponse>("/staff/team")
      .then((res) => {
        if (cancelled) return;
        setTeam(res.team);
        setMembers(res.members || []);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setLoadError(err.message || "Failed to load team members.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? members.filter(
          (m) =>
            m.display_name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q),
        )
      : members;
    // Hide the current requester from the list (can't pass to yourself).
    if (!currentUserEmail) return list;
    return list.filter(
      (m) => m.email.toLowerCase() !== currentUserEmail.toLowerCase(),
    );
  }, [members, searchQuery, currentUserEmail]);

  const handleConfirm = async () => {
    if (!selectedEmail) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiPatch<{
        success: boolean;
        message: string;
        ticket: Ticket;
      }>(`/staff/tickets/${ticket.ticket_id}/reassign`, {
        assigned_to: selectedEmail,
      });
      toast.success(res.message || "Ticket transferred.");
      onReassigned(res.ticket);
      onOpenChange(false);
    } catch (err) {
      const message =
        (err as Error)?.message || "Failed to transfer ticket.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Reassign ticket{" "}
            {ticket.ticket_id.substring(0, 8).toUpperCase()}
          </DialogTitle>
          <DialogDescription>
            {team ? (
              <>
                Within{" "}
                <span className="font-medium text-foreground">
                  {team.name}
                </span>{" "}
                ({team.category}). Pick a teammate to transfer the ticket to.
              </>
            ) : (
              <>Transfer this ticket to another team member.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-6 w-6 text-muted-foreground" />
          </div>
        ) : loadError ? (
          <ErrorState title="Failed to load" message={loadError} />
        ) : !team ? (
          <ErrorState
            title="No team"
            message="You are not assigned to a team yet. Ask an admin to add you to one."
          />
        ) : (
          <>
            <Input
              placeholder="Search name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <ScrollArea className="max-h-72 rounded-md border">
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No teammates available.
                </div>
              ) : (
                <div className="flex flex-col">
                  {filtered.map((m) => {
                    const isCurrent = m.email === ticket.assigned_to;
                    const isSelected = selectedEmail === m.email;
                    return (
                      <button
                        key={m.email}
                        type="button"
                        disabled={isCurrent}
                        data-selected={isSelected}
                        onClick={() => setSelectedEmail(m.email)}
                        className="w-full text-left px-3 py-2 border-b last:border-b-0 transition-colors hover:bg-muted data-[selected=true]:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {m.display_name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {m.email}
                            </div>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {m.role === "agent" ? "Agent · Lead" : "Staff"}
                          </Badge>
                        </div>
                        {isCurrent && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Currently assigned
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedEmail || submitting || loading || !team}
          >
            {submitting ? <Spinner className="h-4 w-4" /> : "Confirm transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
