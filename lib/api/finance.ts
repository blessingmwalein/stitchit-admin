import { apiFetch, buildQuery, createCrudApi } from "./client";
import type { ListParams } from "@/lib/types/common";
import type { Invoice, Payment, Expense, Account, JournalEntry, AgingReport, CustomerStatement } from "@/lib/types/finance";

export const invoicesApi = {
  ...createCrudApi<Invoice>("/invoices"),
  post: (id: string) =>
    apiFetch<Invoice>(`/invoices/${id}/post`, { method: "POST" }),
  pdf: (id: string) =>
    apiFetch<{ url: string }>(`/invoices/${id}/pdf`, { method: "POST" }),
  void: (id: string) =>
    apiFetch<Invoice>(`/invoices/${id}/void`, { method: "POST" }),
  markPaid: (id: string) =>
    apiFetch<Invoice>(`/invoices/${id}/mark-paid`, { method: "POST" }),
};

export const paymentsApi = {
  ...createCrudApi<Payment>("/payments"),
  allocate: (id: string, invoiceId: string, amount: number) =>
    apiFetch<Payment>(`/payments/${id}/allocate`, { method: "POST", body: { invoiceId, amount } }),
};

export const expensesApi = {
  ...createCrudApi<Expense>("/expenses"),
};

export const accountsApi = {
  list: (params?: ListParams) =>
    apiFetch<Account[]>(`/accounting/accounts${buildQuery(params)}`),
  get: (id: string) => apiFetch<Account>(`/accounting/accounts/${id}`),
  create: (payload: Partial<Account>) =>
    apiFetch<Account>("/accounting/accounts", { method: "POST", body: payload }),
  update: (id: string, payload: Partial<Account>) =>
    apiFetch<Account>(`/accounting/accounts/${id}`, { method: "PATCH", body: payload }),
  tree: () =>
    apiFetch<Account[]>("/accounting/accounts/tree"),
};

export const journalsApi = {
  list: (params?: ListParams) =>
    apiFetch<any>(`/accounting/journal${buildQuery(params)}`),
  get: (id: string) =>
    apiFetch<JournalEntry>(`/accounting/journal/${id}`),
  create: (payload: Partial<JournalEntry>) =>
    apiFetch<JournalEntry>(`/accounting/journal`, { method: "POST", body: payload }),
  reverse: (id: string, reason?: string) =>
    apiFetch<JournalEntry>(`/accounting/journal/${id}/reverse`, { method: "POST", body: { reason } }),
};

export const reportsFinanceApi = {
  arAging: (asOf?: string) =>
    apiFetch<AgingReport>(`/reports/ar-aging${asOf ? `?asOf=${asOf}` : ""}`),
  apAging: (asOf?: string) =>
    apiFetch<any>(`/reports/ap-aging${asOf ? `?asOf=${asOf}` : ""}`),
  customerStatement: (customerId: string, from: string, to: string) =>
    apiFetch<CustomerStatement>(`/reports/customer-statement?customerId=${customerId}&from=${from}&to=${to}`),
  trialBalance: (from: string, to: string) =>
    apiFetch<any>(`/reports/trial-balance?from=${from}&to=${to}`),
  incomeStatement: (from: string, to: string) =>
    apiFetch<any>(`/reports/income-statement?from=${from}&to=${to}`),
  balanceSheet: (asOf: string) =>
    apiFetch<any>(`/reports/balance-sheet?asOf=${asOf}`),
};
