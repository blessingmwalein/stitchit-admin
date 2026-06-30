"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { apiClient } from "@/lib/api/client";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  userName: string | null;
  ip: string | null;
  userAgent: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
};

async function listLogs(params: { search?: string; page: number; pageSize: number }) {
  return apiClient.get<{ data: AuditLog[]; meta: { total: number } }>("/audit-logs", { params });
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
  LOGOUT: "bg-gray-100 text-gray-700",
};

const columns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => (
      <Badge variant="secondary" className={`text-xs ${ACTION_COLORS[row.original.action] ?? ""}`}>
        {row.original.action}
      </Badge>
    ),
  },
  {
    header: "Entity",
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.entityType}</p>
        <p className="font-mono text-xs text-muted-foreground truncate max-w-32">{row.original.entityId}</p>
      </div>
    ),
  },
  {
    header: "User",
    cell: ({ row }) => row.original.userName ?? <span className="text-muted-foreground text-xs">System</span>,
  },
  {
    accessorKey: "ip",
    header: "IP",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip ?? "—"}</span>,
  },
  {
    accessorKey: "createdAt",
    header: "Time",
    cell: ({ row }) => format(new Date(row.original.createdAt), "dd MMM yyyy HH:mm:ss"),
  },
];

export default function AuditPage() {
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: Number });
  const [pageSize] = useQueryState("pageSize", { defaultValue: 25, parse: Number });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", { search, page, pageSize }],
    queryFn: () => listLogs({ search, page, pageSize }),
  });

  return (
    <div className="flex flex-col">
      <PageHeader title="Audit Log" description="All system actions" />
      <div className="flex items-center gap-2 border-b bg-card px-6 py-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search actions, entities…" className="h-8 pl-8 text-sm" />
        </div>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} total={data?.meta?.total} page={page} pageSize={pageSize} onPageChange={setPage} loading={isLoading} />
    </div>
  );
}
