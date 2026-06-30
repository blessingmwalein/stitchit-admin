"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { invoicesApi } from "@/lib/api/finance";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Search, SendHorizonal, CheckCircle2, Ban, Banknote, ExternalLink } from "lucide-react";
import { InvoiceFormModal } from "@/components/modules/finance/invoice-form-modal";
import { PaymentFormModal } from "@/components/modules/finance/payment-form-modal";

// ── Types ─────────────────────────────────────────────────────────────────────

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  type: "INVOICE" | "DEPOSIT" | "CREDIT_NOTE";
  status: string;
  total: string | number;
  balance: string | number;
  amountPaid: string | number;
  subtotal: string | number;
  discountTotal: string | number;
  taxTotal: string | number;
  issueDate: string;
  dueDate?: string | null;
  notes?: string | null;
  currencyCode: string;
  customerId: string;
  orderId?: string | null;
  customer: { id: string; customerNumber: string; firstName: string | null; lastName: string | null; companyName: string | null } | null;
  order: { id: string; orderNumber: string } | null;
  items?: { id: string; lineNo: number; description: string; quantity: number; unitPrice: string; lineTotal: string }[];
  allocations?: { id: string; amount: string; payment?: { id: string; receiptNumber: string; paymentDate: string; method: string } | null }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function customerName(inv: InvoiceRow) {
  const c = inv.customer;
  if (!c) return "—";
  return c.firstName ? `${c.firstName} ${c.lastName ?? ""}`.trim() : c.companyName ?? c.customerNumber;
}

function safeDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
}

function typeBadge(type: string) {
  if (type === "DEPOSIT") return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Deposit</Badge>;
  if (type === "CREDIT_NOTE") return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">Credit Note</Badge>;
  return <Badge variant="outline" className="text-xs">Invoice</Badge>;
}

function methodLabel(m: string) {
  const map: Record<string, string> = { CASH: "Cash", BANK_TRANSFER: "Bank Transfer", MOBILE_MONEY: "EcoCash/InnBucks", PAYNOW: "Paynow", CHEQUE: "Cheque", OTHER: "Other" };
  return map[m] ?? m;
}

const ACTIONABLE_STATUSES = ["POSTED", "PARTIALLY_PAID", "OVERDUE"];

// ── Table columns ─────────────────────────────────────────────────────────────

const columns: ColumnDef<InvoiceRow>[] = [
  {
    header: "Invoice",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-mono text-xs">{row.original.invoiceNumber}</span>
        {typeBadge(row.original.type)}
      </div>
    ),
  },
  {
    header: "Customer",
    cell: ({ row }) => <span className="font-medium">{customerName(row.original)}</span>,
  },
  {
    header: "Order",
    cell: ({ row }) => row.original.order
      ? <span className="font-mono text-xs">{row.original.order.orderNumber}</span>
      : <span className="text-muted-foreground text-xs">—</span>,
  },
  {
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    header: "Total",
    cell: ({ row }) => <span className="tabular-nums">${Number(row.original.total).toFixed(2)}</span>,
  },
  {
    header: "Balance",
    cell: ({ row }) => {
      const bal = Number(row.original.balance);
      return <span className={`tabular-nums font-medium ${bal > 0 ? "text-red-600" : "text-green-600"}`}>${bal.toFixed(2)}</span>;
    },
  },
  {
    header: "Issued",
    cell: ({ row }) => safeDate(row.original.issueDate),
  },
  {
    header: "Due",
    cell: ({ row }) => safeDate(row.original.dueDate),
  },
];

// ── Invoice Drawer ────────────────────────────────────────────────────────────

function InvoiceDrawer({
  invoiceId,
  open,
  onClose,
  onActionDone,
}: {
  invoiceId: string | null;
  open: boolean;
  onClose: () => void;
  onActionDone: () => void;
}) {
  const qc = useQueryClient();
  const [showPayment, setShowPayment] = React.useState(false);

  const { data: inv, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => invoicesApi.get(invoiceId!),
    enabled: open && !!invoiceId,
  });

  const invoice = inv as InvoiceRow | undefined;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    onActionDone();
  }

  const postMut = useMutation({
    mutationFn: () => invoicesApi.post(invoiceId!),
    onSuccess: () => { toast.success("Invoice posted"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to post invoice"),
  });

  const markPaidMut = useMutation({
    mutationFn: () => invoicesApi.markPaid(invoiceId!),
    onSuccess: () => { toast.success("Invoice marked as paid"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const voidMut = useMutation({
    mutationFn: () => invoicesApi.void(invoiceId!),
    onSuccess: () => { toast.success("Invoice voided"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to void invoice"),
  });

  const isPending = postMut.isPending || markPaidMut.isPending || voidMut.isPending;
  const status = invoice?.status ?? "";

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="shrink-0 px-6 py-5 border-b">
            {isLoading ? (
              <SheetTitle className="text-muted-foreground">Loading…</SheetTitle>
            ) : invoice ? (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <SheetTitle className="font-mono text-lg">{invoice.invoiceNumber}</SheetTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {typeBadge(invoice.type)}
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums">${Number(invoice.total).toFixed(2)}</p>
                  {Number(invoice.balance) > 0 && (
                    <p className="text-xs text-red-500 mt-0.5">Balance: ${Number(invoice.balance).toFixed(2)}</p>
                  )}
                </div>
              </div>
            ) : null}
          </SheetHeader>

          {invoice && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Action buttons */}
              {status !== "VOID" && status !== "PAID" && (
                <div className="flex flex-wrap gap-2 px-6 py-4 border-b bg-muted/30">
                  {status === "DRAFT" && (
                    <Button size="sm" onClick={() => postMut.mutate()} disabled={isPending}>
                      <SendHorizonal className="h-3.5 w-3.5 mr-1.5" />Post Invoice
                    </Button>
                  )}
                  {ACTIONABLE_STATUSES.includes(status) && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setShowPayment(true)} disabled={isPending}>
                        <Banknote className="h-3.5 w-3.5 mr-1.5" />Record Payment
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => markPaidMut.mutate()} disabled={isPending}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Mark as Paid
                      </Button>
                    </>
                  )}
                  {status !== "PAID" && (
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => voidMut.mutate()} disabled={isPending}>
                      <Ban className="h-3.5 w-3.5 mr-1.5" />Void
                    </Button>
                  )}
                </div>
              )}

              <div className="px-6 py-5 space-y-6">
                {/* Customer */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Customer</h3>
                  <div className="rounded-lg border bg-card p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{customerName(invoice)}</span>
                    </div>
                    {invoice.customer && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Customer #</span>
                        <span className="font-mono text-xs">{invoice.customer.customerNumber}</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Invoice Details */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Invoice Details</h3>
                  <div className="rounded-lg border bg-card p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Issue Date</span>
                      <span>{safeDate(invoice.issueDate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Due Date</span>
                      <span>{safeDate(invoice.dueDate)}</span>
                    </div>
                    {invoice.order && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Linked Order</span>
                        <span className="font-mono text-xs flex items-center gap-1">
                          {invoice.order.orderNumber}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </div>
                    )}
                    <Separator className="my-1" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${Number(invoice.subtotal).toFixed(2)}</span>
                    </div>
                    {Number(invoice.discountTotal) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount</span>
                        <span>−${Number(invoice.discountTotal).toFixed(2)}</span>
                      </div>
                    )}
                    {Number(invoice.taxTotal) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>+${Number(invoice.taxTotal).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-1">
                      <span>Total</span>
                      <span>${Number(invoice.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="text-green-600">${Number(invoice.amountPaid).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-muted-foreground">Balance Due</span>
                      <span className={Number(invoice.balance) > 0 ? "text-red-600" : "text-green-600"}>
                        ${Number(invoice.balance).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Line Items */}
                {invoice.items && invoice.items.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Line Items</h3>
                    <div className="rounded-lg border bg-card overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Description</th>
                            <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">Qty</th>
                            <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">Price</th>
                            <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {invoice.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2">{item.description}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{Number(item.quantity).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">${Number(item.unitPrice).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium">${Number(item.lineTotal).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Payments Applied */}
                {invoice.allocations && invoice.allocations.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Payments Applied</h3>
                    <div className="space-y-2">
                      {invoice.allocations.map((alloc) => (
                        <div key={alloc.id} className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between text-sm">
                          <div>
                            <p className="font-mono text-xs font-medium">{alloc.payment?.receiptNumber ?? "—"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {safeDate(alloc.payment?.paymentDate)} · {methodLabel(alloc.payment?.method ?? "")}
                            </p>
                          </div>
                          <span className="font-semibold text-green-600">${Number(alloc.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Notes */}
                {invoice.notes && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Notes</h3>
                    <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">{invoice.notes}</div>
                  </section>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Record Payment modal — prefilled for this invoice's customer/order */}
      {invoice && (
        <PaymentFormModal
          open={showPayment}
          onOpenChange={setShowPayment}
          prefill={{
            customerId: invoice.customerId,
            orderId: invoice.orderId ?? undefined,
            isDeposit: invoice.type === "DEPOSIT",
          }}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["invoices"] });
            qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
          }}
        />
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [statusFilter, setStatusFilter] = useQueryState("status", { defaultValue: "" });
  const [typeFilter, setTypeFilter] = useQueryState("type", { defaultValue: "" });
  const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: Number });
  const [pageSize] = useQueryState("pageSize", { defaultValue: 20, parse: Number });

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", { search, statusFilter, typeFilter, page, pageSize }],
    queryFn: () => invoicesApi.list({ search, status: statusFilter || undefined, page, limit: pageSize } as any),
  });

  const total = (data as any)?.total ?? (data as any)?.meta?.total ?? 0;
  let rows: InvoiceRow[] = (data as any)?.data ?? [];

  // Client-side type filter (backend doesn't filter by type yet)
  if (typeFilter) {
    rows = rows.filter((r) => r.type === typeFilter);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
  }

  const hasFilters = search || statusFilter || typeFilter;

  return (
    <div className="flex flex-col">
      <PageHeader title="Invoices" description={`${total} total`}>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />New invoice
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="px-4 pb-4 flex flex-wrap gap-2 items-end border-b">
        <div className="flex items-center gap-1.5 bg-background border rounded-md px-2 h-9 flex-1 min-w-48 max-w-64">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search invoice #, customer…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <Select value={statusFilter || "__all__"} onValueChange={(v) => { setStatusFilter(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="POSTED">Posted</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="VOID">Void</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter || "__all__"} onValueChange={(v) => { setTypeFilter(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            <SelectItem value="INVOICE">Invoice</SelectItem>
            <SelectItem value="DEPOSIT">Deposit</SelectItem>
            <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      <InvoiceFormModal
        open={showCreate}
        onOpenChange={setShowCreate}
      />

      <InvoiceDrawer
        invoiceId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onActionDone={() => qc.invalidateQueries({ queryKey: ["invoices"] })}
      />

      <DataTable
        columns={columns}
        data={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={isLoading}
        onRowClick={(r) => setSelectedId(r.id)}
      />
    </div>
  );
}
