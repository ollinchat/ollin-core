"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useFinance } from "@/contexts/FinanceContext";
import { useBilling } from "@/contexts/BillingContext";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { useContacts } from "@/contexts/ContactsContext";
import type { FinanceClient, TaxInvoice } from "@/lib/finance-types";
import type { BillingDocument, BillingExpense } from "@/modules/billing/types";
import { ChevronLeft, FileText, Receipt, FileStack, Plus, Package, Fingerprint, UserPlus, DollarSign, TrendingUp, Download, Trash2, ChevronDown, X, Loader2, MoreVertical, Share2, Settings, Upload, Camera, Search, SlidersHorizontal, Check } from "lucide-react";
import { DocumentCard } from "@/components/finances/DocumentCard";
import type { Quote, DeliveryNote, LineItem } from "@/lib/finance-types";
import { getNextNumberPreview } from "@/lib/document-numbering";
import type { BillingClient, BillingLineItem } from "@/modules/billing/types";
import { TAX_INVOICE_HEADER_EN, TAX_INVOICE_HEADER_HE, QUOTE_HEADER_EN, QUOTE_HEADER_HE, DELIVERY_NOTE_HEADER_EN, DELIVERY_NOTE_HEADER_HE, DEFAULT_VAT_RATE } from "@/lib/finance-types";
import { LiveDocumentEditor } from "@/components/finances/LiveDocumentEditor";
import { generateUUID } from "@/lib/uuid";

function openInvoicePdf(inv: TaxInvoice, companyName: string, signatureDataUrl?: string, locale: "en" | "he" = "en") {
  const title = locale === "he" ? TAX_INVOICE_HEADER_HE : TAX_INVOICE_HEADER_EN;
  const clientLabel = locale === "he" ? "לקוח" : "Client";
  const descLabel = locale === "he" ? "תיאור" : "Description";
  const qtyLabel = locale === "he" ? "כמות" : "Qty";
  const priceLabel = locale === "he" ? "מחיר" : "Price";
  const totalLabel = locale === "he" ? "סה\"כ" : "Total";
  const subtotalLabel = locale === "he" ? "סיכום ביניים" : "Subtotal";
  const dueLabel = locale === "he" ? "תאריך פירעון" : "Due";
  const dateLabel = locale === "he" ? "תאריך" : "Date";
  const sigLabel = locale === "he" ? "חתימה" : "Authorized signature";
  const rows = inv.items.map((i) => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>${i.unitPrice.toFixed(2)}</td><td>${(i.quantity * i.unitPrice).toFixed(2)}</td></tr>`).join("");
  const signatureHtml = signatureDataUrl
    ? `<div style="margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e7eb;"><p style="font-size:0.75rem;color:#6b7280;">${sigLabel}</p><img src="${signatureDataUrl}" alt="Signature" style="max-width:180px;height:auto;" /></div>`
    : "";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} #${inv.number}</title><style>body{font-family:system-ui,sans-serif;padding:24px;max-width:600px;margin:0 auto;} h1{color:#008080;} table{width:100%;border-collapse:collapse;} th,td{border-bottom:1px solid #eee;padding:8px 0;} th{text-align:left;color:#6b7280;font-weight:500;}</style></head><body><h1>${title}</h1><p style="color:#6b7280;">#${inv.number}</p><p><strong>${companyName}</strong></p><p>${clientLabel}: ${inv.clientName}</p><p>${dateLabel}: ${inv.date}${inv.dueDate ? ` · ${dueLabel}: ${inv.dueDate}` : ""}</p><table><thead><tr><th>${descLabel}</th><th>${qtyLabel}</th><th>${priceLabel}</th><th>${totalLabel}</th></tr></thead><tbody>${rows}</tbody></table><p>${subtotalLabel}: ${inv.subtotal.toFixed(2)} · VAT ${inv.vatRate}%: ${inv.vatAmount.toFixed(2)} · <strong>${totalLabel}: ${inv.total.toFixed(2)}</strong></p>${signatureHtml}</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 300);
}

function openQuotePdf(q: Quote, companyName: string, locale: "en" | "he" = "en") {
  const title = locale === "he" ? QUOTE_HEADER_HE : QUOTE_HEADER_EN;
  const clientLabel = locale === "he" ? "לקוח" : "Client";
  const descLabel = locale === "he" ? "תיאור" : "Description";
  const qtyLabel = locale === "he" ? "כמות" : "Qty";
  const priceLabel = locale === "he" ? "מחיר" : "Price";
  const totalLabel = locale === "he" ? "סה\"כ" : "Total";
  const subtotalLabel = locale === "he" ? "סיכום ביניים" : "Subtotal";
  const dateLabel = locale === "he" ? "תאריך" : "Date";
  const rows = q.items.map((i) => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>${i.unitPrice.toFixed(2)}</td><td>${(i.quantity * i.unitPrice).toFixed(2)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} #${q.number}</title><style>body{font-family:system-ui,sans-serif;padding:24px;max-width:600px;margin:0 auto;} h1{color:#008080;} table{width:100%;border-collapse:collapse;} th,td{border-bottom:1px solid #eee;padding:8px 0;}</style></head><body><h1>${title}</h1><p style="color:#6b7280;">#${q.number}</p><p><strong>${companyName}</strong></p><p>${clientLabel}: ${q.clientName}</p><p>${dateLabel}: ${q.date}</p><table><thead><tr><th>${descLabel}</th><th>${qtyLabel}</th><th>${priceLabel}</th><th>${totalLabel}</th></tr></thead><tbody>${rows}</tbody></table><p>${subtotalLabel}: ${q.subtotal.toFixed(2)} · VAT ${q.vatRate}%: ${q.vatAmount.toFixed(2)} · <strong>${totalLabel}: ${q.total.toFixed(2)}</strong></p></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
}

function getClientType(clients: FinanceClient[], clientId: string): "company" | "private" | "other" {
  const c = clients.find((x) => x.id === clientId);
  if (c?.clientType === "private") return "private";
  if (c?.clientType === "company") return "company";
  return "other";
}

function companyDisplayName(profile: { name?: string; nameEn?: string; nameHe?: string }, locale: "en" | "he"): string {
  if (locale === "he" && profile.nameHe) return profile.nameHe;
  if (profile.nameEn) return profile.nameEn;
  return profile.name || "Company";
}

const TEAL = "#008080";

type TabId = "quotes" | "invoices" | "receipts" | "delivery_notes" | "cancellations" | "expenses";
type CreateModalType = "quote" | "invoice" | "receipt" | "delivery_note" | "credit_note" | "expense";
type UiStatus = "draft" | "pending" | "paid" | "canceled" | "overdue";

function docTypeLabel(t: BillingDocument["type"]): string {
  if (t === "invoice") return "Invoice";
  if (t === "quote") return "Quote";
  if (t === "receipt") return "Receipt";
  if (t === "delivery_note") return "Delivery Note";
  if (t === "credit_note") return "Credit Note";
  if (t === "negative_receipt") return "Negative Receipt";
  return "Draft";
}

function formatMoney(n: number): string {
  if (typeof n !== "number" || Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
}

/** Optional: convert integer part to words for "Total in Words" (English). */
function numberToWordsEn(n: number): string {
  if (n <= 0 || n >= 10000) return "";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n < 10) return ones[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numberToWordsEn(n % 100) : "");
  return numberToWordsEn(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numberToWordsEn(n % 1000) : "");
}

function StatusBadge({ status }: { status: UiStatus }) {
  const cls =
    status === "paid"
      ? "bg-green-100/70 text-green-700 font-semibold"
      : status === "overdue"
        ? "bg-red-100/60 text-red-700 font-semibold"
        : status === "pending"
          ? "bg-amber-100/60 text-amber-700 font-semibold"
          : status === "canceled"
            ? "bg-gray-100/80 text-gray-600 font-medium"
            : "bg-gray-100/70 text-gray-700 font-medium";
  const label = status === "overdue" ? "Overdue" : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${cls}`}>{label}</span>;
}

function docDateIso(doc: BillingDocument): string {
  if (doc.date && /^\d{4}-\d{2}-\d{2}$/.test(doc.date)) return doc.date;
  return new Date(doc.createdAt || Date.now()).toISOString().slice(0, 10);
}

function expenseDateIso(e: BillingExpense): string {
  if (e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)) return e.date;
  return new Date(e.createdAt || Date.now()).toISOString().slice(0, 10);
}

function getInvoiceUiStatus(doc: BillingDocument, todayIso: string): UiStatus {
  const s = doc.status as UiStatus;
  if (doc.type !== "invoice") return s;
  if (s === "paid" || s === "canceled" || s === "draft") return s;
  if (s === "pending" && doc.dueDate && doc.dueDate < todayIso) return "overdue";
  return "pending";
}

/** Elite document template – luxury invoice look: grid header, notes, bank, signature */
function UnifiedDocumentPreview({
  company,
  client,
  items,
  subtotal,
  vatAmount,
  total,
  currencySymbol,
  docNumber,
  docType,
  language,
  compact,
  date,
  dueDate,
  totalInWords,
  vatRate = 17,
  title,
  notes,
  bankDetails,
  creditForInvoiceNumber,
  originalReceiptNumber,
  isCanceled,
}: {
  company: { name: string; address?: string; taxId?: string; logoUrl?: string; signatureUrl?: string };
  client: { name: string; email?: string; phone?: string; address?: string; taxId?: string };
  items: { description: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  vatAmount: number;
  total: number;
  currencySymbol: string;
  docNumber?: string;
  docType?: BillingDocument["type"];
  language: "he" | "en" | "both";
  compact?: boolean;
  date?: string;
  dueDate?: string;
  totalInWords?: string;
  vatRate?: number;
  title?: string;
  notes?: string;
  bankDetails?: { bankName?: string; branchNumber?: string; accountNumber?: string; iban?: string; swift?: string; bitLink?: string };
  creditForInvoiceNumber?: string;
  originalReceiptNumber?: string;
  isCanceled?: boolean;
}) {
  const lang = language === "both" ? "en" : language;
  const L = {
    from: lang === "he" ? "מהחברה" : "From",
    to: lang === "he" ? "אל" : "To",
    client: lang === "he" ? "לקוח" : "Client",
    description: lang === "he" ? "תיאור" : "Description",
    price: lang === "he" ? "מחיר" : "Price",
    qty: lang === "he" ? "כמות" : "Qty",
    vat: lang === "he" ? "מע\"מ" : "VAT",
    lineTotal: lang === "he" ? "סה\"כ" : "Total",
    subtotal: lang === "he" ? "סיכום ביניים (ללא מע\"מ)" : "Sub-total (Excl. VAT)",
    vatBase: lang === "he" ? "בסיס לחישוב מע\"מ" : "VAT base",
    vatRateLabel: (rate: number) => (lang === "he" ? `מע\"מ (${rate}%)` : `VAT (${rate}%)`),
    grandTotal: lang === "he" ? "סה\"כ כולל" : "Grand Total",
    taxId: lang === "he" ? "ח.פ" : "Tax ID",
    docDate: lang === "he" ? "תאריך" : "Date",
    dueDateLabel: lang === "he" ? "תאריך פירעון" : "Due Date",
    totalInWordsLabel: lang === "he" ? "סכום במלים" : "Total in Words",
    signature: lang === "he" ? "חתימה" : "Signature",
    notesLabel: lang === "he" ? "הערות" : "Comments / Notes",
    bankInfo: lang === "he" ? "פרטי בנק" : "Bank Information",
    bankName: lang === "he" ? "שם הבנק" : "Bank Name",
    branch: lang === "he" ? "סניף" : "Branch",
    account: lang === "he" ? "חשבון" : "Account",
  };
  const docTypeLabel =
    docType === "invoice" ? (lang === "he" ? "חשבונית" : "Invoice")
    : docType === "quote" ? (lang === "he" ? "הצעת מחיר" : "Quote")
    : docType === "delivery_note" ? (lang === "he" ? "תעודת משלוח" : "Delivery Note")
    : docType === "credit_note" ? (lang === "he" ? "מסמך זיכוי" : "Credit Note")
    : docType === "negative_receipt" ? (lang === "he" ? "קבלה שלילית" : "Negative Receipt")
    : docType ?? "";
  const scale = compact ? "scale-90 origin-top" : "";
  const textSize = compact ? "text-xs" : "text-sm";
  const textSizeSmall = compact ? "text-[10px]" : "text-xs";
  const hasBank = bankDetails && (bankDetails.bankName || bankDetails.branchNumber || bankDetails.accountNumber || bankDetails.iban || bankDetails.swift || bankDetails.bitLink);
  const formatAmount = (n: number) => (n < 0 ? `-${currencySymbol}${formatMoney(-n)}` : `${currencySymbol}${formatMoney(n)}`);
  return (
    <div
      className={`relative bg-white rounded-none border border-gray-200 overflow-hidden ${compact ? "shadow-md max-w-[420px]" : "shadow-xl max-w-[595px]"} ${scale}`}
      style={{ fontFamily: "Inter, var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
    >
      {isCanceled && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" aria-hidden>
          <span className="text-red-600 font-black text-4xl md:text-5xl uppercase tracking-widest opacity-90 rotate-[-12deg]" style={{ textShadow: "0 0 2px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.2)", border: "4px solid rgb(220 38 38)", padding: "0.5rem 1.5rem" }}>
            {lang === "he" ? "מבוטל" : "CANCELLED"}
          </span>
        </div>
      )}
      <div className={compact ? "p-3" : "p-8"}>
        {/* Single row: From (Sender) | To (Recipient) – Israeli standard */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mb-8 border-b border-gray-200 pb-6 ${compact ? "mb-5 pb-4" : ""}`}>
          <div>
            {company.logoUrl && (
              <div className="mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={company.logoUrl} alt="" className={`${compact ? "h-10" : "h-12"} w-auto object-contain`} />
              </div>
            )}
            <p className={`text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1`}>{L.from}</p>
            <p className={`font-semibold text-gray-900 ${compact ? "text-sm" : "text-base"}`}>{company.name}</p>
            {company.address && <p className={`text-gray-600 ${textSize} mt-0.5 leading-snug`}>{company.address}</p>}
            {company.taxId && <p className={`text-gray-500 ${textSize} mt-0.5`}>{L.taxId}: {company.taxId}</p>}
          </div>
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1`}>{L.to}</p>
            <p className={`font-semibold text-gray-900 ${compact ? "text-sm" : "text-base"}`}>{client.name}</p>
            {client.email && <p className={`text-gray-600 ${textSize}`}>{client.email}</p>}
            {client.phone && <p className={`text-gray-600 ${textSize}`}>{client.phone}</p>}
            {client.address && <p className={`text-gray-600 ${textSize}`}>{client.address}</p>}
            {client.taxId && <p className={`text-gray-500 ${textSize}`}>{L.taxId}: {client.taxId}</p>}
          </div>
        </div>

        {/* Doc type, number, date, title – minimal header */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
          {docType && <span className={`font-semibold ${compact ? "text-sm" : "text-base"}`} style={{ color: TEAL }}>{docTypeLabel}</span>}
          {docNumber && <span className={`text-gray-600 ${textSizeSmall}`}>#{docNumber}</span>}
          {creditForInvoiceNumber && <span className={`text-gray-600 ${textSizeSmall}`}>{lang === "he" ? `עבור חשבונית #${creditForInvoiceNumber}` : `For Invoice #${creditForInvoiceNumber}`}</span>}
          {originalReceiptNumber && <span className={`text-gray-600 ${textSizeSmall}`}>{lang === "he" ? `עבור קבלה #${originalReceiptNumber}` : `For Receipt #${originalReceiptNumber}`}</span>}
          {date && <span className={`text-gray-500 ${textSizeSmall}`}>{L.docDate}: {date}</span>}
          {dueDate && <span className={`text-gray-500 ${textSizeSmall}`}>{L.dueDateLabel}: {dueDate}</span>}
          {title && title.trim() && <span className={`font-medium text-gray-900 ${textSizeSmall}`}>{title}</span>}
        </div>

        {/* Items table */}
        <table className={`w-full ${textSize} border-collapse`} style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 font-semibold text-gray-700 w-[40%]">{L.description}</th>
              <th className="text-right py-3 font-semibold text-gray-700 w-[15%]">{L.price}</th>
              <th className="text-right py-3 font-semibold text-gray-700 w-[10%]">{L.qty}</th>
              <th className="text-right py-3 font-semibold text-gray-700 w-[15%]">{L.vat}</th>
              <th className="text-right py-3 font-semibold text-gray-700 w-[20%]">{L.lineTotal}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => {
              const lineTotal = i.quantity * i.unitPrice;
              const lineVat = Math.round(lineTotal * (vatRate / 100) * 100) / 100;
              return (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-3 text-gray-900 align-top">{i.description || "—"}</td>
                  <td className="py-3 text-right tabular-nums text-gray-700 align-top">{currencySymbol}{formatMoney(i.unitPrice)}</td>
                  <td className="py-3 text-right tabular-nums text-gray-700 align-top">{i.quantity}</td>
                  <td className="py-3 text-right tabular-nums text-gray-600 align-top">{currencySymbol}{formatMoney(lineVat)}</td>
                  <td className="py-3 text-right tabular-nums text-gray-900 font-medium align-top">{currencySymbol}{formatMoney(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Notes – before totals */}
        {notes && notes.trim() && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className={`text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1`}>{L.notesLabel}</p>
            <p className={`text-gray-700 ${textSize} leading-relaxed whitespace-pre-wrap`}>{notes.trim()}</p>
          </div>
        )}

        {/* Totals */}
        <div className={`mt-6 pt-4 border-t-2 border-gray-200 space-y-2 ${textSize}`}>
          <div className="flex justify-between text-gray-600">
            <span>{L.subtotal}</span>
            <span className="tabular-nums">{formatAmount(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{L.vatBase}</span>
            <span className="tabular-nums">{formatAmount(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{L.vatRateLabel(vatRate)}</span>
            <span className="tabular-nums">{formatAmount(vatAmount)}</span>
          </div>
          <div className="flex justify-between font-bold pt-2 text-gray-900" style={{ color: TEAL }}>
            <span>{L.grandTotal}</span>
            <span className="tabular-nums">{formatAmount(total)}</span>
          </div>
          {totalInWords && totalInWords.trim() && (
            <p className={`pt-2 text-gray-600 italic ${textSizeSmall}`}>{L.totalInWordsLabel}: {totalInWords}</p>
          )}
        </div>

        {/* Footer: Bank details (from company profile) + Signature bottom right */}
        <div className={`mt-10 pt-6 border-t border-gray-200 flex flex-col md:flex-row md:items-end md:justify-between gap-6 ${compact ? "mt-6 pt-4" : ""}`}>
          {hasBank && !compact && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{L.bankInfo}</p>
              {bankDetails!.bankName && <p className={`text-gray-700 ${textSize}`}>{L.bankName}: {bankDetails!.bankName}</p>}
              {(bankDetails!.branchNumber || bankDetails!.accountNumber) && (
                <p className={`text-gray-700 ${textSize}`}>
                  {bankDetails!.branchNumber && <span>{L.branch}: {bankDetails!.branchNumber}</span>}
                  {bankDetails!.branchNumber && bankDetails!.accountNumber && " · "}
                  {bankDetails!.accountNumber && <span>{L.account}: {bankDetails!.accountNumber}</span>}
                </p>
              )}
              {bankDetails!.iban && <p className={`text-gray-700 ${textSize}`}>IBAN: {bankDetails!.iban}</p>}
              {bankDetails!.swift && <p className={`text-gray-700 ${textSize}`}>SWIFT: {bankDetails!.swift}</p>}
              {bankDetails!.bitLink && <p className={`text-gray-700 ${textSize}`}>Payment: {bankDetails!.bitLink}</p>}
            </div>
          )}
          {company.signatureUrl && !compact && (
            <div className="md:ml-auto md:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{L.signature}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={company.signatureUrl} alt="" className="inline-block max-w-[180px] max-h-16 object-contain" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpenseModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (e: Omit<BillingExpense, "id" | "createdAt">) => void;
}) {
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-sm border border-gray-100 shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Add Expense</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-sm text-gray-500 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} className="w-full rounded-sm border border-gray-100 px-3 py-2.5 text-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-sm border border-gray-100 px-3 py-2.5 text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-sm border border-gray-100 px-3 py-2.5 text-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-sm border border-gray-100 px-3 py-2.5 text-gray-900" />
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-sm bg-gray-100 text-gray-700 font-medium">Cancel</button>
          <button
            type="button"
            onClick={() => {
              const amt = parseFloat(amount) || 0;
              onSave({ vendor: vendor.trim() || "Vendor", amount: amt, category: category.trim() || "General", date: date || new Date().toISOString().slice(0, 10) });
              setVendor("");
              setAmount("");
              setCategory("General");
              setDate(new Date().toISOString().slice(0, 10));
              onClose();
            }}
            disabled={!vendor.trim()}
            className="flex-1 py-2.5 rounded-sm text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const VAT_RATE_PCT = 17;

/** Price Excl. VAT → Incl. VAT (+17%) */
function priceExclToIncl(excl: number): number {
  return Math.round((excl * (1 + VAT_RATE_PCT / 100)) * 100) / 100;
}

/** Price Incl. VAT → Excl. VAT (reverse) */
function priceInclToExcl(incl: number): number {
  return Math.round((incl / (1 + VAT_RATE_PCT / 100)) * 100) / 100;
}

/** Line VAT amount from unit price (excl), quantity, discount % */
function lineVatAmount(unitPriceExcl: number, quantity: number, discountPct: number): number {
  const afterDiscount = unitPriceExcl * (1 - discountPct / 100);
  return Math.round(quantity * afterDiscount * (VAT_RATE_PCT / 100) * 100) / 100;
}

/** Line total excl. VAT */
function lineTotalExcl(unitPriceExcl: number, quantity: number, discountPct: number): number {
  return Math.round(quantity * unitPriceExcl * (1 - discountPct / 100) * 100) / 100;
}

type UiLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  confirmed: boolean;
};

function emptyUiLineItem(): UiLineItem {
  return { id: generateUUID(), description: "", quantity: 1, unitPrice: 0, discountPct: 0, confirmed: false };
}

/** World currencies for searchable dropdown (code, symbol, name) */
const CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: "ILS", symbol: "₪", name: "Israeli Shekel" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
];
const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.symbol]));

function NewClientModal({
  open,
  onClose,
  onSave,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (client: BillingClient) => void;
  locale: "en" | "he";
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  if (!open) return null;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      id: generateUUID(),
      name: trimmed,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    setName("");
    setEmail("");
    setPhone("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white border border-gray-200 shadow-xl rounded-none"
        style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            {locale === "he" ? "לקוח חדש" : "New Client"}
          </h3>
          <button type="button" onClick={onClose} className="p-2 rounded-none text-gray-500 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              {locale === "he" ? "שם" : "Name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              {locale === "he" ? "אימייל" : "Email"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              {locale === "he" ? "טלפון" : "Phone"}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]"
            />
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-none border border-gray-200 bg-white text-[13px] font-medium text-gray-700">
            {locale === "he" ? "ביטול" : "Cancel"}
          </button>
          <button type="button" onClick={handleSave} disabled={!name.trim()} className="flex-1 py-2 rounded-none text-white text-[13px] font-semibold disabled:opacity-50" style={{ backgroundColor: TEAL }}>
            {locale === "he" ? "שמור" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

type DocCreateStep = "form" | "preview" | "generated";

function SuccessWithPreview({
  genDoc,
  businessProfile,
  symbol,
  docLang,
  documentLanguage,
  t,
  locale,
  generatedDocId,
  downloadPdf,
  getShareLink,
  getPdfBlob,
  onClose,
  bankDetails,
}: {
  genDoc: BillingDocument | null | undefined;
  businessProfile?: { legalName?: string; taxId?: string; address?: string; businessLogo?: string; signature?: string };
  symbol: string;
  docLang: "he" | "en" | "both";
  documentLanguage?: string;
  t: Record<string, string>;
  locale: "en" | "he";
  generatedDocId: string;
  downloadPdf: (id: string) => void;
  getShareLink: (id: string) => string | null;
  getPdfBlob: (id: string) => Promise<Blob | null>;
  onClose: () => void;
  bankDetails?: { bankName?: string; branchNumber?: string; accountNumber?: string; iban?: string; swift?: string; bitLink?: string };
}) {
  const [linkCopied, setLinkCopied] = useState(false);
  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      const blob = await getPdfBlob(generatedDocId);
      if (blob) {
        const fileName = genDoc ? `${genDoc.type}-${genDoc.number}.pdf` : "document.pdf";
        const file = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: fileName });
            return;
          } catch (err) {
            if ((err as Error).name === "AbortError") return;
          }
        }
      }
    }
    const link = getShareLink(generatedDocId);
    if (link) {
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [generatedDocId, getPdfBlob, getShareLink, genDoc]);
  const totalInWords =
    genDoc && docLang !== "he"
      ? numberToWordsEn(Math.floor(genDoc.total)) + " " + symbol + " only"
      : undefined;
  return (
    <div className="flex flex-col gap-6 p-4 bg-white">
      <div className="flex-1 overflow-y-auto flex justify-center min-h-0">
        {genDoc ? (
          <div className="flex-shrink-0 w-full" style={{ maxWidth: 595 }}>
            <UnifiedDocumentPreview
              company={{
                name: businessProfile?.legalName ?? "",
                address: businessProfile?.address,
                taxId: businessProfile?.taxId,
                logoUrl: businessProfile?.businessLogo,
                signatureUrl: businessProfile?.signature,
              }}
              client={{
                name: genDoc.clientName ?? "",
                email: genDoc.clientEmail,
                phone: genDoc.clientPhone,
                address: genDoc.clientAddress,
                taxId: genDoc.clientTaxId,
              }}
              items={genDoc.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice }))}
              subtotal={genDoc.subtotal}
              vatAmount={genDoc.vatAmount}
              total={genDoc.total}
              currencySymbol={symbol}
              docNumber={genDoc.number}
              docType={genDoc.type}
              language={docLang}
              date={genDoc.date}
              dueDate={genDoc.dueDate}
              totalInWords={totalInWords}
              vatRate={genDoc.vatRate ?? 17}
              title={genDoc.title}
              notes={genDoc.notes}
              bankDetails={(genDoc.type === "invoice" || genDoc.type === "credit_note" || genDoc.type === "negative_receipt") ? bankDetails : undefined}
            />
          </div>
        ) : (
          <p className="text-[13px] text-gray-600">{t.documentCreated}</p>
        )}
      </div>
      <p className="text-center text-[13px] font-semibold text-gray-900">{t.documentCreated}</p>
      <div className="flex flex-col gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => { downloadPdf(generatedDocId); onClose(); }}
          className="w-full py-3 rounded-none border border-gray-200 bg-white text-gray-700 font-medium text-[13px]"
        >
          {t.downloadPdf}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3 rounded-none text-white font-semibold text-[13px]"
          style={{ backgroundColor: TEAL }}
        >
          {linkCopied ? (locale === "he" ? "הועתק!" : "Copied!") : (locale === "he" ? "שיתוף" : "Share")}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2.5 rounded-none border border-gray-200 bg-gray-50 text-gray-700 font-medium text-[13px]">
          {locale === "he" ? "סגור" : "Close"}
        </button>
      </div>
    </div>
  );
}

function DocumentCreateSlideOver({
  open,
  type,
  title,
  docNumberPreview,
  documentLanguage,
  bankDetails,
  businessProfile,
  clientOptions: initialClientOptions,
  locale,
  onClose,
  onSubmit,
  isSubmitting,
  downloadPdf,
  getShareLink,
  getPdfBlob,
  documents,
}: {
  open: boolean;
  type: "quote" | "invoice" | "delivery_note";
  title: string;
  docNumberPreview: string;
  documentLanguage?: string;
  bankDetails?: { bankName?: string; branchNumber?: string; accountNumber?: string; iban?: string; swift?: string; bitLink?: string };
  businessProfile?: { legalName?: string; taxId?: string; address?: string; businessLogo?: string; signature?: string };
  clientOptions: BillingClient[];
  locale: "en" | "he";
  onClose: () => void;
  onSubmit: (client: BillingClient, items: BillingLineItem[], notes?: string, title?: string) => Promise<string | null>;
  isSubmitting: boolean;
  downloadPdf: (docId: string) => void;
  getShareLink: (docId: string) => string | null;
  getPdfBlob: (docId: string) => Promise<Blob | null>;
  documents?: BillingDocument[];
}) {
  const [localClients, setLocalClients] = useState<BillingClient[]>([]);
  const clientOptions = useMemo(() => [...initialClientOptions, ...localClients], [initialClientOptions, localClients]);
  const [selectedClient, setSelectedClient] = useState<BillingClient | null>(null);
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClientFields, setNewClientFields] = useState({ name: "", email: "", phone: "", address: "", taxId: "" });
  const [lineItems, setLineItems] = useState<UiLineItem[]>([emptyUiLineItem()]);
  const [notes, setNotes] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [autoSendPdf, setAutoSendPdf] = useState(true);
  const [currency, setCurrency] = useState("ILS");
  const [currencySearch, setCurrencySearch] = useState("");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [step, setStep] = useState<DocCreateStep>("form");
  const [generatedDocId, setGeneratedDocId] = useState<string | null>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!currencyOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setCurrencyOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [currencyOpen]);
  const filteredCurrencies = useMemo(
    () =>
      CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
          c.symbol.includes(currencySearch) ||
          c.name.toLowerCase().includes(currencySearch.toLowerCase())
      ),
    [currencySearch]
  );
  const effectiveClient = useMemo((): BillingClient | null => {
    if (newClientMode) {
      const { name, email, phone, address, taxId } = newClientFields;
      if (!name.trim()) return null;
      return { id: "new", name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, address: address.trim() || undefined, taxId: taxId.trim() || undefined };
    }
    return selectedClient;
  }, [newClientMode, newClientFields, selectedClient]);

  const addLine = useCallback(() => setLineItems((p) => [...p, emptyUiLineItem()]), []);
  const removeLine = useCallback((id: string) => setLineItems((p) => (p.length <= 1 ? p : p.filter((i) => i.id !== id))), []);

  const updateLine = useCallback((id: string, patch: Partial<UiLineItem>) => {
    setLineItems((p) =>
      p.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, ...patch };
        if ("unitPrice" in patch || "quantity" in patch || "discountPct" in patch || "description" in patch) next.confirmed = false;
        return next;
      })
    );
  }, []);

  const setExclFromIncl = useCallback((id: string, inclValue: number) => {
    const excl = priceInclToExcl(inclValue);
    updateLine(id, { unitPrice: excl });
  }, [updateLine]);

  const setInclFromExcl = useCallback((id: string, exclValue: number) => {
    updateLine(id, { unitPrice: exclValue });
  }, [updateLine]);

  const confirmRow = useCallback((id: string) => {
    setLineItems((p) => p.map((i) => (i.id === id ? { ...i, confirmed: true } : i)));
  }, []);

  const allConfirmed = useMemo(() => lineItems.every((i) => i.confirmed), [lineItems]);
  const canGoToPreview = effectiveClient && allConfirmed && !isSubmitting;

  const { subtotal, vatAmount, total } = useMemo(() => {
    let st = 0;
    lineItems.forEach((i) => {
      st += lineTotalExcl(i.unitPrice, i.quantity, i.discountPct);
    });
    st = Math.round(st * 100) / 100;
    const vat = Math.round(st * (VAT_RATE_PCT / 100) * 100) / 100;
    return { subtotal: st, vatAmount: vat, total: st + vat };
  }, [lineItems]);

  const buildPayload = useCallback(() => {
    if (!effectiveClient) return null;
    const normalized: BillingLineItem[] = lineItems.map((i) => ({
      id: i.id || generateUUID(),
      description: i.description.trim() || "Item",
      quantity: Math.max(0, Number(i.quantity)),
      unitPrice: Math.round(i.unitPrice * (1 - i.discountPct / 100) * 100) / 100,
    }));
    return {
      client: effectiveClient,
      items: normalized.length > 0 ? normalized : [{ id: generateUUID(), description: "Item", quantity: 1, unitPrice: 0 }],
      notes: notes.trim() || undefined,
      title: documentTitle.trim() || undefined,
    };
  }, [effectiveClient, lineItems, notes, documentTitle]);

  const handleGenerate = useCallback(async () => {
    const payload = buildPayload();
    if (!payload) return;
    const docId = await onSubmit(payload.client, payload.items, payload.notes, payload.title);
    if (docId) {
      setGeneratedDocId(docId);
      setStep("generated");
    }
  }, [buildPayload, onSubmit]);

  const symbol = CURRENCY_SYMBOLS[currency] ?? "₪";

  if (!open) return null;

  const t = {
    docNumber: locale === "he" ? "מס׳ מסמך" : "Document Number",
    docLanguage: locale === "he" ? "שפת מסמך" : "Document Language",
    bankDetails: locale === "he" ? "פרטי בנק" : "Bank Details",
    bankName: locale === "he" ? "שם הבנק" : "Bank Name",
    client: locale === "he" ? "לקוח" : "Client",
    newClient: locale === "he" ? "לקוח חדש" : "New Client",
    selectClient: locale === "he" ? "בחר לקוח" : "Select client",
    email: locale === "he" ? "אימייל" : "Email",
    phone: locale === "he" ? "טלפון" : "Phone",
    address: locale === "he" ? "כתובת" : "Address",
    businessId: locale === "he" ? "ח.פ" : "Business ID",
    autoSend: locale === "he" ? "שלח אוטומטית PDF למייל הלקוח בשמירה" : "Automatically send PDF to client email on Save",
    lineItems: locale === "he" ? "פריטים" : "Line Items",
    addLine: locale === "he" ? "הוסף שורה" : "Add line",
    description: locale === "he" ? "תיאור" : "Description",
    qty: locale === "he" ? "כמות" : "Qty",
    discount: locale === "he" ? "הנחה" : "Discount",
    priceExcl: locale === "he" ? "מחיר ללא מע\"מ" : "Price Excl. VAT",
    priceIncl: locale === "he" ? "מחיר כולל מע\"מ" : "Price Incl. VAT",
    vatLabel: locale === "he" ? "מע\"מ" : "VAT",
    confirm: locale === "he" ? "אישור" : "Confirm",
    subtotal: locale === "he" ? "סיכום ביניים (ללא מע\"מ)" : "Sub-total (Excl. VAT)",
    vatAmountLabel: locale === "he" ? "סכום מע\"מ (17%)" : "VAT Amount (17%)",
    grandTotal: locale === "he" ? "סה\"כ כולל" : "Grand Total",
    total: locale === "he" ? "סה\"כ" : "Total",
    documentDate: locale === "he" ? "תאריך מסמך" : "Document Date",
    dueDate: locale === "he" ? "לתשלום עד" : "Due Date",
    notes: locale === "he" ? "הערות" : "Notes",
    cancel: locale === "he" ? "ביטול" : "Cancel",
    create: locale === "he" ? "צור" : "Create",
    creating: locale === "he" ? "יוצר…" : "Creating…",
    preview: locale === "he" ? "תצוגה מקדימה" : "Preview",
    generateDoc: locale === "he" ? "הפק מסמך" : "Generate Document",
    downloadPdf: locale === "he" ? "הורד PDF" : "Download PDF",
    sendToClient: locale === "he" ? "שלח ללקוח" : "Send to Client",
    documentCreated: locale === "he" ? "המסמך נוצר בהצלחה" : "Document created successfully",
    newDocTitle: locale === "he" ? "הפקת מסמך חדש" : "New Document",
  };

  return (
    <>
      <div className="fixed inset-0 z-[110] flex justify-end bg-black/40" onClick={onClose}>
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.25 }}
          className="w-full max-w-lg bg-white border-l border-gray-200 shadow-xl flex flex-col max-h-screen rounded-none"
          style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 flex-shrink-0">
            <h2 className="font-bold text-gray-900 text-lg truncate">{t.newDocTitle}</h2>
            <div className="flex items-center gap-2 shrink-0">
              {step === "form" && (
                <div className="relative w-[100px]" ref={currencyRef}>
                  <button
                    type="button"
                    onClick={() => setCurrencyOpen((o) => !o)}
                    className="w-full flex items-center justify-between gap-1 rounded-none border border-gray-200 bg-white px-2 py-1.5 text-[12px] text-gray-900"
                  >
                    <span>{CURRENCY_SYMBOLS[currency] ?? "₪"}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${currencyOpen ? "rotate-180" : ""}`} />
                  </button>
                  {currencyOpen && (
                    <div className="absolute top-full right-0 z-10 mt-1 w-48 max-h-56 overflow-auto rounded-none border border-gray-200 bg-white shadow-lg">
                      <input
                        type="text"
                        value={currencySearch}
                        onChange={(e) => setCurrencySearch(e.target.value)}
                        className="w-full rounded-none border-b border-gray-200 px-2 py-1.5 text-[12px] text-gray-900 focus:outline-none"
                        aria-label="Search currency"
                      />
                      {filteredCurrencies.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setCurrency(c.code); setCurrencyOpen(false); setCurrencySearch(""); }}
                          className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-[12px] rounded-none ${currency === c.code ? "bg-[#008080] text-white" : "text-gray-900 hover:bg-gray-50"}`}
                        >
                          <span>{c.symbol}</span>
                          <span className="truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button type="button" onClick={onClose} className="p-2 rounded-none text-gray-500 hover:bg-gray-100" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {step === "form" && (
              <>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{t.docNumber}</label>
              <p className="text-sm font-medium text-gray-900">#{docNumberPreview}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 pb-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t.documentDate}</label>
                <input
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t.dueDate}</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {locale === "he" ? "כותרת המסמך" : "Document Title"}
                </label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]"
                  placeholder={locale === "he" ? "לדוגמה: פרויקט אלפא – שלב 1" : "e.g. Project Alpha – Phase 1"}
                />
              </div>
            </div>

            {documentLanguage && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{t.docLanguage}</label>
                <p className="text-sm text-gray-700">{documentLanguage === "he" ? "Hebrew" : documentLanguage === "en" ? "English" : "Bilingual"}</p>
              </div>
            )}
            {type === "invoice" && bankDetails && (bankDetails.bankName || bankDetails.iban || bankDetails.swift || bankDetails.bitLink) && (
              <div className="rounded-none border border-gray-200 p-3 bg-gray-50/50">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{t.bankDetails}</label>
                {bankDetails.bankName && <p className="text-sm text-gray-700">{t.bankName}: {bankDetails.bankName}</p>}
                {bankDetails.iban && <p className="text-sm text-gray-700">IBAN: {bankDetails.iban}</p>}
                {bankDetails.swift && <p className="text-sm text-gray-700">SWIFT: {bankDetails.swift}</p>}
                {bankDetails.bitLink && <p className="text-sm text-gray-700">Payment link: {bankDetails.bitLink}</p>}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="block text-sm font-medium text-gray-700">{t.client}</label>
                <button
                  type="button"
                  onClick={() => setNewClientMode(false)}
                  className={`px-3 py-1.5 rounded-none text-[13px] font-medium border ${!newClientMode ? "bg-[#008080] text-white border-[#008080]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                >
                  {t.selectClient}
                </button>
                <button
                  type="button"
                  onClick={() => setNewClientMode(true)}
                  className={`px-3 py-1.5 rounded-none text-[13px] font-medium border flex items-center gap-1 ${newClientMode ? "bg-[#008080] text-white border-[#008080]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                >
                  <Plus className="w-3.5 h-3.5" /> + {t.newClient}
                </button>
              </div>
              {!newClientMode ? (
                <>
                  <select
                    value={selectedClient?.id ?? ""}
                    onChange={(e) => {
                      const c = clientOptions.find((x) => x.id === e.target.value) ?? null;
                      setSelectedClient(c);
                    }}
                    className="w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]"
                  >
                    <option value="">{t.selectClient}</option>
                    {clientOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {selectedClient && (
                    <div className="rounded-none border border-gray-200 bg-white p-4 space-y-2">
                      <p className="text-[13px] font-semibold text-gray-900">{selectedClient.name}</p>
                      {selectedClient.email && <p className="text-[12px] text-gray-600">{t.email}: {selectedClient.email}</p>}
                      {selectedClient.phone && <p className="text-[12px] text-gray-600">{t.phone}: {selectedClient.phone}</p>}
                      {selectedClient.address && <p className="text-[12px] text-gray-600">{t.address}: {selectedClient.address}</p>}
                      {selectedClient.taxId && <p className="text-[12px] text-gray-600">{t.businessId}: {selectedClient.taxId}</p>}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-none border border-gray-200 bg-white p-4 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{locale === "he" ? "שם" : "Name"}</label>
                    <input type="text" value={newClientFields.name} onChange={(e) => setNewClientFields((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t.email}</label>
                    <input type="email" value={newClientFields.email} onChange={(e) => setNewClientFields((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t.phone}</label>
                    <input type="tel" value={newClientFields.phone} onChange={(e) => setNewClientFields((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t.address}</label>
                    <input type="text" value={newClientFields.address} onChange={(e) => setNewClientFields((p) => ({ ...p, address: e.target.value }))} className="w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t.businessId}</label>
                    <input type="text" value={newClientFields.taxId} onChange={(e) => setNewClientFields((p) => ({ ...p, taxId: e.target.value }))} className="w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]" />
                  </div>
                </div>
              )}
              {effectiveClient && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={autoSendPdf} onChange={(e) => setAutoSendPdf(e.target.checked)} className="rounded-none border border-gray-200 text-[#008080] focus:ring-[#008080] accent-[#008080]" />
                  <span className="text-[13px] text-gray-700">{t.autoSend}{effectiveClient.email ? ` (${effectiveClient.email})` : ""}</span>
                </label>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.lineItems}</label>
              <div className="space-y-3">
                {lineItems.map((item) => {
                  const incl = priceExclToIncl(item.unitPrice);
                  const lineVat = lineVatAmount(item.unitPrice, item.quantity, item.discountPct);
                  const lineTotal = lineTotalExcl(item.unitPrice, item.quantity, item.discountPct);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-none border border-gray-200 p-2.5 ${item.confirmed ? "border-[#008080]/40 bg-[#008080]/5" : "bg-white"}`}
                    >
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide">{t.description}</label>
                        <textarea
                          value={item.description}
                          onChange={(e) => updateLine(item.id, { description: e.target.value })}
                          rows={2}
                          className="w-full min-h-[52px] rounded-none border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080] resize-y"
                          style={{ resize: "vertical" }}
                        />
                        <div className="grid grid-cols-4 gap-1.5">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t.priceExcl}</label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.unitPrice || ""}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!Number.isNaN(v)) setInclFromExcl(item.id, v);
                              }}
                              className="w-full rounded-none border border-gray-200 bg-white px-1.5 py-1 text-[12px] text-gray-900 tabular-nums focus:outline-none focus:border-[#008080]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t.qty}</label>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={item.quantity}
                              onChange={(e) => updateLine(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                              className="w-full rounded-none border border-gray-200 bg-white px-1.5 py-1 text-[12px] text-gray-900 tabular-nums focus:outline-none focus:border-[#008080]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t.discount}</label>
                            <div className="relative rounded-none border border-gray-200 bg-white">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={item.discountPct || ""}
                                onChange={(e) => updateLine(item.id, { discountPct: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                                className="w-full rounded-none border-0 bg-transparent px-1.5 py-1 pr-5 text-[12px] text-gray-900 tabular-nums focus:outline-none focus:ring-0"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-500 pointer-events-none">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">{locale === "he" ? "סה\"כ" : "Line Total"}</label>
                            <input
                              type="number"
                              readOnly
                              value={lineTotal || 0}
                              className="w-full rounded-none border border-gray-200 bg-gray-50 px-1.5 py-1 text-[12px] text-gray-900 tabular-nums focus:outline-none focus:border-[#008080]"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-[#008080] font-medium">
                          {t.vatLabel}: {symbol}{formatMoney(lineVat)}
                        </p>
                        <p className="text-[10px] text-gray-500 tabular-nums">
                          {locale === "he" ? "סה\"כ שורה (ללא מע\"מ)" : "Line total (excl.)"}: {symbol}{formatMoney(lineTotal)}
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => confirmRow(item.id)}
                            disabled={item.confirmed}
                            className="inline-flex items-center gap-1 rounded-none px-2 py-1 text-[11px] font-medium disabled:opacity-60 disabled:cursor-default text-white hover:opacity-90"
                            style={{ backgroundColor: item.confirmed ? "#006666" : TEAL }}
                          >
                            <Check className="w-3 h-3" /> {t.confirm}
                          </button>
                          <button type="button" onClick={() => removeLine(item.id)} className="inline-flex items-center justify-center w-7 h-7 rounded-none text-gray-400 hover:bg-gray-100 hover:text-red-600" aria-label="Delete">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={addLine} className="mt-3 w-full py-2.5 rounded-none border border-gray-200 border-dashed bg-gray-50/50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-[13px] flex items-center justify-center gap-1.5" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                <Plus className="w-4 h-4" /> {t.addLine}
              </button>
              <div className="mt-4 rounded-none border border-gray-200 p-4 bg-white space-y-2">
                <div className="flex justify-between text-[13px] text-gray-600">
                  <span>{t.subtotal}</span>
                  <span className="tabular-nums">{symbol}{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[13px] text-gray-600">
                  <span>{t.vatAmountLabel}</span>
                  <span className="tabular-nums">{symbol}{formatMoney(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-[13px] font-bold pt-2 border-t border-gray-200" style={{ color: TEAL }}>
                  <span>{t.grandTotal}</span>
                  <span className="tabular-nums">{symbol}{formatMoney(total)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.notes}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080] resize-none"
              />
            </div>
              </>
            )}

            {step === "preview" && (
              <div className="fixed inset-0 z-[120] flex flex-col bg-gray-100" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                <div className="flex-1 overflow-y-auto overflow-x-auto p-6 flex justify-center min-h-0">
                  <div className="flex-shrink-0 w-full" style={{ maxWidth: 595, minHeight: 842 }}>
                    <UnifiedDocumentPreview
                      company={{
                        name: businessProfile?.legalName ?? "",
                        address: businessProfile?.address,
                        taxId: businessProfile?.taxId,
                        logoUrl: businessProfile?.businessLogo,
                        signatureUrl: businessProfile?.signature,
                      }}
                      client={{
                        name: effectiveClient?.name ?? "",
                        email: effectiveClient?.email,
                        phone: effectiveClient?.phone,
                        address: effectiveClient?.address,
                        taxId: effectiveClient?.taxId,
                      }}
                      items={lineItems
                        .filter((i) => i.description.trim() || i.quantity > 0 || i.unitPrice > 0)
                        .map((i) => ({
                          description: i.description.trim() || "—",
                          quantity: i.quantity,
                          unitPrice: Math.round(i.unitPrice * (1 - (i.discountPct || 0) / 100) * 100) / 100,
                        }))}
                      subtotal={subtotal}
                      vatAmount={vatAmount}
                      total={total}
                      currencySymbol={symbol}
                      docNumber={docNumberPreview}
                      docType={type}
                      language={documentLanguage === "he" ? "he" : documentLanguage === "en" ? "en" : "both"}
                      date={documentDate || undefined}
                      dueDate={dueDate || undefined}
                      vatRate={17}
                      title={documentTitle.trim() || undefined}
                      notes={notes.trim() || undefined}
                      bankDetails={type === "invoice" ? bankDetails : undefined}
                    />
                  </div>
                </div>
                <div className="flex gap-2 p-4 border-t border-gray-200 bg-white flex-shrink-0">
                  <button type="button" onClick={() => setStep("form")} className="flex-1 py-2.5 rounded-none border border-gray-200 bg-white text-gray-700 font-medium text-[13px]">
                    {locale === "he" ? "חזרה" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-none text-white font-semibold text-[13px] disabled:opacity-50"
                    style={{ backgroundColor: TEAL }}
                  >
                    {isSubmitting ? t.creating : (locale === "he" ? "הפק מסמך" : "Finalize & Generate")}
                  </button>
                </div>
              </div>
            )}

            {step === "generated" && (() => {
              const genDoc = generatedDocId && documents ? documents.find((d) => d.id === generatedDocId) : null;
              const docLang = documentLanguage === "he" ? "he" : documentLanguage === "en" ? "en" : "both";
              return (
                <SuccessWithPreview
                  genDoc={genDoc}
                  businessProfile={businessProfile}
                  symbol={symbol}
                  docLang={docLang}
                  documentLanguage={documentLanguage}
                  t={t}
                  locale={locale}
                  generatedDocId={generatedDocId!}
                  downloadPdf={downloadPdf}
                  getShareLink={getShareLink}
                  getPdfBlob={getPdfBlob}
                  onClose={onClose}
                  bankDetails={bankDetails}
                />
              );
            })()}
          </div>
          <div className="flex gap-2 p-4 border-t border-gray-200 flex-shrink-0">
            {step === "form" && (
              <>
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-none border border-gray-200 bg-white text-gray-700 font-medium text-[13px]">
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("preview")}
                  disabled={!canGoToPreview}
                  className="flex-1 py-2.5 rounded-none text-white font-semibold text-[13px] disabled:opacity-50"
                  style={{ backgroundColor: TEAL }}
                >
                  {t.create}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default function DocumentsPage() {
  const { locale } = useLocale();
  const {
    documents,
    clients: billingClients,
    expenses,
    businessProfile,
    downloadPdf,
    getShareLink,
    getPdfBlob,
    addExpense,
    createDraft,
    convertToQuote,
    convertQuoteToInvoice,
    createDeliveryNote,
    convertDeliveryNoteToInvoice,
    createReceipt,
    markPaid,
    issueCreditNote,
    issueNegativeReceipt,
    cancelQuote,
    cancelDeliveryNote,
  } = useBilling();
  const { getConversationsWithMeta, currentUserId } = useInternalMessages();
  const { contacts } = useContacts();

  const [activeTab, setActiveTab] = useState<TabId>("quotes");
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterClientId, setFilterClientId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "paid" | "pending" | "overdue">("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [openMenuDocId, setOpenMenuDocId] = useState<string | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewExpense, setPreviewExpense] = useState<BillingExpense | null>(null);
  const [createModal, setCreateModal] = useState<CreateModalType | null>(null);

  const showSuccessToast = useCallback((message: string) => {
    setToastMessage(message);
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!openMenuDocId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuDocId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openMenuDocId]);

  const handleShare = useCallback(
    async (docId: string) => {
      if (typeof navigator !== "undefined" && navigator.share) {
        const blob = await getPdfBlob(docId);
        if (!blob) {
          const link = getShareLink(docId);
          if (link) {
            navigator.clipboard.writeText(link);
            showSuccessToast(locale === "he" ? "הקישור הועתק" : "Link copied");
          }
          return;
        }
        const doc = documents.find((d) => d.id === docId);
        const fileName = doc ? `${doc.type}-${doc.number}.pdf` : "document.pdf";
        const file = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: fileName });
            showSuccessToast(locale === "he" ? "המסמך שותף" : "Document shared");
          } catch (err) {
            if ((err as Error).name !== "AbortError") {
              const link = getShareLink(docId);
              if (link) {
                navigator.clipboard.writeText(link);
                showSuccessToast(locale === "he" ? "הקישור הועתק" : "Link copied");
              }
            }
          }
        } else {
          const link = getShareLink(docId);
          if (link) {
            navigator.clipboard.writeText(link);
            showSuccessToast(locale === "he" ? "הקישור הועתק" : "Link copied");
          }
        }
      } else {
        const link = getShareLink(docId);
        if (link) {
          navigator.clipboard.writeText(link);
          showSuccessToast(locale === "he" ? "הקישור הועתק" : "Link copied");
        }
      }
    },
    [getPdfBlob, getShareLink, showSuccessToast, documents, locale]
  );

  const handleConvertToInvoice = useCallback(
    (docId: string) => {
      setLoadingDocId(docId);
      setTimeout(() => {
        if (convertQuoteToInvoice(docId)) {
          setActiveTab("invoices");
          showSuccessToast("Quote converted to invoice");
        }
        setLoadingDocId(null);
      }, 400);
    },
    [convertQuoteToInvoice, showSuccessToast]
  );

  const handleConvertDeliveryNoteToInvoice = useCallback(
    (docId: string) => {
      setLoadingDocId(docId);
      setTimeout(() => {
        if (convertDeliveryNoteToInvoice(docId)) {
          setActiveTab("invoices");
          showSuccessToast("Delivery note converted to invoice");
        }
        setLoadingDocId(null);
      }, 400);
    },
    [convertDeliveryNoteToInvoice, showSuccessToast]
  );

  const handleMarkPaid = useCallback(
    (docId: string) => {
      setLoadingDocId(docId);
      setTimeout(() => {
        if (markPaid(docId)) showSuccessToast("Invoice marked as paid");
        setLoadingDocId(null);
      }, 400);
    },
    [markPaid, showSuccessToast]
  );

  const handleIssueReceipt = useCallback(
    (docId: string) => {
      setLoadingDocId(docId);
      setTimeout(() => {
        if (createReceipt(docId)) {
          setActiveTab("receipts");
          showSuccessToast("Receipt issued");
        }
        setLoadingDocId(null);
      }, 400);
    },
    [createReceipt, showSuccessToast]
  );

  const handleIssueReceiptFromInvoice = useCallback(
    (invoice: BillingDocument) => {
      if (invoice.type !== "invoice") return;
      if ((invoice.status as string) === "canceled") return;
      if ((invoice.status as string) !== "paid") {
        setLoadingDocId(invoice.id);
        setTimeout(() => {
          markPaid(invoice.id);
          if (createReceipt(invoice.id)) {
            setActiveTab("receipts");
            showSuccessToast("Receipt issued");
          }
          setLoadingDocId(null);
        }, 450);
        return;
      }
      handleIssueReceipt(invoice.id);
    },
    [createReceipt, handleIssueReceipt, markPaid, showSuccessToast]
  );

  const handleCreateCreditNote = useCallback(
    (invoiceId: string) => {
      setLoadingDocId(invoiceId);
      setTimeout(() => {
        if (issueCreditNote(invoiceId)) {
          setActiveTab("cancellations");
          showSuccessToast("Credit note created");
        }
        setLoadingDocId(null);
      }, 400);
    },
    [issueCreditNote, showSuccessToast]
  );

  const handleScanReceipt = useCallback(() => {
    showSuccessToast("Scan Receipt (coming soon)");
  }, [showSuccessToast]);

  const hasActiveFilters = !!(searchQuery.trim() || dateFrom || dateTo || filterClientId || filterStatus);
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setFilterClientId("");
    setFilterStatus("");
  }, []);

  const handleUploadExpenseFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        if (!dataUrl) return;
        addExpense({
          vendor: file.name.replace(/\.[^.]+$/, ""),
          amount: 0,
          category: "Uncategorized",
          date: new Date().toISOString().slice(0, 10),
          attachment: { name: file.name, mime: file.type || "application/octet-stream", dataUrl },
        });
        showSuccessToast("Expense uploaded");
      };
      reader.readAsDataURL(file);
    },
    [addExpense, showSuccessToast]
  );

  const todayIso = new Date().toISOString().slice(0, 10);

  const chatList = useMemo(() => getConversationsWithMeta(currentUserId), [getConversationsWithMeta, currentUserId]);
  const clientOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    billingClients.forEach((c) => byId.set(c.id, { id: c.id, name: c.name }));
    chatList.forEach((x: { contactId: string }) => {
      const { contactId } = x;
      if (byId.has(contactId)) return;
      const contact = contacts.find((c) => c.id === contactId || c.phone === contactId);
      byId.set(contactId, { id: contactId, name: contact?.name ?? contactId });
    });
    documents.forEach((d) => {
      if (!byId.has(d.clientId)) byId.set(d.clientId, { id: d.clientId, name: d.clientName || d.clientId });
    });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [billingClients, chatList, contacts, documents]);

  const billingClientOptions = useMemo((): BillingClient[] => {
    return clientOptions.map(({ id, name }) => {
      const fromBilling = billingClients.find((c) => c.id === id);
      if (fromBilling) return fromBilling;
      const fromDoc = documents.find((d) => d.clientId === id);
      if (fromDoc) return { id, name, email: fromDoc.clientEmail, phone: fromDoc.clientPhone, address: fromDoc.clientAddress, taxId: fromDoc.clientTaxId };
      const contact = contacts.find((c) => c.id === id || c.phone === id);
      return { id, name, email: contact?.email, phone: contact?.phone };
    });
  }, [clientOptions, billingClients, documents, contacts]);

  const [createDocSubmitting, setCreateDocSubmitting] = useState(false);
  const handleCreateDocument = useCallback(
    (type: "quote" | "invoice" | "delivery_note") =>
      async (client: BillingClient, items: BillingLineItem[], notes?: string, title?: string): Promise<string | null> => {
        setCreateDocSubmitting(true);
        try {
          if (type === "delivery_note") {
            const doc = createDeliveryNote(client, items, notes, title);
            if (doc) {
              setActiveTab("delivery_notes");
              showSuccessToast("Delivery note created");
              return doc.id;
            }
            return null;
          }
          const draft = createDraft(client, items, notes, title);
          if (!draft) return null;
          const quote = convertToQuote(draft.id);
          if (!quote) return null;
          if (type === "invoice") {
            const inv = convertQuoteToInvoice(quote.id);
            if (inv) {
              setActiveTab("invoices");
              showSuccessToast("Invoice created");
              return inv.id;
            }
            return null;
          }
          setActiveTab("quotes");
          showSuccessToast("Quote created");
          return quote.id;
        } finally {
          setCreateDocSubmitting(false);
        }
      },
    [createDraft, convertToQuote, convertQuoteToInvoice, createDeliveryNote, showSuccessToast]
  );

  const inRange = (iso: string) => {
    if (dateFrom && iso < dateFrom) return false;
    if (dateTo && iso > dateTo) return false;
    return true;
  };
  const byClient = (clientId: string) => (!filterClientId ? true : clientId === filterClientId);
  const searchLower = searchQuery.trim().toLowerCase();
  const matchesSearch = (d: BillingDocument) => {
    if (!searchLower) return true;
    const num = (d.number ?? "").toLowerCase();
    const name = (d.clientName ?? "").toLowerCase();
    const title = (d.title ?? "").toLowerCase();
    return num.includes(searchLower) || name.includes(searchLower) || title.includes(searchLower);
  };

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const iso = docDateIso(d);
      if (!inRange(iso)) return false;
      if (!byClient(d.clientId)) return false;
      if (!matchesSearch(d)) return false;
      if (activeTab === "invoices" && filterStatus) {
        if (getInvoiceUiStatus(d, todayIso) !== filterStatus) return false;
      }
      if (activeTab === "quotes") return d.type === "quote";
      if (activeTab === "invoices") return d.type === "invoice";
      if (activeTab === "receipts") return d.type === "receipt";
      if (activeTab === "delivery_notes") return d.type === "delivery_note";
      if (activeTab === "cancellations") return (d.status as string) === "canceled" || d.type === "credit_note" || d.type === "negative_receipt";
      return false;
    });
  }, [documents, activeTab, dateFrom, dateTo, filterClientId, searchQuery, filterStatus, todayIso]);

  const expenseSearchLower = searchQuery.trim().toLowerCase();
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!inRange(expenseDateIso(e))) return false;
      if (!expenseSearchLower) return true;
      const vendor = (e.vendor ?? "").toLowerCase();
      const category = (e.category ?? "").toLowerCase();
      return vendor.includes(expenseSearchLower) || category.includes(expenseSearchLower);
    });
  }, [expenses, dateFrom, dateTo, searchQuery]);

  const metrics = useMemo(() => {
    const receipts = documents.filter((d) => d.type === "receipt").filter((d) => inRange(docDateIso(d)) && byClient(d.clientId));
    const invoices = documents.filter((d) => d.type === "invoice").filter((d) => inRange(docDateIso(d)) && byClient(d.clientId));
    const quotes = documents.filter((d) => d.type === "quote").filter((d) => inRange(docDateIso(d)) && byClient(d.clientId));

    const totalPaid = receipts.filter((r) => (r.status as string) === "paid").reduce((s, r) => s + (r.total || 0), 0);
    const unpaidInvoices = invoices.filter((inv) => getInvoiceUiStatus(inv, todayIso) === "pending" || getInvoiceUiStatus(inv, todayIso) === "overdue");
    const unpaidAmount = unpaidInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
    const activeQuotes = quotes.filter((q) => (q.status as string) !== "canceled").length;
    const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    return { totalPaid, unpaidAmount, unpaidCount: unpaidInvoices.length, activeQuotes, totalExpenses };
  }, [documents, dateFrom, dateTo, filterClientId, filteredExpenses, todayIso]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "quotes", label: locale === "he" ? "הצעות" : "Quotes", icon: <FileStack className="w-4 h-4" /> },
    { id: "invoices", label: locale === "he" ? "חשבוניות" : "Invoices", icon: <FileText className="w-4 h-4" /> },
    { id: "receipts", label: locale === "he" ? "קבלות" : "Receipts", icon: <Receipt className="w-4 h-4" /> },
    { id: "delivery_notes", label: locale === "he" ? "תעודות משלוח" : "Delivery Notes", icon: <Package className="w-4 h-4" /> },
    { id: "cancellations", label: locale === "he" ? "מבוטלים" : "Cancellations", icon: <X className="w-4 h-4" /> },
    { id: "expenses", label: locale === "he" ? "הוצאות" : "Expenses", icon: <DollarSign className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] font-sans antialiased">
      {/* Success toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed top-0 left-0 right-0 z-[200] flex justify-center pt-4 px-4 pointer-events-none"
          >
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg font-medium text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">✓</span>
              {toastMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-away overlay for row menus */}
      {openMenuDocId && (
        <button
          type="button"
          className="fixed inset-0 z-[140] cursor-default"
          aria-label="Close menu"
          onClick={() => setOpenMenuDocId(null)}
        />
      )}

      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 bg-white shadow-sm min-h-[56px]">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 py-2 pr-2 -ml-1 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="flex-1 min-w-0 font-semibold text-gray-900 text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 shrink-0" style={{ color: TEAL }} />
          Documents
        </h1>
        <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 px-2 py-1.5">
          <Link
            href="/dashboard/finances/clients"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-100 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-gray-600" />
            Clients
          </Link>
          <Link
            href="/dashboard/finances/business-settings"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-100 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Settings className="w-4 h-4 text-gray-600" />
            Business Settings
          </Link>
        </div>
      </header>

      {/* Collapsible Financial Snapshot */}
      <section className="px-4 pt-3">
        <button
          type="button"
          onClick={() => setSnapshotOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded-xl border border-gray-100 bg-white shadow-sm text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50/80 transition-colors"
        >
          <span>View Financial Snapshot</span>
          <motion.span
            animate={{ rotate: snapshotOpen ? 180 : 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="shrink-0 text-gray-500"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {snapshotOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 pb-3 px-1 rounded-b-xl bg-gray-50/80 border border-t-0 border-gray-100 shadow-sm">
                {/* Single-row filters directly above summary cards */}
                <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-3 mb-3 flex flex-row flex-wrap items-end gap-3">
                  <div className="flex items-end gap-2 min-w-0">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-0.5">From Date</label>
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-100 px-2.5 py-1.5 text-xs text-gray-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-0.5">To Date</label>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-100 px-2.5 py-1.5 text-xs text-gray-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50" />
                    </div>
                  </div>
                  <div className="min-w-[140px]">
                    <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Select Client</label>
                    <select value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)} className="w-full rounded-lg border border-gray-100 px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:ring-2 focus:ring-teal-500/20">
                      <option value="">All clients</option>
                      {clientOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); setFilterClientId(""); }} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors shrink-0">
                    Clear
                  </button>
                </div>
                {/* Summary blocks: Paid, Unpaid, Quotes, Expenses only */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-3">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Paid</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5 tabular-nums">{formatMoney(metrics.totalPaid)}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-3">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Unpaid</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5 tabular-nums">{metrics.unpaidCount} · {formatMoney(metrics.unpaidAmount)}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-3">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Quotes</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5 tabular-nums">{metrics.activeQuotes}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-3">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Expenses</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5 tabular-nums">{formatMoney(metrics.totalExpenses)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Tabs */}
      <div className="px-4 pt-3">
        <div className="flex gap-2 p-1.5 rounded-2xl bg-gray-100/80 overflow-x-auto border border-gray-100 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-0 py-3 px-4 rounded-xl text-[13px] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === t.id ? "bg-white shadow-sm text-gray-900 font-semibold border border-gray-100" : "text-gray-500 font-medium hover:text-gray-700 hover:bg-white/50"}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <main className="flex-1 px-4 py-4">
        {activeTab !== "expenses" ? (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-visible">
            {/* Section header: title + Create New button */}
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                {activeTab === "quotes" && "Pending Quotes"}
                {activeTab === "invoices" && "Recent Invoices"}
                {activeTab === "receipts" && "Receipts"}
                {activeTab === "delivery_notes" && "Delivery Notes"}
                {activeTab === "cancellations" && "Canceled Documents"}
              </h2>
              {activeTab !== "cancellations" && (
                <button
                  type="button"
                  onClick={() =>
                    setCreateModal(
                      activeTab === "quotes"
                        ? "quote"
                        : activeTab === "invoices"
                          ? "invoice"
                          : activeTab === "receipts"
                            ? "receipt"
                            : "delivery_note"
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] font-semibold text-white shrink-0 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL }}
                >
                  <Plus className="w-4 h-4" />
                  {activeTab === "quotes" && (locale === "he" ? "הצעת מחיר חדשה" : "New Quote")}
                  {activeTab === "invoices" && (locale === "he" ? "חשבונית חדשה" : "New Invoice")}
                  {activeTab === "receipts" && (locale === "he" ? "קבלה חדשה" : "New Receipt")}
                  {activeTab === "delivery_notes" && (locale === "he" ? "תעודת משלוח חדשה" : "New Delivery Note")}
                </button>
              )}
              {activeTab === "cancellations" && (
                <button
                  type="button"
                  onClick={() => setCreateModal("credit_note")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] font-semibold text-white shrink-0 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL }}
                >
                  <Plus className="w-4 h-4" />
                  New Credit Note
                </button>
              )}
            </div>

            {/* Luxury filter bar: unified horizontal bar, Search button, thin borders, sharp corners */}
            <div className="px-4 py-3 border-b border-gray-100 bg-white">
              {/* Mobile: Filter button that opens drawer */}
              <div className="flex items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setFilterDrawerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-none border border-gray-100 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                >
                  <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                  {locale === "he" ? "מסננים" : "Filter"}
                </button>
                {hasActiveFilters && (
                  <button type="button" onClick={clearFilters} className="text-[13px] font-medium text-gray-500 hover:text-gray-700" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                    {locale === "he" ? "נקה" : "Clear"}
                  </button>
                )}
              </div>
              {/* Desktop: full horizontal bar */}
              <div className="hidden lg:flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px] flex items-end gap-0">
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                      {activeTab === "expenses"
                        ? (locale === "he" ? "חיפוש (ספק / קטגוריה)" : "Search (vendor / category)")
                        : (locale === "he" ? "חיפוש (מס׳ מסמך / לקוח)" : "Search (document # / customer)")}
                    </label>
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={activeTab === "expenses" ? (locale === "he" ? "ספק או קטגוריה…" : "Vendor or category…") : (locale === "he" ? "מס׳ מסמך או שם לקוח…" : "Document number or customer name…")}
                      className="w-full rounded-none border border-gray-100 bg-white py-2 px-3 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#008080] focus:ring-1 focus:ring-[#008080]"
                      style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="shrink-0 h-[38px] px-4 rounded-none border border-l-0 border-gray-100 bg-[#008080] text-white hover:bg-[#006666] transition-colors flex items-center justify-center"
                    style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                    aria-label={locale === "he" ? "חפש" : "Search"}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
                <div className="min-w-[140px]">
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                    {locale === "he" ? "לקוח" : "Customer"}
                  </label>
                  <select
                    value={filterClientId}
                    onChange={(e) => setFilterClientId(e.target.value)}
                    className="w-full rounded-none border border-gray-100 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]"
                    style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                  >
                    <option value="">{locale === "he" ? "כל הלקוחות" : "All customers"}</option>
                    {clientOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                    {locale === "he" ? "מתאריך" : "From Date"}
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full min-w-[120px] rounded-none border border-gray-100 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]"
                    style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                    {locale === "he" ? "עד תאריך" : "To Date"}
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full min-w-[120px] rounded-none border border-gray-100 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]"
                    style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                  />
                </div>
                {activeTab === "invoices" && (
                  <div className="min-w-[120px]">
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                      {locale === "he" ? "סטטוס" : "Status"}
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as "" | "paid" | "pending" | "overdue")}
                      className="w-full rounded-none border border-gray-100 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]"
                      style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                    >
                      <option value="">{locale === "he" ? "הכל" : "All"}</option>
                      <option value="paid">{locale === "he" ? "שולם" : "Paid"}</option>
                      <option value="pending">{locale === "he" ? "ממתין" : "Pending"}</option>
                      <option value="overdue">{locale === "he" ? "באיחור" : "Overdue"}</option>
                    </select>
                  </div>
                )}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="shrink-0 px-3 py-2 rounded-none border border-gray-100 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                  >
                    {locale === "he" ? "נקה מסננים" : "Clear Filters"}
                  </button>
                )}
              </div>
            </div>

            {/* Filter drawer (mobile) */}
            <AnimatePresence>
              {filterDrawerOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[180] bg-black/40 lg:hidden"
                    onClick={() => setFilterDrawerOpen(false)}
                    aria-hidden
                  />
                  <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "tween", duration: 0.25 }}
                    className="fixed top-0 right-0 bottom-0 z-[181] w-full max-w-sm bg-white border-l border-gray-100 shadow-xl lg:hidden flex flex-col"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="text-[13px] font-semibold text-gray-900" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                        {locale === "he" ? "מסננים" : "Filters"}
                      </span>
                      <button type="button" onClick={() => setFilterDrawerOpen(false)} className="p-2 rounded-none text-gray-500 hover:bg-gray-100">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                          {activeTab === "expenses" ? (locale === "he" ? "חיפוש" : "Search") : (locale === "he" ? "חיפוש" : "Search")}
                        </label>
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={activeTab === "expenses" ? (locale === "he" ? "ספק או קטגוריה…" : "Vendor or category…") : (locale === "he" ? "מס׳ מסמך או שם לקוח…" : "Document number or customer…")}
                          className="w-full rounded-none border border-gray-100 bg-white py-2.5 px-3 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#008080]"
                          style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                          {locale === "he" ? "לקוח" : "Customer"}
                        </label>
                        <select
                          value={filterClientId}
                          onChange={(e) => setFilterClientId(e.target.value)}
                          className="w-full rounded-none border border-gray-100 bg-white px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]"
                          style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                        >
                          <option value="">{locale === "he" ? "כל הלקוחות" : "All customers"}</option>
                          {clientOptions.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                          {locale === "he" ? "מתאריך" : "From Date"}
                        </label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-none border border-gray-100 bg-white px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                          {locale === "he" ? "עד תאריך" : "To Date"}
                        </label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-none border border-gray-100 bg-white px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }} />
                      </div>
                      {activeTab === "invoices" && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                            {locale === "he" ? "סטטוס" : "Status"}
                          </label>
                          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "" | "paid" | "pending" | "overdue")} className="w-full rounded-none border border-gray-100 bg-white px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                            <option value="">{locale === "he" ? "הכל" : "All"}</option>
                            <option value="paid">{locale === "he" ? "שולם" : "Paid"}</option>
                            <option value="pending">{locale === "he" ? "ממתין" : "Pending"}</option>
                            <option value="overdue">{locale === "he" ? "באיחור" : "Overdue"}</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-gray-100 flex gap-2">
                      <button type="button" onClick={clearFilters} className="flex-1 py-2.5 rounded-none border border-gray-100 bg-white text-[13px] font-medium text-gray-700" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                        {locale === "he" ? "נקה" : "Clear"}
                      </button>
                      <button type="button" onClick={() => setFilterDrawerOpen(false)} className="flex-1 py-2.5 rounded-none text-white text-[13px] font-semibold" style={{ backgroundColor: TEAL, fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                        {locale === "he" ? "החל" : "Apply"}
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <table className="w-full text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">{locale === "he" ? "סוג / מס'" : "Type / Number"}</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">{locale === "he" ? "לקוח" : "Client"}</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">{locale === "he" ? "תאריך" : "Date"}</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">{locale === "he" ? "סכום" : "Amount"}</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">{locale === "he" ? "סטטוס" : "Status"}</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap" />
                </tr>
              </thead>
              <tbody>
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center">
                      <p className="text-[13px] font-medium text-gray-500 mb-3" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                        {locale === "he" ? "לא נמצאו מסמכים" : "No documents found"}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="rounded-none border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                        >
                          {locale === "he" ? "נקה מסננים" : "Clear Filters"}
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((d) => {
                    const uiStatus = getInvoiceUiStatus(d, todayIso);
                    const isCanceled = (d.status as string) === "canceled";
                    const notCanceled = !isCanceled;
                    const canConvertToInvoice = (d.type === "quote" || d.type === "delivery_note") && notCanceled;
                    const canIssueReceipt = d.type === "invoice" && notCanceled;
                    const canCreateCreditNote = d.type === "invoice" && notCanceled;
                    const canCancelQuote = d.type === "quote" && notCanceled;
                    const canCancelDeliveryNote = d.type === "delivery_note" && notCanceled;
                    const canCancelReceipt = d.type === "receipt" && notCanceled;
                    return (
                      <React.Fragment key={d.id}>
                        <tr className={isCanceled ? "bg-gray-50/50" : ""}>
                          <td colSpan={6} className={`px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${isCanceled ? "text-gray-400 line-through" : "text-gray-500"}`}>
                            {d.title && d.title.trim() ? d.title : (locale === "he" ? "ללא כותרת" : "No title")}
                          </td>
                        </tr>
                        <tr className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isCanceled ? "bg-gray-50/50" : ""}`}>
                        <td className={`px-4 py-2 font-medium whitespace-nowrap ${isCanceled ? "text-gray-500 line-through" : "text-gray-900"}`}>{docTypeLabel(d.type)} #{d.number}</td>
                        <td className={`px-4 py-2 whitespace-nowrap ${isCanceled ? "text-gray-400 line-through" : "text-gray-600"}`}>{d.clientName || "—"}</td>
                        <td className={`px-4 py-2 whitespace-nowrap ${isCanceled ? "text-gray-400 line-through" : "text-gray-600"}`}>{docDateIso(d)}</td>
                        <td className={`px-4 py-2 text-right font-medium tabular-nums whitespace-nowrap ${isCanceled ? "text-gray-400 line-through" : "text-gray-900"}`}>{formatMoney(d.total || 0)}</td>
                        <td className="px-4 py-2 whitespace-nowrap"><StatusBadge status={uiStatus} /></td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <div className="relative inline-flex">
                            <button
                              type="button"
                              onClick={() => setOpenMenuDocId((prev) => (prev === d.id ? null : d.id))}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                              aria-haspopup="menu"
                              aria-expanded={openMenuDocId === d.id}
                              aria-label="More actions"
                              title="More"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            <AnimatePresence>
                              {openMenuDocId === d.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                  transition={{ duration: 0.15, ease: "easeOut" }}
                                  className="absolute right-0 top-[calc(100%+0.5rem)] z-[220] w-56 rounded-none border border-gray-100 bg-white p-1 min-w-[12rem]"
                                  style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}
                                  role="menu"
                                >
                                  <button
                                    type="button"
                                    onClick={() => { setOpenMenuDocId(null); setPreviewDocId(d.id); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-none text-gray-700 hover:bg-gray-50 text-[12px] font-medium"
                                    style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                                    role="menuitem"
                                  >
                                    <FileText className="w-4 h-4 text-gray-500" />
                                    {locale === "he" ? "תצוגה מקדימה" : "Preview"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setOpenMenuDocId(null); downloadPdf(d.id); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-none text-gray-700 hover:bg-gray-50 text-[12px] font-medium"
                                    style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                                    role="menuitem"
                                  >
                                    <Download className="w-4 h-4 text-gray-500" />
                                    Download PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setOpenMenuDocId(null); handleShare(d.id); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-none text-gray-700 hover:bg-gray-50 text-[12px] font-medium"
                                    style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                                    role="menuitem"
                                  >
                                    <Share2 className="w-4 h-4 text-gray-500" />
                                    {locale === "he" ? "שלח ללקוח" : "Send to Client"}
                                  </button>
                                  {/* Context-specific actions */}
                                  {canConvertToInvoice && (
                                    <button
                                      type="button"
                                      disabled={loadingDocId === d.id}
                                      onClick={() => {
                                        setOpenMenuDocId(null);
                                        if (d.type === "quote") handleConvertToInvoice(d.id);
                                        if (d.type === "delivery_note") handleConvertDeliveryNoteToInvoice(d.id);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 rounded-none text-[12px] font-medium disabled:opacity-60 text-white hover:opacity-90 transition-opacity"
                                      style={{ backgroundColor: TEAL, fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                                      role="menuitem"
                                    >
                                      {loadingDocId === d.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <FileText className="w-4 h-4" />
                                      )}
                                      Convert to Invoice
                                    </button>
                                  )}
                                  {(canCancelQuote || canCancelDeliveryNote) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuDocId(null);
                                        if (d.type === "quote") cancelQuote(d.id);
                                        if (d.type === "delivery_note") cancelDeliveryNote(d.id);
                                        setActiveTab("cancellations");
                                        showSuccessToast(locale === "he" ? "המסמך בוטל" : "Document canceled");
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 rounded-none text-amber-700 hover:bg-amber-50 text-[12px] font-medium"
                                      style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                                      role="menuitem"
                                    >
                                      <X className="w-4 h-4" />
                                      {locale === "he" ? "ביטול" : "Cancel"}
                                    </button>
                                  )}

                                  {canIssueReceipt && (
                                    <button
                                      type="button"
                                      disabled={loadingDocId === d.id}
                                      onClick={() => {
                                        setOpenMenuDocId(null);
                                        handleIssueReceiptFromInvoice(d);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 rounded-none text-gray-700 hover:bg-gray-50 text-[12px] font-medium disabled:opacity-60"
                                      style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                                      role="menuitem"
                                    >
                                      {loadingDocId === d.id ? (
                                        <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                                      ) : (
                                        <Receipt className="w-4 h-4 text-gray-500" />
                                      )}
                                      Issue Receipt
                                    </button>
                                  )}

                                  {canCreateCreditNote && (
                                    <button
                                      type="button"
                                      disabled={loadingDocId === d.id}
                                      onClick={() => {
                                        setOpenMenuDocId(null);
                                        handleCreateCreditNote(d.id);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 rounded-none text-gray-700 hover:bg-gray-50 text-[12px] font-medium disabled:opacity-60"
                                      style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                                      role="menuitem"
                                    >
                                      {loadingDocId === d.id ? (
                                        <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                                      ) : (
                                        <X className="w-4 h-4 text-gray-500" />
                                      )}
                                      Create Credit Note
                                    </button>
                                  )}

                                  {canCancelReceipt && (
                                    <button
                                      type="button"
                                      disabled={loadingDocId === d.id}
                                      onClick={() => {
                                        setOpenMenuDocId(null);
                                        if (issueNegativeReceipt(d.id)) {
                                          setActiveTab("cancellations");
                                          showSuccessToast(locale === "he" ? "קבלה שלילית נוצרה" : "Negative receipt issued");
                                        }
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 rounded-none text-amber-700 hover:bg-amber-50 text-[12px] font-medium"
                                      style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                                      role="menuitem"
                                    >
                                      <X className="w-4 h-4" />
                                      {locale === "he" ? "ביטול (קבלה שלילית)" : "Cancel (Negative Receipt)"}
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModal("expense")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL }}
                >
                  <Plus className="w-4 h-4" />
                  {locale === "he" ? "הוצאה חדשה" : "New Expense"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleScanReceipt}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border border-gray-200 bg-white text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Camera className="w-4 h-4 text-gray-600" />
                  Scan Receipt
                </button>
                <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50/70 text-[12px] font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Upload className="w-4 h-4 text-gray-600" />
                Upload Document
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.currentTarget.value = "";
                  if (!f) return;
                  handleUploadExpenseFile(f);
                }}
              />
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-visible">
              {/* Expenses filter bar: luxury style + mobile Filter button */}
              <div className="px-4 py-3 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setFilterDrawerOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-none border border-gray-100 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                    {locale === "he" ? "מסננים" : "Filter"}
                  </button>
                  {hasActiveFilters && (
                    <button type="button" onClick={clearFilters} className="text-[13px] font-medium text-gray-500 hover:text-gray-700" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                      {locale === "he" ? "נקה" : "Clear"}
                    </button>
                  )}
                </div>
                <div className="hidden lg:flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px] flex items-end gap-0">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                        {locale === "he" ? "חיפוש (ספק / קטגוריה)" : "Search (vendor / category)"}
                      </label>
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={locale === "he" ? "ספק או קטגוריה…" : "Vendor or category…"}
                        className="w-full rounded-none border border-gray-100 bg-white py-2 px-3 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#008080] focus:ring-1 focus:ring-[#008080]"
                        style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                      />
                    </div>
                    <button type="button" onClick={() => {}} className="shrink-0 h-[38px] px-4 rounded-none border border-l-0 border-gray-100 bg-[#008080] text-white hover:bg-[#006666] transition-colors flex items-center justify-center" aria-label={locale === "he" ? "חפש" : "Search"}>
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                      {locale === "he" ? "מתאריך" : "From Date"}
                    </label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full min-w-[120px] rounded-none border border-gray-100 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                      {locale === "he" ? "עד תאריך" : "To Date"}
                    </label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full min-w-[120px] rounded-none border border-gray-100 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#008080]" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }} />
                  </div>
                  {hasActiveFilters && (
                    <button type="button" onClick={clearFilters} className="shrink-0 px-3 py-2 rounded-none border border-gray-100 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                      {locale === "he" ? "נקה מסננים" : "Clear Filters"}
                    </button>
                  )}
                </div>
              </div>
              <table className="w-full text-[12px]">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Date</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Supplier Name</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Category</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-600">Amount</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-600">View</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center">
                        <p className="text-[13px] font-medium text-gray-500 mb-3" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                          {locale === "he" ? "לא נמצאו הוצאות" : "No expenses found"}
                        </p>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-none border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
                          >
                            {locale === "he" ? "נקה מסננים" : "Clear Filters"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-2.5 text-gray-600">{expenseDateIso(e)}</td>
                        <td className="px-6 py-2.5 font-medium text-gray-900">{e.vendor}</td>
                        <td className="px-6 py-2.5 text-gray-600">{e.category}</td>
                        <td className="px-6 py-2.5 text-right font-medium text-gray-900 tabular-nums">{formatMoney(e.amount)}</td>
                        <td className="px-6 py-2.5 text-right">
                          <button
                            type="button"
                            disabled={!e.attachment?.dataUrl}
                            onClick={() => setPreviewExpense(e)}
                            className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg border border-gray-100 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Create document slide-over (Quote / Invoice / Delivery Note) */}
      <AnimatePresence>
        {(createModal === "quote" || createModal === "invoice" || createModal === "delivery_note") && (
          <DocumentCreateSlideOver
            open
            type={createModal}
            title={
              createModal === "quote"
                ? "New Quote"
                : createModal === "invoice"
                  ? "New Invoice"
                  : "New Delivery Note"
            }
            docNumberPreview={
              createModal === "quote"
                ? getNextNumberPreview("quote")
                : createModal === "invoice"
                  ? getNextNumberPreview("invoice")
                  : getNextNumberPreview("deliveryNote")
            }
            documentLanguage={businessProfile?.documentLanguage}
            bankDetails={createModal === "invoice" ? businessProfile?.bankDetails : undefined}
            businessProfile={businessProfile ? { legalName: businessProfile.legalName, taxId: businessProfile.taxId, address: businessProfile.address, businessLogo: businessProfile.businessLogo, signature: (businessProfile as { signature?: string }).signature } : undefined}
            clientOptions={billingClientOptions}
            locale={locale}
            onClose={() => setCreateModal(null)}
            onSubmit={handleCreateDocument(createModal)}
            isSubmitting={createDocSubmitting}
            downloadPdf={downloadPdf}
            getShareLink={getShareLink}
            getPdfBlob={getPdfBlob}
            documents={documents}
          />
        )}
      </AnimatePresence>

      {/* History document preview modal (3-dots → Preview) – full A4 */}
      {previewDocId && (() => {
        const previewDoc = documents.find((d) => d.id === previewDocId);
        if (!previewDoc) return null;
        const docLang = (businessProfile as { documentLanguage?: string } | undefined)?.documentLanguage === "he" ? "he" : (businessProfile as { documentLanguage?: string } | undefined)?.documentLanguage === "en" ? "en" : "both";
        const bp = businessProfile as { bankDetails?: { bankName?: string; iban?: string; swift?: string; bitLink?: string } } | undefined;
        return (
          <div className="fixed inset-0 z-[200] flex flex-col bg-black/50" onClick={() => setPreviewDocId(null)}>
            <div className="flex-1 overflow-y-auto overflow-x-auto p-6 flex justify-center min-h-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 w-full bg-white shadow-xl rounded-none" style={{ width: 595, minHeight: 842, maxWidth: "100%" }}>
                <UnifiedDocumentPreview
                  company={{
                    name: businessProfile?.legalName ?? "",
                    address: businessProfile?.address,
                    taxId: businessProfile?.taxId,
                    logoUrl: businessProfile?.businessLogo,
                    signatureUrl: (businessProfile as { signature?: string })?.signature,
                  }}
                  client={{
                    name: previewDoc.clientName ?? "",
                    email: previewDoc.clientEmail,
                    phone: previewDoc.clientPhone,
                    address: previewDoc.clientAddress,
                    taxId: previewDoc.clientTaxId,
                  }}
                  items={previewDoc.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice }))}
                  subtotal={previewDoc.subtotal}
                  vatAmount={previewDoc.vatAmount}
                  total={previewDoc.total}
                  currencySymbol={CURRENCY_SYMBOLS["ILS"] ?? "₪"}
                  docNumber={previewDoc.number}
                  docType={previewDoc.type}
                  language={docLang}
                  date={previewDoc.date}
                  dueDate={previewDoc.dueDate}
                  vatRate={previewDoc.vatRate ?? 17}
                  title={previewDoc.title}
                  notes={previewDoc.notes}
                  bankDetails={(previewDoc.type === "invoice" || previewDoc.type === "credit_note" || previewDoc.type === "negative_receipt") ? bp?.bankDetails : undefined}
                  creditForInvoiceNumber={previewDoc.creditForInvoiceNumber}
                  originalReceiptNumber={previewDoc.originalReceiptNumber}
                  isCanceled={(previewDoc.status as string) === "canceled" && previewDoc.type !== "credit_note" && previewDoc.type !== "negative_receipt"}
                />
              </div>
            </div>
            <div className="flex justify-center p-4 bg-white border-t border-gray-200 flex-shrink-0 rounded-none">
              <button
                type="button"
                onClick={() => setPreviewDocId(null)}
                className="px-6 py-2.5 rounded-none border border-gray-200 bg-white text-gray-700 font-medium text-[13px]"
              >
                {locale === "he" ? "סגור" : "Close"}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Create Receipt: select paid invoice */}
      {createModal === "receipt" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={() => setCreateModal(null)}>
          <div className="bg-white rounded-sm border border-gray-100 shadow-xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">New Receipt — Select paid invoice</h2>
              <button type="button" onClick={() => setCreateModal(null)} className="p-2 rounded-sm text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {documents.filter((d) => d.type === "invoice" && (d.status as string) === "paid").length === 0 ? (
                <p className="text-sm text-gray-500">No paid invoices. Mark an invoice as paid first.</p>
              ) : (
                <ul className="space-y-1">
                  {documents
                    .filter((d) => d.type === "invoice" && (d.status as string) === "paid")
                    .map((inv) => (
                      <li key={inv.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (createReceipt(inv.id)) {
                              setCreateModal(null);
                              setActiveTab("receipts");
                              showSuccessToast("Receipt created");
                            }
                          }}
                          className="w-full text-left px-3 py-2 rounded-sm border border-gray-100 hover:bg-gray-50 text-sm font-medium text-gray-900"
                        >
                          Invoice #{inv.number} · {inv.clientName} · {formatMoney(inv.total || 0)}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Credit Note: select invoice */}
      {createModal === "credit_note" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={() => setCreateModal(null)}>
          <div className="bg-white rounded-sm border border-gray-100 shadow-xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">New Credit Note — Select invoice to cancel</h2>
              <button type="button" onClick={() => setCreateModal(null)} className="p-2 rounded-sm text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {documents.filter((d) => d.type === "invoice" && (d.status as string) !== "canceled").length === 0 ? (
                <p className="text-sm text-gray-500">No invoices to cancel.</p>
              ) : (
                <ul className="space-y-1">
                  {documents
                    .filter((d) => d.type === "invoice" && (d.status as string) !== "canceled")
                    .map((inv) => (
                      <li key={inv.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (issueCreditNote(inv.id)) {
                              setCreateModal(null);
                              setActiveTab("cancellations");
                              showSuccessToast("Credit note issued");
                            }
                          }}
                          className="w-full text-left px-3 py-2 rounded-sm border border-gray-100 hover:bg-gray-50 text-sm font-medium text-gray-900"
                        >
                          Invoice #{inv.number} · {inv.clientName} · {formatMoney(inv.total || 0)}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expense modal */}
      <ExpenseModal
        open={createModal === "expense"}
        onClose={() => setCreateModal(null)}
        onSave={(e) => {
          addExpense(e);
          setCreateModal(null);
          showSuccessToast("Expense added");
        }}
      />

      {/* Expense preview */}
      <AnimatePresence>
        {previewExpense?.attachment?.dataUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setPreviewExpense(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-2xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{previewExpense.attachment.name}</p>
                  <p className="text-xs text-gray-500 truncate">{previewExpense.vendor} · {expenseDateIso(previewExpense)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewExpense(null)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-gray-50/50">
                {previewExpense.attachment.mime === "application/pdf" ? (
                  <iframe title="Expense preview" src={previewExpense.attachment.dataUrl} className="w-full h-[70vh] rounded-xl bg-white border border-gray-100" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewExpense.attachment.dataUrl} alt="Expense attachment" className="w-full max-h-[70vh] object-contain rounded-xl bg-white border border-gray-100" />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LegacyFinanceDocumentsPage() {
  const { locale } = useLocale();
  const {
    companyProfile,
    clients,
    quotes,
    invoices,
    receipts,
    deliveryNotes,
    expenses,
    addQuote,
    addDeliveryNote,
    convertQuoteToInvoice,
    cancelInvoice,
    getInvoiceEffectiveStatus,
    issueReceiptFromInvoice,
    updateInvoiceStatus,
    updateInvoice,
    updateQuoteStatus,
  } = useFinance();
  const { getConversationsWithMeta, currentUserId } = useInternalMessages();
  const { contacts } = useContacts();
  const [activeTab, setActiveTab] = useState<"quotes" | "invoices" | "receipts" | "delivery_notes" | "expenses">("quotes");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterClientId, setFilterClientId] = useState("");
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [showNewDeliveryNote, setShowNewDeliveryNote] = useState(false);
  const [quoteClientId, setQuoteClientId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteDesc, setQuoteDesc] = useState("");
  const [deliveryNoteClientId, setDeliveryNoteClientId] = useState("");
  const [deliveryNoteAmount, setDeliveryNoteAmount] = useState("");
  const [deliveryNoteDesc, setDeliveryNoteDesc] = useState("");
  const [deliveryNoteNotes, setDeliveryNoteNotes] = useState("");
  const [quoteUseDocumentEditor, setQuoteUseDocumentEditor] = useState(false);
  const [quoteEditorItems, setQuoteEditorItems] = useState<LineItem[]>([{ id: generateUUID(), description: "", quantity: 1, unitPrice: 0 }]);
  const [quoteEditorVatRate, setQuoteEditorVatRate] = useState(DEFAULT_VAT_RATE);
  const [quoteEditorDate, setQuoteEditorDate] = useState(new Date().toISOString().slice(0, 10));
  const [quoteEditorDueDate, setQuoteEditorDueDate] = useState("");
  const companies = useMemo(() => clients.filter((c) => c.clientType === "company" || !c.clientType), [clients]);
  const privateClients = useMemo(() => clients.filter((c) => c.clientType === "private"), [clients]);
  const selectedClient = useMemo(() => clients.find((c) => c.id === quoteClientId), [clients, quoteClientId]);

  const chatList = useMemo(() => getConversationsWithMeta(currentUserId), [getConversationsWithMeta, currentUserId]);
  const filterClientOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    clients.forEach((c) => byId.set(c.id, { id: c.id, name: c.name }));
    chatList.forEach((x: { contactId: string }) => {
      const { contactId } = x;
      if (byId.has(contactId)) return;
      const contact = contacts.find((c) => c.id === contactId || c.phone === contactId);
      byId.set(contactId, { id: contactId, name: contact?.name ?? contactId });
    });
    return Array.from(byId.values());
  }, [clients, chatList, contacts]);

  const inDateRange = (dateStr: string, createdAt?: number) => {
    const d = dateStr || (createdAt ? new Date(createdAt).toISOString().slice(0, 10) : "");
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  };
  const byClient = (clientId: string) => {
    if (!filterClientId) return true;
    return clientId === filterClientId;
  };

  const filteredReceipts = useMemo(() => receipts.filter((r) => (r.status as string) !== "canceled" && byClient(r.clientId) && inDateRange(r.date, r.createdAt)), [receipts, filterClientId, dateFrom, dateTo]);
  const filteredInvoices = useMemo(() => invoices.filter((inv) => byClient(inv.clientId) && inDateRange(inv.date, inv.createdAt)), [invoices, filterClientId, dateFrom, dateTo]);
  const filteredQuotes = useMemo(() => quotes.filter((q) => (q.status as string) !== "canceled" && byClient(q.clientId) && inDateRange(q.date, q.createdAt)), [quotes, filterClientId, dateFrom, dateTo]);
  const filteredExpenses = useMemo(() => expenses.filter((e) => inDateRange(e.date, e.createdAt)), [expenses, dateFrom, dateTo]);

  const totalPaid = useMemo(() => filteredReceipts.reduce((s, r) => s + r.total, 0), [filteredReceipts]);
  const unpaidInvoices = useMemo(() => filteredInvoices.filter((inv) => inv.status !== "paid" && inv.status !== "canceled"), [filteredInvoices]);
  const unpaidAmount = useMemo(() => unpaidInvoices.reduce((s, inv) => s + inv.total, 0), [unpaidInvoices]);
  const activeQuotesCount = useMemo(() => filteredQuotes.filter((q) => (q.status as string) !== "canceled").length, [filteredQuotes]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);

  const handleNewQuote = () => {
    const client = clients.find((c) => c.id === quoteClientId);
    if (!client || !quoteAmount.trim()) return;
    addQuote({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      clientAddress: client.address,
      clientVatId: client.vatId,
      clientHpNumber: client.hpNumber,
      amount: quoteAmount.trim(),
      description: quoteDesc.trim(),
      date: new Date().toISOString().slice(0, 10),
    });
    setQuoteClientId("");
    setQuoteAmount("");
    setQuoteDesc("");
    setShowNewQuote(false);
    setQuoteUseDocumentEditor(false);
  };

  const handleNewQuoteFromEditor = () => {
    if (!selectedClient) return;
    addQuote({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientEmail: selectedClient.email,
      clientAddress: selectedClient.address,
      clientVatId: selectedClient.vatId,
      clientHpNumber: selectedClient.hpNumber,
      items: quoteEditorItems,
      date: quoteEditorDate,
      dueDate: quoteEditorDueDate || undefined,
      vatRate: quoteEditorVatRate,
    });
    setQuoteClientId("");
    setQuoteEditorItems([{ id: generateUUID(), description: "", quantity: 1, unitPrice: 0 }]);
    setQuoteEditorDate(new Date().toISOString().slice(0, 10));
    setQuoteEditorDueDate("");
    setQuoteEditorVatRate(companyProfile?.vatRate ?? DEFAULT_VAT_RATE);
    setShowNewQuote(false);
    setQuoteUseDocumentEditor(false);
  };

  const handleNewDeliveryNote = () => {
    const client = clients.find((c) => c.id === deliveryNoteClientId);
    if (!client || !deliveryNoteAmount.trim()) return;
    const amountNum = parseFloat(deliveryNoteAmount.replace(/,/g, "")) || 0;
    addDeliveryNote({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      clientAddress: client.address,
      clientVatId: client.vatId,
      clientHpNumber: client.hpNumber,
      items: [{ id: generateUUID(), description: deliveryNoteDesc.trim() || "Item", quantity: 1, unitPrice: amountNum }],
      date: new Date().toISOString().slice(0, 10),
      notes: deliveryNoteNotes.trim() || undefined,
    });
    setDeliveryNoteClientId("");
    setDeliveryNoteAmount("");
    setDeliveryNoteDesc("");
    setDeliveryNoteNotes("");
    setShowNewDeliveryNote(false);
  };

  const formatTotal = (n: number) => (typeof n === "number" ? n.toFixed(2) : String(n));
  const isActive = (s: string) => s !== "canceled";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white/95">
        <Link href="/dashboard" className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          Back
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent" />
          Documents
        </h1>
      </header>
      <div className="flex-1 p-4 space-y-4">
        <div className="flex gap-1 p-1 rounded bg-gray-100/80 overflow-x-auto">
          <button type="button" onClick={() => setActiveTab("quotes")} className={`flex-1 min-w-0 py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === "quotes" ? "bg-white shadow-soft text-gray-900" : "text-gray-600"}`}>
            <FileStack className="w-4 h-4 shrink-0" />
            {locale === "he" ? "הצעות" : "Quotes"}
          </button>
          <button type="button" onClick={() => setActiveTab("invoices")} className={`flex-1 min-w-0 py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === "invoices" ? "bg-white shadow-soft text-gray-900" : "text-gray-600"}`}>
            <FileText className="w-4 h-4 shrink-0" />
            {locale === "he" ? "חשבוניות" : "Invoices"}
          </button>
          <button type="button" onClick={() => setActiveTab("receipts")} className={`flex-1 min-w-0 py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === "receipts" ? "bg-white shadow-soft text-gray-900" : "text-gray-600"}`}>
            <Receipt className="w-4 h-4 shrink-0" />
            {locale === "he" ? "קבלות" : "Receipts"}
          </button>
          <button type="button" onClick={() => setActiveTab("delivery_notes")} className={`flex-1 min-w-0 py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === "delivery_notes" ? "bg-white shadow-soft text-gray-900" : "text-gray-600"}`}>
            <Package className="w-4 h-4 shrink-0" />
            {locale === "he" ? "תעודות משלוח" : "Delivery Notes"}
          </button>
        </div>

        {activeTab === "quotes" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowNewQuote((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-accent/10 text-accent font-medium text-sm hover:bg-accent/20"
            >
              <Plus className="w-4 h-4" />
              New Quote
            </button>
            {showNewQuote && (
              <div className="space-y-3">
                {quoteUseDocumentEditor && selectedClient ? (
                  <>
                    <p className="text-xs text-gray-500">{locale === "he" ? "תצוגת מסמך A4 — עריכה בזמן אמת" : "Live A4 document — edit below"}</p>
                    <LiveDocumentEditor
                      kind="quote"
                      locale={locale}
                      number="—"
                      companyName={companyProfile?.nameEn || companyProfile?.name || "Company"}
                      companyNameHe={companyProfile?.nameHe}
                      companyAddress={companyProfile?.address}
                      logoUrl={companyProfile?.logo}
                      clientName={selectedClient.name}
                      clientAddress={selectedClient.address}
                      date={quoteEditorDate}
                      dueDate={quoteEditorDueDate || undefined}
                      items={quoteEditorItems}
                      vatRate={quoteEditorVatRate}
                      onItemsChange={setQuoteEditorItems}
                      onVatRateChange={setQuoteEditorVatRate}
                      onDateChange={setQuoteEditorDate}
                      onDueDateChange={setQuoteEditorDueDate}
                      editable
                      showQrPlaceholder
                      signatureDataUrl={companyProfile?.signature}
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setQuoteUseDocumentEditor(false)} className="flex-1 py-2.5 rounded bg-gray-100 text-gray-700 font-medium">{locale === "he" ? "חזרה" : "Back"}</button>
                      <button type="button" onClick={handleNewQuoteFromEditor} className="flex-1 py-2.5 rounded bg-accent text-white font-medium">Create Quote</button>
                    </div>
                  </>
                ) : (
                  <div className="rounded bg-white shadow-soft p-4 border border-gray-200 space-y-3">
                    <select value={quoteClientId} onChange={(e) => setQuoteClientId(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900">
                      <option value="">{locale === "he" ? "בחר לקוח" : "Select client"}</option>
                      {companies.length > 0 && <optgroup label={locale === "he" ? "חברות" : "Companies"}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                      {privateClients.length > 0 && <optgroup label={locale === "he" ? "פרטי" : "Private"}>{privateClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                    </select>
                    {selectedClient && (
                      <div className="rounded bg-gray-50 p-2.5 text-xs text-gray-600 space-y-0.5">
                        {selectedClient.email && <p>Email: {selectedClient.email}</p>}
                        {selectedClient.address && <p>Address: {selectedClient.address}</p>}
                        {(selectedClient.vatId || selectedClient.hpNumber) && <p>VAT / H.P.: {[selectedClient.vatId, selectedClient.hpNumber].filter(Boolean).join(" · ")}</p>}
                      </div>
                    )}
                    <input type="text" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} placeholder={locale === "he" ? "סכום" : "Amount (e.g. 1,500)"} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900" />
                    <input type="text" value={quoteDesc} onChange={(e) => setQuoteDesc(e.target.value)} placeholder={locale === "he" ? "תיאור" : "Description (optional)"} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowNewQuote(false)} className="flex-1 py-2.5 rounded bg-gray-100 text-gray-700 font-medium">Cancel</button>
                      <button type="button" onClick={handleNewQuote} disabled={!quoteClientId || !quoteAmount.trim()} className="flex-1 py-2.5 rounded bg-accent text-white font-medium disabled:opacity-50">Create Quote</button>
                    </div>
                    {selectedClient && (
                      <button type="button" onClick={() => { setQuoteUseDocumentEditor(true); setQuoteEditorVatRate(companyProfile?.vatRate ?? DEFAULT_VAT_RATE); setQuoteEditorDate(new Date().toISOString().slice(0, 10)); }} className="w-full py-2 rounded border border-[#008080]/40 text-[#006666] text-sm font-medium">
                        {locale === "he" ? "ערוך כמסמך A4" : "Edit as A4 document"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {quotes.length === 0 && !showNewQuote && (
              <p className="text-sm text-gray-500 py-6 text-center rounded-2xl bg-gray-50">No quotes yet. Add a client in Clients, then create a quote above.</p>
            )}
            {(() => {
              const activeQuotes = quotes.filter((q) => isActive(q.status as string));
              const byCompany = activeQuotes.filter((q) => getClientType(clients, q.clientId) !== "private");
              const byPrivate = activeQuotes.filter((q) => getClientType(clients, q.clientId) === "private");
              return (
                <>
                  {byCompany.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Companies</h3>
                      {byCompany.map((q) => (
                        <DocumentCard
                          key={q.id}
                          type="Quote"
                          number={q.number}
                          clientName={q.clientName}
                          total={q.total}
                          status={q.status as string}
                          date={new Date(q.createdAt).toLocaleDateString()}
                          dueDate={q.dueDate}
                          borderAccent="teal"
                          primaryAction={{ label: "Convert to Tax Invoice", onClick: () => { convertQuoteToInvoice(q.id) && setActiveTab("invoices"); } }}
                          onView={() => openQuotePdf(q, companyDisplayName(companyProfile, locale), locale)}
                          onPrint={() => openQuotePdf(q, companyDisplayName(companyProfile, locale), locale)}
                          onSendToClient={() => { const c = clients.find((x) => x.id === q.clientId); if (c?.email) window.location.href = `mailto:${c.email}?subject=Quote%20%23${q.number}`; }}
                          onShare={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard/finances/documents?quote=${q.id}`); }}
                          onChangeStatus={() => updateQuoteStatus(q.id, "sent")}
                          onCancel={() => updateQuoteStatus(q.id, "canceled")}
                        />
                      ))}
                    </div>
                  )}
                  {byPrivate.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Private Clients</h3>
                      {byPrivate.map((q) => (
                        <DocumentCard
                          key={q.id}
                          type="Quote"
                          number={q.number}
                          clientName={q.clientName}
                          total={q.total}
                          status={q.status as string}
                          date={new Date(q.createdAt).toLocaleDateString()}
                          dueDate={q.dueDate}
                          borderAccent="amber"
                          primaryAction={{ label: "Convert to Tax Invoice", onClick: () => { convertQuoteToInvoice(q.id) && setActiveTab("invoices"); } }}
                          onView={() => openQuotePdf(q, companyDisplayName(companyProfile, locale), locale)}
                          onPrint={() => openQuotePdf(q, companyDisplayName(companyProfile, locale), locale)}
                          onSendToClient={() => { const c = clients.find((x) => x.id === q.clientId); if (c?.email) window.location.href = `mailto:${c.email}?subject=Quote%20%23${q.number}`; }}
                          onShare={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard/finances/documents?quote=${q.id}`); }}
                          onChangeStatus={() => updateQuoteStatus(q.id, "sent")}
                          onCancel={() => updateQuoteStatus(q.id, "canceled")}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
            {quotes.filter((q) => (q.status as string) === "canceled").length > 0 && (
              <p className="text-xs text-gray-400">Canceled quotes are not shown.</p>
            )}
          </div>
        )}

        {activeTab === "receipts" && (
          <div className="space-y-3">
            {receipts.length === 0 && (
              <p className="text-sm text-gray-500 py-6 text-center rounded-2xl bg-gray-50">No receipts. Issue a receipt from an invoice.</p>
            )}
            {receipts.filter((r) => (r.status as string) !== "canceled").map((rec) => (
              <DocumentCard
                key={rec.id}
                type="Receipt"
                number={rec.number}
                clientName={rec.clientName}
                total={rec.total}
                status={rec.status as string}
                date={new Date(rec.createdAt).toLocaleDateString()}
                borderAccent="teal"
                onView={() => {}}
                onShare={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard/finances/documents?receipt=${rec.id}`); }}
              />
            ))}
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="space-y-3">
            {invoices.length === 0 && (
              <p className="text-sm text-gray-500 py-6 text-center rounded-2xl bg-gray-50">No invoices. Convert a quote to create one.</p>
            )}
            {(() => {
              const byCompany = invoices.filter((inv) => getClientType(clients, inv.clientId) !== "private");
              const byPrivate = invoices.filter((inv) => getClientType(clients, inv.clientId) === "private");
              return (
                <>
                  {byCompany.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Companies</h3>
                      {byCompany.map((inv) => {
                        const eff = getInvoiceEffectiveStatus(inv);
                        return (
                          <DocumentCard
                            key={inv.id}
                            type="Invoice"
                            number={inv.number}
                            clientName={inv.clientName}
                            total={inv.total}
                            status={inv.status as string}
                            effectiveStatus={eff}
                            date={new Date(inv.createdAt).toLocaleDateString()}
                            dueDate={inv.dueDate}
                            borderAccent="teal"
                            primaryAction={inv.status !== "canceled" ? { label: "Issue Receipt", onClick: () => { issueReceiptFromInvoice(inv.id) && setActiveTab("receipts"); } } : undefined}
                            onView={() => openInvoicePdf(inv, companyDisplayName(companyProfile, locale), companyProfile.signature, locale)}
                            onPrint={() => openInvoicePdf(inv, companyDisplayName(companyProfile, locale), companyProfile.signature, locale)}
                            onSendToClient={() => { const c = clients.find((x) => x.id === inv.clientId); if (c?.email) window.location.href = `mailto:${c.email}?subject=Invoice%20%23${inv.number}`; }}
                            onShare={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard/finances/documents?invoice=${inv.id}`); }}
                            onChangeStatus={() => {}}
                            onCancel={inv.status !== "canceled" ? () => cancelInvoice(inv.id) : undefined}
                          >
                            {inv.status !== "canceled" && (
                              <>
                                {(inv.status === "draft" || (inv.status as string) === "active") && (
                                  <>
                                    <button type="button" onClick={() => updateInvoiceStatus(inv.id, "sent")} className="px-3 py-1.5 rounded-lg bg-[#008080]/15 text-[#006666] text-xs font-medium">Mark Sent</button>
                                    <input type="date" value={inv.dueDate || ""} onChange={(e) => updateInvoice(inv.id, { dueDate: e.target.value || undefined })} className="rounded-lg border border-gray-200 px-2 py-1 text-xs" title="Due date" />
                                  </>
                                )}
                                {((inv.status as string) === "sent" || (inv.status as string) === "active" || eff === "overdue") && (
                                  <button type="button" onClick={() => updateInvoiceStatus(inv.id, "paid")} className="px-3 py-1.5 rounded-lg bg-[#008080]/15 text-[#006666] text-xs font-medium">Mark Paid</button>
                                )}
                              </>
                            )}
                          </DocumentCard>
                        );
                      })}
                    </div>
                  )}
                  {byPrivate.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Private Clients</h3>
                      {byPrivate.map((inv) => {
                        const eff = getInvoiceEffectiveStatus(inv);
                        return (
                          <DocumentCard
                            key={inv.id}
                            type="Invoice"
                            number={inv.number}
                            clientName={inv.clientName}
                            total={inv.total}
                            status={inv.status as string}
                            effectiveStatus={eff}
                            date={new Date(inv.createdAt).toLocaleDateString()}
                            dueDate={inv.dueDate}
                            borderAccent="amber"
                            primaryAction={inv.status !== "canceled" ? { label: "Issue Receipt", onClick: () => { issueReceiptFromInvoice(inv.id) && setActiveTab("receipts"); } } : undefined}
                            onView={() => openInvoicePdf(inv, companyDisplayName(companyProfile, locale), companyProfile.signature, locale)}
                            onPrint={() => openInvoicePdf(inv, companyDisplayName(companyProfile, locale), companyProfile.signature, locale)}
                            onSendToClient={() => { const c = clients.find((x) => x.id === inv.clientId); if (c?.email) window.location.href = `mailto:${c.email}?subject=Invoice%20%23${inv.number}`; }}
                            onShare={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard/finances/documents?invoice=${inv.id}`); }}
                            onChangeStatus={() => {}}
                            onCancel={inv.status !== "canceled" ? () => cancelInvoice(inv.id) : undefined}
                          >
                            {inv.status !== "canceled" && (
                              <>
                                {(inv.status === "draft" || (inv.status as string) === "active") && (
                                  <>
                                    <button type="button" onClick={() => updateInvoiceStatus(inv.id, "sent")} className="px-3 py-1.5 rounded-lg bg-[#008080]/15 text-[#006666] text-xs font-medium">Mark Sent</button>
                                    <input type="date" value={inv.dueDate || ""} onChange={(e) => updateInvoice(inv.id, { dueDate: e.target.value || undefined })} className="rounded-lg border border-gray-200 px-2 py-1 text-xs" title="Due date" />
                                  </>
                                )}
                                {((inv.status as string) === "sent" || (inv.status as string) === "active" || eff === "overdue") && (
                                  <button type="button" onClick={() => updateInvoiceStatus(inv.id, "paid")} className="px-3 py-1.5 rounded-lg bg-[#008080]/15 text-[#006666] text-xs font-medium">Mark Paid</button>
                                )}
                              </>
                            )}
                          </DocumentCard>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {activeTab === "delivery_notes" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowNewDeliveryNote((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-accent/10 text-accent font-medium text-sm hover:bg-accent/20"
            >
              <Plus className="w-4 h-4" />
              {locale === "he" ? "תעודת משלוח חדשה" : "New Delivery Note"}
            </button>
            {showNewDeliveryNote && (
              <div className="rounded bg-white shadow-soft p-4 border border-gray-200 space-y-3">
                <select value={deliveryNoteClientId} onChange={(e) => setDeliveryNoteClientId(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900">
                  <option value="">{locale === "he" ? "בחר לקוח" : "Select client"}</option>
                  {companies.length > 0 && <optgroup label={locale === "he" ? "חברות" : "Companies"}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                  {privateClients.length > 0 && <optgroup label={locale === "he" ? "פרטי" : "Private"}>{privateClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                </select>
                <input type="text" value={deliveryNoteAmount} onChange={(e) => setDeliveryNoteAmount(e.target.value)} placeholder={locale === "he" ? "סכום" : "Amount"} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900" />
                <input type="text" value={deliveryNoteDesc} onChange={(e) => setDeliveryNoteDesc(e.target.value)} placeholder={locale === "he" ? "תיאור" : "Description"} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900" />
                <input type="text" value={deliveryNoteNotes} onChange={(e) => setDeliveryNoteNotes(e.target.value)} placeholder={locale === "he" ? "הערות (אחריות/משך)" : "Notes (Warranty/Duration)"} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowNewDeliveryNote(false)} className="flex-1 py-2.5 rounded bg-gray-100 text-gray-700 font-medium">{locale === "he" ? "ביטול" : "Cancel"}</button>
                  <button type="button" onClick={handleNewDeliveryNote} disabled={!deliveryNoteClientId || !deliveryNoteAmount.trim()} className="flex-1 py-2.5 rounded bg-accent text-white font-medium disabled:opacity-50">{locale === "he" ? "צור תעודה" : "Create"}</button>
                </div>
              </div>
            )}
            {deliveryNotes.filter((d) => (d.status as string) !== "canceled").length === 0 && !showNewDeliveryNote && (
              <p className="text-sm text-gray-500 py-6 text-center rounded bg-gray-50">{locale === "he" ? "אין תעודות משלוח. צור אחת למעלה." : "No delivery notes. Create one above."}</p>
            )}
            {deliveryNotes.filter((d) => (d.status as string) !== "canceled").map((dn) => (
              <DocumentCard key={dn.id} type={locale === "he" ? "תעודת משלוח" : "Delivery Note"} number={dn.number} clientName={dn.clientName} total={dn.total} status={dn.status as string} date={new Date(dn.createdAt).toLocaleDateString()} borderAccent="teal" onView={() => {}} onShare={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard/finances/documents?delivery=${dn.id}`); }} />
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Link href="/dashboard/finances/company-profile" className="flex-1 text-center py-2.5 rounded bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
            Company
          </Link>
          <Link href="/dashboard/finances/clients" className="flex-1 text-center py-2.5 rounded bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
            Clients
          </Link>
        </div>
      </div>
    </div>
  );
}
