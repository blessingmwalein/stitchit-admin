import { apiFetch, buildQuery, createCrudApi } from "./client";
import type { ListParams } from "@/lib/types/common";
import type { Material, StockMovement } from "@/lib/types/inventory";

export const materialsApi = {
  ...createCrudApi<Material>("/inventory/materials"),
};

export const categoriesApi = {
  list: () => apiFetch<any[]>("/inventory/categories"),
};

export const stockApi = {
  adjust: (payload: {
    materialId: string;
    warehouseId: string;
    qty: number;
    unitCost?: number;
    note?: string;
  }) => apiFetch("/inventory/stock/adjust", { method: "POST", body: payload }),
  movements: (params?: ListParams) =>
    apiFetch<any>(`/inventory/stock/movements${buildQuery(params)}`),
};

export const warehousesApi = {
  list: () => apiFetch<any[]>("/inventory/warehouses"),
};
