"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";

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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api";

const formSchema = z.object({
  topic: z
    .string()
    .min(3, "Topic must be at least 3 characters.")
    .max(100, "Topic must not exceed 100 characters."),
  description: z
    .string()
    .min(3, "Description must be at least 3 characters.")
    .max(1000, "Description must not exceed 1000 characters."),
  location: z
    .string()
    .max(200, "Location must not exceed 200 characters.")
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TicketReopenDialogProps {
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReopened: () => void;
}

export function TicketReopenDialog({
  ticketId,
  open,
  onOpenChange,
  onReopened,
}: TicketReopenDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { topic: "", description: "", location: "" },
  });

  React.useEffect(() => {
    if (!open) form.reset();
  }, [open, form]);

  async function onSubmit(values: FormValues) {
    try {
      setSubmitting(true);
      const payload = {
        topic: values.topic.trim(),
        description: values.description.trim(),
        location: values.location?.trim() || null,
      };
      await apiPost(`/tickets/${ticketId}/reopen`, payload);
      toast.success("Ticket re-opened.");
      onOpenChange(false);
      onReopened();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to re-open ticket.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-600" />
            Re-open this ticket
          </DialogTitle>
          <DialogDescription>
            Use this if the issue is not actually resolved. The ticket will go
            back to <strong>Open</strong> and your support team will be notified.
          </DialogDescription>
        </DialogHeader>

        <form
          id="reopen-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FieldGroup>
            <Controller
              name="topic"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reopen-topic">Topic</FieldLabel>
                  <Input
                    {...field}
                    id="reopen-topic"
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g. Issue still happening"
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reopen-description">
                    Why is the issue still unresolved?
                  </FieldLabel>
                  <div className="relative">
                    <Textarea
                      {...field}
                      id="reopen-description"
                      placeholder="Tell the team what's still broken so they don't have to guess."
                      rows={5}
                      className="min-h-24 resize-y pb-8"
                      aria-invalid={fieldState.invalid}
                    />
                    <div className="absolute right-3 bottom-3 text-xs text-muted-foreground tabular-nums pointer-events-none">
                      {field.value.length}/1000
                    </div>
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="location"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reopen-location">Location</FieldLabel>
                  <Input
                    {...field}
                    id="reopen-location"
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g. Library, 2nd floor"
                    autoComplete="off"
                  />
                  <FieldDescription>
                    Optional — where the issue is still occurring.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form="reopen-form"
            disabled={submitting}
            className="min-w-32"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {submitting ? "Re-opening..." : "Re-open ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
