const ACCESS_TOKEN_KEY = "st_access_token";
const REFRESH_TOKEN_KEY = "st_refresh_token";
const SESSION_COOKIE = "st_session";

const isBrowser = typeof window !== "undefined";

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
