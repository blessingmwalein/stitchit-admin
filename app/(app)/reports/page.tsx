"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi as reportsFinanceApi } from "@/lib/api/reports";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { format, startOfYear, endOfMonth } from "date-fns";

function DateRangeForm({ onApply, defaults }: { onApply: (from: string, to: string) => void; defaults: { from: string; to: string } }) {
  const [from, setFrom] = React.useState(defaults.from);
  const [to, setTo] = React.useState(defaults.to);
  return (
    <div className="flex items-end gap-3 mb-4">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">From</Label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-sm w-36" />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">To</Label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-sm w-36" />
      </div>
      <Button size="sm" onClick={() => onApply(from, to)}>Apply</Button>
    </div>
  );
}

function TrialBalanceTab() {
  const now = new Date();
  const defaults = { from: format(startOfYear(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
  const [params, setParams] = React.useState(defaults);
  const { data, isLoading } = useQuery({
    queryKey: ["trial-balance", params],
    queryFn: () => reportsFinanceApi.trialBalance(params.from, params.to),
  });
  return (
    <div>
      <DateRangeForm defaults={defaults} onApply={(from, to) => setParams({ from, to })} />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-1.5 text-left font-medium pr-4">Code</th>
              <th className="py-1.5 text-left font-medium pr-4">Account</th>
              <th className="py-1.5 text-right font-medium pr-4">Debit</th>
              <th className="py-1.5 text-right font-medium">Credit</th>
            </tr>
          </thead>
          <tbody>
            {data?.lines?.map((line: any) => (
              <tr key={line.accountId} className="border-b hover:bg-muted/30">
                <td className="py-1.5 pr-4 font-mono text-xs text-muted-foreground">{line.code}</td>
                <td className="py-1.5 pr-4">{line.name}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{line.debit > 0 ? `$${Number(line.debit).toFixed(2)}` : ""}</td>
                <td className="py-1.5 text-right tabular-nums">{line.credit > 0 ? `$${Number(line.credit).toFixed(2)}` : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold border-t-2">
              <td colSpan={2} className="py-2">Totals</td>
              <td className="py-2 text-right tabular-nums pr-4">${Number(data?.totalDebit ?? 0).toFixed(2)}</td>
              <td className="py-2 text-right tabular-nums">${Number(data?.totalCredit ?? 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

function IncomeStatementTab() {
  const now = new Date();
  const defaults = { from: format(startOfYear(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
  const [params, setParams] = React.useState(defaults);
  const { data, isLoading } = useQuery({
    queryKey: ["income-statement", params],
    queryFn: () => reportsFinanceApi.incomeStatement(params.from, params.to),
  });
  return (
    <div>
      <DateRangeForm defaults={defaults} onApply={(from, to) => setParams({ from, to })} />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-1 max-w-md text-sm">
          {data?.sections?.map((section: any) => (
            <React.Fragment key={section.label}>
              <p className="font-semibold mt-3">{section.label}</p>
              {section.lines?.map((l: any) => (
                <div key={l.name} className="flex justify-between pl-4">
                  <span>{l.name}</span>
                  <span className="tabular-nums">${Number(l.amount).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Total {section.label}</span>
                <span className="tabular-nums">${Number(section.total).toFixed(2)}</span>
              </div>
            </React.Fragment>
          ))}
          <div className="flex justify-between font-bold text-base border-t-2 pt-2 mt-3">
            <span>Net {(data?.netIncome ?? 0) >= 0 ? "Income" : "Loss"}</span>
            <span className={`tabular-nums ${(data?.netIncome ?? 0) >= 0 ? "text-green-700" : "text-red-600"}`}>
              ${Math.abs(Number(data?.netIncome ?? 0)).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function BalanceSheetTab() {
  const now = new Date();
  const [asOf, setAsOf] = React.useState(format(now, "yyyy-MM-dd"));
  const { data, isLoading } = useQuery({
    queryKey: ["balance-sheet", asOf],
    queryFn: () => reportsFinanceApi.balanceSheet(asOf),
  });
  return (
    <div>
      <div className="flex items-end gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">As of</Label>
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-8 text-sm w-36" />
        </div>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="grid grid-cols-2 gap-8 max-w-2xl text-sm">
          {["Assets", "Liabilities & Equity"].map((side) => {
            const sections: any[] = side === "Assets" ? (data?.assets ?? []) : (data?.liabilitiesAndEquity ?? []);
            return (
              <div key={side}>
                <p className="font-bold mb-2">{side}</p>
                {sections.map((section: any) => (
                  <div key={section.label} className="mb-3">
                    <p className="font-semibold">{section.label}</p>
                    {section.lines?.map((l: any) => (
                      <div key={l.name} className="flex justify-between pl-3 py-0.5">
                        <span>{l.name}</span>
                        <span className="tabular-nums">${Number(l.amount).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pl-3 font-medium border-t">
                      <span>Total</span>
                      <span className="tabular-nums">${Number(section.total).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t-2 pt-1">
                  <span>Total {side}</span>
                  <span className="tabular-nums">${Number(side === "Assets" ? data?.totalAssets : data?.totalLiabilitiesAndEquity ?? 0).toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AgingTab({ type }: { type: "ar" | "ap" }) {
  const { data, isLoading } = useQuery({
    queryKey: [`${type}-aging`],
    queryFn: () => type === "ar" ? reportsFinanceApi.arAging() : reportsFinanceApi.apAging(),
  });
  const buckets = ["current", "1_30", "31_60", "61_90", "over_90"];
  const bucketLabels = ["Current", "1–30d", "31–60d", "61–90d", ">90d"];
  return (
    <div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-1.5 text-left font-medium pr-4">{type === "ar" ? "Customer" : "Supplier"}</th>
              {bucketLabels.map((b) => <th key={b} className="py-1.5 text-right font-medium pr-4">{b}</th>)}
              <th className="py-1.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {data?.rows?.map((row: any) => (
              <tr key={row.entityId} className="border-b hover:bg-muted/30">
                <td className="py-1.5 pr-4 font-medium">{row.name}</td>
                {buckets.map((b) => (
                  <td key={b} className={`py-1.5 pr-4 text-right tabular-nums ${row[b] > 0 && b !== "current" ? "text-red-600" : ""}`}>
                    {row[b] > 0 ? `$${Number(row[b]).toFixed(2)}` : ""}
                  </td>
                ))}
                <td className="py-1.5 text-right tabular-nums font-medium">${Number(row.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold border-t-2">
              <td className="py-2">Total</td>
              {buckets.map((b) => (
                <td key={b} className="py-2 text-right tabular-nums pr-4">${Number(data?.totals?.[b] ?? 0).toFixed(2)}</td>
              ))}
              <td className="py-2 text-right tabular-nums">${Number(data?.totals?.total ?? 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Reports">
        <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" />Export</Button>
      </PageHeader>
      <div className="flex-1 px-6 pt-4 overflow-auto">
        <Tabs defaultValue="trial-balance">
          <TabsList>
            <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
            <TabsTrigger value="income">Income Statement</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="ar-aging">AR Aging</TabsTrigger>
            <TabsTrigger value="ap-aging">AP Aging</TabsTrigger>
          </TabsList>
          <TabsContent value="trial-balance" className="mt-4"><TrialBalanceTab /></TabsContent>
          <TabsContent value="income" className="mt-4"><IncomeStatementTab /></TabsContent>
          <TabsContent value="balance-sheet" className="mt-4"><BalanceSheetTab /></TabsContent>
          <TabsContent value="ar-aging" className="mt-4"><AgingTab type="ar" /></TabsContent>
          <TabsContent value="ap-aging" className="mt-4"><AgingTab type="ap" /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
