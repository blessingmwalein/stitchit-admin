"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ordersApi } from "@/lib/api/sales";
import { paymentsApi } from "@/lib/api/finance";
import { companyApi } from "@/lib/api/settings";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Banknote, CreditCard, FileText, Printer,
  Download, Trash2, MoreVertical, ZoomIn, ZoomOut,
  RotateCcw, RotateCw, FlipHorizontal, FlipVertical,
  Maximize2, RefreshCw, Phone, Mail, MapPin,
  ChevronDown, MessageCircle, Paperclip,
} from "lucide-react";
import { PaymentFormModal } from "@/components/modules/finance/payment-form-modal";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT:            ["QUOTED", "CANCELLED"],
  QUOTED:           ["AWAITING_DEPOSIT", "CANCELLED"],
  AWAITING_DEPOSIT: ["DEPOSIT_PAID", "CANCELLED"],
  DEPOSIT_PAID:     ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION:    ["QUALITY_CHECK"],
  QUALITY_CHECK:    ["READY", "IN_PRODUCTION"],
  READY:            ["DELIVERED"],
  DELIVERED:        ["CLOSED"],
  CLOSED:           [],
  CANCELLED:        [],
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700 border-red-200",
  HIGH:   "bg-amber-100 text-amber-700 border-amber-200",
  NORMAL: "bg-blue-100 text-blue-700 border-blue-200",
  LOW:    "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_ORDER = [
  "DRAFT", "QUOTED", "AWAITING_DEPOSIT", "DEPOSIT_PAID",
  "IN_PRODUCTION", "QUALITY_CHECK", "READY", "DELIVERED", "CLOSED",
];

// ─── Image Lightbox ───────────────────────────────────────────────────────────

function LbBtn({
  onClick, title, children,
}: {
  onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-white/10 transition-colors text-white"
    >
      {children}
    </button>
  );
}

function ImageLightbox({
  images, startIdx, open, onOpenChange,
}: {
  images: string[]; startIdx: number; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const [idx, setIdx] = React.useState(startIdx);
  const [scale, setScale] = React.useState(1);
  const [rotate, setRotate] = React.useState(0);
  const [flipX, setFlipX] = React.useState(false);
  const [flipY, setFlipY] = React.useState(false);

  React.useEffect(() => { setIdx(startIdx); }, [startIdx]);
  React.useEffect(() => {
    if (open) { setScale(1); setRotate(0); setFlipX(false); setFlipY(false); }
  }, [open, idx]);

  const imgTransform = `scale(${scale}) rotate(${rotate}deg) scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full p-0 gap-0 bg-zinc-950 border-zinc-800 overflow-hidden">
        <DialogTitle className="sr-only">Design Preview</DialogTitle>
        <div className="relative flex flex-col" style={{ height: "90vh" }}>
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={cn(
                    "rounded-full transition-all",
                    i === idx ? "h-2 w-6 bg-white" : "h-1.5 w-1.5 bg-zinc-500 hover:bg-zinc-300"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-0.5">
              <LbBtn onClick={() => setScale(s => Math.min(4, s + 0.25))} title="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </LbBtn>
              <LbBtn onClick={() => setScale(s => Math.max(0.25, s - 0.25))} title="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </LbBtn>
              <span className="text-xs text-zinc-400 w-10 text-center tabular-nums">
                {Math.round(scale * 100)}%
              </span>
              <Separator orientation="vertical" className="h-4 bg-zinc-700 mx-1" />
              <LbBtn onClick={() => setRotate(r => r - 90)} title="Rotate Left">
                <RotateCcw className="h-4 w-4" />
              </LbBtn>
              <LbBtn onClick={() => setRotate(r => r + 90)} title="Rotate Right">
                <RotateCw className="h-4 w-4" />
              </LbBtn>
              <Separator orientation="vertical" className="h-4 bg-zinc-700 mx-1" />
              <LbBtn onClick={() => setFlipX(f => !f)} title="Flip Horizontal">
                <FlipHorizontal className={cn("h-4 w-4", flipX && "text-blue-400")} />
              </LbBtn>
              <LbBtn onClick={() => setFlipY(f => !f)} title="Flip Vertical">
                <FlipVertical className={cn("h-4 w-4", flipY && "text-blue-400")} />
              </LbBtn>
              <Separator orientation="vertical" className="h-4 bg-zinc-700 mx-1" />
              <LbBtn
                onClick={() => { setScale(1); setRotate(0); setFlipX(false); setFlipY(false); }}
                title="Reset"
              >
                <RefreshCw className="h-4 w-4" />
              </LbBtn>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-zinc-900 select-none">
            {images[idx] ? (
              <img
                key={idx}
                src={images[idx]}
                alt="Rug design"
                className="max-h-full max-w-full object-contain"
                style={{ transform: imgTransform, transition: "transform 0.18s ease" }}
                draggable={false}
              />
            ) : (
              <p className="text-zinc-500 text-sm">No image available</p>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 px-4 py-3 bg-zinc-900 border-t border-zinc-800 shrink-0 overflow-x-auto">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={cn(
                    "shrink-0 h-14 w-14 rounded-md overflow-hidden border-2 transition-all",
                    i === idx ? "border-white" : "border-transparent opacity-50 hover:opacity-80"
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment Progress Bar ─────────────────────────────────────────────────────

function PayProgress({
  pct, amountPaid, balance,
}: {
  pct: number; amountPaid: number; balance: number;
}) {
  const color =
    balance <= 0 ? "bg-emerald-500" :
    amountPaid > 0 ? "bg-amber-400" :
    "bg-red-400";
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [showDepositModal, setShowDepositModal] = React.useState(false);
  const [showBalanceModal, setShowBalanceModal] = React.useState(false);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIdx, setLightboxIdx] = React.useState(0);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.get(id),
  });

  const { data: paymentsResult } = useQuery({
    queryKey: ["payments", "order", id],
    queryFn: () => paymentsApi.byOrder(id),
    enabled: !!order,
  });
  const payments: any[] = (paymentsResult as any)?.data ?? [];

  const { data: attachments = [] } = useQuery({
    queryKey: ["order-attachments", id],
    queryFn: () => ordersApi.attachments(id),
    enabled: !!order,
  });

  const { data: company } = useQuery({
    queryKey: ["company"],
    queryFn: companyApi.get,
    staleTime: 10 * 60 * 1000,
  });

  const transitionMut = useMutation({
    mutationFn: (status: string) => ordersApi.transition(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["order", id] });
    },
    onError: () => toast.error("Status transition failed"),
  });

  function handleTransition(newStatus: string) {
    if (newStatus === "DEPOSIT_PAID") {
      setShowDepositModal(true);
    } else {
      transitionMut.mutate(newStatus);
    }
  }

  function invalidateOrder() {
    qc.invalidateQueries({ queryKey: ["order", id] });
    qc.invalidateQueries({ queryKey: ["payments", "order", id] });
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-1">
        <div className="w-80 shrink-0 border-r bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return <div className="p-6 text-sm text-red-600">Order not found.</div>;
  }

  // ── Computed values ───────────────────────────────────────────────────────
  const c = (order as any).customer;
  const customerName = c?.firstName
    ? `${c.firstName} ${c.lastName ?? ""}`.trim()
    : c?.companyName ?? order.customerName ?? "—";
  const customerInitials =
    customerName.split(" ").map((w: string) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "?";

  const total           = Number(order.total ?? 0);
  const depositRequired = Number(order.depositRequired ?? 0);
  // Compute from actual recorded payments — more accurate than the order's cached fields
  const actualPaid  = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const balance     = Math.max(0, total - actualPaid);
  const paymentPct  = total > 0 ? Math.min(100, (actualPaid / total) * 100) : 0;

  const items: any[]      = order.items ?? [];
  const itemImages: string[] = items.map((i: any) => i.designFileUrl).filter(Boolean);
  const rugName           = items[0]?.rugName || "Custom Order";
  const nextStatuses      = STATUS_TRANSITIONS[order.status] ?? [];
  const statusHistory: any[] = (order as any).statusHistory ?? [];
  const currentStatusIdx  = STATUS_ORDER.indexOf(order.status);

  const getHistEntry = (s: string) => statusHistory.find((h: any) => h.status === s);

  const paymentLabel =
    balance <= 0 ? "Fully Paid" : actualPaid > 0 ? "Partial" : "Unpaid";
  const paymentLabelColor =
    balance <= 0 ? "text-emerald-600" : actualPaid > 0 ? "text-amber-600" : "text-red-500";

  const attachList = attachments as any[];

  // ── PDF helpers ───────────────────────────────────────────────────────────

  function buildPdfPayload() {
    const o  = order!;
    const co = company as any;
    const cs = co?.settings ?? {};
    const cust = (o as any).customer ?? {};
    return {
      company: {
        name:          co?.name ?? "Stitch't",
        legalName:     co?.legalName,
        address:       co?.address,
        city:          co?.city,
        country:       co?.country,
        phone:         co?.phone,
        email:         co?.email,
        taxId:         co?.taxId,
        logoUrl:       cs.logoUrl,
        primaryColor:  cs.primaryColor ?? "#f97316",
        footerText:    cs.footerText,
      },
      customer: {
        name:    cust.firstName
          ? `${cust.firstName} ${cust.lastName ?? ""}`.trim()
          : cust.companyName ?? o.customerName,
        address: cust.address,
        city:    cust.city,
        country: cust.country,
        phone:   cust.phone,
        email:   cust.email,
      },
      orderNumber:     o.orderNumber,
      status:          o.status,
      priority:        o.priority,
      items:           items.map((i: any) => ({
        rugName:       i.rugName,
        description:   i.description,
        widthCm:       i.widthCm,
        heightCm:      i.heightCm,
        shape:         i.shape,
        complexity:    i.complexity,
        colors:        i.colors ?? [],
        quantity:      i.quantity,
        unitPrice:     Number(i.unitPrice),
        lineTotal:     Number(i.lineTotal),
        designFileUrl: i.designFileUrl ?? null,
      })),
      subtotal:        Number((o as any).subtotal ?? o.total),
      discount:        Number((o as any).discount ?? 0),
      tax:             Number((o as any).tax ?? 0),
      total,
      depositRequired,
      actualPaid,
      balance,
      payments:        payments.map((p: any) => ({
        paymentNumber: p.paymentNumber,
        amount:        Number(p.amount),
        currency:      p.currency ?? "USD",
        method:        p.method,
        reference:     p.reference,
        receivedAt:    p.receivedAt,
        isDeposit:     p.isDeposit ?? false,
      })),
      promisedDate:    o.promisedDate,
      createdAt:       o.createdAt,
      notes:           o.notes,
      generatedAt:     new Date().toISOString(),
    };
  }

  async function handleDownloadOrderSummary() {
    const toastId = "pdf-order";
    toast.loading("Generating order summary…", { id: toastId });
    try {
      const { downloadOrderSummaryPdf } = await import("@/lib/pdf/generate-order-pdfs");
      await downloadOrderSummaryPdf(buildPdfPayload());
      toast.success("Order summary downloaded", { id: toastId });
    } catch {
      toast.error("Could not generate PDF", { id: toastId });
    }
  }

  async function handleDownloadDepositReceipt() {
    const toastId = "pdf-deposit";
    toast.loading("Generating deposit receipt…", { id: toastId });
    try {
      const { downloadDepositReceiptPdf } = await import("@/lib/pdf/generate-order-pdfs");
      await downloadDepositReceiptPdf(buildPdfPayload());
      toast.success("Deposit receipt downloaded", { id: toastId });
    } catch {
      toast.error("Could not generate PDF", { id: toastId });
    }
  }

  async function handleDownloadInvoice() {
    const toastId = "pdf-invoice";
    toast.loading("Generating invoice…", { id: toastId });
    try {
      const { downloadBalanceInvoicePdf } = await import("@/lib/pdf/generate-order-pdfs");
      await downloadBalanceInvoicePdf(buildPdfPayload());
      toast.success("Invoice downloaded", { id: toastId });
    } catch {
      toast.error("Could not generate PDF", { id: toastId });
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Modals */}
      <ImageLightbox
        images={itemImages}
        startIdx={lightboxIdx}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
      <PaymentFormModal
        open={showDepositModal}
        onOpenChange={setShowDepositModal}
        prefill={{
          customerId: (order as any).customerId ?? c?.id,
          orderId: id,
          isDeposit: true,
          amount: depositRequired > 0 ? String(depositRequired) : "",
        }}
        onSuccess={() => {
          invalidateOrder();
          if (order.status === "AWAITING_DEPOSIT") {
            transitionMut.mutate("DEPOSIT_PAID");
          }
        }}
      />
      <PaymentFormModal
        open={showBalanceModal}
        onOpenChange={setShowBalanceModal}
        prefill={{
          customerId: (order as any).customerId ?? c?.id,
          orderId: id,
          isDeposit: false,
          amount: balance > 0 ? balance.toFixed(2) : "",
        }}
        onSuccess={invalidateOrder}
      />

      {/* ── Breadcrumb bar ── */}
      <div className="sticky top-0 z-20 shrink-0 border-b bg-card px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.back()}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Orders
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-mono text-sm text-muted-foreground">{order.orderNumber}</span>
        <StatusBadge status={order.status} />
      </div>

      {/* ── Split layout ── */}
      <div className="flex flex-1">

        {/* ──── LEFT SIDEBAR ──── */}
        <aside className="w-80 shrink-0 border-r bg-card sticky top-[49px] self-start max-h-[calc(100vh-49px)] overflow-y-auto">

          {/* Customer */}
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 shrink-0">
                {customerInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[15px] leading-snug">{customerName}</p>
                {c?.customerNumber && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.customerNumber}</p>
                )}
                {c?.type && (
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{c.type.toLowerCase()}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {c?.phone && (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <a href={`tel:${c.phone}`} className="hover:text-foreground transition-colors">{c.phone}</a>
                </div>
              )}
              {c?.email && (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <a href={`mailto:${c.email}`} className="hover:text-foreground transition-colors truncate">
                    {c.email}
                  </a>
                </div>
              )}
              {(c?.address || c?.city) && (
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span className="text-xs">
                    {[c?.address, c?.city, c?.country].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              {(c?.whatsappNumber || c?.phone) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  asChild
                >
                  <a
                    href={`https://wa.me/${(c.whatsappNumber ?? c.phone).replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1.5" />WhatsApp
                  </a>
                </Button>
              )}
              {c?.id && (
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/crm/customers/${c.id}`}>Profile</Link>
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Summary */}
          <div className="p-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment</p>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className={cn("font-semibold", paymentLabelColor)}>{paymentLabel}</span>
                <span className="text-muted-foreground tabular-nums">{Math.round(paymentPct)}%</span>
              </div>
              <PayProgress pct={paymentPct} amountPaid={actualPaid} balance={balance} />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold tabular-nums">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className={cn(
                  "font-semibold tabular-nums",
                  actualPaid >= total ? "text-emerald-600" :
                  actualPaid > 0 ? "text-amber-600" : ""
                )}>
                  ${actualPaid.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Balance</span>
                <span className={cn(
                  "font-semibold tabular-nums",
                  balance > 0 ? "text-red-600" : "text-emerald-600"
                )}>
                  ${balance.toFixed(2)}
                </span>
              </div>
              {depositRequired > 0 && (
                <div className="flex justify-between text-sm border-t pt-2 mt-2">
                  <span className="text-muted-foreground">Deposit req.</span>
                  <span className="tabular-nums">${depositRequired.toFixed(2)}</span>
                </div>
              )}
            </div>

            {balance > 0 && (
              <div className="space-y-2 pt-1">
                {actualPaid === 0 ? (
                  <Button size="sm" className="w-full" onClick={() => setShowDepositModal(true)}>
                    <Banknote className="h-3.5 w-3.5 mr-1.5" />Record Deposit
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setShowDepositModal(true)}>
                      <Banknote className="h-3.5 w-3.5 mr-1.5" />Deposit
                    </Button>
                    <Button size="sm" className="w-full" onClick={() => setShowBalanceModal(true)}>
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" />Balance Payment
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Status Timeline */}
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">Journey</p>
            <ol>
              {STATUS_ORDER.map((s, idx) => {
                const isCompleted = STATUS_ORDER.indexOf(s) < currentStatusIdx;
                const isCurrent   = s === order.status;
                const isLast      = idx === STATUS_ORDER.length - 1;
                const hist        = getHistEntry(s);
                return (
                  <li key={s} className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={cn(
                        "h-4 w-4 rounded-full flex items-center justify-center border-2 mt-0.5 shrink-0",
                        isCurrent  ? "border-orange-500 bg-orange-500" :
                        isCompleted ? "border-orange-300 bg-orange-100" :
                        "border-muted bg-background"
                      )}>
                        {(isCurrent || isCompleted) && (
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      {!isLast && (
                        <div className={cn(
                          "w-px min-h-[20px] mt-0.5 mb-0.5",
                          isCompleted ? "bg-orange-200" : "bg-muted"
                        )} />
                      )}
                    </div>
                    <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-3")}>
                      <p className={cn(
                        "text-xs font-medium leading-snug",
                        isCurrent  ? "text-orange-600" :
                        isCompleted ? "text-foreground/80" :
                        "text-muted-foreground"
                      )}>
                        {s.replace(/_/g, " ")}
                      </p>
                      {hist?.createdAt && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {format(new Date(hist.createdAt), "dd MMM, HH:mm")}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        {/* ──── RIGHT MAIN ──── */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Sticky order header */}
          <div className="sticky top-[49px] z-10 shrink-0 border-b bg-card px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight leading-tight">{rugName}</h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusBadge status={order.status} />
                  <Badge
                    variant="outline"
                    className={cn("text-xs border shrink-0", PRIORITY_COLORS[order.priority])}
                  >
                    {order.priority}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">{order.orderNumber}</span>
                  <span className="text-xs text-muted-foreground">
                    · Created {format(new Date(order.createdAt), "dd MMM yyyy")}
                  </span>
                  {order.promisedDate && (
                    <span className={cn(
                      "text-xs",
                      new Date(order.promisedDate) < new Date() &&
                      !["DELIVERED", "CLOSED"].includes(order.status)
                        ? "text-red-600 font-medium"
                        : "text-muted-foreground"
                    )}>
                      · Due {format(new Date(order.promisedDate), "dd MMM yyyy")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {nextStatuses.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" disabled={transitionMut.isPending}>
                        Update Status
                        <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {nextStatuses.map(s => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => handleTransition(s)}
                          className={s === "CANCELLED" ? "text-destructive focus:text-destructive" : ""}
                        >
                          → {s.replace(/_/g, " ")}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={handleDownloadOrderSummary}>
                      <Download className="mr-2 h-4 w-4" />Download Order Summary
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadDepositReceipt}>
                      <FileText className="mr-2 h-4 w-4" />Deposit Receipt
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadInvoice}>
                      <FileText className="mr-2 h-4 w-4" />Final Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.print()}>
                      <Printer className="mr-2 h-4 w-4" />Print
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />Delete Order
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="mx-6 mt-5 grid grid-cols-4 divide-x rounded-xl border bg-card overflow-hidden shrink-0">
            {[
              {
                label: "Order ID",
                value: <span className="font-mono text-[13px]">{order.orderNumber}</span>,
              },
              {
                label: "Created",
                value: format(new Date(order.createdAt), "dd MMM yyyy"),
              },
              {
                label: "Items",
                value: `${items.length} item${items.length !== 1 ? "s" : ""}`,
              },
              {
                label: "Promised",
                value: order.promisedDate
                  ? (
                    <span className={cn(
                      new Date(order.promisedDate) < new Date() &&
                      !["DELIVERED", "CLOSED"].includes(order.status)
                        ? "text-red-600 font-bold"
                        : ""
                    )}>
                      {format(new Date(order.promisedDate), "dd MMM yyyy")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
            ].map(({ label, value }) => (
              <div key={label} className="px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                <div className="mt-1 text-sm font-semibold">{value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex-1 px-6 pt-5 pb-8">
            <Tabs defaultValue="overview" className="flex flex-col">
              <TabsList className="h-auto bg-transparent rounded-none p-0 border-b w-full justify-start gap-0 mb-5">
                {[
                  { value: "overview",  label: "Overview" },
                  { value: "payments",  label: `Payments${payments.length > 0 ? ` (${payments.length})` : ""}` },
                  { value: "history",   label: "History" },
                  { value: "files",     label: `Files${attachList.length > 0 ? ` (${attachList.length})` : ""}` },
                  { value: "notes",     label: "Notes" },
                ].map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={cn(
                      "rounded-none h-auto px-4 pb-3 pt-0.5 text-sm font-medium flex-none",
                      "border-0 border-b-2 border-b-transparent",
                      "data-[state=active]:border-b-orange-500 data-[state=active]:text-orange-600",
                      "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                      "dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-orange-500",
                      "text-muted-foreground hover:text-foreground transition-colors"
                    )}
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* ── Overview ── */}
              <TabsContent value="overview" className="space-y-4">
                {itemImages.length > 0 && (
                  <div className="space-y-2.5">
                    <div
                      className="relative rounded-xl border bg-zinc-50 dark:bg-zinc-900 overflow-hidden flex items-center justify-center"
                      style={{ minHeight: 240 }}
                    >
                      <img
                        src={itemImages[0]}
                        alt="Design preview"
                        className="max-h-60 max-w-full object-contain cursor-zoom-in"
                        onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <button
                        onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }}
                        className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/50 text-white text-xs hover:bg-black/70 transition-colors"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />Full screen
                      </button>
                    </div>
                    {itemImages.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {itemImages.map((src, i) => (
                          <button
                            key={i}
                            onClick={() => { setLightboxIdx(i); setLightboxOpen(true); }}
                            className="shrink-0 h-16 w-16 rounded-lg border-2 border-transparent hover:border-primary transition-all overflow-hidden"
                          >
                            <img src={src} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {items.map((item: any, i: number) => {
                  const imgIdx = itemImages.indexOf(item.designFileUrl);
                  return (
                    <div key={item.id ?? i} className="flex gap-4 p-4 rounded-xl border bg-card">
                      {item.designFileUrl ? (
                        <img
                          src={item.designFileUrl}
                          alt="Design"
                          className="shrink-0 h-20 w-20 rounded-lg border object-cover cursor-zoom-in hover:opacity-80 transition-opacity"
                          onClick={() => { if (imgIdx >= 0) { setLightboxIdx(imgIdx); setLightboxOpen(true); } }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="shrink-0 h-20 w-20 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground/40 text-xs">
                          No image
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold">{item.rugName}</p>
                          <div className="text-right shrink-0">
                            <p className="font-bold">${Number(item.lineTotal ?? item.unitPrice).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                          <span>{item.widthCm} × {item.heightCm} cm</span>
                          {item.shape && <span>{item.shape}</span>}
                          {item.complexity && <span>{item.complexity}</span>}
                        </div>
                        {item.colors?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.colors.map((col: string) => (
                              <span key={col} className="text-xs px-2 py-0.5 rounded-full bg-muted border">{col}</span>
                            ))}
                          </div>
                        )}
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-2 italic">{item.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {order.notes && (
                  <div className="p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/10">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-500 mb-2">
                      Notes
                    </p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{order.notes}</p>
                  </div>
                )}
              </TabsContent>

              {/* ── Payments ── */}
              <TabsContent value="payments" className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Total",            value: `$${total.toFixed(2)}`,           cls: "" },
                    { label: "Deposit Required", value: `$${depositRequired.toFixed(2)}`, cls: "" },
                    {
                      label: "Paid",
                      value: `$${actualPaid.toFixed(2)}`,
                      cls: actualPaid >= total ? "text-emerald-600" : actualPaid > 0 ? "text-amber-600" : "",
                    },
                    {
                      label: "Balance",
                      value: `$${balance.toFixed(2)}`,
                      cls: balance > 0 ? "text-red-600" : "text-emerald-600",
                    },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="rounded-xl border bg-card p-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={cn("text-xl font-bold mt-1 tabular-nums", cls)}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Payment History</h3>
                  <Button
                    size="sm"
                    onClick={() => actualPaid === 0 ? setShowDepositModal(true) : setShowBalanceModal(true)}
                  >
                    <Banknote className="mr-1.5 h-3.5 w-3.5" />Record Payment
                  </Button>
                </div>

                <div className="rounded-2xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {["Date", "Type", "Amount", "Method", "Reference", "By"].map(h => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                            No payments recorded yet
                          </td>
                        </tr>
                      ) : (
                        payments.map((p: any) => (
                          <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {p.paymentDate ? format(new Date(p.paymentDate), "dd MMM yyyy") : "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs border-transparent",
                                  p.isDeposit ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                                )}
                              >
                                {p.isDeposit ? "Deposit" : "Payment"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 font-semibold tabular-nums whitespace-nowrap">
                              ${Number(p.amount).toFixed(2)}
                            </td>
                            <td className="px-4 py-3.5 capitalize text-muted-foreground whitespace-nowrap">
                              {p.method?.replace(/_/g, " ").toLowerCase() ?? "—"}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                              {p.reference ?? "—"}
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                              {p.createdByName ?? p.receivedByName ?? "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {payments.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 bg-muted/30">
                          <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                            Total received
                          </td>
                          <td className="px-4 py-2.5 font-bold tabular-nums">
                            ${payments.reduce((s: number, p: any) => s + Number(p.amount), 0).toFixed(2)}
                          </td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </TabsContent>

              {/* ── History ── */}
              <TabsContent value="history">
                {statusHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    No status history recorded
                  </p>
                ) : (
                  <ol className="relative border-l border-muted ml-3 space-y-5 py-2">
                    {statusHistory.map((h: any, i: number) => (
                      <li key={h.id ?? i} className="ml-5 relative">
                        <span className="absolute -left-[29px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-orange-400" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={h.status} />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(h.createdAt), "dd MMM yyyy, HH:mm")}
                          </span>
                          {h.changedByName && (
                            <span className="text-xs text-muted-foreground">· {h.changedByName}</span>
                          )}
                        </div>
                        {h.note && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{h.note}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </TabsContent>

              {/* ── Files ── */}
              <TabsContent value="files">
                {attachList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">No attachments</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {attachList.map((att: any, i: number) => {
                      const url = att.url ?? att.fileUrl ?? att.signedUrl;
                      const isImg =
                        att.mimeType?.startsWith("image/") ||
                        /\.(jpe?g|png|gif|webp|svg)$/i.test(att.fileName ?? att.name ?? "");
                      return (
                        <a
                          key={att.id ?? i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="group rounded-xl border overflow-hidden hover:border-primary transition-colors"
                        >
                          {isImg ? (
                            <img
                              src={url}
                              alt=""
                              className="w-full aspect-square object-cover group-hover:opacity-90 transition-opacity"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-muted flex items-center justify-center">
                              <Paperclip className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="p-2 border-t">
                            <p className="text-xs font-medium truncate">{att.name ?? att.fileName ?? "File"}</p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ── Notes ── */}
              <TabsContent value="notes">
                {order.notes ? (
                  <div className="p-4 rounded-xl border bg-muted/30">
                    <p className="text-sm whitespace-pre-wrap text-foreground/80">{order.notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">No notes for this order</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
