import { apiFetch, createCrudApi } from "./client";
import type { FinishedProduct } from "@/lib/types/finished-products";

export const finishedProductsApi = {
  ...createCrudApi<FinishedProduct>("/finished-products"),
  publish: (id: string) => apiFetch<FinishedProduct>(`/finished-products/${id}/publish`, { method: "POST" }),
  unpublish: (id: string) => apiFetch<FinishedProduct>(`/finished-products/${id}/unpublish`, { method: "POST" }),
  feature: (id: string) => apiFetch<FinishedProduct>(`/finished-products/${id}/feature`, { method: "POST" }),
  unfeature: (id: string) => apiFetch<FinishedProduct>(`/finished-products/${id}/unfeature`, { method: "POST" }),
};
