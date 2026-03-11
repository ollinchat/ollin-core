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
}

/**
 * Generate PDF blob for the document. Computes content hash and adds signature badge in footer.
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

  let y = MARGIN;

  // Document title (subject) at top when set
  if (doc.title && doc.title.trim()) {
    pdf.setFontSize(9).setTextColor(100, 100, 100);
    pdf.text("Subject", MARGIN, y);
    y += 4;
    pdf.setFontSize(11).setTextColor(0, 0, 0);
    pdf.text(doc.title.trim().slice(0, 80), MARGIN, y);
    y += 6;
  }

  // Compact header: From | To – minimal vertical space
  const headerY = y;
  const logoH = 16;
  const logoW = 16;
  y = drawLogo(pdf, from.businessLogo || undefined, MARGIN, headerY, logoW, logoH);
  pdf.setFontSize(10).setTextColor(0, 0, 0);
  pdf.text("From", MARGIN, y);
  y += 3.5;
  pdf.setFontSize(9).setTextColor(60, 60, 60);
  pdf.text(from.legalName || "—", MARGIN, y);
  y += 3.5;
  const fromLine2 = [from.taxId ? `Tax ID: ${from.taxId}` : "", from.address || ""].filter(Boolean).join(" · ");
  if (fromLine2) pdf.text(fromLine2.slice(0, 55), MARGIN, y), (y += 3.5);
  y += 1;

  const toStartY = headerY;
  pdf.setFontSize(9).setTextColor(0, 0, 0);
  pdf.text("To", PAGE_W / 2 + 5, toStartY + 3.5);
  pdf.setFontSize(9).setTextColor(60, 60, 60);
  pdf.text(doc.clientName || "—", PAGE_W / 2 + 5, toStartY + 7);
  const toLine2 = [doc.clientEmail || "", doc.clientAddress || ""].filter(Boolean).join(" · ");
  if (toLine2) pdf.text(toLine2.slice(0, 50), PAGE_W / 2 + 5, toStartY + 10.5);
  y = Math.max(y, toStartY + 14);

  // Doc type & number
  const typeLabel =
    doc.type === "invoice"
      ? "Invoice"
      : doc.type === "quote"
        ? "Quote"
        : doc.type === "receipt"
          ? "Receipt"
          : doc.type === "delivery_note"
            ? "Delivery Note"
            : doc.type === "credit_note"
              ? "Credit Note"
              : doc.type === "negative_receipt"
                ? "Negative Receipt"
                : "Draft";
  pdf.setFontSize(16).setTextColor(0, 102, 102);
  pdf.text(`${typeLabel} ${doc.number}`, PAGE_W - MARGIN, MARGIN, { align: "right" });
  y = Math.max(y, MARGIN + 6);
  pdf.setFontSize(8).setTextColor(100, 100, 100);
  pdf.text(`Date: ${doc.date}`, PAGE_W - MARGIN, y, { align: "right" });
  y += 4;
  if (doc.type === "credit_note" && doc.creditForInvoiceNumber) {
    pdf.text(`Credit for Invoice #${doc.creditForInvoiceNumber}`, PAGE_W - MARGIN, y, { align: "right" });
    y += 4;
  }
  if (doc.type === "negative_receipt" && doc.originalReceiptNumber) {
    pdf.text(`Cancellation of Receipt #${doc.originalReceiptNumber}`, PAGE_W - MARGIN, y, { align: "right" });
    y += 4;
  }
  y += 4;

  // Table: optional Discount column when any line has discount
  const hasDiscount = doc.items.some((i) => (i.discountPct ?? 0) > 0);
  const colW = hasDiscount ? [72, 16, 26, 14, 28] : [90, 20, 30, 30];
  const tableX = MARGIN;
  const tableW = colW.reduce((a, b) => a + b, 0);
  pdf.setFillColor(248, 248, 248);
  pdf.rect(tableX, y, tableW, 6);
  pdf.setFontSize(8).setTextColor(0, 0, 0);
  let cx = tableX + 2;
  pdf.text("Description", cx, y + 4);
  cx += colW[0];
  pdf.text("Qty", cx, y + 4);
  cx += colW[1];
  pdf.text("Unit Price", cx, y + 4);
  if (hasDiscount) {
    cx += colW[2];
    pdf.text("Disc.%", cx, y + 4);
    cx += colW[3];
  }
  pdf.text("Amount", tableX + tableW - 22, y + 4);
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
  const totalsLabelX = tableX + tableW - 44;
  const totalsValueX = tableX + tableW - 22;
  y += 4;
  pdf.setFontSize(8);
  pdf.text("Subtotal", totalsLabelX, y + 3);
  pdf.text(formatPdfAmount(doc.subtotal), totalsValueX, y + 3);
  y += 4;
  pdf.text(`VAT (${doc.vatRate}%)`, totalsLabelX, y + 3);
  pdf.text(formatPdfAmount(doc.vatAmount), totalsValueX, y + 3);
  y += 4;
  pdf.setFontSize(9).setFont(undefined, "bold");
  pdf.text("Total", totalsLabelX, y + 3);
  pdf.text(formatPdfAmount(doc.total), totalsValueX, y + 3);
  y += 6;

  // Bank details: on invoices, credit notes, and negative receipts (every A4 issued doc)
  const showBankDetails = (doc.type === "invoice" || doc.type === "credit_note" || doc.type === "negative_receipt") && from.bankDetails && (from.bankDetails.iban || from.bankDetails.bankName || from.bankDetails.accountNumber);
  if (showBankDetails) {
    pdf.setDrawColor(220, 220, 220);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;
    pdf.setFontSize(9).setTextColor(60, 60, 60);
    pdf.text("Bank details for payment", MARGIN, y);
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
