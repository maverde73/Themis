/**
 * Auth helpers for client-side token management.
 *
 * Tokens are stored in localStorage. This is acceptable here because:
 * - The server only holds metadata (zero-knowledge architecture)
 * - The JWT grants access to metadata endpoints, not to encrypted content
 */

const TOKEN_KEY = "token";
const USER_KEY = "user";

export interface StoredUser {
  id: string;
  email: string;
  role: string;
  orgId: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: StoredUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
