"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { journalsApi } from "@/lib/api/finance";
import type { JournalEntry } from "@/lib/types/finance";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const columns: ColumnDef<JournalEntry>[] = [
  { accessorKey: "entryNumber", header: "Number", cell: ({ row }) => <span className="font-mono text-xs">{(row.original as any).entryNumber ?? row.original.journalNumber}</span> },
  { accessorKey: "memo", header: "Description", cell: ({ row }) => <span className="font-medium line-clamp-1 max-w-64">{row.original.memo ?? "—"}</span> },
  { accessorKey: "sourceType", header: "Source", cell: ({ row }) => row.original.sourceType ? <Badge variant="outline" className="text-xs capitalize">{row.original.sourceType.replace(/_/g, " ").toLowerCase()}</Badge> : null },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant="outline" className="text-xs">{(row.original as any).status ?? "—"}</Badge> },
  { accessorKey: "totalDebit", header: "Debit", cell: ({ row }) => `$${Number(row.original.totalDebit).toFixed(2)}` },
  { accessorKey: "totalCredit", header: "Credit", cell: ({ row }) => `$${Number(row.original.totalCredit).toFixed(2)}` },
  {
    header: "Date",
    cell: ({ row }) => {
      const d = (row.original as any).entryDate ?? (row.original as any).date;
      return d ? format(new Date(d), "dd MMM yyyy") : "—";
    },
  },
  { header: "Posted by", cell: ({ row }) => (row.original as any).postedByName ?? row.original.postedBy ?? "—" },
];

export default function JournalsPage() {
  const router = useRouter();
  const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: Number });
  const [pageSize] = useQueryState("pageSize", { defaultValue: 20, parse: Number });

  const { data, isLoading } = useQuery({
    queryKey: ["journal-entries", { page, pageSize }],
    queryFn: () => journalsApi.list({ page, pageSize }),
  });

  return (
    <div className="flex flex-col">
      <PageHeader title="Journal Entries" description={`${(data as any)?.total ?? (data as any)?.meta?.total ?? 0} entries`}>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />Manual entry</Button>
      </PageHeader>
      <DataTable
        columns={columns}
        data={(data as any)?.data ?? []}
        total={(data as any)?.total ?? (data as any)?.meta?.total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={isLoading}
        onRowClick={(r) => router.push(`/finance/journals/${r.id}`)}
      />
    </div>
  );
}
