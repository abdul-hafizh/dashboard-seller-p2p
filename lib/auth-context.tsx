"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { ROLE } from "@/lib/constants";

export interface CurrentUserRole {
  Id: number;
  Name: string;
  Description: string | null;
  Permissions?: { Id: number; Code: string; Name: string }[];
}

export interface CurrentUser {
  Id: string;
  FullName: string;
  Email: string;
  Phone: string | null;
  WhatsappNumber: string | null;
  Avatar: string | null;
  RoleId: number;
  Role: CurrentUserRole | null;
  IsActive: boolean;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  isAdmin: boolean;
  isMerchant: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Pure fetch — returns the current user or null, never touches component state.
 * Kept separate from state updates so effects can call it without the
 * setState-in-effect footgun (state is only ever set from a callback). */
async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const res = await apiFetch<CurrentUser>("auth/me");
    return res.data;
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) {
      console.error(error);
    }
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    setLoading(true);
    const nextUser = await fetchCurrentUser();
    setUser(nextUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchCurrentUser().then((nextUser) => {
      if (ignore) return;
      setUser(nextUser);
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.RoleId === ROLE.SUPER_ADMIN,
        isMerchant: user?.RoleId === ROLE.MERCHANT,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
