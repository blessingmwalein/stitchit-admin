"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "@/lib/api/finance";
import type { Account } from "@/lib/types/finance";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountTree = Account & { children?: AccountTree[] };

function buildTree(accounts: Account[]): AccountTree[] {
  const map = new Map<string, AccountTree>();
  accounts.forEach((a) => map.set(a.id, { ...a, children: [] }));
  const roots: AccountTree[] = [];
  accounts.forEach((a) => {
    if (a.parentId && map.has(a.parentId)) {
      map.get(a.parentId)!.children!.push(map.get(a.id)!);
    } else {
      roots.push(map.get(a.id)!);
    }
  });
  return roots;
}

const TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-700",
  LIABILITY: "bg-red-100 text-red-700",
  EQUITY: "bg-purple-100 text-purple-700",
  REVENUE: "bg-green-100 text-green-700",
  EXPENSE: "bg-amber-100 text-amber-700",
};

function AccountRow({ account, depth }: { account: AccountTree; depth: number }) {
  const [open, setOpen] = React.useState(depth < 2);
  const hasChildren = (account.children?.length ?? 0) > 0;

  return (
    <>
      <tr
        className="group border-b hover:bg-muted/40 cursor-pointer"
        onClick={() => hasChildren && setOpen((v) => !v)}
      >
        <td className="py-2 pr-2" style={{ paddingLeft: `${16 + depth * 20}px` }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{account.code}</span>
            <span className={cn("font-medium text-sm", depth === 0 && "font-semibold")}>{account.name}</span>
          </div>
        </td>
        <td className="py-2 pr-4">
          <Badge variant="secondary" className={cn("text-xs", TYPE_COLORS[account.type] ?? "")}>{account.type}</Badge>
        </td>
        <td className="py-2 pr-4 text-xs text-muted-foreground">{account.subtype ?? "—"}</td>
        <td className="py-2 pr-4 text-right text-sm tabular-nums">
          {account.balance !== undefined ? `$${Number(account.balance).toFixed(2)}` : "—"}
        </td>
        <td className="py-2 pr-4">
          {account.isSystem && <Badge variant="outline" className="text-xs">System</Badge>}
        </td>
      </tr>
      {open && account.children?.map((child) => (
        <AccountRow key={child.id} account={child} depth={depth + 1} />
      ))}
    </>
  );
}

export default function AccountsPage() {
  const { data: accountsResult, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list({ pageSize: 500 }),
  });
  const accounts = accountsResult ?? [];

  const tree = React.useMemo(() => buildTree(accounts), [accounts]);

  return (
    <div className="flex flex-col">
      <PageHeader title="Chart of Accounts" description={`${accounts.length} accounts`}>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />New account</Button>
      </PageHeader>

      <div className="flex-1 overflow-auto px-6 pt-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-4">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pr-2 text-left font-medium pl-4">Account</th>
                <th className="py-2 pr-4 text-left font-medium">Type</th>
                <th className="py-2 pr-4 text-left font-medium">Subtype</th>
                <th className="py-2 pr-4 text-right font-medium">Balance</th>
                <th className="py-2 pr-4 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {tree.map((account) => (
                <AccountRow key={account.id} account={account} depth={0} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
