"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi as reportsFinanceApi } from "@/lib/api/reports";
import { paymentsApi, expensesApi } from "@/lib/api/finance";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { format, startOfYear } from "date-fns";

// ── Shared helpers ────────────────────────────────────────────────────────────

function usd(n: number | undefined | null) {
  return `$${Number(n ?? 0).toFixed(2)}`;
}

function DateRangeForm({ onApply, defaults }: { onApply: (from: string, to: string) => void; defaults: { from: string; to: string } }) {
  const [from, setFrom] = React.useState(defaults.from);
  const [to, setTo] = React.useState(defaults.to);
  return (
    <div className="flex items-end gap-3 mb-5">
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

// ── Cash Summary (actual business data) ───────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  MOBILE_MONEY: "EcoCash / InnBucks",
  PAYNOW: "Paynow",
  CHEQUE: "Cheque",
  STRIPE: "Stripe",
  OTHER: "Other",
};

const CAT_LABELS: Record<string, string> = {
  RENT: "Rent", UTILITIES: "Utilities", SALARIES: "Salaries",
  TRANSPORT: "Transport", MARKETING: "Marketing", EQUIPMENT: "Equipment",
  MATERIALS: "Materials", OTHER: "Other",
};

function CashSummaryTab() {
  const now = new Date();
  const defaults = { from: format(startOfYear(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
  const [params, setParams] = React.useState(defaults);

  const { data: pmtData, isLoading: pmtLoading } = useQuery({
    queryKey: ["cash-summary-payments", params],
    queryFn: () => paymentsApi.list({ page: 1, limit: 5000, fromDate: params.from, toDate: params.to } as any),
  });

  const { data: expData, isLoading: expLoading } = useQuery({
    queryKey: ["cash-summary-expenses", params],
    queryFn: () => expensesApi.list({ page: 1, pageSize: 5000, fromDate: params.from, toDate: params.to }),
  });

  const payments: any[] = (pmtData as any)?.data ?? [];
  const expenses: any[] = (expData as any)?.data ?? [];

  const totalIn  = payments.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalOut = expenses.reduce((s, r) => s + Number(r.amount ?? r.amountUsd ?? 0), 0);
  const netCash  = totalIn - totalOut;

  // Group payments by method
  const byMethod: Record<string, { count: number; amount: number }> = {};
  for (const p of payments) {
    const m = p.method ?? "OTHER";
    if (!byMethod[m]) byMethod[m] = { count: 0, amount: 0 };
    byMethod[m].count++;
    byMethod[m].amount += Number(p.amount ?? 0);
  }

  // Group expenses by category
  const byCat: Record<string, { count: number; amount: number }> = {};
  for (const e of expenses) {
    const c = e.category ?? "OTHER";
    if (!byCat[c]) byCat[c] = { count: 0, amount: 0 };
    byCat[c].count++;
    byCat[c].amount += Number(e.amount ?? e.amountUsd ?? 0);
  }

  const loading = pmtLoading || expLoading;

  return (
    <div>
      <DateRangeForm defaults={defaults} onApply={(from, to) => setParams({ from, to })} />

      {/* 3 summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Cash In</p>
          <p className="text-3xl font-normal tabular-nums mt-2 text-emerald-600">{usd(totalIn)}</p>
          <p className="text-xs text-muted-foreground mt-1">{payments.length} payment{payments.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Cash Out</p>
          <p className="text-3xl font-normal tabular-nums mt-2 text-red-600">{usd(totalOut)}</p>
          <p className="text-xs text-muted-foreground mt-1">{expenses.length} expense{expenses.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Net Position</p>
          <p className={`text-3xl font-normal tabular-nums mt-2 ${netCash >= 0 ? "text-emerald-600" : "text-red-600"}`}>{usd(netCash)}</p>
          <p className="text-xs text-muted-foreground mt-1">cash in minus cash out</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
          {/* Payments by method */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Receipts by Payment Method</p>
            <div className="rounded-xl border overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">Method</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground">#</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(byMethod).sort((a, b) => b[1].amount - a[1].amount).map(([m, v]) => (
                    <tr key={m} className="hover:bg-muted/20">
                      <td className="py-2 px-3">{METHOD_LABELS[m] ?? m}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{v.count}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium text-emerald-700">{usd(v.amount)}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr><td colSpan={3} className="py-4 text-center text-muted-foreground text-xs">No payments in this period</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-muted/20 border-t-2">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-xs">Total</td>
                    <td className="py-2 px-3 text-right tabular-nums text-xs">{payments.length}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-emerald-700">{usd(totalIn)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Deposit vs Balance breakdown */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[{ label: "Deposits", filter: (p: any) => p.isDeposit }, { label: "Balance Payments", filter: (p: any) => !p.isDeposit }].map(({ label, filter }) => {
                const subset = payments.filter(filter);
                const amt    = subset.reduce((s, r) => s + Number(r.amount ?? 0), 0);
                return (
                  <div key={label} className="rounded-lg border px-3 py-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-base font-normal tabular-nums mt-0.5">{usd(amt)}</p>
                    <p className="text-xs text-muted-foreground">{subset.length} records</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expenses by category */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Expenses by Category</p>
            <div className="rounded-xl border overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">Category</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground">#</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(byCat).sort((a, b) => b[1].amount - a[1].amount).map(([c, v]) => (
                    <tr key={c} className="hover:bg-muted/20">
                      <td className="py-2 px-3">{CAT_LABELS[c] ?? c}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{v.count}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium text-red-600">{usd(v.amount)}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr><td colSpan={3} className="py-4 text-center text-muted-foreground text-xs">No expenses in this period</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-muted/20 border-t-2">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-xs">Total</td>
                    <td className="py-2 px-3 text-right tabular-nums text-xs">{expenses.length}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-red-600">{usd(totalOut)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Accounting reports ────────────────────────────────────────────────────────

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
        <div className="rounded-xl border overflow-hidden overflow-x-auto max-w-2xl">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 px-3 text-left font-medium">Code</th>
                <th className="py-2 px-3 text-left font-medium">Account</th>
                <th className="py-2 px-3 text-right font-medium">Debit</th>
                <th className="py-2 px-3 text-right font-medium">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.lines ?? []).map((line: any) => (
                <tr key={line.accountId} className="hover:bg-muted/20">
                  <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{line.code}</td>
                  <td className="py-2 px-3">{line.name}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-emerald-700">{line.debit > 0 ? usd(line.debit) : ""}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-blue-700">{line.credit > 0 ? usd(line.credit) : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/20 border-t-2">
              <tr className="font-semibold">
                <td colSpan={2} className="py-2 px-3">Totals</td>
                <td className="py-2 px-3 text-right tabular-nums text-emerald-700">{usd(data?.totalDebit ?? 0)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-blue-700">{usd(data?.totalCredit ?? 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
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
        <div className="max-w-sm space-y-1 text-sm">
          {(data?.sections ?? []).map((section: any) => (
            <React.Fragment key={section.label}>
              <p className="font-semibold mt-4 text-xs uppercase tracking-wider text-muted-foreground">{section.label}</p>
              {(section.lines ?? []).map((l: any) => (
                <div key={l.name} className="flex justify-between pl-3 py-0.5">
                  <span>{l.name}</span>
                  <span className="tabular-nums">{usd(l.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-medium border-t pt-1 mt-1">
                <span>Total {section.label}</span>
                <span className="tabular-nums">{usd(section.total)}</span>
              </div>
            </React.Fragment>
          ))}
          <div className="flex justify-between font-bold text-base border-t-2 pt-2 mt-4">
            <span>Net {(data?.netIncome ?? 0) >= 0 ? "Income" : "Loss"}</span>
            <span className={`tabular-nums ${(data?.netIncome ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {usd(Math.abs(Number(data?.netIncome ?? 0)))}
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
      <div className="flex items-end gap-3 mb-5">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">As of</Label>
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-8 text-sm w-36" />
        </div>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl text-sm">
          {["Assets", "Liabilities & Equity"].map((side) => {
            const sections: any[] = side === "Assets" ? (data?.assets ?? []) : (data?.liabilitiesAndEquity ?? []);
            return (
              <div key={side}>
                <p className="font-bold mb-3">{side}</p>
                {sections.map((section: any) => (
                  <div key={section.label} className="mb-4">
                    <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">{section.label}</p>
                    {(section.lines ?? []).map((l: any) => (
                      <div key={l.name} className="flex justify-between pl-3 py-0.5">
                        <span>{l.name}</span>
                        <span className="tabular-nums">{usd(l.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pl-3 font-medium border-t mt-1 pt-1">
                      <span>Total</span>
                      <span className="tabular-nums">{usd(section.total)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t-2 pt-1.5 mt-2">
                  <span>Total {side}</span>
                  <span className="tabular-nums">{usd(side === "Assets" ? data?.totalAssets : data?.totalLiabilitiesAndEquity)}</span>
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
        <div className="rounded-xl border overflow-hidden overflow-x-auto max-w-4xl">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 px-3 text-left font-medium">{type === "ar" ? "Customer" : "Supplier"}</th>
                {bucketLabels.map((b) => <th key={b} className="py-2 px-3 text-right font-medium">{b}</th>)}
                <th className="py-2 px-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.rows ?? []).map((row: any) => (
                <tr key={row.entityId} className="hover:bg-muted/20">
                  <td className="py-2 px-3 font-medium">{row.name}</td>
                  {buckets.map((b) => (
                    <td key={b} className={`py-2 px-3 text-right tabular-nums ${row[b] > 0 && b !== "current" ? "text-red-600" : ""}`}>
                      {row[b] > 0 ? usd(row[b]) : ""}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right tabular-nums font-medium">{usd(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/20 border-t-2">
              <tr className="font-semibold">
                <td className="py-2 px-3">Total</td>
                {buckets.map((b) => (
                  <td key={b} className="py-2 px-3 text-right tabular-nums">{usd(data?.totals?.[b] ?? 0)}</td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums">{usd(data?.totals?.total ?? 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Reports">
        <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" />Export</Button>
      </PageHeader>
      <div className="flex-1 px-6 pt-4 overflow-auto">
        <Tabs defaultValue="cash-summary">
          <TabsList className="mb-1 max-w-full overflow-x-auto">
            <TabsTrigger value="cash-summary">
              Cash Summary
              <Badge variant="secondary" className="ml-1.5 text-[10px] py-0 px-1.5 bg-orange-100 text-orange-700 border-0">Live</Badge>
            </TabsTrigger>
            <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
            <TabsTrigger value="income">Income Statement</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="ar-aging">AR Aging</TabsTrigger>
            <TabsTrigger value="ap-aging">AP Aging</TabsTrigger>
          </TabsList>
          <TabsContent value="cash-summary" className="mt-4"><CashSummaryTab /></TabsContent>
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
