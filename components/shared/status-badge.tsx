import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  // Order status (actual backend enum)
  DRAFT: "bg-slate-100 text-slate-700",
  QUOTED: "bg-blue-100 text-blue-700",
  AWAITING_DEPOSIT: "bg-amber-100 text-amber-700",
  DEPOSIT_PAID: "bg-teal-100 text-teal-700",
  IN_PRODUCTION: "bg-indigo-100 text-indigo-700",
  QUALITY_CHECK: "bg-violet-100 text-violet-700",
  READY: "bg-teal-100 text-teal-700",
  DELIVERED: "bg-green-100 text-green-700",
  CLOSED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  // Legacy / other
  SENT: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-orange-100 text-orange-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-green-100 text-green-700",
  ON_HOLD: "bg-yellow-100 text-yellow-700",
  // Lead stages
  NEW_LEAD: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-sky-100 text-sky-700",
  DESIGN_DISCUSSION: "bg-violet-100 text-violet-700",
  QUOTATION_SENT: "bg-purple-100 text-purple-700",
  NEGOTIATION: "bg-amber-100 text-amber-700",
  DEPOSIT_RECEIVED: "bg-teal-100 text-teal-700",
  PRODUCTION: "bg-indigo-100 text-indigo-700",
  LOST: "bg-red-100 text-red-700",
  // Jobs
  PENDING: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  // Invoices
  DRAFT_INV: "bg-slate-100 text-slate-700",
  ISSUED: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  VOID: "bg-slate-100 text-slate-700 line-through",
};

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;
  const color = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700";
  const label = status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge variant="outline" className={cn("border-transparent font-normal", color, className)}>
      {label}
    </Badge>
  );
}
