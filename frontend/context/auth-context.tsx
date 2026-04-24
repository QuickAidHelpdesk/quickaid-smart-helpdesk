"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { MsalProvider, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import {
  msalInstance,
  msalInitPromise,
  loginRequest,
} from "@/lib/msal-config";
import { apiGet, apiPost } from "@/lib/api";
import type { User } from "@/types/user";

const STORAGE_KEY = "quickaid_user";
const PENDING_KEY = "quickaid_pending";
const SESSION_COOKIE = "quickaid_session";

function setSessionCookie(email: string) {
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(email)}; path=/; max-age=86400; SameSite=Lax`;
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}

function getDashboardPath(role: string): string {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "agent":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}

export interface PendingUser {
  user_id: string;
  display_name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  pendingUser: PendingUser | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  completeRegistration: (displayName: string, role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  pendingUser: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  completeRegistration: async () => {},
});

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { instance, inProgress } = useMsal();
  const [user, setUser] = useState<User | null>(null);
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: initialize MSAL, handle redirect response if returning from Microsoft
  useEffect(() => {
    let cancelled = false;

    async function init() {
      await msalInitPromise;
      try {
        const result = await instance.handleRedirectPromise();
        if (result && !cancelled) {
          const claims = result.idTokenClaims as Record<string, string>;
          const oid = claims.oid || claims.sub;
          const displayName = claims.name || "";
          const email = (claims.preferred_username || result.account?.username || "").toLowerCase();

          // Check if user already exists in Cosmos DB
          try {
            const existing = await apiGet<{ user: User }>(
              `/users?email=${encodeURIComponent(email)}`
            );
            // Existing user — upsert and go to dashboard
            const res = await apiPost<{ success: boolean; user: User }>(
              "/users/login",
              { user_id: oid, display_name: existing.user.display_name, email }
            );
            setUser(res.user);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
            setSessionCookie(res.user.email);
            window.location.href = getDashboardPath(res.user.role);
          } catch {
            // User not found (404) — new user, show registration
            const pending: PendingUser = { user_id: oid, display_name: displayName, email };
            setPendingUser(pending);
            localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
            setIsLoading(false);
            window.location.href = "/register";
          }
          return;
        }
      } catch (err) {
        console.error("MSAL redirect error:", err);
      }

      // No redirect response — hydrate from localStorage
      if (!cancelled) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setUser(parsed);
            setSessionCookie(parsed.email);
          } catch {
            localStorage.removeItem(STORAGE_KEY);
            clearSessionCookie();
          }
        } else {
          clearSessionCookie();
        }

        // Hydrate pending user if on /register
        const pendingStored = localStorage.getItem(PENDING_KEY);
        if (pendingStored) {
          try {
            setPendingUser(JSON.parse(pendingStored));
          } catch {
            localStorage.removeItem(PENDING_KEY);
          }
        }

        setIsLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [instance]);

  const login = useCallback(async () => {
    if (inProgress !== InteractionStatus.None) return;
    // Redirect to Microsoft — page navigates away
    await instance.loginRedirect(loginRequest);
  }, [instance, inProgress]);

  const logout = useCallback(() => {
    setUser(null);
    setPendingUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PENDING_KEY);
    clearSessionCookie();
    instance.logoutRedirect({ postLogoutRedirectUri: "/login" });
  }, [instance]);

  const completeRegistration = useCallback(
    async (displayName: string, role: string) => {
      const pending = pendingUser || JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
      if (!pending) throw new Error("No pending registration found.");

      const res = await apiPost<{ success: boolean; user: User }>(
        "/users/login",
        {
          user_id: pending.user_id,
          display_name: displayName,
          email: pending.email,
          role,
        }
      );

      setUser(res.user);
      setPendingUser(null);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
      localStorage.removeItem(PENDING_KEY);
      setSessionCookie(res.user.email);
      window.location.href = getDashboardPath(res.user.role);
    },
    [pendingUser]
  );

  return (
    <AuthContext.Provider
      value={{ user, pendingUser, isLoading, login, logout, completeRegistration }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </MsalProvider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
