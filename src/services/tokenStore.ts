/** Persistent JWT storage (refresh kept in localStorage; access in memory).
 *  For a production deployment behind HTTPS this is acceptable; for higher
 *  assurance, move refresh tokens to an httpOnly cookie set by the backend. */
const ACCESS_KEY = 'airguard.accessToken';
const REFRESH_KEY = 'airguard.refreshToken';

let accessTokenMem: string | null = null;

export const tokenStore = {
  get access() {
    if (accessTokenMem) return accessTokenMem;
    const t = sessionStorage.getItem(ACCESS_KEY);
    accessTokenMem = t;
    return t;
  },
  get refresh() { return localStorage.getItem(REFRESH_KEY); },
  set(tokens: { access: string; refresh: string }) {
    accessTokenMem = tokens.access;
    sessionStorage.setItem(ACCESS_KEY, tokens.access);
    localStorage.setItem(REFRESH_KEY, tokens.refresh);
  },
  clear() {
    accessTokenMem = null;
    sessionStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
