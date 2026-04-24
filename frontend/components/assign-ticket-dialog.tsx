"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/api";
import { Ticket } from "@/components/ticket-list-card";
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

interface Candidate {
  email: string;
  display_name: string;
  role: "staff" | "agent";
  teamName?: string;
}

interface StaffMember {
  user_id: string;
  display_name: string;
  email: string;
  team_id?: string | null;
}

interface AgentMember {
  user_id: string;
  display_name: string;
  email: string;
  team_id?: string | null;
}

interface Team {
  team_id: string;
  name: string;
  category: string;
}

interface AssignTicketDialogProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: (updated: Ticket) => void;
}

export function AssignTicketDialog({
  ticket,
  open,
  onOpenChange,
  onAssigned,
}: AssignTicketDialogProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
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

    Promise.all([
      apiGet<{ staff: StaffMember[] }>("/manage/staff"),
      apiGet<{ agents: AgentMember[] }>("/manage/agents"),
      apiGet<{ teams: Team[] }>("/manage/teams"),
    ])
      .then(([staffRes, agentsRes, teamsRes]) => {
        if (cancelled) return;

        const teamMap = new Map<string, Team>();
        for (const team of teamsRes.teams || []) {
          if (team.team_id) teamMap.set(team.team_id, team);
        }

        const staffCandidates: Candidate[] = (staffRes.staff || []).map((s) => ({
          email: s.email,
          display_name: s.display_name,
          role: "staff",
        }));

        const agentCandidates: Candidate[] = [];
        for (const a of agentsRes.agents || []) {
          const team = a.team_id ? teamMap.get(a.team_id) : undefined;
          if (!team || team.category !== ticket.category) continue;
          agentCandidates.push({
            email: a.email,
            display_name: a.display_name,
            role: "agent",
            teamName: team.name,
          });
        }

        setCandidates([...staffCandidates, ...agentCandidates]);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setLoadError(err.message || "Failed to load assignees.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, ticket.category]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.display_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [candidates, searchQuery]);

  const handleConfirm = async () => {
    if (!selectedEmail) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiPatch<{
        success: boolean;
        message: string;
        ticket: Ticket;
      }>(`/manage/tickets/${ticket.ticket_id}/assign`, {
        assigned_to: selectedEmail,
      });
      toast.success(res.message || "Ticket assigned.");
      onAssigned(res.ticket);
      onOpenChange(false);
    } catch (err) {
      const message =
        (err as Error)?.message || "Failed to assign ticket.";
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
            Assign ticket{" "}
            {ticket.ticket_id.substring(0, 8).toUpperCase()}
          </DialogTitle>
          <DialogDescription>
            Category:{" "}
            <span className="font-medium text-foreground">
              {ticket.category}
            </span>
            . Only agents from a matching team are listed.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-6 w-6 text-muted-foreground" />
          </div>
        ) : loadError ? (
          <ErrorState title="Failed to load" message={loadError} />
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
                  No eligible assignees.
                </div>
              ) : (
                <div className="flex flex-col">
                  {filtered.map((c) => {
                    const isCurrent = c.email === ticket.assigned_to;
                    const isSelected = selectedEmail === c.email;
                    return (
                      <button
                        key={c.email}
                        type="button"
                        disabled={isCurrent}
                        data-selected={isSelected}
                        onClick={() => setSelectedEmail(c.email)}
                        className="w-full text-left px-3 py-2 border-b last:border-b-0 transition-colors hover:bg-muted data-[selected=true]:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {c.display_name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {c.email}
                            </div>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {c.role === "staff"
                              ? "Staff"
                              : `Agent · ${c.teamName}`}
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
            disabled={!selectedEmail || submitting || loading}
          >
            {submitting ? (
              <Spinner className="h-4 w-4" />
            ) : (
              "Confirm assignment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
