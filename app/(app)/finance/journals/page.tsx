"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { journalsApi } from "@/lib/api/finance";
import type { JournalEntry } from "@/lib/types/finance";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { DatePicker } from "@/components/shared/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { JournalEntryDrawer } from "@/components/modules/finance/journal-entry-drawer";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  POSTED:   "bg-green-100 text-green-700 border-green-200",
  DRAFT:    "bg-amber-100 text-amber-700 border-amber-200",
  REVERSED: "bg-slate-100 text-slate-500 border-slate-200",
  VOID:     "bg-red-100 text-red-600 border-red-200",
};

const SOURCE_LABELS: Record<string, string> = {
  MANUAL:        "Manual",
  INVOICE:       "Invoice",
  PAYMENT:       "Payment",
  EXPENSE:       "Expense",
  STOCK_ISSUE:   "Stock Issue",
  STOCK_RECEIPT: "Stock Receipt",
  REVERSAL:      "Reversal",
  PAYROLL:       "Payroll",
};

const columns: ColumnDef<JournalEntry>[] = [
  {
    accessorKey: "entryNumber",
    header: "Number",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium">
        {(row.original as any).entryNumber ?? row.original.journalNumber}
      </span>
    ),
  },
  {
    accessorKey: "memo",
    header: "Description",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-medium line-clamp-1 max-w-64">
        {row.original.memo ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "sourceType",
    header: "Source",
    enableSorting: true,
    cell: ({ row }) =>
      row.original.sourceType ? (
        <Badge variant="outline" className="text-xs">
          {SOURCE_LABELS[row.original.sourceType] ?? row.original.sourceType.replace(/_/g, " ")}
        </Badge>
      ) : null,
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: true,
    cell: ({ row }) => {
      const s = (row.original as any).status as string | undefined;
      return s ? (
        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[s] ?? ""}`}>
          {s}
        </Badge>
      ) : null;
    },
  },
  {
    accessorKey: "totalDebit",
    header: "Debit",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="tabular-nums text-emerald-700 font-medium">
        ${Number(row.original.totalDebit).toFixed(2)}
      </span>
    ),
  },
  {
    accessorKey: "totalCredit",
    header: "Credit",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="tabular-nums text-blue-700 font-medium">
        ${Number(row.original.totalCredit).toFixed(2)}
      </span>
    ),
  },
  {
    accessorKey: "entryDate",
    header: "Date",
    enableSorting: true,
    cell: ({ row }) => {
      const d = (row.original as any).entryDate ?? (row.original as any).date;
      return d ? format(new Date(d), "dd MMM yyyy") : "—";
    },
  },
  {
    header: "Posted by",
    cell: ({ row }) =>
      (row.original as any).postedByName ?? row.original.postedBy ?? "—",
  },
];

const TODAY = format(new Date(), "yyyy-MM-dd");

export default function JournalsPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const [page, setPage]     = useQueryState("page",     { defaultValue: 1, parse: Number });
  const [pageSize]          = useQueryState("pageSize", { defaultValue: 20, parse: Number });
  const [fromDate, setFrom] = useQueryState("from",     { defaultValue: TODAY });
  const [toDate, setTo]     = useQueryState("to",       { defaultValue: TODAY });
  const [status, setStatus] = useQueryState("status",   { defaultValue: "" });
  const [source, setSource] = useQueryState("source",   { defaultValue: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["journal-entries", { page, pageSize, fromDate, toDate, status, source }],
    queryFn: () =>
      journalsApi.list({
        page,
        limit: pageSize,
        ...(fromDate && { fromDate }),
        ...(toDate   && { toDate }),
        ...(status   && { status }),
        ...(source   && { sourceType: source }),
      } as any),
  });

  const total = (data as any)?.total ?? (data as any)?.meta?.total ?? 0;

  function clearFilters() {
    setFrom(TODAY);
    setTo(TODAY);
    setStatus("");
    setSource("");
    setPage(1);
  }

  const hasCustomFilters = fromDate !== TODAY || toDate !== TODAY || !!status || !!source;

  async function handleReverse(id: string) {
    try {
      await journalsApi.reverse(id, "Manual reversal");
      toast.success("Journal entry reversed");
      qc.invalidateQueries({ queryKey: ["journal-entries"] });
      qc.invalidateQueries({ queryKey: ["journal-entry", id] });
      setSelectedId(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reverse entry");
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Journal Entries"
        description={`${total} entries`}
      >
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Manual entry
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="px-4 pb-4 pt-1 flex flex-wrap gap-3 items-end border-b">
        {/* Date range */}
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

        {/* Status */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">Status</span>
          <Select
            value={status || "__all__"}
            onValueChange={(v) => { setStatus(v === "__all__" ? "" : v); setPage(1); }}
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              <SelectItem value="POSTED">Posted</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="REVERSED">Reversed</SelectItem>
              <SelectItem value="VOID">Void</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Source type */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">Source</span>
          <Select
            value={source || "__all__"}
            onValueChange={(v) => { setSource(v === "__all__" ? "" : v); setPage(1); }}
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All sources</SelectItem>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasCustomFilters && (
          <div className="flex flex-col justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground"
              onClick={clearFilters}
            >
              Reset to today
            </Button>
          </div>
        )}
      </div>

      <JournalEntryDrawer
        entryId={selectedId}
        onOpenChange={(open) => { if (!open) setSelectedId(null); }}
        onReverse={handleReverse}
      />

      <DataTable
        columns={columns}
        data={(data as any)?.data ?? []}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={isLoading}
        onRowClick={(r) => setSelectedId((r as any).id)}
      />
    </div>
  );
}
