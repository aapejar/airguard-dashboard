import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types/sensor';

const SESSION_KEY = 'airguard.session';
const USERS_KEY = 'airguard.users';
const TWOFA_CODE = '123456';

interface StoredUser extends User {
  password: string;
}

const defaultUsers: StoredUser[] = [
  { id: '1', username: 'admin', role: 'admin', password: 'admin123' },
  { id: '2', username: 'operator', role: 'operator', password: 'operator123' },
  { id: '3', username: 'viewer', role: 'user', password: 'user123' },
];

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return defaultUsers;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
    return defaultUsers;
  } catch {
    return defaultUsers;
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; requires2FA: true; pendingUser: User }
  | { ok: false; error: string };

interface AuthContextType {
  user: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  verify2FA: (pendingUser: User, code: string) => Promise<boolean>;
  logout: () => void;
  createUser: (username: string, password: string, role: UserRole) => { ok: boolean; error?: string };
  deleteUser: (id: string) => void;
  updateUserRole: (id: string, role: UserRole) => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<StoredUser[]>(() => loadUsers());
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Persist users
  useEffect(() => {
    saveUsers(users);
  }, [users]);

  const persistSession = (u: User | null) => {
    if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    else localStorage.removeItem(SESSION_KEY);
  };

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      // Simulate latency
      await new Promise(r => setTimeout(r, 400));
      const found = users.find(u => u.username === username && u.password === password);
      if (!found) return { ok: false, error: 'Invalid username or password' };

      const publicUser: User = { id: found.id, username: found.username, role: found.role };

      // Admin requires 2FA
      if (found.role === 'admin') {
        return { ok: false, requires2FA: true, pendingUser: publicUser };
      }
      setUser(publicUser);
      persistSession(publicUser);
      return { ok: true, user: publicUser };
    },
    [users],
  );

  const verify2FA = useCallback(async (pendingUser: User, code: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 350));
    if (code.trim() !== TWOFA_CODE) return false;
    setUser(pendingUser);
    persistSession(pendingUser);
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    persistSession(null);
  }, []);

  const createUser = useCallback(
    (username: string, password: string, role: UserRole) => {
      if (!username.trim() || !password.trim()) return { ok: false, error: 'Username and password required' };
      if (users.some(u => u.username === username)) return { ok: false, error: 'Username already exists' };
      const newUser: StoredUser = {
        id: `u-${Date.now()}`,
        username: username.trim(),
        password,
        role,
      };
      setUsers(prev => [...prev, newUser]);
      return { ok: true };
    },
    [users],
  );

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const updateUserRole = useCallback((id: string, role: UserRole) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, role } : u)));
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user],
  );

  const publicUsers: User[] = users.map(({ id, username, role }) => ({ id, username, role }));

  return (
    <AuthContext.Provider
      value={{
        user,
        users: publicUsers,
        isAuthenticated: !!user,
        isLoading,
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
