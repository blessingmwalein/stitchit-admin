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
  badge:       { backgroundColor: ORANGE, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8 },
  badgeText:   { fontFamily: "Helvetica-Bold", fontSize: 11, color: "#fff", letterSpacing: 1 },
  docRef:      { fontSize: 8, color: MUTED, marginBottom: 2 },
  docRefVal:   { fontSize: 9, color: DARK, fontFamily: "Helvetica-Bold", marginBottom: 2 },

  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 20 },

  // Info row
  infoRow:   { flexDirection: "row", marginBottom: 20 },
  infoBox:   { flex: 1 },
  infoLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 },
  infoName:  { fontFamily: "Helvetica-Bold", fontSize: 10, color: DARK, marginBottom: 2 },
  infoText:  { fontSize: 8.5, color: MUTED, marginBottom: 1 },

  // Table
  table:    { marginBottom: 20 },
  thead:    {
    flexDirection: "row", backgroundColor: LIGHT,
    borderTopLeftRadius: 6, borderTopRightRadius: 6,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 8, paddingHorizontal: 10,
  },
  theadCell: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 },
  trow:      { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 9 },
  trowAlt:   { backgroundColor: "#fafafa" },
  tcell:     { fontSize: 9, color: DARK },
  // Date column is prominent — wider and slightly bolder
  colDate:   { flex: 2 },
  colMethod: { flex: 1.8 },
  colRef:    { flex: 2 },
  colAmt:    { flex: 1, textAlign: "right" },

  // Totals
  totalsWrap: { alignItems: "flex-end", marginBottom: 24 },
  totalRow:   { flexDirection: "row", marginBottom: 3 },
  tlabel:     { width: 130, fontSize: 8.5, color: MUTED },
  tvalue:     { width: 70, fontSize: 8.5, color: DARK, textAlign: "right" },
  divLine:    { width: 204, borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 6 },
  balLabel:   { fontFamily: "Helvetica-Bold", color: ORANGE, fontSize: 10 },
  balValue:   { fontFamily: "Helvetica-Bold", color: ORANGE, fontSize: 10 },

  // Thank you
  thankYou: { fontSize: 8.5, color: MUTED, fontFamily: "Helvetica-Oblique", textAlign: "center", marginTop: 4, marginBottom: 20 },

  // Footer
  footer:     { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, marginTop: "auto" },
  footerText: { fontSize: 7.5, color: MUTED, textAlign: "center", marginBottom: 2 },
});

// ── Component ─────────────────────────────────────────────────────────────────

export function DepositReceiptPdf({ data }: { data: OrderPdfPayload }) {
  const { company, customer, orderNumber, payments, actualPaid, balance, total, generatedAt } = data;
  const coLocation = [company.address, company.city, company.country].filter(Boolean).join(", ");

  return (
    <Document title={`Deposit Receipt — ${orderNumber}`} author={company.name}>
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
              <Text style={s.badgeText}>DEPOSIT RECEIPT</Text>
            </View>
            <Text style={s.docRef}>Order Reference</Text>
            <Text style={s.docRefVal}>{orderNumber}</Text>
            <Text style={s.docRef}>Date Issued</Text>
            <Text style={s.docRefVal}>{fmtDate(generatedAt)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Received From / Order Info ────────────────────────────── */}
        <View style={s.infoRow}>
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Received From</Text>
            <Text style={s.infoName}>{customer.name}</Text>
            {customer.address && <Text style={s.infoText}>{customer.address}</Text>}
            {(customer.city || customer.country) && (
              <Text style={s.infoText}>{[customer.city, customer.country].filter(Boolean).join(", ")}</Text>
            )}
            {customer.phone && <Text style={s.infoText}>{customer.phone}</Text>}
            {customer.email && <Text style={s.infoText}>{customer.email}</Text>}
          </View>
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Order Details</Text>
            <Text style={s.infoName}>{orderNumber}</Text>
            <Text style={s.infoText}>Created {fmtDate(data.createdAt)}</Text>
            {data.promisedDate && (
              <Text style={s.infoText}>Promised {fmtDate(data.promisedDate)}</Text>
            )}
          </View>
        </View>

        {/* ── Payments Table ───────────────────────────────────────────── */}
        <View style={s.table}>
          {/* Table header */}
          <View style={s.thead}>
            <Text style={[s.theadCell, s.colDate]}>Date Received</Text>
            <Text style={[s.theadCell, s.colMethod]}>Method</Text>
            <Text style={[s.theadCell, s.colRef]}>Reference</Text>
            <Text style={[s.theadCell, s.colAmt]}>Amount</Text>
          </View>

          {/* Rows */}
          {payments.length === 0 ? (
            <View style={s.trow}>
              <Text style={[s.tcell, { color: MUTED, flex: 1 }]}>No payments recorded</Text>
            </View>
          ) : (
            payments.map((p, i) => (
              <View key={p.paymentNumber} style={[s.trow, i % 2 === 1 ? s.trowAlt : {}]}>
                {/* Date — prominent, slightly bolder */}
                <Text style={[s.tcell, s.colDate, { fontFamily: "Helvetica-Bold" }]}>
                  {fmtDate(p.receivedAt)}
                </Text>
                <Text style={[s.tcell, s.colMethod]}>{fmtMethod(p.method)}</Text>
                <Text style={[s.tcell, s.colRef, { color: p.reference ? DARK : MUTED }]}>
                  {p.reference || "—"}
                </Text>
                <Text style={[s.tcell, s.colAmt]}>{usd(p.amount)}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Totals ───────────────────────────────────────────────────── */}
        <View style={s.totalsWrap}>
          <View style={s.totalRow}>
            <Text style={s.tlabel}>Order Total</Text>
            <Text style={s.tvalue}>{usd(total)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.tlabel}>Total Received</Text>
            <Text style={s.tvalue}>{usd(actualPaid)}</Text>
          </View>
          <View style={s.divLine} />
          <View style={s.totalRow}>
            <Text style={[s.tlabel, s.balLabel]}>Balance Remaining</Text>
            <Text style={[s.tvalue, s.balValue]}>{usd(balance)}</Text>
          </View>
        </View>

        {/* ── Thank you ────────────────────────────────────────────────── */}
        <Text style={s.thankYou}>
          {balance <= 0
            ? "Your order is fully paid. Thank you for your business!"
            : `Thank you for your payment. A balance of ${usd(balance)} remains before collection/delivery.`}
        </Text>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <View style={s.footer}>
          {company.footerText && <Text style={s.footerText}>{company.footerText}</Text>}
          <Text style={s.footerText}>
            {[company.name, company.phone, company.email].filter(Boolean).join(" · ")}
          </Text>
          <Text style={s.footerText}>Generated {fmtDate(generatedAt)}</Text>
        </View>

      </Page>
    </Document>
  );
}
