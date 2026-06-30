import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: number;
  loading?: boolean;
  accent?: "orange" | "teal" | "violet" | "red" | "amber" | "emerald";
  className?: string;
}

const ACCENT: Record<string, { bg: string; icon: string }> = {
  orange:  { bg: "bg-orange-50",  icon: "text-orange-500" },
  teal:    { bg: "bg-teal-50",    icon: "text-teal-500" },
  violet:  { bg: "bg-violet-50",  icon: "text-violet-500" },
  red:     { bg: "bg-red-50",     icon: "text-red-500" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-500" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-500" },
};

export function KpiCard({
  title, value, sub, icon, trend, loading,
  accent = "orange", className,
}: KpiCardProps) {
  const { bg, icon: iconCls } = ACCENT[accent] ?? ACCENT.orange;

  return (
    <div className={cn("bg-card rounded-2xl px-5 py-4", className)}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        {icon && (
          <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0", bg)}>
            <span className={iconCls}>{icon}</span>
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
      ) : (
        <p className="text-3xl font-normal tabular-nums tracking-tight text-foreground">{value}</p>
      )}

      {/* Sub + trend */}
      {!loading && (sub || trend !== undefined) && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {trend !== undefined && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md",
              trend >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600",
            )}>
              {trend >= 0
                ? <TrendingUp className="h-3 w-3" />
                : <TrendingDown className="h-3 w-3" />}
              {trend >= 0 ? "+" : ""}{trend}%
            </span>
          )}
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </div>
      )}
    </div>
  );
}
