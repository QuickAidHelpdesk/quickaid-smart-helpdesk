"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
import { apiPost } from "@/lib/api";

const formSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters.")
    .max(100, "Display name must not exceed 100 characters."),
});

export default function AccountPage() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
    },
  });

  React.useEffect(() => {
    if (user?.display_name) {
      form.reset({
        displayName: user.display_name,
      });
    }
  }, [user, form]);

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; user: any }>(
        "/users/login",
        {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          display_name: data.displayName,
        },
      );

      if (res.user) {
        localStorage.setItem("quickaid_user", JSON.stringify(res.user));
        toast.success("Profile updated successfully!");
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full w-full items-center justify-center p-4 gap-6">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="w-full text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Account Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your profile information and account preferences.
          </p>
        </div>

        <Card className="w-full shadow-sm border-muted relative overflow-hidden">
          <CardContent>
            <form
              id="account-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 pb-3"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <FieldDescription>
                    Your email address is managed by your provider and cannot be
                    changed here.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="role">Role</FieldLabel>
                  <Select value={user?.role || ""} disabled>
                    <SelectTrigger id="role" className="bg-muted capitalize">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectGroup>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Your role is assigned by your administrator and cannot be
                    changed here.
                  </FieldDescription>
                </Field>

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
              form="account-form"
              disabled={isSubmitting}
              className="min-w-32 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
