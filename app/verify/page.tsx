"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2, FileText, ShoppingBag, Building2, Calendar,
  User, DollarSign, Package,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function usd(v: string | null) {
  if (!v) return "—";
  const n = parseFloat(v);
  return isNaN(n) ? "—" : `$${n.toFixed(2)}`;
}

function fmtDate(v: string | null) {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("en-ZW", {
      day: "numeric", month: "long", year: "numeric",
    }).format(new Date(v));
  } catch {
    return v;
  }
}

// ── Row ───────────────────────────────────────────────────────────────────────

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="mt-0.5 h-7 w-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
      </div>
    </div>
  );
}

// ── Content (needs Suspense because it reads searchParams) ────────────────────

function VerifyContent() {
  const params   = useSearchParams();
  const ref      = params.get("ref");
  const type     = params.get("type");
  const customer = params.get("customer");
  const total    = params.get("total");
  const paid     = params.get("paid");
  const items    = params.get("items");
  const date     = params.get("date");

  const isInvoice = type === "invoice";
  const isOrder   = type === "order";
  const isValid   = !!(ref && type);
  const docLabel  = isInvoice ? "Tax Invoice" : isOrder ? "Order Summary" : "Document";
  const DocIcon   = isInvoice ? FileText : ShoppingBag;

  if (!isValid) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-6 w-6 text-red-400" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Invalid Document Link</h1>
        <p className="text-sm text-gray-500">
          This QR code does not contain valid document information. Please scan the code
          from an official Stitch&apos;t document.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Authenticity badge */}
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 mb-5">
        <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Authentic Document</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            This {docLabel.toLowerCase()} was issued by Stitch&apos;t Custom Rugs, Harare.
          </p>
        </div>
      </div>

      {/* Document card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-orange-100 uppercase tracking-wider mb-1">
              {docLabel}
            </p>
            <p className="text-xl font-bold text-white tracking-tight">{ref}</p>
          </div>
          <DocIcon className="h-10 w-10 text-orange-200 opacity-70" />
        </div>
        <div className="px-6 py-1">
          {customer && <Row icon={User}        label="Customer"     value={customer} />}
          {date     && <Row icon={Calendar}    label="Issue Date"   value={fmtDate(date)} />}
          {total    && <Row icon={DollarSign}  label="Order Total"  value={usd(total)} />}
          {isInvoice && paid && (
            <Row icon={DollarSign} label="Amount Paid" value={usd(paid)} />
          )}
          {isInvoice && total && paid && (
            <Row
              icon={DollarSign}
              label="Balance Due"
              value={usd(String(Math.max(0, parseFloat(total) - parseFloat(paid))))}
            />
          )}
          {isOrder && items && (
            <Row icon={Package} label="Items" value={`${items} rug item${items !== "1" ? "s" : ""}`} />
          )}
        </div>
      </div>

      {/* Issued by */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Issued By</p>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Stitch&apos;t Custom Rugs</p>
            <p className="text-xs text-gray-500">Harare, Zimbabwe · +263 788 959 677</p>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-5">
        To report a fraudulent document, contact{" "}
        <span className="text-orange-600">info@stitchit.co.zw</span>
      </p>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/60 to-white flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">Stitch&apos;t</p>
            <p className="text-xs text-gray-500 mt-0.5">Document Verification</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
              </div>
            }
          >
            <VerifyContent />
          </React.Suspense>
        </div>
      </main>
    </div>
  );
}
