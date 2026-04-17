"use client";

import * as React from "react";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { useAuth } from "@/context/auth-context";

const formSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters.")
    .max(100, "Display name must not exceed 100 characters."),
  role: z.enum(["student", "staff", "admin"], {
    message: "Please select a valid role.",
  }),
});

export default function RegisterPage() {
  const router = useRouter();
  const {
    pendingUser,
    completeRegistration,
    isLoading: authLoading,
  } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: pendingUser?.display_name || "",
      // we type-cast empty string to trigger validation if left empty
      role: "" as any,
    },
  });

  React.useEffect(() => {
    if (pendingUser?.display_name) {
      form.setValue("displayName", pendingUser.display_name);
    }
  }, [pendingUser, form]);

  if (!authLoading && !pendingUser) {
    router.replace("/login");
    return null;
  }

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await completeRegistration(data.displayName.trim(), data.role);
      toast.success("Profile completed successfully!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full w-full items-center justify-center p-4 gap-6">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="w-full text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Complete Your Profile
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome to QuickAid! Please fill in your details to get started.
          </p>
        </div>
        <Card className="w-full shadow-sm border-muted relative overflow-hidden">
          <CardContent>
            <form
              id="register-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 pb-3"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={pendingUser?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  {/* <FieldDescription>
                    Your email matches your SSO provider.
                  </FieldDescription> */}
                </Field>

                <Controller
                  name="role"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="role">Role</FieldLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger
                          id="role"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectGroup>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
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
                        aria-invalid={fieldState.invalid}
                        placeholder="Enter your full name"
                        autoComplete="off"
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
          <CardFooter className="flex justify-end border-t bg-muted/20 px-6 py-4">
            <Button
              type="submit"
              form="register-form"
              disabled={isSubmitting}
              className="min-w-32 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {isSubmitting ? "Setting up..." : "Get Started"}
              </span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
