/**
 * Authentication service layer.
 *
 * Frontend-only simulation today, but structured to map 1-to-1 with a real
 * backend (POST /api/auth/login, POST /api/auth/2fa/verify, POST /api/auth/logout).
 * When the backend is available, swap the mock branches for `fetchWithRetry`
 * calls — the public surface (login / verify2FA / logout) stays identical.
 *
 * NOTE: credentials and the demo TOTP code live ONLY in this module and are
 * never exposed through the UI. In production these checks happen server-side
 * and this file becomes a thin HTTP wrapper.
 */

import type { User, UserRole } from '@/types/sensor';

// ── Internal credential store (dev only — replace with backend) ──────────
interface InternalUser extends User {
  password: string;
}

const DEV_USERS: InternalUser[] = [
  { id: '1', username: 'admin', role: 'admin', password: 'admin123' },
  { id: '2', username: 'operator', role: 'operator', password: 'operator123' },
  { id: '3', username: 'viewer', role: 'user', password: 'user123' },
];

/** Demo TOTP code. In production, validated server-side against a real TOTP secret. */
const DEMO_TOTP_CODE = '123456';

// ── Public response shapes ──────────────────────────────────────────────
export type LoginResponse =
  | { status: 'success'; user: User }
  | { status: 'requires_2fa'; pendingUser: User; challengeId: string }
  | { status: 'invalid_credentials' };

export type Verify2FAResponse =
  | { status: 'success'; user: User }
  | { status: 'invalid_code' };

// ── Helpers ─────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const toPublicUser = (u: InternalUser): User => ({ id: u.id, username: u.username, role: u.role });

// ── Service ─────────────────────────────────────────────────────────────
export const authService = {
  /**
   * POST /api/auth/login
   * Returns either a session, a 2FA challenge (admin), or invalid_credentials.
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    await delay(400);
    const found = DEV_USERS.find(u => u.username === username && u.password === password);
    if (!found) return { status: 'invalid_credentials' };

    const publicUser = toPublicUser(found);
    if (found.role === 'admin') {
      return {
        status: 'requires_2fa',
        pendingUser: publicUser,
        challengeId: `chal-${Date.now()}`,
      };
    }
    return { status: 'success', user: publicUser };
  },

  /**
   * POST /api/auth/2fa/verify
   * Validates the time-based one-time code for an in-flight challenge.
   */
  async verify2FA(_challengeId: string, pendingUser: User, code: string): Promise<Verify2FAResponse> {
    await delay(350);
    if (code.trim() !== DEMO_TOTP_CODE) return { status: 'invalid_code' };
    return { status: 'success', user: pendingUser };
  },

  /**
   * POST /api/auth/logout — fire-and-forget on the backend; here it's a no-op.
   */
  async logout(): Promise<void> {
    await delay(50);
  },

  // ── Local user CRUD (admin) — backend-ready surface ────────────
  listUsers(): User[] {
    return DEV_USERS.map(toPublicUser);
  },

  createUser(username: string, password: string, role: UserRole): { ok: boolean; error?: string; user?: User } {
    if (!username.trim() || !password.trim()) return { ok: false, error: 'Username and password required' };
    if (DEV_USERS.some(u => u.username === username)) return { ok: false, error: 'Username already exists' };
    const newUser: InternalUser = { id: `u-${Date.now()}`, username: username.trim(), password, role };
    DEV_USERS.push(newUser);
    return { ok: true, user: toPublicUser(newUser) };
  },

  deleteUser(id: string): void {
    const idx = DEV_USERS.findIndex(u => u.id === id);
    if (idx >= 0) DEV_USERS.splice(idx, 1);
  },

  updateUserRole(id: string, role: UserRole): void {
    const u = DEV_USERS.find(x => x.id === id);
    if (u) u.role = role;
  },
};
