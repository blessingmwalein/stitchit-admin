import { apiFetch, buildQuery, createCrudApi } from "./client";
import type { ListParams } from "@/lib/types/common";
import type { Quotation, Order } from "@/lib/types/sales";

export const quotationsApi = {
  ...createCrudApi<Quotation>("/quotations"),
  send: (id: string) =>
    apiFetch<Quotation>(`/quotations/${id}/send`, { method: "POST" }),
  convert: (id: string) =>
    apiFetch<{ orderId: string }>(`/quotations/${id}/convert`, { method: "POST" }),
  pdf: (id: string) =>
    apiFetch<{ url: string }>(`/quotations/${id}/pdf`, { method: "POST" }),
};

export const ordersApi = {
  ...createCrudApi<Order>("/orders"),
  transition: (id: string, status: string, note?: string) =>
    apiFetch<Order>(`/orders/${id}/status`, { method: "PATCH", body: { status, note } }),
  attachments: (id: string) =>
    apiFetch<any[]>(`/orders/${id}/attachments`),
};
