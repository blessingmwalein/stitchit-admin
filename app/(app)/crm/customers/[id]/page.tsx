"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { customersApi } from "@/lib/api/crm";
import { ordersApi } from "@/lib/api/sales";
import { invoicesApi } from "@/lib/api/finance";
import { customerDisplayName } from "@/lib/types/crm";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => customersApi.get(id),
  });

  const { data: orders } = useQuery({
    queryKey: ["customer-orders", id],
    queryFn: () => ordersApi.list({ customerId: id, pageSize: 10 }),
    enabled: !!customer,
  });

  const { data: invoices } = useQuery({
    queryKey: ["customer-invoices", id],
    queryFn: () => invoicesApi.list({ customerId: id, pageSize: 10 }),
    enabled: !!customer,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!customer) return <div className="p-6 text-muted-foreground">Customer not found.</div>;

  return (
    <div className="flex flex-col">
      <PageHeader title={customerDisplayName(customer)} description={customer.customerNumber} />

      <div className="flex-1 p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${customer.outstandingBalance > 0 ? "text-red-600" : ""}`}>
                ${Number(customer.outstandingBalance).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${Number(customer.totalSpend).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{customer.ordersCount}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                  {[
                    ["Email", customer.email],
                    ["Phone", customer.phone],
                    ["WhatsApp", customer.whatsappNumber],
                    ["Address", customer.address],
                    ["City", customer.city],
                    ["Country", customer.country],
                    ["Tax Number", customer.taxNumber],
                    ["Credit Limit", customer.creditLimit ? `$${customer.creditLimit}` : "—"],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium">{value ?? "—"}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <div className="space-y-2">
              {orders?.data.map((order) => (
                <Card key={order.id} className="shadow-none">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-sm">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">${Number(order.total).toFixed(2)}</span>
                      <StatusBadge status={order.status} />
                    </div>
                  </CardContent>
                </Card>
              )) ?? <p className="text-sm text-muted-foreground">No orders.</p>}
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <div className="space-y-2">
              {invoices?.data.map((inv) => (
                <Card key={inv.id} className="shadow-none">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(inv.issueDate).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">${Number(inv.total).toFixed(2)}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                  </CardContent>
                </Card>
              )) ?? <p className="text-sm text-muted-foreground">No invoices.</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
