"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { customersApi } from "@/lib/api/crm";
import { paymentsApi } from "@/lib/api/finance";
import { customerDisplayName } from "@/lib/types/crm";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Mail, Phone, MessageCircle, MapPin, Building2, User,
  ExternalLink, CreditCard, ShoppingBag, ArrowLeft,
  Calendar, Hash, DollarSign, Receipt,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

function money(v: any) {
  const n = Number(v);
  return isNaN(n) ? "—" : `$${n.toFixed(2)}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function methodLabel(m: string) {
  const map: Record<string, string> = {
    CASH: "Cash", CASH_USD: "Cash (USD)", CASH_ZWG: "Cash (ZWG)",
    BANK_TRANSFER: "Bank Transfer", MOBILE_MONEY: "EcoCash/InnBucks",
    ECOCASH: "EcoCash", INNBUCKS: "InnBucks", PAYNOW: "Paynow",
    CARD: "Card", STRIPE: "Stripe", CHEQUE: "Cheque", OTHER: "Other",
  };
  return map[m] ?? m.replace(/_/g, " ");
}

// ── tab trigger style ─────────────────────────────────────────────────────────

const TAB_CLS =
  "rounded-none h-auto px-4 pb-3 pt-0.5 border-0 border-b-2 border-b-transparent " +
  "data-[state=active]:border-b-orange-500 data-[state=active]:text-orange-600 " +
  "data-[state=active]:bg-transparent data-[state=active]:shadow-none " +
  "dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-orange-500 " +
  "text-muted-foreground hover:text-foreground transition-colors flex-none text-sm";

// ── Sidebar info row ──────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, value, href }: { icon: React.ElementType; value: string | null | undefined; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      {href ? (
        <a href={href} className="text-sm text-orange-600 hover:underline break-all">{value}</a>
      ) : (
        <span className="text-sm break-all">{value}</span>
      )}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => customersApi.get(id),
  });

  const { data: paymentsData } = useQuery({
    queryKey: ["customer-payments", id],
    queryFn: () => paymentsApi.byCustomer(id),
    enabled: !!customer,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="sticky top-0 z-20 shrink-0 border-b bg-card px-6 py-3">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex flex-1 gap-0">
          <div className="w-72 shrink-0 border-r bg-card p-5 space-y-3">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col min-h-full items-center justify-center gap-3 p-8">
        <p className="text-muted-foreground">Customer not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const c = customer as any;
  const name       = customerDisplayName(customer as any);
  const location   = [c.city, c.country].filter(Boolean).join(", ");
  const ordersCount  = c._count?.orders   ?? c.ordersCount   ?? 0;
  const paymentsCount = c._count?.payments ?? 0;

  // Orders come embedded from the customer response (findOne already includes them)
  const orders   = c.orders   ?? [];
  const payments = (paymentsData as any)?.data ?? [];

  // Backend now computes these accurately from actual payment records
  const totalSpend  = Number(c.totalSpend       ?? 0);
  const outstanding = Number(c.outstandingBalance ?? 0);

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 shrink-0 border-b bg-card px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost" size="icon" className="h-7 w-7 shrink-0"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-semibold text-sm truncate">{name}</span>
          <span className="font-mono text-xs text-muted-foreground hidden sm:block">
            {c.customerNumber}
          </span>
          <Badge variant="outline" className="text-xs capitalize shrink-0">
            {(c.type ?? "individual").toLowerCase()}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1">

        {/* ── Left sidebar ──────────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 border-r bg-card sticky top-[49px] self-start max-h-[calc(100vh-49px)] overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center pt-2 pb-1">
              <div className="h-16 w-16 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xl font-bold mb-3">
                {initials(name)}
              </div>
              <p className="font-semibold text-base leading-tight">{name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">{c.customerNumber}</p>
              {c.portalEnabled && (
                <Badge className="mt-2 text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
                  Portal active
                </Badge>
              )}
            </div>

            <Separator />

            {/* Contact details */}
            <div>
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Contact</p>
              <InfoRow icon={Mail}          value={c.email}          href={`mailto:${c.email}`} />
              <InfoRow icon={Phone}         value={c.phone} />
              <InfoRow icon={MessageCircle} value={c.whatsappNumber} href={`https://wa.me/${c.whatsappNumber?.replace(/\D/g, "")}`} />
              <InfoRow icon={MapPin}        value={location} />
              {c.address && <InfoRow icon={Building2} value={c.address} />}
            </div>

            {(c.taxNumber || c.creditLimit) && (
              <>
                <Separator />
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Financials</p>
                  {c.taxNumber    && <InfoRow icon={Hash}       value={`Tax: ${c.taxNumber}`} />}
                  {c.creditLimit  && <InfoRow icon={CreditCard} value={`Credit limit: ${money(c.creditLimit)}`} />}
                </div>
              </>
            )}

            <Separator />

            {/* Quick stats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />Orders
                </span>
                <span className="font-semibold tabular-nums">{ordersCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />Payments
                </span>
                <span className="font-semibold tabular-nums">{paymentsCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />Total spend
                </span>
                <span className="font-semibold tabular-nums">{money(totalSpend)}</span>
              </div>
              {outstanding > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />Outstanding
                  </span>
                  <span className="font-semibold tabular-nums text-red-600">{money(outstanding)}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Member since */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Member since</span>
              <span>{fmtDate(c.createdAt)}</span>
            </div>
          </div>
        </aside>

        {/* ── Right main ───────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Tabs defaultValue="details" className="flex flex-col flex-1">

            {/* Tab bar */}
            <div className="sticky top-[49px] z-10 bg-card border-b px-6 pt-4 shrink-0">
              <TabsList className="h-auto bg-transparent rounded-none p-0 w-full justify-start gap-0">
                <TabsTrigger value="details"  className={TAB_CLS}>Details</TabsTrigger>
                <TabsTrigger value="orders"   className={TAB_CLS}>
                  Orders
                  {ordersCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold h-4 min-w-4 px-1">
                      {ordersCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="payments" className={TAB_CLS}>
                  Payments
                  {paymentsCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold h-4 min-w-4 px-1">
                      {paymentsCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1">

              {/* ── Details tab ──────────────────────────────────────── */}
              <TabsContent value="details" className="m-0 p-6 outline-none">
                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <StatCard label="Total Spend"   value={money(totalSpend)} />
                  <StatCard label="Orders"        value={String(ordersCount)} />
                  <StatCard label="Outstanding"   value={money(outstanding)} />
                </div>

                {/* Info grid */}
                <div className="rounded-xl border overflow-hidden">
                  <div className="bg-muted/30 px-5 py-3 border-b">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Information</p>
                  </div>
                  <dl className="divide-y">
                    {[
                      ["Full Name",  name],
                      ["Email",     c.email     ?? "—"],
                      ["Phone",     c.phone     ?? "—"],
                      ["WhatsApp",  c.whatsappNumber ?? "—"],
                      ["Address",   [c.address, c.city, c.country].filter(Boolean).join(", ") || "—"],
                      ["Tax Number",c.taxNumber ?? "—"],
                      ["Credit Limit", c.creditLimit ? money(c.creditLimit) : "—"],
                      ["Type",      (c.type ?? "INDIVIDUAL").toLowerCase()],
                      ["Customer #",c.customerNumber],
                      ["Created",   fmtDate(c.createdAt)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start px-5 py-3 gap-4">
                        <dt className="w-36 shrink-0 text-sm text-muted-foreground">{label}</dt>
                        <dd className="text-sm font-medium flex-1 capitalize-first">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {c.notes && (
                  <div className="mt-4 rounded-xl border overflow-hidden">
                    <div className="bg-muted/30 px-5 py-3 border-b">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                    </div>
                    <p className="px-5 py-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{c.notes}</p>
                  </div>
                )}
              </TabsContent>

              {/* ── Orders tab ───────────────────────────────────────── */}
              <TabsContent value="orders" className="m-0 p-6 outline-none">
                {orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No orders yet</p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/30 border-b">
                          <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Order #</th>
                          <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                          <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                          <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total</th>
                          <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Paid</th>
                          <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {orders.map((order: any) => {
                          const bal = Number(order.balance ?? 0);
                          return (
                            <tr
                              key={order.id}
                              className="hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => router.push(`/orders/${order.id}`)}
                            >
                              <td className="px-5 py-3.5 font-mono text-xs font-medium">{order.orderNumber}</td>
                              <td className="px-4 py-3.5 text-muted-foreground">{fmtDate(order.createdAt)}</td>
                              <td className="px-4 py-3.5">
                                <StatusBadge status={order.status} />
                              </td>
                              <td className="px-4 py-3.5 text-right tabular-nums font-medium">{money(order.total)}</td>
                              <td className="px-4 py-3.5 text-right tabular-nums text-emerald-700">{money(order.amountPaid ?? order.actualPaid)}</td>
                              <td className={`px-5 py-3.5 text-right tabular-nums font-medium ${bal > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                                {money(bal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* ── Payments tab ─────────────────────────────────────── */}
              <TabsContent value="payments" className="m-0 p-6 outline-none">
                {payments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                    <Receipt className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No payments recorded</p>
                  </div>
                ) : (
                  <>
                    {/* Summary bar */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <StatCard
                        label="Total Received"
                        value={money(payments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0))}
                      />
                      <StatCard
                        label="Deposits"
                        value={money(payments.filter((p: any) => p.isDeposit).reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0))}
                      />
                      <StatCard
                        label="Transactions"
                        value={String(payments.length)}
                      />
                    </div>

                    <div className="rounded-xl border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/30 border-b">
                            <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Receipt #</th>
                            <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                            <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Type</th>
                            <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Method</th>
                            <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Order</th>
                            <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Reference</th>
                            <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {payments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-5 py-3.5 font-mono text-xs">{p.receiptNumber ?? "—"}</td>
                              <td className="px-4 py-3.5 text-muted-foreground">{fmtDate(p.paymentDate ?? p.receivedAt)}</td>
                              <td className="px-4 py-3.5">
                                {p.isDeposit ? (
                                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs">Deposit</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Payment</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3.5">{methodLabel(p.method ?? "")}</td>
                              <td className="px-4 py-3.5">
                                {p.order ? (
                                  <button
                                    className="font-mono text-xs text-orange-600 hover:underline"
                                    onClick={() => router.push(`/orders/${p.order.id}`)}
                                  >
                                    {p.order.orderNumber}
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-xs text-muted-foreground">{p.reference ?? "—"}</td>
                              <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{money(p.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t bg-muted/20 font-semibold text-xs">
                            <td className="px-5 py-3" colSpan={6}>Total</td>
                            <td className="px-5 py-3 text-right tabular-nums">
                              {money(payments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
