"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { quotationsApi } from "@/lib/api/sales";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { format } from "date-fns";
import { ArrowLeft, FileText, Send } from "lucide-react";

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quotation", id],
    queryFn: () => quotationsApi.get(id),
  });

  const sendMut = useMutation({
    mutationFn: () => quotationsApi.send(id),
    onSuccess: () => { toast.success("Quotation sent"); qc.invalidateQueries({ queryKey: ["quotation", id] }); },
    onError: () => toast.error("Send failed"),
  });

  const convertMut = useMutation({
    mutationFn: () => quotationsApi.convert(id),
    onSuccess: (res) => { toast.success("Converted to order"); router.push(`/orders/${res.orderId}`); },
    onError: () => toast.error("Convert failed"),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!quote) return <div className="p-6 text-sm text-red-600">Quotation not found</div>;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader title={quote.quotationNumber} description={<StatusBadge status={quote.status} />}>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => quotationsApi.pdf(id).then((res) => window.open(res.url, "_blank"))}>
          <FileText className="mr-1 h-4 w-4" />PDF
        </Button>
        {quote.status === "DRAFT" && (
          <Button size="sm" onClick={() => sendMut.mutate()} disabled={sendMut.isPending}>
            <Send className="mr-1 h-4 w-4" />Send
          </Button>
        )}
        {quote.status === "ACCEPTED" && !(quote as any).convertedOrderId && (
          <ConfirmDialog
            trigger={<Button size="sm">Convert to order</Button>}
            title="Convert to Order?"
            description={`This will create an order from ${quote.quotationNumber}.`}
            onConfirm={() => convertMut.mutateAsync()}
          />
        )}
      </PageHeader>

      <div className="px-6 grid grid-cols-4 gap-3">
        <KpiCard title="Subtotal" value={`$${Number(quote.subtotal).toFixed(2)}`} />
        <KpiCard title="Tax" value={`$${Number(quote.tax ?? 0).toFixed(2)}`} />
        <KpiCard title="Total" value={`$${Number(quote.total).toFixed(2)}`} />
        <KpiCard title="Items" value={String(quote.items?.length ?? 0)} />
      </div>

      <div className="px-6">
        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">Line Items</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 text-left font-medium pr-4">Rug</th>
                  <th className="py-2 text-left font-medium pr-4">Dimensions</th>
                  <th className="py-2 text-right font-medium pr-4">Qty</th>
                  <th className="py-2 text-right font-medium pr-4">Unit price</th>
                  <th className="py-2 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items?.map((item: any) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2 pr-4 font-medium">{item.rugName ?? item.description}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{item.widthCm && item.heightCm ? `${item.widthCm} × ${item.heightCm} cm` : "—"}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{item.quantity}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">${Number(item.unitPrice).toFixed(2)}</td>
                    <td className="py-2 text-right tabular-nums">${Number(item.lineTotal ?? item.quantity * item.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Customer</p><p className="font-medium">{quote.customerName}</p></div>
                <div><p className="text-xs text-muted-foreground">Validity</p><p>{quote.validityDays} days</p></div>
                <div><p className="text-xs text-muted-foreground">Created</p><p>{format(new Date(quote.createdAt), "dd MMM yyyy")}</p></div>
                {quote.expiryDate && <div><p className="text-xs text-muted-foreground">Expires</p><p>{format(new Date(quote.expiryDate), "dd MMM yyyy")}</p></div>}
                {quote.notes && <div className="col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p>{quote.notes}</p></div>}
                {(quote as any).convertedOrderId && (
                  <div><p className="text-xs text-muted-foreground">Converted order</p>
                    <Button variant="link" className="h-auto p-0 text-sm" onClick={() => router.push(`/orders/${(quote as any).convertedOrderId}`)}>
                      View order
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
