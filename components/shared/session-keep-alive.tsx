"use client";

import * as React from "react";
import { tokenStore, clearSession } from "@/lib/api/token-store";
import { API_BASE_URL } from "@/lib/api/client";
import type { RefreshResponse } from "@/lib/types/auth";

/**
 * Silently proactivly refreshes the JWT access token 90 seconds before it
 * expires so the user is never interrupted mid-form. Mounts once in the
 * app shell layout; no UI output.
 */
export function SessionKeepAlive() {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const exp = tokenStore.getExpiresAt();
    if (!exp) return;

    // Refresh 90 s before expiry; clamp so we never set a negative delay.
    const msUntilRefresh = Math.max(0, (exp - 90) * 1000 - Date.now());

    timerRef.current = setTimeout(async () => {
      const refreshToken = tokenStore.getRefreshToken();
      if (!refreshToken) return;

      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          // Refresh failed — clear session so user is redirected to login.
          clearSession();
          window.location.href = "/login";
          return;
        }

        const data = (await res.json()) as RefreshResponse;
        tokenStore.setTokens(data.accessToken, data.refreshToken);

        // Schedule the next refresh based on the new token's expiry.
        scheduleRefresh();
      } catch {
        // Network error — try again in 30 s rather than killing the session.
        timerRef.current = setTimeout(scheduleRefresh, 30_000);
      }
    }, msUntilRefresh);
  }, []);

  React.useEffect(() => {
    // Schedule on mount (token already present from login).
    scheduleRefresh();

    // Also reschedule whenever localStorage changes in another tab.
    function onStorage(e: StorageEvent) {
      if (e.key === "st_access_token") scheduleRefresh();
    }
    window.addEventListener("storage", onStorage);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("storage", onStorage);
    };
  }, [scheduleRefresh]);

  return null;
}
