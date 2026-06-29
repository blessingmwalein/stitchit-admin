import { create } from "zustand";
import { persist } from "zustand/middleware";

import { authApi } from "@/lib/api/auth";
import {
  clearSession,
  setSessionCookie,
  tokenStore,
} from "@/lib/api/token-store";
import type { AuthUser, LoginPayload } from "@/lib/types/auth";

interface AuthState {
  user: AuthUser | null;
  permissions: string[];
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      permissions: [],
      isAuthenticated: false,

      login: async (payload) => {
        const res = await authApi.login(payload);
        tokenStore.setTokens(res.accessToken, res.refreshToken);
        setSessionCookie();
        set({
          user: res.user,
          permissions: res.user.permissions,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        const refreshToken = tokenStore.getRefreshToken();
        try {
          if (refreshToken) {
            await authApi.logout(refreshToken);
          }
        } catch {
          // Best effort: still clear the local session.
        }
        clearSession();
        set({ user: null, permissions: [], isAuthenticated: false });
      },

      setUser: (user) =>
        set({ user, permissions: user.permissions, isAuthenticated: true }),

      clear: () => {
        clearSession();
        set({ user: null, permissions: [], isAuthenticated: false });
      },
    }),
    {
      name: "st-auth",
      partialize: (state) => ({
        user: state.user,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
