"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { VALID_CATEGORIES, VALID_PRIORITIES } from "@/config/enums";

const formSchema = z.object({
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters.")
    .max(100, "Subject must not exceed 100 characters."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters.")
    .max(1000, "Description must not exceed 1000 characters."),
  category: z.enum(VALID_CATEGORIES, {
    message: "Please select a valid category.",
  }),
  priority: z.enum(VALID_PRIORITIES, {
    message: "Please select a valid priority.",
  }),
});

export default function CreateTicketPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      description: "",
      category: "IT Support",
      priority: "Low",
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!user?.email) {
      toast.error("You must be logged in to submit a ticket.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...data,
        email: user.email,
        status: "Open",
      };

      await apiPost("/submit_ticket", payload);

      toast.success("Ticket submitted successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit ticket.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full w-full items-center justify-center p-4 gap-6">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight">Create Ticket</h1>
        <p className="text-muted-foreground mt-2">
          Submit a new helpdesk ticket and our team will get back to you
          shortly.
        </p>
      </div>
      <Card className="w-full max-w-2xl shadow-sm border-muted">
        <CardContent>
          <form
            id="ticket-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="category"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="w-full">
                      <FieldLabel htmlFor="category">Category</FieldLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger
                          id="category"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectGroup>
                            {VALID_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="priority"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="w-full">
                      <FieldLabel htmlFor="priority">Priority</FieldLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger
                          id="priority"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectGroup>
                            {VALID_PRIORITIES.map((pri) => (
                              <SelectItem key={pri} value={pri}>
                                {pri}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="subject"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="subject">Subject</FieldLabel>
                    <Input
                      {...field}
                      id="subject"
                      aria-invalid={fieldState.invalid}
                      placeholder="Brief summary of your issue"
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
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <div className="relative">
                      <Textarea
                        {...field}
                        id="description"
                        placeholder="Please provide detailed information about your issue..."
                        rows={8}
                        className="min-h-32 resize-y pb-8"
                        aria-invalid={fieldState.invalid}
                      />
                      <div className="absolute right-3 bottom-3 text-xs text-muted-foreground pointer-events-nonetabular-nums">
                        {field.value.length}/1000 characters
                      </div>
                    </div>
                    <FieldDescription>
                      Include any steps to reproduce or helpful context.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between border-t bg-muted/20 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isSubmitting}
          >
            Reset
          </Button>
          <Button type="submit" form="ticket-form" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Ticket"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
