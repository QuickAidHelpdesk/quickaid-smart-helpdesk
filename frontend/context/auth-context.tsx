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
import { apiPost } from "@/lib/api";
import type { User } from "@/types/user";

const STORAGE_KEY = "quickaid_user";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

async function upsertUser(claims: Record<string, string>, username: string) {
  const oid = claims.oid || claims.sub;
  const displayName = claims.name || "User";
  const email = claims.preferred_username || username || "";

  const res = await apiPost<{ success: boolean; user: User }>(
    "/users/login",
    { user_id: oid, display_name: displayName, email }
  );
  return res.user;
}

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { instance, inProgress } = useMsal();
  const [user, setUser] = useState<User | null>(null);
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
          const savedUser = await upsertUser(claims, result.account?.username || "");
          setUser(savedUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(savedUser));
          window.location.href = "/dashboard";
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
            setUser(JSON.parse(stored));
          } catch {
            localStorage.removeItem(STORAGE_KEY);
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
    localStorage.removeItem(STORAGE_KEY);
    instance.logoutRedirect({ postLogoutRedirectUri: "/login" });
  }, [instance]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
