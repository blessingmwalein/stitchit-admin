const ACCESS_TOKEN_KEY = "st_access_token";
const REFRESH_TOKEN_KEY = "st_refresh_token";
const SESSION_COOKIE = "st_session";

const isBrowser = typeof window !== "undefined";

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    // atob needs standard base64 (pad with =)
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4), "="
    );
    const json = JSON.parse(atob(padded)) as { exp?: number };
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

/**
 * Small token store backed by localStorage. Tokens are only ever read on the
 * client; the `st_session` cookie is a non-httpOnly marker used exclusively by
 * proxy.ts (middleware) for redirects.
 */
export const tokenStore = {
  getAccessToken(): string | null {
    if (!isBrowser) return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    if (!isBrowser) return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  /** Returns the access token expiry as a Unix timestamp (seconds), or null. */
  getExpiresAt(): number | null {
    const token = this.getAccessToken();
    if (!token) return null;
    return decodeJwtExp(token);
  },
  setTokens(accessToken: string, refreshToken: string) {
    if (!isBrowser) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear() {
    if (!isBrowser) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export function setSessionCookie() {
  if (!isBrowser) return;
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

export function clearSessionCookie() {
  if (!isBrowser) return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Clears tokens + session cookie. Used on logout and refresh failure. */
export function clearSession() {
  tokenStore.clear();
  clearSessionCookie();
}
