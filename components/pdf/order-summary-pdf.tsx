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
  badgeText:   { fontFamily: "Helvetica-Bold", fontSize: 11, color: "#fff", letterSpacing: 1 },
  docRef:      { fontSize: 8, color: MUTED, marginBottom: 1 },
  docRefVal:   { fontSize: 9, color: DARK, fontFamily: "Helvetica-Bold", marginBottom: 4 },

  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 20 },

  // Meta grid
  metaGrid:  { flexDirection: "row", marginBottom: 20 },
  metaBox:   { flex: 1, paddingRight: 12 },
  metaLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  metaVal:   { fontSize: 9, color: DARK, marginBottom: 1 },
  metaName:  { fontFamily: "Helvetica-Bold", fontSize: 10, color: DARK, marginBottom: 2 },

  // Section header
  sectionTitle: {
    fontFamily: "Helvetica-Bold", fontSize: 8, color: MUTED,
    textTransform: "uppercase", letterSpacing: 0.8,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    paddingBottom: 4, marginBottom: 10,
  },

  // Item card
  itemCard:   { borderWidth: 1, borderColor: BORDER, borderRadius: 6, marginBottom: 12, overflow: "hidden" },
  itemHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    backgroundColor: LIGHT, paddingVertical: 7, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  itemHeaderLeft: { flex: 1, paddingRight: 10 },
  itemNum:    { fontSize: 7.5, color: MUTED, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  itemName:   { fontFamily: "Helvetica-Bold", fontSize: 11, color: DARK },
  itemPriceBox: { alignItems: "flex-end" },
  itemQtyPrice: { fontSize: 8.5, color: MUTED },
  itemTotal:  { fontFamily: "Helvetica-Bold", fontSize: 11, color: DARK, marginTop: 1 },

  itemBody:   { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12 },
  itemSpecs:  { flex: 1 },
  specGrid:   { flexDirection: "row", flexWrap: "wrap" },
  specItem:   { width: "50%", marginBottom: 6 },
  specLabel:  { fontSize: 7.5, color: MUTED, marginBottom: 1 },
  specVal:    { fontSize: 9, color: DARK },
  colorDot:   { fontSize: 8.5, color: DARK, marginRight: 6, marginBottom: 2 },
  colorRow:   { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },

  // Design image in item
  designBox:  { width: 80, marginLeft: 12, alignItems: "center" },
  designImg:  { width: 80, height: 64, borderRadius: 4, objectFit: "cover" },
  designLbl:  { fontSize: 6.5, color: MUTED, marginTop: 3, textAlign: "center" },

  // Financial summary
  finWrap:  { backgroundColor: LIGHT, borderWidth: 1, borderColor: BORDER, borderRadius: 6, padding: 14, marginBottom: 16 },
  finRow:   { flexDirection: "row", marginBottom: 4 },
  finLabel: { flex: 1, fontSize: 9, color: MUTED },
  finValue: { fontSize: 9, color: DARK, textAlign: "right" },
  finLine:  { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 6 },
  finBold:  { fontFamily: "Helvetica-Bold", color: DARK },
  finOrange:{ fontFamily: "Helvetica-Bold", color: ORANGE },

  // Notes
  notesBox:  { marginBottom: 16 },
  notesText: { fontSize: 8.5, color: DARK, fontFamily: "Helvetica-Oblique" },

  // Signature
  sigRow:   { flexDirection: "row", marginTop: 16, marginBottom: 20 },
  sigBox:   { flex: 1, paddingRight: 20 },
  sigLine:  { borderBottomWidth: 1, borderBottomColor: DARK, marginBottom: 4 },
  sigLabel: { fontSize: 7.5, color: MUTED },

  // Footer with QR
  footer:      { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, marginTop: "auto", flexDirection: "row", alignItems: "flex-end" },
  footerLeft:  { flex: 1 },
  footerText:  { fontSize: 7.5, color: MUTED, marginBottom: 2 },
  qrBox:       { alignItems: "center", marginLeft: 16 },
  qrImg:       { width: 52, height: 52 },
  qrLabel:     { fontSize: 6, color: MUTED, marginTop: 2, textAlign: "center" },
});

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderSummaryPdf({ data }: { data: OrderPdfPayload }) {
  const {
    company, customer, orderNumber,
    items, total, depositRequired, actualPaid, balance,
    createdAt, promisedDate, notes, generatedAt, qrCodeDataUrl,
  } = data;

  const coLocation = [company.address, company.city, company.country].filter(Boolean).join(", ");

  return (
    <Document title={`Order Summary — ${orderNumber}`} author={company.name}>
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
          </View>
          <View style={s.headerRight}>
            <View style={s.badge}>
              <Text style={s.badgeText}>ORDER SUMMARY</Text>
            </View>
            <Text style={s.docRef}>Order Number</Text>
            <Text style={s.docRefVal}>{orderNumber}</Text>
            <Text style={s.docRef}>Generated</Text>
            <Text style={s.docRefVal}>{fmtDate(generatedAt)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Meta grid ───────────────────────────────────────────────── */}
        <View style={s.metaGrid}>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Customer</Text>
            <Text style={s.metaName}>{customer.name}</Text>
            {customer.phone && <Text style={s.metaVal}>{customer.phone}</Text>}
            {customer.email && <Text style={s.metaVal}>{customer.email}</Text>}
            {(customer.address || customer.city) && (
              <Text style={s.metaVal}>{[customer.address, customer.city].filter(Boolean).join(", ")}</Text>
            )}
          </View>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Dates</Text>
            <Text style={s.metaVal}>Created: {fmtDate(createdAt)}</Text>
            {promisedDate
              ? <Text style={[s.metaVal, { color: ORANGE, fontFamily: "Helvetica-Bold" }]}>Promised: {fmtDate(promisedDate)}</Text>
              : <Text style={[s.metaVal, { color: MUTED }]}>Promised: Not set</Text>}
          </View>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Summary</Text>
            <Text style={s.metaVal}>{items.length} item{items.length !== 1 ? "s" : ""}</Text>
            <Text style={s.metaVal}>Total: {usd(total)}</Text>
            {actualPaid > 0 && <Text style={s.metaVal}>Paid: {usd(actualPaid)}</Text>}
          </View>
        </View>

        {/* ── Items ───────────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Order Items</Text>

        {items.map((item, i) => (
          <View key={i} style={s.itemCard}>
            {/* Card header */}
            <View style={s.itemHeader}>
              <View style={s.itemHeaderLeft}>
                <Text style={s.itemNum}>Item {i + 1}</Text>
                <Text style={s.itemName}>{item.rugName}</Text>
              </View>
              <View style={s.itemPriceBox}>
                {item.quantity > 1 && (
                  <Text style={s.itemQtyPrice}>{item.quantity} × {usd(item.unitPrice)}</Text>
                )}
                <Text style={s.itemTotal}>{usd(item.lineTotal)}</Text>
              </View>
            </View>

            {/* Card body: specs + design image */}
            <View style={s.itemBody}>
              <View style={s.itemSpecs}>
                <View style={s.specGrid}>
                  <View style={s.specItem}>
                    <Text style={s.specLabel}>Dimensions</Text>
                    <Text style={s.specVal}>{item.widthCm} × {item.heightCm} cm</Text>
                  </View>
                  <View style={s.specItem}>
                    <Text style={s.specLabel}>Area</Text>
                    <Text style={s.specVal}>{((item.widthCm * item.heightCm) / 10000).toFixed(2)} m²</Text>
                  </View>
                  <View style={s.specItem}>
                    <Text style={s.specLabel}>Shape</Text>
                    <Text style={s.specVal}>{fmtShape(item.shape)}</Text>
                  </View>
                  <View style={s.specItem}>
                    <Text style={s.specLabel}>Complexity</Text>
                    <Text style={s.specVal}>{fmtComplexity(item.complexity)}</Text>
                  </View>
                  <View style={s.specItem}>
                    <Text style={s.specLabel}>Quantity</Text>
                    <Text style={s.specVal}>{item.quantity}</Text>
                  </View>
                  <View style={s.specItem}>
                    <Text style={s.specLabel}>Unit Price</Text>
                    <Text style={s.specVal}>{usd(item.unitPrice)}</Text>
                  </View>
                </View>
                {item.colors.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={s.specLabel}>Colors</Text>
                    <View style={s.colorRow}>
                      {item.colors.map((c, j) => (
                        <Text key={j} style={s.colorDot}>• {c}</Text>
                      ))}
                    </View>
                  </View>
                )}
                {item.description && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={s.specLabel}>Notes</Text>
                    <Text style={[s.specVal, { fontFamily: "Helvetica-Oblique", color: MUTED }]}>
                      {item.description}
                    </Text>
                  </View>
                )}
              </View>

              {/* Design image */}
              {item.designFileUrl && (
                <View style={s.designBox}>
                  <Image src={item.designFileUrl} style={s.designImg} />
                  <Text style={s.designLbl}>Design Reference</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {/* ── Financial Summary ─────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Financial Summary</Text>
        <View style={s.finWrap}>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Order Total</Text>
            <Text style={s.finValue}>{usd(total)}</Text>
          </View>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Deposit Required</Text>
            <Text style={s.finValue}>{usd(depositRequired)}</Text>
          </View>
          {actualPaid > 0 && (
            <View style={s.finRow}>
              <Text style={s.finLabel}>Amount Received</Text>
              <Text style={s.finValue}>{usd(actualPaid)}</Text>
            </View>
          )}
          <View style={s.finLine} />
          <View style={s.finRow}>
            <Text style={[s.finLabel, balance <= 0 ? s.finBold : s.finOrange]}>
              {balance <= 0 ? "Fully Paid" : "Balance Due"}
            </Text>
            <Text style={[s.finValue, balance <= 0 ? s.finBold : s.finOrange]}>
              {usd(balance)}
            </Text>
          </View>
        </View>

        {/* ── Notes ────────────────────────────────────────────────── */}
        {notes && (
          <View style={s.notesBox}>
            <Text style={s.sectionTitle}>Order Notes</Text>
            <Text style={s.notesText}>{notes}</Text>
          </View>
        )}

        {/* ── Signature Lines ───────────────────────────────────────── */}
        <View style={s.sigRow}>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Confirmed by (Customer)</Text>
          </View>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Date</Text>
          </View>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Production Staff</Text>
          </View>
        </View>

        {/* ── Footer with QR ─────────────────────────────────────── */}
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
