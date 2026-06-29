"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ordersApi } from "@/lib/api/sales";
import type { Order } from "@/lib/types/sales";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ArrowLeft, Paperclip, Banknote, ExternalLink } from "lucide-react";
import { PaymentFormModal } from "@/components/modules/finance/payment-form-modal";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["QUOTED", "CANCELLED"],
  QUOTED: ["AWAITING_DEPOSIT", "CANCELLED"],
  AWAITING_DEPOSIT: ["DEPOSIT_PAID", "CANCELLED"],
  DEPOSIT_PAID: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["QUALITY_CHECK"],
  QUALITY_CHECK: ["READY", "IN_PRODUCTION"],
  READY: ["DELIVERED"],
  DELIVERED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showDeposit, setShowDeposit] = React.useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.get(id),
  });

  const transitionMut = useMutation({
    mutationFn: (status: string) => ordersApi.transition(id, status),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["order", id] }); },
    onError: () => toast.error("Transition failed"),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!order) return <div className="p-6 text-sm text-red-600">Order not found</div>;

  const nextStatuses = STATUS_TRANSITIONS[order.status] ?? [];

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title={order.orderNumber}
        description={<StatusBadge status={order.status} />}
      >
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />Back
        </Button>
        {Number(order.balance ?? 0) > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShowDeposit(true)}>
            <Banknote className="mr-1 h-4 w-4" />Record deposit
          </Button>
        )}
        {nextStatuses.map((s) => (
          <Button key={s} size="sm" onClick={() => transitionMut.mutate(s)} disabled={transitionMut.isPending}>
            → {s.replace(/_/g, " ")}
          </Button>
        ))}
      </PageHeader>

      <PaymentFormModal
        open={showDeposit}
        onOpenChange={setShowDeposit}
        prefill={{ customerId: (order as any).customerId, orderId: id, isDeposit: true }}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["order", id] })}
      />

      <div className="px-6 grid grid-cols-4 gap-3">
        <KpiCard title="Total" value={`$${Number(order.total).toFixed(2)}`} />
        <KpiCard title="Deposit required" value={`$${Number(order.depositRequired ?? 0).toFixed(2)}`} />
        <KpiCard title="Balance" value={`$${Number(order.balance ?? 0).toFixed(2)}`} />
        <KpiCard title="Items" value={String(order.items?.length ?? 0)} />
      </div>

      <div className="px-6">
        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4 space-y-3">
            {order.items?.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-4">
                    {/* Design image */}
                    {item.designFileUrl ? (
                      <div className="shrink-0 group relative">
                        <img
                          src={item.designFileUrl}
                          alt="Design"
                          className="h-20 w-20 rounded-lg border object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <a
                          href={item.designFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="h-4 w-4 text-white" />
                        </a>
                      </div>
                    ) : (
                      <div className="shrink-0 h-20 w-20 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground/30 text-xs">No image</div>
                    )}

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{item.rugName}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {item.widthCm} × {item.heightCm} cm &middot; {item.shape ?? "rectangle"} &middot; {item.complexity ?? "standard"}
                          </p>
                          {item.colors?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.colors.map((c: string) => (
                                <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold">${Number(item.unitPrice).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">qty {item.quantity}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Customer</p><p className="font-medium">{(() => { const c = (order as any).customer; if (!c) return "—"; return c.firstName ? `${c.firstName} ${c.lastName ?? ""}`.trim() : c.companyName ?? c.customerNumber; })()}</p></div>
                <div><p className="text-xs text-muted-foreground">Priority</p><p><StatusBadge status={order.priority} /></p></div>
                <div><p className="text-xs text-muted-foreground">Created</p><p>{format(new Date(order.createdAt), "dd MMM yyyy")}</p></div>
                {order.promisedDate && <div><p className="text-xs text-muted-foreground">Promised by</p><p>{format(new Date(order.promisedDate), "dd MMM yyyy")}</p></div>}
                {order.notes && <div className="col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p>{order.notes}</p></div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attachments" className="mt-4 space-y-2">
            {((order as any).attachments ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No attachments</p>
            )}
            {(order as any).attachments?.map((att: any) => (
              <div key={att.id} className="flex items-center gap-2 rounded-lg border p-3">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{att.label ?? att.id}</span>
                {att.kind && <Badge variant="outline" className="text-xs">{att.kind}</Badge>}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-2">
            {((order as any).statusHistory ?? []).map((h: any) => (
              <div key={h.id} className="flex items-center gap-3 text-sm">
                <StatusBadge status={h.status} />
                <span className="text-muted-foreground text-xs">{format(new Date(h.createdAt), "dd MMM yyyy HH:mm")}</span>
                {h.note && <span className="text-muted-foreground">{h.note}</span>}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
