import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthUser, getCurrentUser, login as loginRequest, logout as logoutRequest } from "../api.js";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  // Called after a successful password change so the shell immediately
  // knows mustChangePassword is now false, without a second round trip.
  markPasswordChanged: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    registerGlobalUnauthorizedHandler(() => setUser(null));
    return () => registerGlobalUnauthorizedHandler(() => {});
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedInUser = await loginRequest(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const markPasswordChanged = useCallback(() => {
    setUser((current) => (current ? { ...current, mustChangePassword: false } : current));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, markPasswordChanged }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

// Shared handler for a 401 received from any API call made after initial
// load (e.g. the session expired, or the account was deactivated mid-session
// per AC-27). Pages/components that catch an ApiError with status 401
// should call this instead of duplicating the "clear user, go to /login"
// logic themselves. Exported separately from the hook so it's usable from
// plain async functions, not just inside a render.
let globalLogoutHandler: (() => void) | null = null;

export function registerGlobalUnauthorizedHandler(handler: () => void) {
  globalLogoutHandler = handler;
}

export function triggerGlobalUnauthorized() {
  globalLogoutHandler?.();
}
