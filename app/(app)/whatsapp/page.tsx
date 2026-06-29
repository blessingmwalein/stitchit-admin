"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { apiClient } from "@/lib/api/client";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

type WhatsAppMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  to: string;
  from: string;
  body: string;
  template: string | null;
  status: string;
  waMessageId: string | null;
  customerName: string | null;
  createdAt: string;
};

async function listMessages(params: { page: number; pageSize: number }) {
  return apiClient.get<{ data: WhatsAppMessage[]; meta: { total: number } }>("/whatsapp/messages", { params });
}

const STATUS_COLORS: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  READ: "bg-green-600 text-white",
  FAILED: "bg-red-100 text-red-700",
  RECEIVED: "bg-purple-100 text-purple-700",
};

const columns: ColumnDef<WhatsAppMessage>[] = [
  {
    accessorKey: "direction",
    header: "Dir",
    cell: ({ row }) =>
      row.original.direction === "INBOUND"
        ? <ArrowDownLeft className="h-4 w-4 text-purple-500" />
        : <ArrowUpRight className="h-4 w-4 text-blue-500" />,
  },
  {
    header: "Contact",
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">{row.original.customerName ?? (row.original.direction === "INBOUND" ? row.original.from : row.original.to)}</p>
        <p className="text-xs text-muted-foreground">{row.original.direction === "INBOUND" ? row.original.from : row.original.to}</p>
      </div>
    ),
  },
  {
    accessorKey: "body",
    header: "Message",
    cell: ({ row }) => <p className="text-sm line-clamp-2 max-w-xs">{row.original.body}</p>,
  },
  {
    accessorKey: "template",
    header: "Template",
    cell: ({ row }) => row.original.template ? <Badge variant="outline" className="text-xs">{row.original.template}</Badge> : null,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[row.original.status] ?? "")}>
        {row.original.status.toLowerCase()}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Time",
    cell: ({ row }) => format(new Date(row.original.createdAt), "dd MMM HH:mm"),
  },
];

export default function WhatsAppPage() {
  const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: Number });
  const [pageSize] = useQueryState("pageSize", { defaultValue: 25, parse: Number });

  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-messages", { page, pageSize }],
    queryFn: () => listMessages({ page, pageSize }),
    refetchInterval: 10_000,
  });

  return (
    <div className="flex flex-col">
      <PageHeader title="WhatsApp" description="Inbound & outbound messages">
        <Button size="sm">Send message</Button>
      </PageHeader>
      <DataTable columns={columns} data={data?.data ?? []} total={data?.meta?.total} page={page} pageSize={pageSize} onPageChange={setPage} loading={isLoading} />
    </div>
  );
}
