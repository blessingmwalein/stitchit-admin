"use client";

import type { OrderPdfPayload } from "@/components/pdf/pdf-types";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = window.document.createElement("a");
  a.href    = url;
  a.download = filename;
  a.style.display = "none";
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 300);
}

async function makeQr(url: string): Promise<string> {
  const QRCode = await import("qrcode");
  return QRCode.default.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 160,
    color: { dark: "#111827", light: "#ffffff" },
  });
}

function verifyBase() {
  return typeof window !== "undefined"
    ? window.location.origin
    : "https://app.stitchit.co.zw";
}

function invoiceVerifyUrl(data: OrderPdfPayload) {
  const p = new URLSearchParams({
    ref:      data.orderNumber,
    type:     "invoice",
    customer: data.customer.name,
    total:    data.total.toFixed(2),
    paid:     data.actualPaid.toFixed(2),
    date:     data.generatedAt.substring(0, 10),
  });
  return `${verifyBase()}/verify?${p.toString()}`;
}

function orderVerifyUrl(data: OrderPdfPayload) {
  const p = new URLSearchParams({
    ref:      data.orderNumber,
    type:     "order",
    customer: data.customer.name,
    total:    data.total.toFixed(2),
    items:    String(data.items.length),
    date:     data.generatedAt.substring(0, 10),
  });
  return `${verifyBase()}/verify?${p.toString()}`;
}

// Cast pdf() as any — our components render a <Document> root, which is correct
// at runtime. The strict ReactElement<DocumentProps> type is overly narrow.

export async function downloadDepositReceiptPdf(data: OrderPdfPayload) {
  const [{ pdf }, { createElement }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("react"),
  ]);
  const { DepositReceiptPdf } = await import("@/components/pdf/deposit-receipt-pdf");
  const blob = await (pdf as any)(createElement(DepositReceiptPdf, { data })).toBlob();
  triggerDownload(blob, `deposit-receipt-${data.orderNumber}.pdf`);
}

export async function downloadBalanceInvoicePdf(rawData: OrderPdfPayload) {
  const [{ pdf }, { createElement }, qrDataUrl] = await Promise.all([
    import("@react-pdf/renderer"),
    import("react"),
    makeQr(invoiceVerifyUrl(rawData)),
  ]);
  const data: OrderPdfPayload = { ...rawData, qrCodeDataUrl: qrDataUrl };
  const { BalanceInvoicePdf } = await import("@/components/pdf/balance-invoice-pdf");
  const blob = await (pdf as any)(createElement(BalanceInvoicePdf, { data })).toBlob();
  triggerDownload(blob, `invoice-${data.orderNumber}.pdf`);
}

export async function downloadOrderSummaryPdf(rawData: OrderPdfPayload) {
  const [{ pdf }, { createElement }, qrDataUrl] = await Promise.all([
    import("@react-pdf/renderer"),
    import("react"),
    makeQr(orderVerifyUrl(rawData)),
  ]);
  const data: OrderPdfPayload = { ...rawData, qrCodeDataUrl: qrDataUrl };
  const { OrderSummaryPdf } = await import("@/components/pdf/order-summary-pdf");
  const blob = await (pdf as any)(createElement(OrderSummaryPdf, { data })).toBlob();
  triggerDownload(blob, `order-summary-${data.orderNumber}.pdf`);
}
