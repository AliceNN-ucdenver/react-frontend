import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { AuthUser, JwtPayload, UserRole } from '@/types/user';
import { auditLogger } from '@/services/auditLogger';

const API_BASE = import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:8080';

/** Seconds before token expiry to trigger silent refresh */
const REFRESH_BUFFER_SECONDS = 60;

interface LoginResponse {
  accessToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Decode a JWT payload without verifying the signature.
 * For display purposes ONLY — never use for authorization decisions.
 * All authorization is enforced server-side (OWASP A07).
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = (parts[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function jwtToAuthUser(payload: JwtPayload): AuthUser {
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    displayName: payload.displayName,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // JWT stored in memory ONLY — never localStorage/sessionStorage (OWASP A07)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const applyToken = useCallback(
    (accessToken: string) => {
      const payload = decodeJwtPayload(accessToken);
      if (!payload) return;

      setToken(accessToken);
      const authUser = jwtToAuthUser(payload);
      setUser(authUser);
      auditLogger.setUser(authUser.id);

      // Schedule silent refresh 60s before expiry
      const nowSeconds = Math.floor(Date.now() / 1000);
      const secondsUntilRefresh = payload.exp - nowSeconds - REFRESH_BUFFER_SECONDS;

      clearRefreshTimer();

      if (secondsUntilRefresh > 0) {
        refreshTimerRef.current = setTimeout(() => {
          void silentRefresh();
        }, secondsUntilRefresh * 1000);
      }
    },
    [clearRefreshTimer] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const silentRefresh = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // httpOnly refresh cookie sent automatically
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = (await response.json()) as LoginResponse;
        applyToken(data.accessToken);
        auditLogger.logTokenRefresh();
      } else {
        // Refresh failed — clear session
        setToken(null);
        setUser(null);
        auditLogger.setUser(null);
        clearRefreshTimer();
      }
    } catch {
      // Network error during refresh — clear session gracefully
      setToken(null);
      setUser(null);
      auditLogger.setUser(null);
      clearRefreshTimer();
    }
  }, [applyToken, clearRefreshTimer]);

  // Attempt silent refresh on mount (handles page reloads with valid refresh cookie)
  useEffect(() => {
    void silentRefresh();
    return clearRefreshTimer;
  }, [silentRefresh, clearRefreshTimer]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        await auditLogger.logLoginFailed(email);
        throw new Error('Invalid email or password');
      }

      const data = (await response.json()) as LoginResponse;
      applyToken(data.accessToken);
      await auditLogger.logLogin(email);
    },
    [applyToken]
  );

  const logout = useCallback(async (): Promise<void> => {
    auditLogger.logLogout();
    clearRefreshTimer();

    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Best-effort — always clear local state regardless
    }

    setToken(null);
    setUser(null);
    auditLogger.setUser(null);
    auditLogger.resetSession();
  }, [clearRefreshTimer]);

  const hasRole = useCallback(
    (role: UserRole): boolean => {
      if (!user) return false;
      if (role === 'viewer') return true; // all authenticated users have viewer access
      if (role === 'reviewer') return user.role === 'reviewer' || user.role === 'admin';
      return user.role === 'admin';
    },
    [user]
  );

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: token !== null && user !== null,
    login,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
