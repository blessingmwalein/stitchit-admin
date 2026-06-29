import { apiFetch, buildQuery, createCrudApi } from "./client";
import type { ListParams } from "@/lib/types/common";
import type { Lead, Customer } from "@/lib/types/crm";

export const leadsApi = {
  ...createCrudApi<Lead>("/leads"),
  move: (id: string, stage: string) =>
    apiFetch<Lead>(`/leads/${id}/stage`, { method: "PATCH", body: { stage } }),
  convert: (id: string) =>
    apiFetch<{ customerId: string }>(`/leads/${id}/convert`, { method: "POST" }),
  byStage: (params?: ListParams) =>
    apiFetch<Record<string, Lead[]>>(`/leads/kanban${buildQuery(params)}`),
};

export const customersApi = {
  ...createCrudApi<Customer>("/customers"),
  getStatement: (id: string, from: string, to: string) =>
    apiFetch(`/customers/${id}/statement?from=${from}&to=${to}`),
};
