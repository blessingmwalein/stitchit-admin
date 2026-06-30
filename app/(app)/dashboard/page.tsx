"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api/reports";
import { ordersApi } from "@/lib/api/sales";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, ShoppingBag, Factory, TrendingUp,
  Clock, RefreshCw, Wallet, Package,
  ArrowRight, CreditCard, ReceiptText, Coins,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Constants ─────────────────────────────────────────────────────────────────

const PIPELINE = [
  { status: "AWAITING_DEPOSIT", label: "Awaiting Deposit", color: "#f59e0b" },
  { status: "DEPOSIT_PAID",     label: "Deposit Paid",     color: "#14b8a6" },
  { status: "IN_PRODUCTION",   label: "In Production",    color: "#6366f1" },
  { status: "QUALITY_CHECK",   label: "Quality Check",    color: "#8b5cf6" },
  { status: "READY",            label: "Ready",             color: "#10b981" },
  { status: "DELIVERED",        label: "Delivered",         color: "#22c55e" },
];

const QUICK_LINKS = [
  { href: "/orders",              label: "Orders",      icon: ShoppingBag },
  { href: "/finance/payments",    label: "Payments",    icon: Wallet },
  { href: "/production",          label: "Production",  icon: Factory },
  { href: "/inventory",           label: "Inventory",   icon: Package },
  { href: "/finance/expenses",    label: "Expenses",    icon: CreditCard },
  { href: "/finance/journals",    label: "Journals",    icon: ReceiptText },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function usd(n: number | undefined | null) {
  const v = Number(n ?? 0);
  if (isNaN(v)) return "$0";
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function monthLabel() {
  return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
}

function shortDate(iso: string | undefined | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Custom chart tooltip ──────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-xl px-3 py-2.5 text-xs shadow-sm space-y-1">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{usd(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => reportsApi.dashboard(),
    refetchInterval: 60_000,
  });

  const { data: recentOrdersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", "dashboard-recent"],
    queryFn: () => ordersApi.list({ page: 1, pageSize: 6 }),
  });

  const kpis = (data ?? {}) as any;
  const chartData: { month: string; income: number; expenses: number }[] = kpis.revenueChart ?? [];
  const ordersByStatus: { status: string; count: number }[] = kpis.ordersByStatus ?? [];
  const recentOrders: any[] = (recentOrdersData as any)?.data ?? [];
  const pipelineMax = Math.max(1, ...ordersByStatus.map((s) => s.count));

  return (
    <div className="flex flex-col min-h-full bg-muted/20">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-5 border-b bg-card">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{todayLabel()}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
        </Button>
      </div>

      <div className="flex-1 p-6 space-y-5">

        {/* ── Row 1 · 5 KPI Cards ─────────────────────────────────── */}
        <div className="grid gap-px grid-cols-2 lg:grid-cols-5 bg-border rounded-2xl overflow-hidden ring-1 ring-border">
          <KpiCard
            title={`Income · ${monthLabel()}`}
            value={usd(kpis.monthlyIncome)}
            sub="Deposits + balances received"
            icon={<DollarSign className="h-4 w-4" />}
            accent="orange" loading={isLoading}
            className="rounded-none"
          />
          <KpiCard
            title="Capital"
            value={usd(kpis.capital)}
            sub="All-time payments received"
            icon={<Coins className="h-4 w-4" />}
            accent="emerald" loading={isLoading}
            className="rounded-none"
          />
          <KpiCard
            title="Cash Balance"
            value={usd(kpis.cashBalance)}
            sub="Cash + bank + mobile"
            icon={<Wallet className="h-4 w-4" />}
            accent="teal" loading={isLoading}
            className="rounded-none"
          />
          <KpiCard
            title="Outstanding"
            value={usd(kpis.outstandingBalance)}
            sub="Unpaid order balances"
            icon={<TrendingUp className="h-4 w-4" />}
            accent={(kpis.outstandingBalance ?? 0) > 0 ? "amber" : "teal"}
            loading={isLoading}
            className="rounded-none"
          />
          <KpiCard
            title={`Expenses · ${monthLabel()}`}
            value={usd(kpis.monthlyExpenses)}
            sub="Total expenses this month"
            icon={<CreditCard className="h-4 w-4" />}
            accent="red" loading={isLoading}
            className="rounded-none"
          />
        </div>

        {/* ── Row 2 · Chart + Pipeline ──────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Income vs Expenses chart */}
          <div className="lg:col-span-2 bg-card rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold">Income vs Expenses</p>
                <p className="text-xs text-muted-foreground mt-0.5">Monthly · last 6 months</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-normal tabular-nums">{usd(kpis.monthlyIncome)}</p>
                <p className="text-xs text-muted-foreground">this month</p>
              </div>
            </div>

            {isLoading ? (
              <Skeleton className="h-[200px] w-full rounded-xl" />
            ) : chartData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={52}
                    tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone" dataKey="income" name="Income"
                    stroke="#f97316" strokeWidth={2} fill="url(#gIncome)"
                    dot={false} activeDot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone" dataKey="expenses" name="Expenses"
                    stroke="#ef4444" strokeWidth={2} fill="url(#gExpenses)"
                    dot={false} activeDot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                    iconType="circle" iconSize={8}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Orders pipeline */}
          <div className="bg-card rounded-2xl p-5">
            <p className="text-sm font-semibold mb-0.5">Orders Pipeline</p>
            <p className="text-xs text-muted-foreground mb-4">Live order stages</p>
            <div className="space-y-4">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i}>
                      <div className="h-3 w-28 bg-muted rounded animate-pulse mb-1.5" />
                      <div className="h-2 w-full bg-muted rounded-full animate-pulse" />
                    </div>
                  ))
                : PIPELINE.map(({ status, label, color }) => {
                    const found = ordersByStatus.find((s) => s.status === status);
                    const count = found?.count ?? 0;
                    const pct   = Math.round((count / pipelineMax) * 100);
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <span className="text-xs font-semibold tabular-nums">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>

        {/* ── Row 3 · Recent Orders + Quick links ────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold">Recent Orders</p>
                <p className="text-xs text-muted-foreground mt-0.5">Latest activity</p>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
                <Link href="/orders">View all <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </div>

            {ordersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No orders yet.</p>
            ) : (
              <div className="divide-y">
                {recentOrders.map((order: any) => {
                  const cname = [order.customer?.firstName, order.customer?.lastName]
                    .filter(Boolean).join(" ") || "—";
                  const rugName = order.items?.[0]?.rugName || order.rugName || "Custom Rug";
                  return (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-3 py-3 -mx-1 px-1 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">
                        {cname[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{rugName}</p>
                        <p className="text-xs text-muted-foreground">{cname} · {order.orderNumber}</p>
                      </div>
                      <StatusBadge status={order.status} className="shrink-0" />
                      <span className="text-sm font-normal tabular-nums shrink-0">{usd(order.total)}</span>
                      <span className="text-xs text-muted-foreground shrink-0 w-12 text-right">
                        {shortDate(order.createdAt)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Mini operational stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-2xl p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">In Production</p>
                <p className="text-3xl font-normal mt-2 tabular-nums">
                  {isLoading ? "—" : kpis.ordersInProduction ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">active jobs</p>
              </div>
              <div className="bg-card rounded-2xl p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Overdue</p>
                <p className={`text-3xl font-normal mt-2 tabular-nums ${(kpis.jobsOverdue ?? 0) > 0 ? "text-red-500" : ""}`}>
                  {isLoading ? "—" : kpis.jobsOverdue ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">jobs past due</p>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-card rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Links</p>
              <div className="space-y-0.5">
                {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between px-2 py-2.5 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5 text-orange-500" />
                      </div>
                      <span className="text-sm">{label}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
