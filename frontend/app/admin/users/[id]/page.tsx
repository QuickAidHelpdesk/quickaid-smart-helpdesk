"use client";

import * as React from "react";
import { use } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuth } from "@/context/auth-context";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { User } from "@/types/user";

const formSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters.")
    .max(100, "Display name must not exceed 100 characters."),
  role: z.enum(["user", "agent", "admin"]),
});

export default function AdminEditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const targetUserId = resolvedParams.id;

  const { user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [targetUser, setTargetUser] = React.useState<User | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      role: "user",
    },
  });

  const fetchUser = React.useCallback(async () => {
    if (!currentUser || !targetUserId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiGet<{ user: User }>(`/users/${targetUserId}`);
      setTargetUser(res.user);
      form.reset({
        displayName: res.user.display_name,
        role: res.user.role,
      });
    } catch (err: any) {
      console.error("Failed to fetch user:", err);
      setError(err.message || "Failed to load user details.");
    } finally {
      setLoading(false);
    }
  }, [targetUserId, currentUser, form]);

  React.useEffect(() => {
    if (currentUser) {
      fetchUser();
    }
  }, [fetchUser, currentUser]);

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!targetUser) return;

    setIsSubmitting(true);
    try {
      // Simply hitting a PATCH endpoint to update role and displayName
      await apiPatch<{ success: boolean; user: any }>(
        `/manage/users/${targetUser.user_id}`,
        {
          role: data.role,
          display_name: data.displayName,
        },
      );

      toast.success("User profile updated successfully!");
      fetchUser(); // Refresh details
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading user details...</p>
      </div>
    );
  }

  if (error || !targetUser) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <div className="bg-destructive/10 p-4 rounded-full">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">User Not Found</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {error ||
            "We couldn't find the user you're looking for. They may have been deleted or you might not have permission to view them."}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/users">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full items-center p-4 gap-6 mt-4">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Breadcrumb section matches the ticket details page */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/users" className="flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Users
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {targetUser.display_name || targetUser.user_id}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* <div className="w-full text-center">
          <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage user profile information and permissions.
          </p>
        </div> */}

        <Card className="w-full shadow-sm border-muted relative overflow-hidden">
          <CardContent className="pt-3">
            <form
              id="admin-user-edit-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 pb-3"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={targetUser.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <FieldDescription>
                    The user's email address cannot be changed.
                  </FieldDescription>
                </Field>

                <Controller
                  name="role"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="role">Role</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="role" className="capitalize">
                          <SelectValue placeholder="Select user role" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectGroup>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Set the user's role and permissions.
                      </FieldDescription>
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
                        placeholder="Enter full name"
                        autoComplete="off"
                      />
                      <FieldDescription>
                        Update the user's display name.
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
              onClick={() =>
                form.reset({
                  displayName: targetUser.display_name,
                  role: targetUser.role,
                })
              }
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              form="admin-user-edit-form"
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
