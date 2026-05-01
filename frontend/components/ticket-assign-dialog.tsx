"use client";

import * as React from "react";
import { toast } from "sonner";
import { UserCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, assignTicket } from "@/lib/api";

interface Agent {
  user_id: string;
  display_name: string;
  email: string;
}

interface TicketAssignDialogProps {
  ticketId: string;
  ticketCategory: string;
  currentAssignee?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}

export function TicketAssignDialog({
  ticketId,
  ticketCategory,
  currentAssignee,
  open,
  onOpenChange,
  onAssigned,
}: TicketAssignDialogProps) {
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = React.useState(false);
  const [selectedEmail, setSelectedEmail] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setSelectedEmail("");
      return;
    }

    async function fetchAgents() {
      setLoadingAgents(true);
      try {
        const res = await apiGet<{ agent: Agent[] }>(
          `/manage/agent?category=${encodeURIComponent(ticketCategory)}`
        );
        const list = res.agent ?? [];
        // Fall back to all agents if none match the category
        if (list.length === 0) {
          const fallback = await apiGet<{ agent: Agent[] }>("/manage/agent");
          setAgents(fallback.agent ?? []);
        } else {
          setAgents(list);
        }
      } catch {
        toast.error("Could not load agents.");
        setAgents([]);
      } finally {
        setLoadingAgents(false);
      }
    }

    fetchAgents();
  }, [open, ticketCategory]);

  async function handleSubmit() {
    if (!selectedEmail) return;
    try {
      setSubmitting(true);
      await assignTicket(ticketId, selectedEmail);
      toast.success("Ticket assigned successfully.");
      onOpenChange(false);
      onAssigned();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to assign ticket.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Assign ticket
          </DialogTitle>
          <DialogDescription>
            Select an agent to assign this ticket to. The ticket status will
            automatically change to <strong>In Progress</strong> and the agent
            will receive an email notification.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loadingAgents ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading agents…
            </div>
          ) : agents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No agents available for this ticket category.
            </p>
          ) : (
            <Select
              value={selectedEmail}
              onValueChange={setSelectedEmail}
              disabled={submitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an agent…" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.user_id} value={agent.email}>
                    <span className="font-medium">{agent.display_name}</span>
                    <span className="text-muted-foreground ml-1">
                      — {agent.email}
                    </span>
                    {agent.email === currentAssignee && (
                      <span className="ml-1 text-xs text-primary">(current)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedEmail || loadingAgents}
            className="min-w-28"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            {submitting ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
