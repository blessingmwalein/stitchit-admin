"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { quotationsApi } from "@/lib/api/sales";
import type { Quotation } from "@/lib/types/sales";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { QuotationFormModal } from "@/components/modules/sales/quotation-form-modal";

const columns: ColumnDef<Quotation>[] = [
  {
    accessorKey: "quotationNumber",
    header: "Number",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.quotationNumber}</span>,
  },
  {
    header: "Customer",
    cell: ({ row }) => row.original.customerName ?? <span className="text-muted-foreground italic">No customer</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => <span className="font-medium">${Number(row.original.total).toFixed(2)}</span>,
  },
  {
    accessorKey: "expiryDate",
    header: "Expires",
    cell: ({ row }) => row.original.expiryDate ? format(new Date(row.original.expiryDate), "dd MMM yyyy") : "—",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => format(new Date(row.original.createdAt), "dd MMM yyyy"),
  },
];

export default function QuotationsPage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = React.useState(false);
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: Number });
  const [pageSize, setPageSize] = useQueryState("pageSize", { defaultValue: 20, parse: Number });

  const { data, isLoading } = useQuery({
    queryKey: ["quotations", { search, page, pageSize }],
    queryFn: () => quotationsApi.list({ search, page, pageSize }),
  });

  return (
    <div className="flex flex-col">
      <PageHeader title="Quotations" description={`${data?.meta?.total ?? 0} total`}>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New quote
        </Button>
      </PageHeader>
      <QuotationFormModal open={showCreate} onOpenChange={setShowCreate} />

      <div className="flex items-center gap-2 border-b bg-card px-6 py-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search quotations…"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.meta?.total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={isLoading}
        onRowClick={(r) => router.push(`/quotations/${r.id}`)}
      />
    </div>
  );
}
