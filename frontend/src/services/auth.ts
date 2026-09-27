import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createElement } from "react";

const baseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export type Role = "ADMIN" | "REVIEWER";
export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  full_name?: string | null;
  is_active: boolean;
}

const ACCESS_KEY = "nmmf.access_token";
const REFRESH_KEY = "nmmf.refresh_token";

// Plain (non-React) token storage so api.ts can read/write it without
// depending on the React context -- avoids a circular import between
// services/api.ts and services/auth.ts.
export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh?: string | null) => {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/**
 * Tries once to exchange the stored refresh token for a new access token.
 * Used both proactively (on app load, if we have a refresh token but no
 * confirmed session yet) and reactively by api.ts when a request comes back
 * 401 (the access token may have simply expired -- this is the standard
 * "silent refresh" pattern). Returns the new access token, or null if the
 * refresh token is missing/invalid (caller should then treat the user as
 * signed out).
 */
export async function trySilentRefresh(): Promise<string | null> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) {
      tokenStore.clear();
      return null;
    }
    const data = await response.json();
    tokenStore.set(data.access_token, data.refresh_token);
    return data.access_token as string;
  } catch {
    return null;
  }
}

export type AuthStatus = "checking" | "disabled" | "guest" | "authenticated";

// A write request that comes back 401 even after a silent-refresh attempt
// means the session is genuinely gone (expired refresh token, revoked user,
// etc). Rather than every page catching that itself, api.ts reports it here
// and AppLayout subscribes once to redirect to /login.
const unauthorizedListeners = new Set<() => void>();
export function onUnauthorized(callback: () => void) {
  unauthorizedListeners.add(callback);
  return () => {
    unauthorizedListeners.delete(callback);
  };
}
export function emitUnauthorized() {
  unauthorizedListeners.forEach((callback) => callback());
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<{ status: AuthStatus; user: AuthUser | null }> {
  const token = tokenStore.getAccess();
  const response = await fetch(`${baseUrl}/auth/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (response.status === 400) {
    // Backend says AUTH_ENABLED=false -- there is no login concept at all.
    return { status: "disabled", user: null };
  }
  if (response.status === 401) {
    const refreshed = await trySilentRefresh();
    if (!refreshed) return { status: "guest", user: null };
    const retry = await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${refreshed}` } });
    if (!retry.ok) return { status: "guest", user: null };
    return { status: "authenticated", user: await retry.json() };
  }
  if (!response.ok) return { status: "guest", user: null };
  return { status: "authenticated", user: await response.json() };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshUser = async () => {
    const result = await fetchMe();
    setStatus(result.status);
    setUser(result.user);
  };

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string) => {
    const form = new URLSearchParams();
    form.set("username", username);
    form.set("password", password);
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        response.status === 429
          ? "Too many failed attempts. Wait a few minutes and try again."
          : detail || "Incorrect username or password.",
      );
    }
    const data = await response.json();
    tokenStore.set(data.access_token, data.refresh_token);
    await refreshUser();
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
    setStatus("guest");
  };

  return createElement(AuthContext.Provider, { value: { status, user, login, logout, refreshUser } }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
