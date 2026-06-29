import type { ApiErrorBody, ListParams, Paginated } from "@/lib/types/common";
import type { RefreshResponse } from "@/lib/types/auth";
import { clearSession, tokenStore } from "./token-store";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

export class ApiError extends Error {
  statusCode: number;
  errors?: Record<string, string[]>;

  constructor(body: ApiErrorBody) {
    super(Array.isArray(body.message) ? body.message.join(", ") : body.message);
    this.name = "ApiError";
    this.statusCode = body.statusCode;
    this.errors = body.errors;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip the Authorization header and 401 refresh handling. */
  skipAuth?: boolean;
}

/** Single-flight refresh: concurrent 401s share one refresh request. */
let refreshPromise: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = tokenStore.getRefreshToken();
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as RefreshResponse;
        tokenStore.setTokens(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function parseErrorBody(res: Response): Promise<ApiErrorBody> {
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>;
    return {
      statusCode: body.statusCode ?? res.status,
      message: body.message ?? res.statusText ?? "Request failed",
      errors: body.errors,
    };
  } catch {
    return {
      statusCode: res.status,
      message: res.statusText || "Request failed",
    };
  }
}

async function doFetch<T>(
  path: string,
  options: RequestOptions,
  allowRefreshRetry: boolean
): Promise<T> {
  const { body, headers, skipAuth, ...rest } = options;
  const accessToken = tokenStore.getAccessToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(!skipAuth && accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !skipAuth) {
    if (allowRefreshRetry) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        return doFetch<T>(path, options, false);
      }
    }
    clearSession();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = "/login";
    }
    throw new ApiError({ statusCode: 401, message: "Session expired" });
  }

  if (!res.ok) {
    throw new ApiError(await parseErrorBody(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  return doFetch<T>(path, options, true);
}

export function buildQuery(params?: ListParams): string {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

/** Standard CRUD endpoints shared by most resources. */
/** Convenience wrapper used by ad-hoc pages that need typed shorthand. */
export const apiClient = {
  get: <T>(path: string, options?: { params?: Record<string, unknown> } & Omit<RequestOptions, "body">) => {
    const { params, ...rest } = options ?? {};
    const qs = params ? buildQuery(params as any) : "";
    return apiFetch<T>(`${path}${qs}`, { method: "GET", ...rest });
  },
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

export function createCrudApi<
  T,
  TCreate = Partial<T>,
  TUpdate = Partial<TCreate>,
>(basePath: string) {
  return {
    list: (params?: ListParams) =>
      apiFetch<Paginated<T>>(`${basePath}${buildQuery(params)}`),
    get: (id: string) => apiFetch<T>(`${basePath}/${id}`),
    create: (payload: TCreate) =>
      apiFetch<T>(basePath, { method: "POST", body: payload }),
    update: (id: string, payload: TUpdate) =>
      apiFetch<T>(`${basePath}/${id}`, { method: "PATCH", body: payload }),
    remove: (id: string) =>
      apiFetch<void>(`${basePath}/${id}`, { method: "DELETE" }),
  };
}
