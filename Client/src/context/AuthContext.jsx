import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

/**
 * Small module-level bridge so non-React code (axios interceptors)
 * can clear auth and trigger redirects safely.
 */
const authBridge = {
  getSnapshot: () => ({ user: null, accessToken: null }),
  setAuth: () => {},
  clearAuth: () => {},
};

export function getAuthSnapshot() {
  return authBridge.getSnapshot();
}

export function setAuthExternal(next) {
  authBridge.setAuth(next);
}

export function clearAuthAndRedirectToLogin() {
  authBridge.clearAuth();
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const setAuth = useCallback((next) => {
    setUser(next?.user ?? null);
    setAccessToken(next?.accessToken ?? null);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setAccessToken(null);
  }, []);

  useEffect(() => {
    authBridge.getSnapshot = () => ({ user, accessToken });
    authBridge.setAuth = setAuth;
    authBridge.clearAuth = clearAuth;
  }, [user, accessToken, setAuth, clearAuth]);

  const login = useCallback(async ({ email, password }) => {
    const res = await authApi.login({ email, password });
    setAuth(res);
    return res;
  }, [setAuth]);

  const register = useCallback(async ({ name, email, password, phone }) => {
    const res = await authApi.register({ name, email, password, phone });
    setAuth(res);
    return res;
  }, [setAuth]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      window.location.assign("/login");
    }
  }, [clearAuth]);

  // Bootstrap session: if refresh cookie exists, fetch fresh access token.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authApi.refresh();
        if (!cancelled && res?.accessToken) setAuth(res);
      } catch {
        // No active session, ignore.
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setAuth]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      bootstrapping,
      login,
      logout,
      register,
      setAuth,
      clearAuth,
    }),
    [user, accessToken, bootstrapping, login, logout, register, setAuth, clearAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

