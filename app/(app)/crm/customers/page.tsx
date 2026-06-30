"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { customersApi } from "@/lib/api/crm";
import { customerDisplayName, type Customer } from "@/lib/types/crm";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { CustomerFormModal } from "@/components/modules/crm/customer-form-modal";

function safeMoney(v: any): string {
  const n = Number(v);
  return isNaN(n) ? "—" : `$${n.toFixed(2)}`;
}

function safeCount(v: any): number {
  const n = Number(v ?? (v as any)?._count?.orders ?? 0);
  return isNaN(n) ? 0 : n;
}

const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "customerNumber",
    header: "Number",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.customerNumber}</span>
    ),
  },
  {
    header: "Name",
    enableSorting: false,
    cell: ({ row }) => {
      const c = row.original as any;
      return (
        <div>
          <p className="font-medium">{customerDisplayName(row.original)}</p>
          {c.email && (
            <p className="text-xs text-muted-foreground">{c.email}</p>
          )}
        </div>
      );
    },
  },
  {
    header: "Phone",
    enableSorting: false,
    cell: ({ row }) => {
      const c = row.original as any;
      return <span className="text-sm">{c.phone ?? "—"}</span>;
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    enableSorting: true,
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs capitalize">
        {row.original.type.toLowerCase()}
      </Badge>
    ),
  },
  {
    header: "Orders",
    enableSorting: false,
    cell: ({ row }) => {
      const c = row.original as any;
      const count = c._count?.orders ?? c.ordersCount ?? "—";
      return <span className="tabular-nums text-sm">{count}</span>;
    },
  },
  {
    accessorKey: "outstandingBalance",
    header: "Outstanding",
    enableSorting: true,
    cell: ({ row }) => {
      const v = (row.original as any).outstandingBalance;
      const n = Number(v);
      if (isNaN(n)) return <span className="text-muted-foreground text-sm">—</span>;
      return (
        <span className={n > 0 ? "text-red-600 font-medium tabular-nums" : "tabular-nums text-sm"}>
          ${n.toFixed(2)}
        </span>
      );
    },
  },
  {
    accessorKey: "totalSpend",
    header: "Total Spend",
    enableSorting: true,
    cell: ({ row }) => {
      const v = (row.original as any).totalSpend;
      const n = Number(v);
      return (
        <span className="tabular-nums text-sm">
          {isNaN(n) ? "—" : `$${n.toFixed(2)}`}
        </span>
      );
    },
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
      <PageHeader
        title="Customers"
        description={`${(data as any)?.meta?.total ?? (data as any)?.total ?? 0} customers`}
      >
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New customer
        </Button>
      </PageHeader>

      <CustomerFormModal open={showCreate} onOpenChange={setShowCreate} />

      <div className="flex items-center gap-2 border-b bg-card px-4 py-3">
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
        data={(data as any)?.data ?? []}
        total={(data as any)?.meta?.total ?? (data as any)?.total}
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
