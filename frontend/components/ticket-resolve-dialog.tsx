"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

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

interface TicketResolveDialogProps {
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: () => void;
}

export function TicketResolveDialog({
  ticketId,
  open,
  onOpenChange,
  onResolved,
}: TicketResolveDialogProps) {
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
      await apiPost(`/tickets/${ticketId}/finish`, payload);
      toast.success("Ticket resolved.");
      onOpenChange(false);
      onResolved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to resolve ticket.";
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
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Mark ticket as resolved
          </DialogTitle>
          <DialogDescription>
            This will set the ticket status to Resolved and notify the user by email.
          </DialogDescription>
        </DialogHeader>

        <form
          id="resolve-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FieldGroup>
            <Controller
              name="topic"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="resolve-topic">Resolution topic</FieldLabel>
                  <Input
                    {...field}
                    id="resolve-topic"
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g. Resolved by network reset"
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
                  <FieldLabel htmlFor="resolve-description">
                    What was done
                  </FieldLabel>
                  <div className="relative">
                    <Textarea
                      {...field}
                      id="resolve-description"
                      placeholder="Describe the resolution so the user has a clear answer."
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
                  <FieldLabel htmlFor="resolve-location">Location</FieldLabel>
                  <Input
                    {...field}
                    id="resolve-location"
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g. Server room A"
                    autoComplete="off"
                  />
                  <FieldDescription>Optional — where the fix was applied.</FieldDescription>
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
            form="resolve-form"
            disabled={submitting}
            className="min-w-32"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {submitting ? "Resolving..." : "Resolve ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
