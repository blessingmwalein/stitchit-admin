"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ordersApi } from "@/lib/api/sales";
import type { Order } from "@/lib/types/sales";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { OrderFormModal } from "@/components/modules/sales/order-form-modal";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  NORMAL: "bg-blue-100 text-blue-600",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

const columns: ColumnDef<Order>[] = [
  {
    id: "design",
    header: "",
    cell: ({ row }) => {
      const firstImg = (row.original as any).items?.find((i: any) => i.designFileUrl)?.designFileUrl;
      if (!firstImg) return <div className="h-9 w-9 rounded border bg-muted flex items-center justify-center text-muted-foreground/40 shrink-0"><span className="text-[10px]">—</span></div>;
      return (
        <img
          src={firstImg}
          alt="Design"
          className="h-9 w-9 rounded border object-cover shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      );
    },
  },
  {
    accessorKey: "orderNumber",
    header: "Order",
    cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.orderNumber}</span>,
  },
  {
    header: "Customer",
    cell: ({ row }) => {
      const c = (row.original as any).customer;
      if (!c) return <span className="text-muted-foreground text-xs">—</span>;
      const name = c.firstName
        ? `${c.firstName} ${c.lastName ?? ""}`.trim()
        : c.companyName ?? c.customerNumber;
      return <span className="font-medium">{name}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <Badge variant="outline" className={`border-transparent text-xs ${PRIORITY_COLORS[row.original.priority]}`}>
        {row.original.priority}
      </Badge>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => <span className="font-medium">${Number(row.original.total).toFixed(2)}</span>,
  },
  {
    accessorKey: "balance",
    header: "Balance",
    cell: ({ row }) => (
      <span className={row.original.balance > 0 ? "text-red-600" : "text-green-600"}>
        ${Number(row.original.balance).toFixed(2)}
      </span>
    ),
  },
  {
    accessorKey: "promisedDate",
    header: "Due",
    cell: ({ row }) =>
      row.original.promisedDate ? format(new Date(row.original.promisedDate), "dd MMM") : "—",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => format(new Date(row.original.createdAt), "dd MMM yyyy"),
  },
];

export default function OrdersPage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = React.useState(false);
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [status, setStatus] = useQueryState("status", { defaultValue: "" });
  const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: Number });
  const [pageSize, setPageSize] = useQueryState("pageSize", { defaultValue: 20, parse: Number });

  const { data, isLoading } = useQuery({
    queryKey: ["orders", { search, status, page, pageSize }],
    queryFn: () => ordersApi.list({ search, status: status || undefined, page, pageSize }),
  });

  return (
    <div className="flex flex-col">
      <PageHeader title="Orders" description={`${data?.meta?.total ?? 0} total`}>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New order
        </Button>
      </PageHeader>
      <OrderFormModal open={showCreate} onOpenChange={setShowCreate} />

      <div className="flex items-center gap-2 border-b bg-card px-6 py-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search orders…"
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
        onRowClick={(r) => router.push(`/orders/${r.id}`)}
      />
    </div>
  );
}
