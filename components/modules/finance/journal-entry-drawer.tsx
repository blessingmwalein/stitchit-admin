"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { journalsApi } from "@/lib/api/finance";
import type { JournalEntry } from "@/lib/types/finance";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface Props {
  entryId: string | null;
  onOpenChange: (open: boolean) => void;
  onReverse?: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  POSTED: "bg-green-100 text-green-700 border-green-200",
  DRAFT: "bg-amber-100 text-amber-700 border-amber-200",
  REVERSED: "bg-slate-100 text-slate-500 border-slate-200",
  VOID: "bg-red-100 text-red-600 border-red-200",
};

function SkeletonRows() {
  return (
    <div className="space-y-2 px-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

export function JournalEntryDrawer({ entryId, onOpenChange, onReverse }: Props) {
  const open = entryId !== null;

  const { data: entry, isLoading } = useQuery<JournalEntry>({
    queryKey: ["journal-entry", entryId],
    queryFn: () => journalsApi.get(entryId!),
    enabled: open,
  });

  const date = entry
    ? ((entry as any).entryDate ?? (entry as any).date ?? entry.createdAt)
    : null;

  const status = (entry as any)?.status as string | undefined;
  const entryNumber =
    (entry as any)?.entryNumber ?? entry?.journalNumber ?? "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-xl overflow-hidden p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-start justify-between gap-2 pr-6">
            <div>
              <SheetTitle className="font-mono text-base">{entryNumber}</SheetTitle>
              <SheetDescription className="mt-0.5 text-xs">
                {date ? format(new Date(date), "dd MMM yyyy") : ""}
                {entry?.sourceType && (
                  <span className="ml-2 capitalize">
                    · {entry.sourceType.replace(/_/g, " ").toLowerCase()}
                  </span>
                )}
              </SheetDescription>
            </div>
            {status && (
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ${STATUS_COLORS[status] ?? ""}`}
              >
                {status}
              </Badge>
            )}
          </div>
          {entry?.memo && (
            <p className="text-sm text-muted-foreground mt-1">{entry.memo}</p>
          )}
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="pt-4">
              <SkeletonRows />
            </div>
          ) : entry ? (
            <div className="pb-6">
              {/* Lines table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium w-16">Code</th>
                    <th className="px-3 py-2.5 text-left font-medium">Account</th>
                    <th className="px-3 py-2.5 text-right font-medium w-24">Debit</th>
                    <th className="px-5 py-2.5 text-right font-medium w-24">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {(entry.lines ?? []).map((line, idx) => {
                    const l = line as any;
                    // Backend returns lines with nested account relation
                    const code = l.account?.code ?? l.accountCode ?? "—";
                    const name = l.account?.name ?? l.accountName ?? "Unknown account";
                    const debit  = Number(l.debit  ?? 0);
                    const credit = Number(l.credit ?? 0);
                    const note   = l.memo ?? l.description ?? null;
                    return (
                      <tr
                        key={l.id ?? idx}
                        className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">
                          {code}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-medium">{name}</span>
                          {note && (
                            <p className="text-xs text-muted-foreground truncate max-w-52">
                              {note}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">
                          {debit > 0 ? `$${debit.toFixed(2)}` : ""}
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-blue-700">
                          {credit > 0 ? `$${credit.toFixed(2)}` : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-semibold text-xs">
                    <td className="px-5 py-2.5" colSpan={2}>
                      Total
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      ${Number(entry.totalDebit).toFixed(2)}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      ${Number(entry.totalCredit).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Meta */}
              <Separator className="my-4" />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-5 text-xs">
                <dt className="text-muted-foreground">Posted by</dt>
                <dd className="font-medium text-right">
                  {(entry as any).postedByName ?? entry.postedBy ?? "—"}
                </dd>
                {entry.sourceId && (
                  <>
                    <dt className="text-muted-foreground">Source ref</dt>
                    <dd className="font-mono text-right truncate">{entry.sourceId}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium text-right">
                  {format(new Date(entry.createdAt), "dd MMM yyyy, HH:mm")}
                </dd>
              </dl>
            </div>
          ) : null}
        </div>

        {/* Footer actions */}
        {entry && status === "POSTED" && onReverse && (
          <div className="border-t px-5 py-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => onReverse(entry.id)}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reverse entry
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
