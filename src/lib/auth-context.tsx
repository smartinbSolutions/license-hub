import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { API_BASE_URL } from "./api-config";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ resetToken?: string }>;
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
}

const tokenKey = "posLicenseAdminToken";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function authRequest<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = await response.json();
      message = body.error ?? message;
    } catch {
      // Keep the status-based message.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getStoredAdminToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(tokenKey);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = getStoredAdminToken();
    setToken(storedToken);

    if (!storedToken) {
      setLoading(false);
      return;
    }

    authRequest<{ user: AdminUser | null }>("/api/auth/me", undefined, storedToken)
      .then((result) => {
        setUser(result.user);
        if (!result.user) window.localStorage.removeItem(tokenKey);
      })
      .catch(() => {
        window.localStorage.removeItem(tokenKey);
        setUser(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    loading,
    signIn: async (email, password) => {
      const result = await authRequest<{ token: string; user: AdminUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      window.localStorage.setItem(tokenKey, result.token);
      setToken(result.token);
      setUser(result.user);
    },
    logout: async () => {
      const currentToken = getStoredAdminToken();
      if (currentToken) {
        await authRequest<void>("/api/auth/logout", { method: "POST" }, currentToken);
      }
      window.localStorage.removeItem(tokenKey);
      setToken(null);
      setUser(null);
    },
    resetPassword: async (email) => {
      return authRequest<{ ok: boolean; resetToken?: string }>("/api/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },
    confirmPasswordReset: async (resetToken, password) => {
      await authRequest<{ ok: boolean }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, password }),
      });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
