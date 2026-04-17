"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Ticket, Loader2 } from "lucide-react";

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
  const [submittedTicket, setSubmittedTicket] = React.useState<any>(null);

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

      const response = (await apiPost("/submit_ticket", payload)) as any;

      // Simulate a small delay for animation if needed, or rely on actual request
      await new Promise((resolve) => setTimeout(resolve, 800));

      setSubmittedTicket({
        id: response.ticket_id || "TKT-" + Math.floor(Math.random() * 10000),
        ...payload,
        createdAt: new Date().toLocaleDateString(),
      });
      toast.success("Ticket submitted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit ticket.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full w-full items-center justify-center p-4 gap-6">
      <AnimatePresence mode="wait">
        {!submittedTicket ? (
          <div key="form" className="w-full max-w-2xl flex flex-col gap-6">
            <div className="w-full text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                Create Ticket
              </h1>
              <p className="text-muted-foreground mt-2">
                Submit a new helpdesk ticket and our team will get back to you
                shortly.
              </p>
            </div>
            <Card className="w-full shadow-sm border-muted relative overflow-hidden">
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
                          <Field
                            data-invalid={fieldState.invalid}
                            className="w-full"
                          >
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
                          <Field
                            data-invalid={fieldState.invalid}
                            className="w-full"
                          >
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
                          <FieldLabel htmlFor="description">
                            Description
                          </FieldLabel>
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
                <Button
                  type="submit"
                  form="ticket-form"
                  disabled={isSubmitting}
                  className="min-w-32 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Ticket className="w-4 h-4" />
                    )}
                    {isSubmitting ? "Submitting..." : "Submit Ticket"}
                  </span>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.5 }}
            className="w-full max-w-lg mt-10"
          >
            <Card className="border border-green-500/20 shadow-lg shadow-green-500/10 overflow-hidden bg-linear-to-b from-green-50/50 to-transparent dark:from-green-950/20">
              <CardContent className="p-8 pt-10 flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                  className="rounded-full bg-green-100 p-3 text-green-600 mb-6 dark:bg-green-900/50 dark:text-green-400"
                >
                  <CheckCircle2 className="w-12 h-12" />
                </motion.div>

                <h2 className="text-2xl font-bold mb-2">Ticket Submitted</h2>
                <p className="text-muted-foreground mb-8">
                  Your request has been received. We'll be on it shortly!
                </p>

                <div className="w-full text-left bg-card rounded-xl border p-4 mb-8 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
                  <div className="flex justify-between items-start mb-4 pl-4 border-b pb-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        Ticket ID
                      </p>
                      <p className="font-mono font-medium">
                        {submittedTicket.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        Priority
                      </p>
                      <p className="font-medium text-sm inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 mt-1">
                        {submittedTicket.priority}
                      </p>
                    </div>
                  </div>

                  <div className="pl-4 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                        Subject
                      </p>
                      <p className="font-medium">{submittedTicket.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                        Category
                      </p>
                      <p className="text-sm">{submittedTicket.category}</p>
                    </div>
                  </div>

                  <div className="absolute -left-2 top-1/2 w-4 h-4 rounded-full border border-r-0 bg-background shadow-inner -translate-y-1/2" />
                  <div className="absolute -right-2 top-1/2 w-4 h-4 rounded-full border border-l-0 bg-background shadow-inner -translate-y-1/2" />
                </div>

                <div className="flex gap-4 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSubmittedTicket(null);
                      form.reset();
                    }}
                  >
                    Submit Another
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => router.push("/tickets")}
                  >
                    Go to My Tickets
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
