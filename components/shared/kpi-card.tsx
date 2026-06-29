import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: number;
  loading?: boolean;
  className?: string;
}

export function KpiCard({ title, value, sub, icon, trend, loading, className }: KpiCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {sub && !loading && (
          <p className="mt-1 text-xs text-muted-foreground">
            {trend !== undefined && (
              <span className={cn("mr-1 font-medium", trend >= 0 ? "text-green-600" : "text-red-600")}>
                {trend >= 0 ? "+" : ""}{trend}%
              </span>
            )}
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
