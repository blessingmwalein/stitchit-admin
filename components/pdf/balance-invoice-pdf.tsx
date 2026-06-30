"use client";

import React from "react";
import {
  Document, Page, View, Text, StyleSheet, Image,
} from "@react-pdf/renderer";
import { format, parseISO } from "date-fns";
import type { OrderPdfPayload } from "./pdf-types";

// ── Theme ─────────────────────────────────────────────────────────────────────

const ORANGE = "#f97316";
const DARK   = "#111827";
const MUTED  = "#6b7280";
const BORDER = "#e5e7eb";
const LIGHT  = "#f9fafb";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try { return format(parseISO(iso), "d MMM yyyy"); } catch { return iso; }
}

function fmtMethod(m: string) {
  const map: Record<string, string> = {
    CASH_USD: "Cash (USD)", CASH_ZWG: "Cash (ZWG)",
    BANK_TRANSFER: "Bank Transfer", ECOCASH: "EcoCash",
    INNBUCKS: "Innbucks", CARD: "Card", OTHER: "Other",
  };
  return map[m] ?? m;
}

function fmtShape(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function fmtComplexity(c: string) {
  return c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function usd(n: number) {
  return `$${n.toFixed(2)}`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: DARK, padding: 40, lineHeight: 1.5 },

  // Header
  header:      { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  headerLeft:  { flex: 1, paddingRight: 20 },
  logoBox:     { width: 52, height: 52, marginBottom: 8, borderRadius: 6, overflow: "hidden", backgroundColor: LIGHT },
  logo:        { width: 52, height: 52, objectFit: "contain" },
  coName:      { fontFamily: "Helvetica-Bold", fontSize: 13, color: DARK, marginBottom: 3 },
  coMeta:      { fontSize: 8, color: MUTED, marginBottom: 1 },
  headerRight: { alignItems: "flex-end" },
  badge:       { backgroundColor: ORANGE, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10 },
  badgeText:   { fontFamily: "Helvetica-Bold", fontSize: 14, color: "#fff", letterSpacing: 1 },
  docRef:      { fontSize: 8, color: MUTED, marginBottom: 1 },
  docRefVal:   { fontSize: 9, color: DARK, fontFamily: "Helvetica-Bold", marginBottom: 4 },

  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 20 },

  // Bill to / meta grid
  infoRow:   { flexDirection: "row", marginBottom: 20 },
  infoBox:   { flex: 1, paddingRight: 16 },
  infoLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 },
  infoName:  { fontFamily: "Helvetica-Bold", fontSize: 10, color: DARK, marginBottom: 2 },
  infoText:  { fontSize: 8.5, color: MUTED, marginBottom: 1 },

  // Items table
  table: { marginBottom: 4 },
  thead: {
    flexDirection: "row", backgroundColor: LIGHT,
    borderTopLeftRadius: 6, borderTopRightRadius: 6,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 7, paddingHorizontal: 10,
  },
  theadCell: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 },
  trow:    { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER, paddingHorizontal: 10 },
  trowAlt: { backgroundColor: "#fafafa" },
  tcell:   { fontSize: 9, color: DARK },
  tsubtext:{ fontSize: 7.5, color: MUTED, marginBottom: 1 },

  colDesc:  { flex: 3, paddingVertical: 8, paddingRight: 8 },
  colQty:   { flex: 0.6, paddingVertical: 8, textAlign: "center" },
  colUnit:  { flex: 1, paddingVertical: 8, textAlign: "right" },
  colTotal: { flex: 1, paddingVertical: 8, textAlign: "right" },

  // Totals
  totalsWrap: { alignItems: "flex-end", marginTop: 8, marginBottom: 20 },
  totalRow:   { flexDirection: "row", marginBottom: 3 },
  tlabel:     { width: 140, fontSize: 8.5, color: MUTED },
  tvalue:     { width: 80, fontSize: 8.5, color: DARK, textAlign: "right" },
  divLine:    { width: 224, borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 6 },
  balWrap:    { backgroundColor: "#fff7ed", borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, marginTop: 4 },
  balRow:     { flexDirection: "row" },
  balLabel:   { width: 140, fontFamily: "Helvetica-Bold", fontSize: 11, color: ORANGE },
  balValue:   { width: 80, fontFamily: "Helvetica-Bold", fontSize: 11, color: ORANGE, textAlign: "right" },

  // Payment history
  ph:      { marginBottom: 20 },
  phTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  phRow:   { flexDirection: "row", marginBottom: 3 },
  phCell:  { fontSize: 8, color: DARK },

  // Terms
  terms:      { marginBottom: 20 },
  termsTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  termsText:  { fontSize: 8, color: MUTED },

  // Footer with QR
  footer:     { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, marginTop: "auto", flexDirection: "row", alignItems: "flex-end" },
  footerLeft: { flex: 1 },
  footerText: { fontSize: 7.5, color: MUTED, textAlign: "left", marginBottom: 2 },
  qrBox:      { alignItems: "center", marginLeft: 16 },
  qrImg:      { width: 52, height: 52 },
  qrLabel:    { fontSize: 6, color: MUTED, marginTop: 2, textAlign: "center" },
});

// ── Component ─────────────────────────────────────────────────────────────────

export function BalanceInvoicePdf({ data }: { data: OrderPdfPayload }) {
  const {
    company, customer, orderNumber, items, payments,
    subtotal, discount, tax, total, actualPaid, balance,
    generatedAt, createdAt, promisedDate, notes, qrCodeDataUrl,
  } = data;

  const coLocation = [company.address, company.city, company.country].filter(Boolean).join(", ");
  const dueDate = fmtDate(new Date(Date.now() + 30 * 86400000).toISOString());

  return (
    <Document title={`Invoice — ${orderNumber}`} author={company.name}>
      <Page size="A4" style={s.page}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {company.logoUrl && (
              <View style={s.logoBox}>
                <Image src={company.logoUrl} style={s.logo} />
              </View>
            )}
            <Text style={s.coName}>{company.name}</Text>
            {company.legalName && <Text style={s.coMeta}>{company.legalName}</Text>}
            {coLocation && <Text style={s.coMeta}>{coLocation}</Text>}
            {company.phone && <Text style={s.coMeta}>{company.phone}</Text>}
            {company.email && <Text style={s.coMeta}>{company.email}</Text>}
            {company.taxId && <Text style={s.coMeta}>Tax ID: {company.taxId}</Text>}
          </View>
          <View style={s.headerRight}>
            <View style={s.badge}>
              <Text style={s.badgeText}>INVOICE</Text>
            </View>
            <Text style={s.docRef}>Order Reference</Text>
            <Text style={s.docRefVal}>{orderNumber}</Text>
            <Text style={s.docRef}>Issue Date</Text>
            <Text style={s.docRefVal}>{fmtDate(generatedAt)}</Text>
            <Text style={s.docRef}>Due Date</Text>
            <Text style={s.docRefVal}>{dueDate}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Bill To / Order Ref ──────────────────────────────────────── */}
        <View style={s.infoRow}>
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Bill To</Text>
            <Text style={s.infoName}>{customer.name}</Text>
            {customer.address && <Text style={s.infoText}>{customer.address}</Text>}
            {(customer.city || customer.country) && (
              <Text style={s.infoText}>{[customer.city, customer.country].filter(Boolean).join(", ")}</Text>
            )}
            {customer.phone && <Text style={s.infoText}>{customer.phone}</Text>}
            {customer.email && <Text style={s.infoText}>{customer.email}</Text>}
          </View>
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Order Info</Text>
            <Text style={s.infoText}>Created: {fmtDate(createdAt)}</Text>
            {promisedDate && <Text style={s.infoText}>Promised: {fmtDate(promisedDate)}</Text>}
            <Text style={s.infoText}>Items: {items.length}</Text>
          </View>
        </View>

        {/* ── Items Table ──────────────────────────────────────────────── */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.theadCell, s.colDesc]}>Description</Text>
            <Text style={[s.theadCell, s.colQty, { textAlign: "center" }]}>Qty</Text>
            <Text style={[s.theadCell, s.colUnit, { textAlign: "right" }]}>Unit Price</Text>
            <Text style={[s.theadCell, s.colTotal, { textAlign: "right" }]}>Total</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={[s.trow, i % 2 === 1 ? s.trowAlt : {}]}>
              <View style={s.colDesc}>
                <Text style={[s.tcell, { fontFamily: "Helvetica-Bold", marginBottom: 2 }]}>
                  {item.rugName}
                </Text>
                <Text style={s.tsubtext}>
                  {item.widthCm} × {item.heightCm} cm · {fmtShape(item.shape)}
                </Text>
                {item.colors.length > 0 && (
                  <Text style={s.tsubtext}>Colors: {item.colors.join(", ")}</Text>
                )}
                <Text style={s.tsubtext}>Complexity: {fmtComplexity(item.complexity)}</Text>
              </View>
              <Text style={[s.tcell, s.colQty]}>{item.quantity}</Text>
              <Text style={[s.tcell, s.colUnit]}>{usd(item.unitPrice)}</Text>
              <Text style={[s.tcell, s.colTotal]}>{usd(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ───────────────────────────────────────────────────── */}
        <View style={s.totalsWrap}>
          <View style={s.totalRow}>
            <Text style={s.tlabel}>Subtotal</Text>
            <Text style={s.tvalue}>{usd(subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={s.totalRow}>
              <Text style={s.tlabel}>Discount</Text>
              <Text style={s.tvalue}>−{usd(discount)}</Text>
            </View>
          )}
          {tax > 0 && (
            <View style={s.totalRow}>
              <Text style={s.tlabel}>Tax</Text>
              <Text style={s.tvalue}>{usd(tax)}</Text>
            </View>
          )}
          <View style={s.divLine} />
          <View style={s.totalRow}>
            <Text style={[s.tlabel, { fontFamily: "Helvetica-Bold" }]}>Order Total</Text>
            <Text style={[s.tvalue, { fontFamily: "Helvetica-Bold" }]}>{usd(total)}</Text>
          </View>
          {actualPaid > 0 && (
            <View style={s.totalRow}>
              <Text style={s.tlabel}>Payments Received</Text>
              <Text style={s.tvalue}>−{usd(actualPaid)}</Text>
            </View>
          )}
          <View style={s.divLine} />
          <View style={s.balWrap}>
            <View style={s.balRow}>
              <Text style={s.balLabel}>{balance <= 0 ? "FULLY PAID" : "BALANCE DUE"}</Text>
              <Text style={s.balValue}>{usd(balance)}</Text>
            </View>
          </View>
        </View>

        {/* ── Payment History ──────────────────────────────────────────── */}
        {payments.length > 0 && (
          <View style={s.ph}>
            <Text style={s.phTitle}>Payment History</Text>
            {payments.map((p, i) => (
              <View key={i} style={s.phRow}>
                <Text style={[s.phCell, { width: 90 }]}>{fmtDate(p.receivedAt)}</Text>
                <Text style={[s.phCell, { width: 100 }]}>{fmtMethod(p.method)}</Text>
                <Text style={[s.phCell, { flex: 1, color: MUTED }]}>{p.reference || "—"}</Text>
                <Text style={[s.phCell, { width: 60, textAlign: "right" }]}>{usd(p.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Payment Terms ────────────────────────────────────────────── */}
        <View style={s.terms}>
          <Text style={s.termsTitle}>Payment Methods Accepted</Text>
          <Text style={s.termsText}>Cash (USD) · EcoCash · Bank Transfer · Innbucks</Text>
          {notes && (
            <Text style={[s.termsText, { marginTop: 6, fontFamily: "Helvetica-Oblique" }]}>
              Note: {notes}
            </Text>
          )}
        </View>

        {/* ── Footer with QR ───────────────────────────────────────────── */}
        <View style={s.footer}>
          <View style={s.footerLeft}>
            {company.footerText && <Text style={s.footerText}>{company.footerText}</Text>}
            <Text style={s.footerText}>
              {[company.name, company.phone, company.email].filter(Boolean).join(" · ")}
            </Text>
            <Text style={s.footerText}>Generated {fmtDate(generatedAt)}</Text>
          </View>
          {qrCodeDataUrl && (
            <View style={s.qrBox}>
              <Image src={qrCodeDataUrl} style={s.qrImg} />
              <Text style={s.qrLabel}>Scan to verify</Text>
            </View>
          )}
        </View>

      </Page>
    </Document>
  );
}
