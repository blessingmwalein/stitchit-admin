import { apiFetch, buildQuery, createCrudApi } from "./client";
import type { ListParams } from "@/lib/types/common";
import type { Supplier, PurchaseOrder, GoodsReceivedNote, Bill } from "@/lib/types/procurement";

export const suppliersApi = createCrudApi<Supplier>("/suppliers");

export const purchaseOrdersApi = {
  ...createCrudApi<PurchaseOrder>("/purchase-orders"),
  send: (id: string) =>
    apiFetch<PurchaseOrder>(`/purchase-orders/${id}/send`, { method: "POST" }),
  cancel: (id: string) =>
    apiFetch<PurchaseOrder>(`/purchase-orders/${id}/cancel`, { method: "POST" }),
};

export const grnsApi = {
  ...createCrudApi<GoodsReceivedNote>("/grns"),
};

export const supplierBillsApi = {
  ...createCrudApi<Bill>("/bills"),
};

export const supplierPaymentsApi = {
  ...createCrudApi<any>("/supplier-payments"),
};
