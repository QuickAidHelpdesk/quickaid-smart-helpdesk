"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const { login, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // True when returning from Microsoft redirect (MSAL processing)
  const isRedirecting = authLoading || user;

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await login();
      // Page redirects to Microsoft — won't reach here
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      {isRedirecting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Signing you in...
          </p>
        </div>
      )}
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Welcome!</CardTitle>
              <CardDescription>
                Sign in to your QuickAid account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {error && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}
                <Button
                  variant="outline"
                  className="w-full flex items-center gap-3 relative h-11"
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 21 21"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                    </svg>
                  )}
                  <span className="font-medium text-foreground">
                    {isLoading ? "Signing in..." : "Continue with Entra ID"}
                  </span>
                </Button>
              </div>
              <div className="mt-4 text-center text-sm text-balance text-muted-foreground">
                By clicking continue, you agree to our{" "}
                <Link
                  href="/terms"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Privacy Policy
                </Link>
                .
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
