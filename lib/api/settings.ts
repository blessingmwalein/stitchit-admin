import { apiFetch, createCrudApi } from "./client";

export const usersApi = {
  ...createCrudApi<any>("/users"),
  resetPassword: (id: string, password: string) =>
    apiFetch(`/users/${id}/reset-password`, { method: "POST", body: { password } }),
  toggleActive: (id: string) =>
    apiFetch(`/users/${id}/toggle-active`, { method: "POST" }),
};

export const rolesApi = {
  ...createCrudApi<any>("/roles"),
  permissions: () => apiFetch<string[]>("/rbac/permissions"),
  userRoles: (userId: string) => apiFetch<any[]>(`/users/${userId}/roles`),
  assign: (userId: string, roleId: string) =>
    apiFetch(`/users/${userId}/roles`, { method: "POST", body: { roleId } }),
  revoke: (userId: string, roleId: string) =>
    apiFetch(`/users/${userId}/roles/${roleId}`, { method: "DELETE" }),
};

export const companyApi = {
  get: () => apiFetch<any>("/company"),
  update: (data: any) => apiFetch<any>("/company", { method: "PATCH", body: data }),
};

export const settingsApi = {
  getAll: () => apiFetch<Record<string, any>>("/settings"),
  set: (key: string, value: any) =>
    apiFetch("/settings", { method: "PUT", body: { key, value } }),
  pricing: () => apiFetch<any>("/settings/pricing"),
  updatePricing: (data: any) =>
    apiFetch("/settings/pricing", { method: "PUT", body: data }),
};

export const numberingApi = {
  list: () => apiFetch<any[]>("/numbering"),
  reset: (docType: string, nextNumber: number) =>
    apiFetch("/numbering/reset", { method: "POST", body: { docType, nextNumber } }),
};
