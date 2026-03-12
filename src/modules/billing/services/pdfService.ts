/**
 * Professional PDF generation: minimalist template, SHA-256 hash, signature badge, optional QR and password.
 */

import type { BillingDocument } from "../types";
import type { BusinessProfile } from "@/contexts/ChatEngineContext";
import { documentCanonicalString } from "./hashService";
import { sha256Hex } from "./hashService";

const FONT_SIZE = 10;
const MARGIN = 20;
const PAGE_W = 210;
const PAGE_H = 297;

function drawLogo(
  jsPDF: import("jspdf").jsPDF,
  businessLogo: string | undefined,
  x: number,
  y: number,
  w: number,
  h: number
): number {
  if (businessLogo) {
    try {
      jsPDF.addImage(businessLogo, "JPEG", x, y, w, h);
    } catch {
      try {
        jsPDF.addImage(businessLogo, "PNG", x, y, w, h);
      } catch {
        jsPDF.rect(x, y, w, h);
        jsPDF.text("Logo", x + w / 2 - 5, y + h / 2 - 2);
      }
    }
  } else {
    jsPDF.rect(x, y, w, h);
    jsPDF.setFontSize(8).text("Logo", x + w / 2 - 4, y + h / 2 - 2);
  }
  return y + h + 6;
}

function addFooter(
  jsPDF: import("jspdf").jsPDF,
  contentHash: string,
  signedAt: number,
  qrDataUrl: string | null,
  pageNumber: number,
  totalPages: number
): void {
  const y = PAGE_H - 28;
  jsPDF.setDrawColor(220, 220, 220);
  jsPDF.line(MARGIN, y, PAGE_W - MARGIN, y);
  jsPDF.setFontSize(8).setTextColor(100, 100, 100);
  jsPDF.text(
    `Digitally Signed by Ollin | ${new Date(signedAt).toISOString()} | Hash: ${contentHash.slice(0, 16)}...`,
    MARGIN,
    y + 6
  );
  if (qrDataUrl) {
    try {
      jsPDF.addImage(qrDataUrl, "PNG", PAGE_W - MARGIN - 24, y - 2, 20, 20);
    } catch (_) {}
  }
  jsPDF.text(`Page ${pageNumber} of ${totalPages}`, PAGE_W / 2 - 10, PAGE_H - 8, { align: "center" });
}

/** Draw a diagonal red "CANCELLED" stamp on the page (for canceled invoices/receipts). */
function drawCanceledStamp(jsPDF: import("jspdf").jsPDF): void {
  const cx = PAGE_W / 2;
  const cy = PAGE_H / 2;
  const label = "CANCELLED";
  jsPDF.setFontSize(32).setFont(undefined, "bold").setTextColor(185, 28, 28);
  jsPDF.text(label, cx, cy, { align: "center", angle: -25 });
}

export interface PdfOptions {
  /** Optional: lock PDF with password (e.g. last 4 digits of client phone) */
  password?: string;
  /** Optional: QR code image data URL for payment/profile link */
  qrDataUrl?: string | null;
  /** Document language for labels: he, en, or bilingual (default from doc.documentLanguage or "en") */
  documentLanguage?: "he" | "en" | "bilingual";
}

type PdfLang = "he" | "en";

function pdfLabels(lang: PdfLang): {
  from: string;
  to: string;
  subject: string;
  taxId: string;
  description: string;
  qty: string;
  unitPrice: string;
  discount: string;
  amount: string;
  subtotalBefore: string;
  discountLabel: string;
  subtotal: string;
  vat: string;
  total: string;
  notes: string;
  bankDetails: string;
  date: string;
  creditFor: string;
  cancelReceipt: string;
  typeInvoice: string;
  typeQuote: string;
  typeReceipt: string;
  typeDeliveryNote: string;
  typeCreditNote: string;
  typeNegativeReceipt: string;
  typeDraft: string;
} {
  if (lang === "he") {
    return {
      from: "מהחברה",
      to: "אל",
      subject: "נושא המסמך",
      taxId: "ח.פ",
      description: "תיאור",
      qty: "כמות",
      unitPrice: "מחיר",
      discount: "הנחה",
      amount: "סה\"כ",
      subtotalBefore: "סיכום לפני הנחה",
      discountLabel: "הנחה",
      subtotal: "סיכום ביניים (ללא מע\"מ)",
      vat: "מע\"מ",
      total: "סה\"כ כולל",
      notes: "הערות",
      bankDetails: "פרטי בנק",
      date: "תאריך",
      creditFor: "זיכוי עבור חשבונית",
      cancelReceipt: "ביטול קבלה",
      typeInvoice: "חשבונית",
      typeQuote: "הצעת מחיר",
      typeReceipt: "קבלה",
      typeDeliveryNote: "תעודת משלוח",
      typeCreditNote: "מסמך זיכוי",
      typeNegativeReceipt: "קבלה שלילית",
      typeDraft: "טיוטה",
    };
  }
  return {
    from: "From",
    to: "To",
    subject: "Subject",
    taxId: "Tax ID",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit Price",
    discount: "Disc.%",
    amount: "Amount",
    subtotalBefore: "Subtotal (before discount)",
    discountLabel: "Discount",
    subtotal: "Subtotal",
    vat: "VAT",
    total: "Total",
    notes: "Notes",
    bankDetails: "Bank details for payment",
    date: "Date",
    creditFor: "Credit for Invoice #",
    cancelReceipt: "Cancellation of Receipt #",
    typeInvoice: "Invoice",
    typeQuote: "Quote",
    typeReceipt: "Receipt",
    typeDeliveryNote: "Delivery Note",
    typeCreditNote: "Credit Note",
    typeNegativeReceipt: "Negative Receipt",
    typeDraft: "Draft",
  };
}

/**
 * Generate PDF blob for the document. Computes content hash and adds signature badge in footer.
 * Uses the same data as the A4 UI Preview (WYSIWYG): doc must include id, number, type, client*,
 * items (with discountPct), subtotal, vatRate, vatAmount, total, date, title, notes, documentLanguage.
 * Returns { blob, contentHash } for storing on document.
 */
export async function generateDocumentPdf(
  doc: BillingDocument,
  from: BusinessProfile,
  options: PdfOptions = {}
): Promise<{ blob: Blob; contentHash: string }> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const canonical = documentCanonicalString(doc);
  const contentHash = await sha256Hex(canonical);
  const signedAt = Date.now();

  const lang: PdfLang = (doc.documentLanguage ?? options.documentLanguage ?? "en") === "he" ? "he" : "en";
  const L = pdfLabels(lang);

  let y = MARGIN;

  // Document title (subject) – same as preview
  if (doc.title && doc.title.trim()) {
    pdf.setFontSize(9).setTextColor(100, 100, 100);
    pdf.text(L.subject, MARGIN, y);
    y += 4;
    pdf.setFontSize(11).setTextColor(0, 0, 0);
    pdf.text(doc.title.trim().slice(0, 80), MARGIN, y);
    y += 6;
  }

  // Header: From | To – Company ID (ח.פ) and address
  const headerY = y;
  const logoH = 16;
  const logoW = 16;
  y = drawLogo(pdf, from.businessLogo || undefined, MARGIN, headerY, logoW, logoH);
  pdf.setFontSize(10).setTextColor(0, 0, 0);
  pdf.text(L.from, MARGIN, y);
  y += 3.5;
  pdf.setFontSize(9).setTextColor(60, 60, 60);
  pdf.text(from.legalName || "—", MARGIN, y);
  y += 3.5;
  if (from.taxId && from.taxId.trim()) {
    pdf.text(`${L.taxId}: ${from.taxId.trim()}`, MARGIN, y);
    y += 3.5;
  }
  if (from.address && from.address.trim()) {
    pdf.text(from.address.trim().slice(0, 55), MARGIN, y);
    y += 3.5;
  }
  y += 1;

  const toStartY = headerY;
  pdf.setFontSize(9).setTextColor(0, 0, 0);
  pdf.text(L.to, PAGE_W / 2 + 5, toStartY + 3.5);
  pdf.setFontSize(9).setTextColor(60, 60, 60);
  pdf.text(doc.clientName || "—", PAGE_W / 2 + 5, toStartY + 7);
  const toLine2 = [doc.clientEmail || "", doc.clientAddress || ""].filter(Boolean).join(" · ");
  if (toLine2) pdf.text(toLine2.slice(0, 50), PAGE_W / 2 + 5, toStartY + 10.5);
  y = Math.max(y, toStartY + 14);

  const typeLabel =
    doc.type === "invoice"
      ? L.typeInvoice
      : doc.type === "quote"
        ? L.typeQuote
        : doc.type === "receipt"
          ? L.typeReceipt
          : doc.type === "delivery_note"
            ? L.typeDeliveryNote
            : doc.type === "credit_note"
              ? L.typeCreditNote
              : doc.type === "negative_receipt"
                ? L.typeNegativeReceipt
                : L.typeDraft;
  pdf.setFontSize(16).setTextColor(0, 102, 102);
  pdf.text(`${typeLabel} ${doc.number}`, PAGE_W - MARGIN, MARGIN, { align: "right" });
  y = Math.max(y, MARGIN + 6);
  pdf.setFontSize(8).setTextColor(100, 100, 100);
  pdf.text(`${L.date}: ${doc.date}`, PAGE_W - MARGIN, y, { align: "right" });
  y += 4;
  if (doc.type === "credit_note" && doc.creditForInvoiceNumber) {
    pdf.text(`${L.creditFor}${doc.creditForInvoiceNumber}`, PAGE_W - MARGIN, y, { align: "right" });
    y += 4;
  }
  if (doc.type === "negative_receipt" && doc.originalReceiptNumber) {
    pdf.text(`${L.cancelReceipt} #${doc.originalReceiptNumber}`, PAGE_W - MARGIN, y, { align: "right" });
    y += 4;
  }
  y += 4;

  const hasDiscount = doc.items.some((i) => (i.discountPct ?? 0) > 0);
  const colW = hasDiscount ? [72, 16, 26, 14, 28] : [90, 20, 30, 30];
  const tableX = MARGIN;
  const tableW = colW.reduce((a, b) => a + b, 0);
  pdf.setFillColor(248, 248, 248);
  pdf.rect(tableX, y, tableW, 6);
  pdf.setFontSize(8).setTextColor(0, 0, 0);
  let cx = tableX + 2;
  pdf.text(L.description, cx, y + 4);
  cx += colW[0];
  pdf.text(L.qty, cx, y + 4);
  cx += colW[1];
  pdf.text(L.unitPrice, cx, y + 4);
  if (hasDiscount) {
    cx += colW[2];
    pdf.text(L.discount, cx, y + 4);
    cx += colW[3];
  }
  pdf.text(L.amount, tableX + tableW - 22, y + 4);
  y += 6;

  doc.items.forEach((item) => {
    const pct = item.discountPct ?? 0;
    const amount = Math.round(item.quantity * item.unitPrice * (1 - pct / 100) * 100) / 100;
    pdf.setFontSize(8);
    cx = tableX + 2;
    pdf.text(item.description.slice(0, 40), cx, y + 3);
    cx += colW[0];
    pdf.text(String(item.quantity), cx, y + 3);
    cx += colW[1];
    pdf.text(item.unitPrice.toFixed(2), cx, y + 3);
    if (hasDiscount) {
      cx += colW[2];
      pdf.text(pct > 0 ? `${pct}%` : "—", cx, y + 3);
      cx += colW[3];
    }
    pdf.text(amount.toFixed(2), tableX + tableW - 22, y + 3);
    y += 4;
  });

  const formatPdfAmount = (n: number) => (n < 0 ? `-${(-n).toFixed(2)}` : n.toFixed(2));
  const totalDiscountAmount = doc.items.reduce((sum, i) => {
    const pct = i.discountPct ?? 0;
    if (pct <= 0) return sum;
    return sum + Math.round(i.quantity * i.unitPrice * (pct / 100) * 100) / 100;
  }, 0);
  const totalsLabelX = tableX + tableW - 44;
  const totalsValueX = tableX + tableW - 22;
  y += 4;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(tableX, y, tableX + tableW, y);
  y += 5;
  pdf.setFontSize(8).setTextColor(60, 60, 60);
  if (hasDiscount && totalDiscountAmount > 0) {
    const subtotalBefore = doc.subtotal + totalDiscountAmount;
    pdf.text(L.subtotalBefore, totalsLabelX, y + 3);
    pdf.text(formatPdfAmount(subtotalBefore), totalsValueX, y + 3);
    y += 4;
    pdf.text(L.discountLabel, totalsLabelX, y + 3);
    pdf.setTextColor(0, 128, 0);
    pdf.text(`-${formatPdfAmount(totalDiscountAmount)}`, totalsValueX, y + 3);
    pdf.setTextColor(60, 60, 60);
    y += 4;
  }
  pdf.text(L.subtotal, totalsLabelX, y + 3);
  pdf.text(formatPdfAmount(doc.subtotal), totalsValueX, y + 3);
  y += 4;
  pdf.text(`${L.vat} (${doc.vatRate}%)`, totalsLabelX, y + 3);
  pdf.text(formatPdfAmount(doc.vatAmount), totalsValueX, y + 3);
  y += 4;
  pdf.setFontSize(9).setFont(undefined, "bold").setTextColor(0, 0, 0);
  pdf.text(L.total, totalsLabelX, y + 3);
  pdf.text(formatPdfAmount(doc.total), totalsValueX, y + 3);
  y += 6;

  if (doc.notes && doc.notes.trim()) {
    pdf.setDrawColor(220, 220, 220);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
    pdf.setFontSize(9).setTextColor(0, 0, 0);
    pdf.text(L.notes, MARGIN, y);
    y += 5;
    pdf.setFontSize(8).setTextColor(60, 60, 60);
    const notesLines = doc.notes.trim().split(/\r?\n/);
    for (let i = 0; i < Math.min(notesLines.length, 8); i++) {
      pdf.text(notesLines[i].slice(0, 85), MARGIN, y);
      y += 4;
    }
    y += 4;
  }

  // Bank details: on invoices, credit notes, and negative receipts (every A4 issued doc)
  const showBankDetails = (doc.type === "invoice" || doc.type === "credit_note" || doc.type === "negative_receipt") && from.bankDetails && (from.bankDetails.iban || from.bankDetails.bankName || from.bankDetails.accountNumber);
  if (showBankDetails) {
    pdf.setDrawColor(220, 220, 220);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;
    pdf.setFontSize(9).setTextColor(60, 60, 60);
    pdf.text(L.bankDetails, MARGIN, y);
    y += 5;
    if (from.bankDetails.bankName) pdf.text(from.bankDetails.bankName, MARGIN, y), (y += 5);
    if (from.bankDetails.branchNumber || from.bankDetails.accountNumber) {
      pdf.text([from.bankDetails.branchNumber, from.bankDetails.accountNumber].filter(Boolean).join(" / "), MARGIN, y);
      y += 5;
    }
    if (from.bankDetails.iban) pdf.text(`IBAN: ${from.bankDetails.iban}`, MARGIN, y), (y += 5);
    y += 4;
  }

  // Footer on first page
  addFooter(pdf, contentHash, signedAt, options.qrDataUrl ?? null, 1, 1);

  // Canceled stamp: diagonal red "CANCELLED" for canceled invoices/receipts (not for credit note / negative receipt)
  const isCanceledDoc =
    (doc.status as string) === "canceled" &&
    (doc.type === "invoice" || doc.type === "receipt");
  if (isCanceledDoc) {
    drawCanceledStamp(pdf);
  }

  // Password protection: optional (e.g. last 4 of client phone). jsPDF encryption varies by build.
  if (options.password) {
    try {
      (pdf as unknown as { setEncryption: (p: string) => void }).setEncryption?.(options.password);
    } catch (_) {}
  }

  const blob = pdf.output("blob");
  return { blob, contentHash };
}
