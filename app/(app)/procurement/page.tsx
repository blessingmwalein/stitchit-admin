"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { suppliersApi, purchaseOrdersApi, supplierBillsApi } from "@/lib/api/procurement";
import type { Supplier, PurchaseOrder, Bill } from "@/lib/types/procurement";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { SupplierFormModal } from "@/components/modules/procurement/supplier-form-modal";

const supplierCols: ColumnDef<Supplier>[] = [
  { accessorKey: "supplierNumber", header: "Number", cell: ({ row }) => <span className="font-mono text-xs">{row.original.supplierNumber}</span> },
  { accessorKey: "name", header: "Supplier", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "contactPerson", header: "Contact", cell: ({ row }) => row.original.contactPerson ?? "—" },
  { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
  {
    accessorKey: "outstandingBalance",
    header: "Outstanding",
    cell: ({ row }) => <span className={row.original.outstandingBalance > 0 ? "text-red-600" : ""}>${Number(row.original.outstandingBalance).toFixed(2)}</span>,
  },
];

const poCols: ColumnDef<PurchaseOrder>[] = [
  { accessorKey: "poNumber", header: "PO", cell: ({ row }) => <span className="font-mono text-xs">{row.original.poNumber}</span> },
  { accessorKey: "supplierName", header: "Supplier" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "total", header: "Total", cell: ({ row }) => `$${Number(row.original.total).toFixed(2)}` },
  { accessorKey: "expectedDate", header: "Expected", cell: ({ row }) => row.original.expectedDate ? format(new Date(row.original.expectedDate), "dd MMM yyyy") : "—" },
];

const billCols: ColumnDef<Bill>[] = [
  { accessorKey: "billNumber", header: "Bill", cell: ({ row }) => <span className="font-mono text-xs">{row.original.billNumber}</span> },
  { accessorKey: "supplierName", header: "Supplier" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "total", header: "Total", cell: ({ row }) => `$${Number(row.original.total).toFixed(2)}` },
  {
    accessorKey: "balance",
    header: "Balance",
    cell: ({ row }) => <span className={row.original.balance > 0 ? "text-red-600" : ""}>${Number(row.original.balance).toFixed(2)}</span>,
  },
  { accessorKey: "dueDate", header: "Due", cell: ({ row }) => format(new Date(row.original.dueDate), "dd MMM yyyy") },
];

export default function ProcurementPage() {
  const [showSupplier, setShowSupplier] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("suppliers");
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: Number });
  const [pageSize] = useQueryState("pageSize", { defaultValue: 20, parse: Number });

  const [editSupplier, setEditSupplier] = React.useState<Supplier | undefined>();
  const suppliers = useQuery({ queryKey: ["suppliers", { search, page }], queryFn: () => suppliersApi.list({ search, page, pageSize }) });
  const pos = useQuery({ queryKey: ["purchase-orders", { search, page }], queryFn: () => purchaseOrdersApi.list({ page, pageSize }) });
  const bills = useQuery({ queryKey: ["supplier-bills", { page }], queryFn: () => supplierBillsApi.list({ page, pageSize }) });

  return (
    <div className="flex flex-col">
      <PageHeader title="Procurement">
        {activeTab === "suppliers" && (
          <Button size="sm" onClick={() => setShowSupplier(true)}>
            <Plus className="mr-1 h-4 w-4" />New Supplier
          </Button>
        )}
      </PageHeader>

      <SupplierFormModal
        open={showSupplier || !!editSupplier}
        onOpenChange={(v) => { setShowSupplier(v); if (!v) setEditSupplier(undefined); }}
        supplier={editSupplier}
      />

      <div className="flex-1 px-6 pt-4">
        <Tabs defaultValue="suppliers" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="pos">Purchase Orders</TabsTrigger>
            <TabsTrigger value="bills">Bills</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="mt-4">
            <DataTable columns={supplierCols} data={suppliers.data?.data ?? []} total={suppliers.data?.meta?.total} page={page} pageSize={pageSize} onPageChange={setPage} loading={suppliers.isLoading} onRowClick={(r) => setEditSupplier(r)} />
          </TabsContent>
          <TabsContent value="pos" className="mt-4">
            <DataTable columns={poCols} data={pos.data?.data ?? []} total={pos.data?.meta?.total} page={page} pageSize={pageSize} onPageChange={setPage} loading={pos.isLoading} />
          </TabsContent>
          <TabsContent value="bills" className="mt-4">
            <DataTable columns={billCols} data={bills.data?.data ?? []} total={bills.data?.meta?.total} page={page} pageSize={pageSize} onPageChange={setPage} loading={bills.isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
