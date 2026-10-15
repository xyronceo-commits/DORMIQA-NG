/**
 * DORMIQA Session Duration & Expiry Management
 * 
 * Rules:
 * 1. Session duration is strictly 12 hours from the authentic sign-in timestamp recorded by the server (Supabase user.last_sign_in_at).
 * 2. localStorage is only a fallback when server time is unavailable. Stored time older than server time is never trusted.
 * 3. Page refreshes and token renewals do NOT restart the 12-hour window.
 * 4. Stored entries are cleared on sign-out and when switching accounts.
 * 5. Slight clock discrepancies (start time up to 5 minutes in the future) are tolerated as fresh sessions.
 * 6. With no server time and no stored time, a new session is considered fresh and valid.
 * 7. Administrator accounts are exempt from user 12-hour session kicking.
 */

export const USER_SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes tolerance for client-server clock drift

export interface SessionRecord {
  uid: string;
  loginTime: number;
  serverSignInAt?: string;
  expiresAt: number;
}

export interface UserLike {
  id?: string;
  uid?: string;
  email?: string | null;
  last_sign_in_at?: string | null;
}

function getStorageKey(uid: string): string {
  return `dormiqa_user_session_${uid}`;
}

/**
 * Reads a stored session entry from localStorage safely
 */
export function getStoredSession(uid: string): SessionRecord | null {
  if (typeof window === 'undefined' || !uid) return null;
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.loginTime !== 'number') return null;
    return parsed as SessionRecord;
  } catch {
    return null;
  }
}

/**
 * Checks whether a user's session is within the 12-hour window.
 * Uses user.last_sign_in_at as authoritative start time when available.
 */
export function checkUserSessionValid(uid: string, user?: UserLike | null, nowMs: number = Date.now()): boolean {
  if (!uid) return false;

  // 1. Authoritative check using Supabase server-recorded last_sign_in_at
  const serverSignInStr = user?.last_sign_in_at;
  if (serverSignInStr) {
    const serverTime = new Date(serverSignInStr).getTime();
    if (!isNaN(serverTime) && serverTime > 0) {
      // Tolerate slight future clock drift
      const effectiveDiff = nowMs - serverTime;
      if (effectiveDiff < -CLOCK_SKEW_TOLERANCE_MS) {
        // More than 5 mins in the future -> abnormal clock
        return false;
      }
      
      const elapsed = Math.max(0, effectiveDiff);
      const isValid = elapsed < USER_SESSION_DURATION_MS;

      // Synchronize/replace stored entry with server timestamp if valid
      if (isValid) {
        const stored = getStoredSession(uid);
        if (!stored || stored.loginTime < serverTime) {
          try {
            const record: SessionRecord = {
              uid,
              loginTime: serverTime,
              serverSignInAt: serverSignInStr,
              expiresAt: serverTime + USER_SESSION_DURATION_MS
            };
            localStorage.setItem(getStorageKey(uid), JSON.stringify(record));
          } catch (_) {}
        }
      }

      return isValid;
    }
  }

  // 2. Fallback to localStorage when server last_sign_in_at is absent
  const stored = getStoredSession(uid);
  if (!stored) {
    // Brand new sign-in with no server time and no stored time -> fresh and valid!
    return true;
  }

  const effectiveDiff = nowMs - stored.loginTime;
  if (effectiveDiff < -CLOCK_SKEW_TOLERANCE_MS) {
    return false;
  }

  const elapsed = Math.max(0, effectiveDiff);
  return elapsed < USER_SESSION_DURATION_MS;
}

/**
 * Sets or updates the session timestamp.
 * Does NOT reset or advance timestamp on page refresh/auth callback if existing session is already recorded.
 */
export function setUserSessionTimestamp(uid: string, user?: UserLike | null, nowMs: number = Date.now()): void {
  if (typeof window === 'undefined' || !uid) return;

  try {
    const serverSignInStr = user?.last_sign_in_at;
    let loginTime = nowMs;

    if (serverSignInStr) {
      const parsedServerTime = new Date(serverSignInStr).getTime();
      if (!isNaN(parsedServerTime) && parsedServerTime > 0) {
        loginTime = parsedServerTime;
      }
    }

    const stored = getStoredSession(uid);
    // If a session record already exists and is for the same server sign-in or newer, DO NOT advance the timer!
    if (stored) {
      if (serverSignInStr && stored.serverSignInAt === serverSignInStr) {
        return;
      }
      if (!serverSignInStr && stored.loginTime <= loginTime && (loginTime - stored.loginTime < USER_SESSION_DURATION_MS)) {
        return;
      }
    }

    const record: SessionRecord = {
      uid,
      loginTime,
      serverSignInAt: serverSignInStr || undefined,
      expiresAt: loginTime + USER_SESSION_DURATION_MS
    };
    localStorage.setItem(getStorageKey(uid), JSON.stringify(record));
  } catch (err) {
    console.warn('[Session] Failed to write session timestamp:', err);
  }
}

/**
 * Clears the session timestamp for a user (on sign-out)
 */
export function clearUserSessionTimestamp(uid?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (uid) {
      localStorage.removeItem(getStorageKey(uid));
    } else {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dormiqa_user_session_')) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (err) {
    console.warn('[Session] Failed to clear session timestamp:', err);
  }
}

/**
 * On app initialization: delete any stale dormiqa_user_session_* entries
 * whose uid does not match the active authenticated user.
 */
export function cleanupStaleSessionEntries(currentUid?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const keepKey = currentUid ? getStorageKey(currentUid) : null;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('dormiqa_user_session_')) {
        if (!keepKey || key !== keepKey) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (err) {
    console.warn('[Session] Failed to clean up stale sessions:', err);
  }
}
