"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { useAuth } from "@/context/auth-context";

const formSchema = z
  .object({
    displayName: z
      .string()
      .min(2, "Display name must be at least 2 characters.")
      .max(100, "Display name must not exceed 100 characters."),
    email: z
      .string()
      .min(1, "Email is required.")
      .email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must not exceed 128 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type SignupFormValues = z.infer<typeof formSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signupWithPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  async function onSubmit(data: SignupFormValues) {
    setIsSubmitting(true);
    try {
      await signupWithPassword(
        data.displayName.trim(),
        data.email.trim().toLowerCase(),
        data.password
      );
      // persistSession redirects to /dashboard
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-up failed. Please try again.";
      toast.error(message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full w-full items-center justify-center p-4 gap-6">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="w-full text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Create your account
          </h1>
          <p className="text-muted-foreground mt-2">
            Sign up with email and password to start using QuickAid.
          </p>
        </div>
        <Card className="w-full shadow-sm border-muted relative overflow-hidden">
          <CardContent>
            <form
              id="signup-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 pb-3"
              noValidate
            >
              <FieldGroup>
                <Controller
                  name="displayName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="displayName">
                        Display Name
                      </FieldLabel>
                      <Input
                        {...field}
                        id="displayName"
                        placeholder="Enter your full name"
                        autoComplete="name"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <Input
                        {...field}
                        id="password"
                        type="password"
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="confirmPassword"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="confirmPassword">
                        Confirm Password
                      </FieldLabel>
                      <Input
                        {...field}
                        id="confirmPassword"
                        type="password"
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium underline underline-offset-4 hover:text-primary"
              >
                Sign in
              </Link>
            </p>
            <Button
              type="submit"
              form="signup-form"
              disabled={isSubmitting}
              className="min-w-32 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {isSubmitting ? "Creating..." : "Create account"}
              </span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
