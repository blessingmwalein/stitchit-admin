import type {
  AuthUser,
  LoginPayload,
  LoginResponse,
  RefreshResponse,
} from "@/lib/types/auth";
import { apiFetch } from "./client";

export const authApi = {
  login: (payload: LoginPayload) =>
    apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
      skipAuth: true,
    }),

  refresh: (refreshToken: string) =>
    apiFetch<RefreshResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      skipAuth: true,
    }),

  logout: (refreshToken: string) =>
    apiFetch<void>("/auth/logout", {
      method: "POST",
      body: { refreshToken },
    }),

  me: () => apiFetch<AuthUser>("/auth/me"),
};
