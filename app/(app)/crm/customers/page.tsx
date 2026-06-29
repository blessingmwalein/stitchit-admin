"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { customersApi } from "@/lib/api/crm";
import { customerDisplayName, type Customer } from "@/lib/types/crm";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { CustomerFormModal } from "@/components/modules/crm/customer-form-modal";

const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "customerNumber",
    header: "Number",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.customerNumber}</span>,
  },
  {
    header: "Name",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{customerDisplayName(row.original)}</p>
        {row.original.email && <p className="text-xs text-muted-foreground">{row.original.email}</p>}
      </div>
    ),
  },
  { accessorKey: "phone", header: "Phone" },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-xs capitalize">{row.original.type.toLowerCase()}</span>
    ),
  },
  {
    accessorKey: "outstandingBalance",
    header: "Outstanding",
    cell: ({ row }) => (
      <span className={row.original.outstandingBalance > 0 ? "text-red-600 font-medium" : ""}>
        ${Number(row.original.outstandingBalance).toFixed(2)}
      </span>
    ),
  },
  {
    accessorKey: "totalSpend",
    header: "Total Spend",
    cell: ({ row }) => `$${Number(row.original.totalSpend).toFixed(2)}`,
  },
];

export default function CustomersPage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = React.useState(false);
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: Number });
  const [pageSize, setPageSize] = useQueryState("pageSize", { defaultValue: 20, parse: Number });

  const { data, isLoading } = useQuery({
    queryKey: ["customers", { search, page, pageSize }],
    queryFn: () => customersApi.list({ search, page, pageSize }),
  });

  return (
    <div className="flex flex-col">
      <PageHeader title="Customers" description={`${data?.meta?.total ?? 0} customers`}>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New customer
        </Button>
      </PageHeader>

      <CustomerFormModal open={showCreate} onOpenChange={setShowCreate} />

      <div className="flex items-center gap-2 border-b bg-card px-6 py-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search customers…"
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
        onRowClick={(r) => router.push(`/crm/customers/${r.id}`)}
      />
    </div>
  );
}
