"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { expensesApi } from "@/lib/api/finance";
import type { Expense } from "@/lib/types/finance";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ExpenseFormModal } from "@/components/modules/finance/expense-form-modal";

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: Number });
  const [pageSize] = useQueryState("pageSize", { defaultValue: 20, parse: Number });

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", { page, pageSize }],
    queryFn: () => expensesApi.list({ page, pageSize }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => { toast.success("Expense deleted"); qc.invalidateQueries({ queryKey: ["expenses"] }); },
    onError: () => toast.error("Failed to delete expense"),
  });

  const columns: ColumnDef<Expense>[] = [
    { accessorKey: "expenseNumber", header: "Reference", cell: ({ row }) => <span className="font-mono text-xs">{row.original.expenseNumber}</span> },
    {
      header: "Description",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{(row.original as any).payee || row.original.description || "—"}</p>
          {(row.original as any).payee && row.original.description && (
            <p className="text-xs text-muted-foreground">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="text-xs capitalize">{(row.original.category ?? "").replace(/_/g, " ").toLowerCase()}</span>
      ),
    },
    {
      header: "Amount (USD)",
      cell: ({ row }) => {
        const amt = (row.original as any).amount ?? (row.original as any).amountUsd ?? 0;
        return <span className="font-medium">${Number(amt).toFixed(2)}</span>;
      },
    },
    {
      header: "Date",
      cell: ({ row }) => {
        const d = (row.original as any).date ?? (row.original as any).expenseDate ?? (row.original as any).createdAt;
        return d ? format(new Date(d), "dd MMM yyyy") : "—";
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); setEditingExpense(row.original); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
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

  return (
    <div className="flex flex-col">
      <PageHeader title="Expenses" description={`${total} total`}>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />New expense
        </Button>
      </PageHeader>

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
