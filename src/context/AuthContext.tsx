import {
  createContext, useContext, useState, useCallback, useEffect, useRef,
  type ReactNode,
} from 'react';
import type { User, UserRole } from '@/types/sensor';
import { authService, type LoginResponse, type Verify2FAResponse } from '@/services/authService';
import { auditBus } from '@/services/auditBus';
import { config } from '@/config';

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; requires2FA: true; pendingUser: User; challengeId: string }
  | { ok: false; error: string };

interface AuthContextType {
  user: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  verify2FA: (challengeId: string, pendingUser: User, code: string) => Promise<boolean>;
  logout: (reason?: 'manual' | 'inactivity') => void;
  reloadUsers: () => Promise<void>;
  createUser: (username: string, password: string, role: UserRole) => Promise<{ ok: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<void>;
  updateUserRole: (id: string, role: UserRole) => Promise<void>;
  setUserStatus: (id: string, status: 'active' | 'disabled') => Promise<void>;
  setUser2FA: (id: string, enabled: boolean) => Promise<void>;
  resetUserPassword: (id: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ATTEMPTS_KEY = 'airguard.loginAttempts';
const LOCKOUT_KEY = 'airguard.loginLockedUntil';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const raw = localStorage.getItem(ATTEMPTS_KEY); return raw ? Number(raw) || 0 : 0;
  });
  const [lockedUntil, setLockedUntil] = useState<number | null>(() => {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return null;
    const ts = Number(raw);
    return ts && ts > Date.now() ? ts : null;
  });

  const inactivityTimerRef = useRef<number | null>(null);

  // Restore session from refresh token
  useEffect(() => {
    (async () => {
      try {
        const u = await authService.restoreSession();
        if (u) setUser(u);
      } finally { setIsLoading(false); }
    })();
  }, []);

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

  const reloadUsers = useCallback(async () => {
    try { setUsers(await authService.listUsers()); }
    catch { /* tolerate; admins-only endpoint */ }
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      if (lockedUntil && Date.now() < lockedUntil) {
        const remain = Math.ceil((lockedUntil - Date.now()) / 1000);
        return { ok: false, error: `Too many failed attempts. Try again in ${remain}s.` };
      }
      if (lockedUntil && Date.now() >= lockedUntil) resetAttempts();

      let result: LoginResponse;
      try { result = await authService.login(username, password); }
      catch (err) {
        const msg = err instanceof Error ? err.message : 'Authentication service unavailable';
        return { ok: false, error: msg };
      }

      if (result.status === 'invalid_credentials') {
        recordFailedAttempt();
        auditBus.emit({ level: 'warning', message: `Failed login attempt for "${username}"`, source: 'auth', actor: username });
        return { ok: false, error: result.message ?? 'Invalid username or password' };
      }
      if (result.status === 'requires_2fa') {
        auditBus.emit({ level: 'info', message: `2FA challenge issued for "${result.pendingUser.username}"`, source: 'auth', actor: result.pendingUser.username });
        return { ok: false, requires2FA: true, pendingUser: result.pendingUser, challengeId: result.challengeId };
      }

      resetAttempts();
      setUser(result.user);
      auditBus.emit({ level: 'info', message: `User "${result.user.username}" signed in`, source: 'auth', actor: result.user.username });
      return { ok: true, user: result.user };
    },
    [lockedUntil, recordFailedAttempt, resetAttempts],
  );

  const verify2FA = useCallback(
    async (challengeId: string, pendingUser: User, code: string): Promise<boolean> => {
      let res: Verify2FAResponse;
      try { res = await authService.verify2FA(challengeId, pendingUser, code); }
      catch { return false; }
      if (res.status === 'invalid_code') {
        recordFailedAttempt();
        auditBus.emit({ level: 'warning', message: `Invalid 2FA code for "${pendingUser.username}"`, source: 'auth', actor: pendingUser.username });
        return false;
      }
      resetAttempts();
      setUser(res.user);
      auditBus.emit({ level: 'info', message: `User "${res.user.username}" signed in (2FA verified)`, source: 'auth', actor: res.user.username });
      return true;
    },
    [recordFailedAttempt, resetAttempts],
  );

  const logout = useCallback((reason: 'manual' | 'inactivity' = 'manual') => {
    const username = user?.username;
    setUser(null);
    setUsers([]);
    void authService.logout();
    if (username) {
      auditBus.emit({
        level: reason === 'inactivity' ? 'warning' : 'info',
        message: reason === 'inactivity'
          ? `Session ended for "${username}" (inactivity timeout)`
          : `User "${username}" signed out`,
        source: 'auth', actor: username,
      });
    }
  }, [user]);

  // Inactivity auto-logout
  useEffect(() => {
    if (!user) return;
    const reset = () => {
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = window.setTimeout(() => logout('inactivity'), config.sessionInactivityTimeout);
    };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [user, logout]);

  // Auto-load users when an admin signs in
  useEffect(() => {
    if (user?.role === 'admin') void reloadUsers();
    else setUsers([]);
  }, [user, reloadUsers]);

  const createUser = useCallback(async (username: string, password: string, role: UserRole) => {
    const res = await authService.createUser(username, password, role);
    if (res.ok) {
      await reloadUsers();
      auditBus.emit({ level: 'info', message: `User "${username}" (${role}) created`, source: 'auth', actor: user?.username });
    }
    return { ok: res.ok, error: res.error };
  }, [user, reloadUsers]);

  const deleteUser = useCallback(async (id: string) => {
    const target = users.find(u => u.id === id);
    await authService.deleteUser(id);
    await reloadUsers();
    if (target) auditBus.emit({ level: 'info', message: `User "${target.username}" deleted`, source: 'auth', actor: user?.username });
  }, [user, users, reloadUsers]);

  const updateUserRole = useCallback(async (id: string, role: UserRole) => {
    await authService.updateUserRole(id, role);
    await reloadUsers();
    const target = users.find(u => u.id === id);
    if (target) auditBus.emit({ level: 'info', message: `User "${target.username}" role changed to ${role}`, source: 'auth', actor: user?.username });
  }, [user, users, reloadUsers]);

  const setUserStatus = useCallback(async (id: string, status: 'active' | 'disabled') => {
    await authService.setUserStatus(id, status);
    await reloadUsers();
    const target = users.find(u => u.id === id);
    if (target) auditBus.emit({
      level: status === 'disabled' ? 'warning' : 'info',
      message: `User "${target.username}" ${status === 'disabled' ? 'disabled' : 'enabled'}`,
      source: 'auth', actor: user?.username,
    });
  }, [user, users, reloadUsers]);

  const setUser2FA = useCallback(async (id: string, enabled: boolean) => {
    await authService.setUser2FA(id, enabled);
    await reloadUsers();
    const target = users.find(u => u.id === id);
    if (target) auditBus.emit({ level: 'info', message: `2FA ${enabled ? 'enabled' : 'disabled'} for "${target.username}"`, source: 'auth', actor: user?.username });
  }, [user, users, reloadUsers]);

  const resetUserPassword = useCallback(async (id: string, newPassword: string) => {
    const res = await authService.resetPassword(id, newPassword);
    const target = users.find(u => u.id === id);
    if (res.ok && target) auditBus.emit({ level: 'warning', message: `Password reset for "${target.username}"`, source: 'auth', actor: user?.username });
    return res;
  }, [user, users]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user, users,
        isAuthenticated: !!user,
        isLoading,
        failedAttempts, lockedUntil,
        login, verify2FA, logout, reloadUsers,
        createUser, deleteUser, updateUserRole, setUserStatus, setUser2FA, resetUserPassword,
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
