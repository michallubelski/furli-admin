import type { AdminSession } from '../../features/auth/api';

// Distinct key from furli-fronted's `furli_auth_v2` - if this app is ever opened on the same
// origin/subdomain family as furli-fronted in a browser, the two sessions must never collide.
export const AUTH_KEY = 'furli_admin_auth_v1';

export function loadAuth(): AdminSession | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_KEY) : null;
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function saveAuth(session: AdminSession | null): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    if (session) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  } catch {
    // no-op
  }
}

// Used by admin/context.tsx to timestamp locally-tracked audit-trail entries.
export function nowLabel(): string {
  try {
    return new Date().toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'teraz';
  }
}
