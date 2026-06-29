"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api/reports";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, ShoppingBag, Factory, Users,
  TrendingUp, AlertTriangle, Package, Clock,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => reportsApi.dashboard(),
    refetchInterval: 60_000,
  });

  const kpis = data ?? {};

  return (
    <div className="flex flex-col">
      <PageHeader title="Dashboard" description="Live overview of Stitch't operations" />

      <div className="flex-1 space-y-6 p-6">
        {/* KPI grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Revenue MTD"
            value={kpis.revenueMtd ? `$${Number(kpis.revenueMtd).toFixed(0)}` : "$0"}
            sub="Month to date"
            icon={<DollarSign className="h-4 w-4" />}
            loading={isLoading}
          />
          <KpiCard
            title="Orders In Production"
            value={kpis.ordersInProduction ?? 0}
            sub="Active jobs"
            icon={<Factory className="h-4 w-4" />}
            loading={isLoading}
          />
          <KpiCard
            title="New Orders MTD"
            value={kpis.newOrdersMtd ?? 0}
            sub="Month to date"
            icon={<ShoppingBag className="h-4 w-4" />}
            loading={isLoading}
          />
          <KpiCard
            title="AR Balance"
            value={kpis.arBalance ? `$${Number(kpis.arBalance).toFixed(0)}` : "$0"}
            sub="Outstanding invoices"
            icon={<TrendingUp className="h-4 w-4" />}
            loading={isLoading}
          />
          <KpiCard
            title="Cash Position"
            value={kpis.cashPosition ? `$${Number(kpis.cashPosition).toFixed(0)}` : "$0"}
            sub="Cash + bank + mobile"
            icon={<DollarSign className="h-4 w-4" />}
            loading={isLoading}
          />
          <KpiCard
            title="AP Balance"
            value={kpis.apBalance ? `$${Number(kpis.apBalance).toFixed(0)}` : "$0"}
            sub="Owed to suppliers"
            icon={<Users className="h-4 w-4" />}
            loading={isLoading}
          />
          <KpiCard
            title="Jobs Overdue"
            value={kpis.jobsOverdue ?? 0}
            sub="Past due date"
            icon={<Clock className="h-4 w-4" />}
            loading={isLoading}
          />
          <KpiCard
            title="Low Stock Items"
            value={kpis.lowStockCount ?? 0}
            sub="Below reorder level"
            icon={<AlertTriangle className="h-4 w-4" />}
            loading={isLoading}
          />
        </div>

        {/* Charts row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Revenue (last 6 months)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={kpis.revenueChart ?? []}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Orders by status</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={kpis.ordersByStatus ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity summary */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Open invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {kpis.openInvoiceCount ?? 0} unpaid invoice{(kpis.openInvoiceCount ?? 0) !== 1 ? "s" : ""} totalling{" "}
                  <span className="font-medium text-foreground">
                    ${Number(kpis.arBalance ?? 0).toFixed(2)}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Revenue YTD</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div>
                  <p className="text-2xl font-bold">
                    ${Number(kpis.revenueYtd ?? 0).toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Year to date</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
