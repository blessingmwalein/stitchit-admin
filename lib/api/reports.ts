import { apiFetch } from "./client";

export const reportsApi = {
  dashboard: () => apiFetch<any>("/reports/dashboard"),

  trialBalance: (from: string, to: string) =>
    apiFetch<any>(`/reports/trial-balance?from=${from}&to=${to}`),

  generalLedger: (accountId: string, from: string, to: string) =>
    apiFetch<any>(`/reports/general-ledger?accountId=${accountId}&from=${from}&to=${to}`),

  incomeStatement: (from: string, to: string) =>
    apiFetch<any>(`/reports/income-statement?from=${from}&to=${to}`),

  balanceSheet: (asOf: string) =>
    apiFetch<any>(`/reports/balance-sheet?asOf=${asOf}`),

  arAging: (asOf?: string) =>
    apiFetch<any>(`/reports/ar-aging${asOf ? `?asOf=${asOf}` : ""}`),

  apAging: (asOf?: string) =>
    apiFetch<any>(`/reports/ap-aging${asOf ? `?asOf=${asOf}` : ""}`),

  inventoryValuation: () =>
    apiFetch<any>("/reports/inventory-valuation"),
};
