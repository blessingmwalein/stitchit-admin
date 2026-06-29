"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { paymentsApi } from "@/lib/api/finance";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Plus, Search } from "lucide-react";
import { PaymentFormModal } from "@/components/modules/finance/payment-form-modal";

type PaymentRow = {
  id: string;
  receiptNumber: string;
  isDeposit: boolean;
  method: string;
  amount: string;
  currencyCode: string;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  customer: { id: string; customerNumber: string; firstName: string | null; lastName: string | null; companyName: string | null } | null;
  order: { id: string; orderNumber: string } | null;
  allocations: { invoice: { id: string; invoiceNumber: string } | null }[];
};

function customerName(row: PaymentRow) {
  const c = row.customer;
  if (!c) return "—";
  return c.firstName ? `${c.firstName} ${c.lastName ?? ""}`.trim() : c.companyName ?? c.customerNumber;
}

function typeBadge(row: PaymentRow) {
  return row.isDeposit ? (
    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs">Deposit</Badge>
  ) : (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Payment</Badge>
  );
}

function methodLabel(method: string) {
  const map: Record<string, string> = {
    CASH: "Cash",
    BANK_TRANSFER: "Bank Transfer",
    MOBILE_MONEY: "EcoCash / InnBucks",
    PAYNOW: "Paynow",
    CHEQUE: "Cheque",
    STRIPE: "Stripe",
    OTHER: "Other",
  };
  return map[method] ?? method.replace(/_/g, " ");
}

function safeDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
}

const columns: ColumnDef<PaymentRow>[] = [
  {
    header: "Receipt #",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{(row.original as any).receiptNumber ?? "—"}</span>
    ),
  },
  {
    header: "Customer",
    cell: ({ row }) => <span className="font-medium">{customerName(row.original)}</span>,
  },
  {
    header: "Type",
    cell: ({ row }) => typeBadge(row.original),
  },
  {
    header: "Order",
    cell: ({ row }) => row.original.order
      ? <span className="font-mono text-xs">{row.original.order.orderNumber}</span>
      : <span className="text-muted-foreground text-xs">—</span>,
  },
  {
    header: "Method",
    cell: ({ row }) => <span className="text-sm">{methodLabel(row.original.method)}</span>,
  },
  {
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">
        ${Number(row.original.amount).toFixed(2)}
      </span>
    ),
  },
  {
    header: "Date",
    cell: ({ row }) => safeDate((row.original as any).paymentDate),
  },
  {
    header: "Notes / Ref",
    cell: ({ row }) => {
      const text = row.original.notes ?? row.original.reference ?? "—";
      return <span className="text-xs text-muted-foreground line-clamp-1 max-w-40">{text}</span>;
    },
  },
];

// ── View Drawer ───────────────────────────────────────────────────────────────

function PaymentDrawer({ payment, open, onClose }: { payment: PaymentRow | null; open: boolean; onClose: () => void }) {
  if (!payment) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="shrink-0 px-6 py-5 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="font-mono text-lg">{(payment as any).receiptNumber ?? "Payment"}</SheetTitle>
              <div className="flex items-center gap-2 mt-1.5">
                {typeBadge(payment)}
                <span className="text-sm text-muted-foreground">{safeDate((payment as any).paymentDate)}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold tabular-nums">${Number(payment.amount).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{payment.currencyCode}</p>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">

          {/* Client Details */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Client</h3>
            <div className="rounded-lg border bg-card divide-y">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium">{customerName(payment)}</span>
              </div>
              {payment.customer && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Customer #</span>
                  <span className="text-xs font-mono">{payment.customer.customerNumber}</span>
                </div>
              )}
            </div>
          </section>

          {/* Order Details (only if linked) */}
          {payment.order && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Linked Order</h3>
              <div className="rounded-lg border bg-card divide-y">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Order #</span>
                  <span className="text-xs font-mono">{payment.order.orderNumber}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Type</span>
                  {typeBadge(payment)}
                </div>
              </div>
            </section>
          )}

          {/* Payment Details */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Payment Details</h3>
            <div className="rounded-lg border bg-card divide-y">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-semibold tabular-nums">${Number(payment.amount).toFixed(2)} {payment.currencyCode}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Method</span>
                <span className="text-sm">{methodLabel(payment.method)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm">{safeDate((payment as any).paymentDate)}</span>
              </div>
              {payment.reference && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Reference</span>
                  <span className="text-sm font-mono">{payment.reference}</span>
                </div>
              )}
              {!payment.order && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Type</span>
                  {typeBadge(payment)}
                </div>
              )}
            </div>
          </section>

          {/* Notes */}
          {payment.notes && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Notes</h3>
              <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground leading-relaxed">
                {payment.notes}
              </div>
            </section>
          )}

          {/* Applied to invoices */}
          {payment.allocations.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Applied to Invoices</h3>
              <div className="rounded-lg border bg-card divide-y">
                {payment.allocations.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-mono">{a.invoice?.invoiceNumber ?? "—"}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [showCreate, setShowCreate] = React.useState(false);
  const [selected, setSelected] = React.useState<PaymentRow | null>(null);

  const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: Number });
  const [pageSize] = useQueryState("pageSize", { defaultValue: 20, parse: Number });

  // Filters
  const [fromDate, setFromDate] = useQueryState("from", { defaultValue: "" });
  const [toDate, setToDate] = useQueryState("to", { defaultValue: "" });
  const [typeFilter, setTypeFilter] = useQueryState("type", { defaultValue: "" });
  const [methodFilter, setMethodFilter] = useQueryState("method", { defaultValue: "" });
  const [search, setSearch] = React.useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["payments", { page, pageSize, fromDate, toDate, typeFilter, methodFilter }],
    queryFn: () => paymentsApi.list({
      page,
      limit: pageSize,
      ...(fromDate && { fromDate }),
      ...(toDate && { toDate }),
      ...(typeFilter === "deposit" && { isDeposit: true }),
      ...(typeFilter === "payment" && { isDeposit: false }),
      ...(methodFilter && { method: methodFilter }),
    } as any),
  });

  const total = (data as any)?.total ?? (data as any)?.meta?.total ?? 0;
  let rows: PaymentRow[] = (data as any)?.data ?? [];

  // Client-side search on notes/reference/receipt number
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((r) =>
      r.notes?.toLowerCase().includes(q) ||
      r.reference?.toLowerCase().includes(q) ||
      (r as any).receiptNumber?.toLowerCase().includes(q) ||
      customerName(r).toLowerCase().includes(q)
    );
  }

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setTypeFilter("");
    setMethodFilter("");
    setSearch("");
  }

  const hasFilters = fromDate || toDate || typeFilter || methodFilter || search;

  return (
    <div className="flex flex-col">
      <PageHeader title="Payments" description={`${total} total`}>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />Record payment
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="px-4 pb-4 flex flex-wrap gap-2 items-end border-b">
        <div className="flex items-center gap-1.5 bg-background border rounded-md px-2 h-9 flex-1 min-w-48 max-w-64">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search receipt, customer, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={typeFilter || "__all__"} onValueChange={(v) => { setTypeFilter(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            <SelectItem value="deposit">Deposits</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
          </SelectContent>
        </Select>

        <Select value={methodFilter || "__all__"} onValueChange={(v) => { setMethodFilter(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All methods</SelectItem>
            <SelectItem value="CASH">Cash</SelectItem>
            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
            <SelectItem value="MOBILE_MONEY">EcoCash / InnBucks</SelectItem>
            <SelectItem value="PAYNOW">Paynow</SelectItem>
            <SelectItem value="CHEQUE">Cheque</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            className="h-9 w-36"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            placeholder="From"
            title="From date"
          />
          <span className="text-muted-foreground text-xs">—</span>
          <Input
            type="date"
            className="h-9 w-36"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            placeholder="To"
            title="To date"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      <PaymentFormModal open={showCreate} onOpenChange={setShowCreate} />

      <PaymentDrawer
        payment={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />

      <DataTable
        columns={columns}
        data={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={isLoading}
        onRowClick={(r) => setSelected(r)}
      />
    </div>
  );
}
