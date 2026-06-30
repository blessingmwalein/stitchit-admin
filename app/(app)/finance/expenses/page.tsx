"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { expensesApi } from "@/lib/api/finance";
import type { Expense } from "@/lib/types/finance";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { DatePicker } from "@/components/shared/date-picker";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ExpenseFormModal } from "@/components/modules/finance/expense-form-modal";

const CATEGORIES = [
  { value: "RENT",        label: "Rent" },
  { value: "UTILITIES",   label: "Utilities" },
  { value: "SALARIES",    label: "Salaries" },
  { value: "TRANSPORT",   label: "Transport" },
  { value: "MARKETING",   label: "Marketing" },
  { value: "EQUIPMENT",   label: "Equipment" },
  { value: "OTHER",       label: "Other" },
];

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);

  const [page, setPage]         = useQueryState("page",     { defaultValue: 1, parse: Number });
  const [pageSize]              = useQueryState("pageSize", { defaultValue: 20, parse: Number });
  const [fromDate, setFrom]     = useQueryState("from",     { defaultValue: "" });
  const [toDate, setTo]         = useQueryState("to",       { defaultValue: "" });
  const [category, setCategory] = useQueryState("cat",      { defaultValue: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", { page, pageSize, fromDate, toDate, category }],
    queryFn: () =>
      expensesApi.list({
        page,
        pageSize,
        ...(fromDate  && { fromDate }),
        ...(toDate    && { toDate }),
        ...(category  && { category }),
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      toast.success("Expense deleted");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: () => toast.error("Failed to delete expense"),
  });

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: "expenseNumber",
      header: "Reference",
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.expenseNumber}</span>
      ),
    },
    {
      header: "Description",
      enableSorting: false,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">
            {(row.original as any).payee || row.original.description || "—"}
          </p>
          {(row.original as any).payee && row.original.description && (
            <p className="text-xs text-muted-foreground">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-xs capitalize">
          {(row.original.category ?? "").replace(/_/g, " ").toLowerCase()}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount (USD)",
      enableSorting: true,
      cell: ({ row }) => {
        const amt = (row.original as any).amount ?? (row.original as any).amountUsd ?? 0;
        return <span className="font-medium tabular-nums">${Number(amt).toFixed(2)}</span>;
      },
    },
    {
      accessorKey: "date",
      header: "Date",
      enableSorting: true,
      cell: ({ row }) => {
        const d =
          (row.original as any).date ??
          (row.original as any).expenseDate ??
          (row.original as any).createdAt;
        return d ? format(new Date(d), "dd MMM yyyy") : "—";
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); setEditingExpense(row.original); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this expense? This cannot be undone.")) {
                deleteMut.mutate(row.original.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const total = (data as any)?.meta?.total ?? (data as any)?.total ?? 0;
  const rows: Expense[] = (data as any)?.data ?? [];

  const hasFilters = fromDate || toDate || category;

  function clearFilters() {
    setFrom("");
    setTo("");
    setCategory("");
    setPage(1);
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Expenses" description={`${total} total`}>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />New expense
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="px-4 pb-4 pt-1 flex flex-wrap gap-3 items-end border-b">
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">From</span>
            <DatePicker
              value={fromDate}
              onChange={(v) => { setFrom(v); setPage(1); }}
              placeholder="From date"
              className="w-38"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">To</span>
            <DatePicker
              value={toDate}
              onChange={(v) => { setTo(v); setPage(1); }}
              placeholder="To date"
              className="w-38"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">Category</span>
          <Select
            value={category || "__all__"}
            onValueChange={(v) => { setCategory(v === "__all__" ? "" : v); setPage(1); }}
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <div className="flex flex-col justify-end">
            <Button
              variant="ghost" size="sm"
              className="h-9 text-muted-foreground"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <ExpenseFormModal open={showCreate} onOpenChange={setShowCreate} />
      <ExpenseFormModal
        open={!!editingExpense}
        onOpenChange={(o) => { if (!o) setEditingExpense(null); }}
        expense={editingExpense}
      />

      <DataTable
        columns={columns}
        data={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={isLoading}
      />
    </div>
  );
}
