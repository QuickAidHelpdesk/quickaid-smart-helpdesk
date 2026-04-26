"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
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

interface TicketCommentFormProps {
  ticketId: string;
  onPosted: () => void;
}

export function TicketCommentForm({
  ticketId,
  onPosted,
}: TicketCommentFormProps) {
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { topic: "", description: "", location: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      setSubmitting(true);
      const payload = {
        topic: values.topic.trim(),
        description: values.description.trim(),
        location: values.location?.trim() || null,
      };
      await apiPost(`/tickets/${ticketId}/comments`, payload);
      toast.success("Progress entry posted.");
      form.reset();
      onPosted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post entry.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        <Controller
          name="topic"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="comment-topic">Topic</FieldLabel>
              <Input
                {...field}
                id="comment-topic"
                aria-invalid={fieldState.invalid}
                placeholder="e.g. Need more info"
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
              <FieldLabel htmlFor="comment-description">Description</FieldLabel>
              <div className="relative">
                <Textarea
                  {...field}
                  id="comment-description"
                  placeholder="Share an update, ask a question, or answer one."
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
              <FieldLabel htmlFor="comment-location">Location</FieldLabel>
              <Input
                {...field}
                id="comment-location"
                aria-invalid={fieldState.invalid}
                placeholder="e.g. Library, 2nd floor"
                autoComplete="off"
              />
              <FieldDescription>Optional — where the issue occurs.</FieldDescription>
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="min-w-32">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Posting..." : "Post Update"}
        </Button>
      </div>
    </form>
  );
}
