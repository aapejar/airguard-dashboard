/**
 * AuthService — thin client over the AirGuard backend `/api/auth/*` routes.
 * All credentials are validated server-side; this module never holds passwords.
 */
import type { User, UserRole } from '@/types/sensor';
import { apiFetch, ApiError } from '@/services/api';
import { tokenStore } from '@/services/tokenStore';
import { config } from '@/config';

export type LoginResponse =
  | { status: 'success'; user: User }
  | { status: 'requires_2fa'; pendingUser: User; challengeId: string }
  | { status: 'invalid_credentials'; message?: string };

export type Verify2FAResponse =
  | { status: 'success'; user: User }
  | { status: 'invalid_code'; message?: string };

interface BackendUser {
  id: string; username: string; role: UserRole; roles?: UserRole[];
  status?: 'active' | 'disabled';
  twoFactorEnabled?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
}

const url = (p: string) => `${config.apiBaseUrl}${p}`;

function normalize(u: BackendUser): User {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    status: u.status,
    twoFactorEnabled: u.twoFactorEnabled,
    lastLogin: u.lastLogin,
    createdAt: u.createdAt,
  };
}

export const authService = {
  async restoreSession(): Promise<User | null> {
    if (!tokenStore.access && !tokenStore.refresh) return null;
    try {
      const data = await apiFetch<{ user: BackendUser }>(url('/api/auth/me'));
      return normalize(data.user);
    } catch {
      tokenStore.clear();
      return null;
    }
  },

  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const data = await apiFetch<{
        status: 'success' | 'requires_2fa';
        user?: BackendUser;
        challengeId?: string;
        tokens?: { access: string; refresh: string };
      }>(url('/api/auth/login'), {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (data.status === 'requires_2fa') {
        return {
          status: 'requires_2fa',
          pendingUser: { id: '', username, role: 'admin' } as User,
          challengeId: data.challengeId!,
        };
      }
      if (data.tokens) tokenStore.set(data.tokens);
      return { status: 'success', user: normalize(data.user!) };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        return { status: 'invalid_credentials', message: err.message };
      }
      throw err;
    }
  },

  async verify2FA(challengeId: string, _pendingUser: User, code: string): Promise<Verify2FAResponse> {
    try {
      const data = await apiFetch<{
        status: 'success';
        user: BackendUser;
        tokens: { access: string; refresh: string };
      }>(url('/api/auth/2fa/verify'), {
        method: 'POST',
        body: JSON.stringify({ challengeId, code }),
      });
      tokenStore.set(data.tokens);
      return { status: 'success', user: normalize(data.user) };
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return { status: 'invalid_code', message: err.message };
      }
      throw err;
    }
  },

  async logout(): Promise<void> {
    const refresh = tokenStore.refresh;
    try {
      await apiFetch(url('/api/auth/logout'), {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refresh }),
      });
    } catch { /* ignore */ }
    tokenStore.clear();
  },

  // ── Admin user management (real backend) ───────────────
  async listUsers(): Promise<User[]> {
    const data = await apiFetch<{ users: BackendUser[] }>(url('/api/users'));
    return data.users.map(normalize);
  },

  async createUser(username: string, password: string, role: UserRole): Promise<{ ok: boolean; error?: string; user?: User }> {
    try {
      const data = await apiFetch<{ user: BackendUser }>(url('/api/users'), {
        method: 'POST', body: JSON.stringify({ username, password, role }),
      });
      return { ok: true, user: normalize(data.user) };
    } catch (err) {
      if (err instanceof ApiError) return { ok: false, error: err.message };
      return { ok: false, error: 'Failed to create user' };
    }
  },

  deleteUser: (id: string) =>
    apiFetch(url(`/api/users/${id}`), { method: 'DELETE' }),

  updateUserRole: (id: string, role: UserRole) =>
    apiFetch(url(`/api/users/${id}/role`), { method: 'PATCH', body: JSON.stringify({ role }) }),

  setUserStatus: (id: string, status: 'active' | 'disabled') =>
    apiFetch(url(`/api/users/${id}/status`), { method: 'PATCH', body: JSON.stringify({ status }) }),

  setUser2FA: (id: string, enabled: boolean) =>
    apiFetch(url(`/api/users/${id}/2fa`), { method: 'PATCH', body: JSON.stringify({ enabled }) }),

  async resetPassword(id: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
    try {
      await apiFetch(url(`/api/users/${id}/reset-password`), {
        method: 'POST', body: JSON.stringify({ newPassword }),
      });
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiError) return { ok: false, error: err.message };
      return { ok: false, error: 'Reset failed' };
    }
  },
};
