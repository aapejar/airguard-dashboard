import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { User, UserRole } from '@/types/sensor';
import { authService, type LoginResponse, type Verify2FAResponse } from '@/services/authService';
import { auditBus } from '@/services/auditBus';
import { config } from '@/config';

const SESSION_KEY = 'airguard.session';
const ATTEMPTS_KEY = 'airguard.loginAttempts';
const LOCKOUT_KEY = 'airguard.loginLockedUntil';

// ── Public auth result shape (UI never sees raw service responses) ──────
export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; requires2FA: true; pendingUser: User; challengeId: string }
  | { ok: false; error: string };

interface AuthContextType {
  user: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Number of failed attempts since last success */
  failedAttempts: number;
  /** Timestamp (ms) until which login is locked, or null */
  lockedUntil: number | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  verify2FA: (challengeId: string, pendingUser: User, code: string) => Promise<boolean>;
  logout: (reason?: 'manual' | 'inactivity') => void;
  createUser: (username: string, password: string, role: UserRole) => { ok: boolean; error?: string };
  deleteUser: (id: string) => void;
  updateUserRole: (id: string, role: UserRole) => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => authService.listUsers());
  const [isLoading, setIsLoading] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    return raw ? Number(raw) || 0 : 0;
  });
  const [lockedUntil, setLockedUntil] = useState<number | null>(() => {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return null;
    const ts = Number(raw);
    return ts && ts > Date.now() ? ts : null;
  });

  const inactivityTimerRef = useRef<number | null>(null);

  // ── Hydrate session ───────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  }, []);

  const persistSession = (u: User | null) => {
    if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    else localStorage.removeItem(SESSION_KEY);
  };

  // ── Failed attempts persistence ───────────────────────
  const recordFailedAttempt = useCallback(() => {
    setFailedAttempts(prev => {
      const next = prev + 1;
      localStorage.setItem(ATTEMPTS_KEY, String(next));
      if (next >= config.maxLoginAttempts) {
        const until = Date.now() + config.loginLockoutDuration;
        localStorage.setItem(LOCKOUT_KEY, String(until));
        setLockedUntil(until);
      }
      return next;
    });
  }, []);

  const resetAttempts = useCallback(() => {
    setFailedAttempts(0);
    setLockedUntil(null);
    localStorage.removeItem(ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_KEY);
  }, []);

  // ── Login ─────────────────────────────────────────────
  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      // Lockout check
      if (lockedUntil && Date.now() < lockedUntil) {
        const remain = Math.ceil((lockedUntil - Date.now()) / 1000);
        return { ok: false, error: `Too many failed attempts. Try again in ${remain}s.` };
      }
      if (lockedUntil && Date.now() >= lockedUntil) resetAttempts();

      const result: LoginResponse = await authService.login(username, password);

      if (result.status === 'invalid_credentials') {
        recordFailedAttempt();
        auditBus.emit({
          level: 'warning',
          message: `Failed login attempt for "${username}"`,
          source: 'auth',
          actor: username,
        });
        return { ok: false, error: 'Invalid username or password' };
      }

      if (result.status === 'requires_2fa') {
        // Don't reset attempts yet — only after full verification
        auditBus.emit({
          level: 'info',
          message: `2FA challenge issued for "${result.pendingUser.username}"`,
          source: 'auth',
          actor: result.pendingUser.username,
        });
        return {
          ok: false,
          requires2FA: true,
          pendingUser: result.pendingUser,
          challengeId: result.challengeId,
        };
      }

      // Success (non-admin)
      resetAttempts();
      setUser(result.user);
      persistSession(result.user);
      auditBus.emit({
        level: 'info',
        message: `User "${result.user.username}" signed in`,
        source: 'auth',
        actor: result.user.username,
      });
      return { ok: true, user: result.user };
    },
    [lockedUntil, recordFailedAttempt, resetAttempts],
  );

  // ── 2FA verification ──────────────────────────────────
  const verify2FA = useCallback(
    async (challengeId: string, pendingUser: User, code: string): Promise<boolean> => {
      const res: Verify2FAResponse = await authService.verify2FA(challengeId, pendingUser, code);
      if (res.status === 'invalid_code') {
        recordFailedAttempt();
        auditBus.emit({
          level: 'warning',
          message: `Invalid 2FA code for "${pendingUser.username}"`,
          source: 'auth',
          actor: pendingUser.username,
        });
        return false;
      }
      resetAttempts();
      setUser(res.user);
      persistSession(res.user);
      auditBus.emit({
        level: 'info',
        message: `Admin "${res.user.username}" signed in (2FA verified)`,
        source: 'auth',
        actor: res.user.username,
      });
      return true;
    },
    [recordFailedAttempt, resetAttempts],
  );

  // ── Logout ────────────────────────────────────────────
  const logout = useCallback((reason: 'manual' | 'inactivity' = 'manual') => {
    const username = user?.username;
    setUser(null);
    persistSession(null);
    void authService.logout();
    if (username) {
      auditBus.emit({
        level: reason === 'inactivity' ? 'warning' : 'info',
        message:
          reason === 'inactivity'
            ? `Session ended for "${username}" (inactivity timeout)`
            : `User "${username}" signed out`,
        source: 'auth',
        actor: username,
      });
    }
  }, [user]);

  // ── Inactivity auto-logout ────────────────────────────
  useEffect(() => {
    if (!user) return;
    const reset = () => {
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = window.setTimeout(() => {
        logout('inactivity');
      }, config.sessionInactivityTimeout);
    };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [user, logout]);

  // ── User CRUD (admin) ─────────────────────────────────
  const createUser = useCallback((username: string, password: string, role: UserRole) => {
    const res = authService.createUser(username, password, role);
    if (res.ok) {
      setUsers(authService.listUsers());
      auditBus.emit({
        level: 'info',
        message: `User "${username}" (${role}) created`,
        source: 'auth',
        actor: user?.username,
      });
    }
    return { ok: res.ok, error: res.error };
  }, [user]);

  const deleteUser = useCallback((id: string) => {
    const target = users.find(u => u.id === id);
    authService.deleteUser(id);
    setUsers(authService.listUsers());
    if (target) {
      auditBus.emit({
        level: 'info',
        message: `User "${target.username}" deleted`,
        source: 'auth',
        actor: user?.username,
      });
    }
  }, [user, users]);

  const updateUserRole = useCallback((id: string, role: UserRole) => {
    authService.updateUserRole(id, role);
    setUsers(authService.listUsers());
    const target = users.find(u => u.id === id);
    if (target) {
      auditBus.emit({
        level: 'info',
        message: `User "${target.username}" role changed to ${role}`,
        source: 'auth',
        actor: user?.username,
      });
    }
  }, [user, users]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        isAuthenticated: !!user,
        isLoading,
        failedAttempts,
        lockedUntil,
        login,
        verify2FA,
        logout,
        createUser,
        deleteUser,
        updateUserRole,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
