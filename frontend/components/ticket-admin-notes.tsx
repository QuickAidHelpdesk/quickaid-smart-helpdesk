"use client";

import * as React from "react";
import { format } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Lock, Send, ShieldCheck, Trash2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
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
import { Separator } from "@/components/ui/separator";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { AdminNote } from "@/types/ticket";

const formSchema = z.object({
  content: z
    .string()
    .min(3, "Note must be at least 3 characters.")
    .max(2000, "Note must not exceed 2000 characters."),
});

type FormValues = z.infer<typeof formSchema>;

interface TicketAdminNotesProps {
  ticketId: string;
}

function authorInitials(name: string, email: string): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function TicketAdminNotes({ ticketId }: TicketAdminNotesProps) {
  const [notes, setNotes] = React.useState<AdminNote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: "" },
  });

  const fetchNotes = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet<{ notes: AdminNote[] }>(
        `/manage/tickets/${ticketId}/notes`
      );
      setNotes(res.notes || []);
    } catch (err) {
      console.error("Failed to load admin notes:", err);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  React.useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function onSubmit(values: FormValues) {
    try {
      setSubmitting(true);
      await apiPost(`/manage/tickets/${ticketId}/notes`, {
        content: values.content.trim(),
      });
      toast.success("Internal note added.");
      form.reset();
      fetchNotes();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add note.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(noteId: string) {
    try {
      setDeletingId(noteId);
      await apiDelete(`/manage/tickets/${ticketId}/notes/${noteId}`);
      toast.success("Note deleted.");
      setNotes((prev) => prev.filter((n) => n.note_id !== noteId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete note.";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="shadow-sm border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            Internal Admin Notes
          </CardTitle>
          <Badge
            variant="outline"
            className="border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-500/10"
          >
            <Lock className="h-3 w-3 mr-1" />
            Admins only
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Visible only to administrators. Not shown to the user or assigned agent.
        </p>
      </CardHeader>
      <CardContent className="py-3 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No internal notes yet.
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {notes.map((n, idx) => (
              <li key={n.note_id} className="flex flex-col gap-2">
                {idx > 0 && <Separator className="mb-1" />}
                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                        {authorInitials(n.author_display_name, n.author_email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
                          <span
                            className="truncate max-w-[16rem] font-medium text-foreground"
                            title={n.author_email}
                          >
                            {n.author_display_name || n.author_email}
                          </span>
                          <span>·</span>
                          <span>
                            {format(
                              new Date(n.created_at),
                              "MMM d, yyyy 'at' HH:mm"
                            )}
                          </span>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              disabled={deletingId === n.note_id}
                              aria-label="Delete note"
                            >
                              {deletingId === n.note_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete note?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This internal note will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(n.note_id)}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                        {n.content}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FieldGroup>
            <Controller
              name="content"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="admin-note-content">
                    Add an internal note
                  </FieldLabel>
                  <div className="relative">
                    <Textarea
                      {...field}
                      id="admin-note-content"
                      placeholder="Triage context, escalation reasoning, anything the user shouldn't see…"
                      rows={4}
                      className="min-h-20 resize-y pb-8"
                      aria-invalid={fieldState.invalid}
                    />
                    <div className="absolute right-3 bottom-3 text-xs text-muted-foreground tabular-nums pointer-events-none">
                      {field.value.length}/2000
                    </div>
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting} size="sm">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Saving..." : "Save note"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
