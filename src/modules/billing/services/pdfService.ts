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

  // From (issuer)
  y = drawLogo(pdf, from.businessLogo || undefined, MARGIN, y, 28, 28);
  pdf.setFontSize(12).setTextColor(0, 0, 0);
  pdf.text(from.legalName || "—", MARGIN, y);
  y += 6;
  pdf.setFontSize(9).setTextColor(80, 80, 80);
  if (from.taxId) pdf.text(`Tax ID: ${from.taxId}`, MARGIN, y), (y += 5);
  if (from.address) pdf.text(from.address, MARGIN, y), (y += 5);
  y += 8;

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
  y = Math.max(y, MARGIN + 10);
  pdf.setFontSize(9).setTextColor(100, 100, 100);
  pdf.text(`Date: ${doc.date}`, PAGE_W - MARGIN, y, { align: "right" });
  y += 5;
  if (doc.type === "credit_note" && doc.creditForInvoiceNumber) {
    pdf.text(`For Invoice #${doc.creditForInvoiceNumber}`, PAGE_W - MARGIN, y, { align: "right" });
    y += 5;
  }
  if (doc.type === "negative_receipt" && doc.originalReceiptNumber) {
    pdf.text(`For Receipt #${doc.originalReceiptNumber}`, PAGE_W - MARGIN, y, { align: "right" });
    y += 5;
  }
  y += 7;

  // To (client)
  pdf.setFontSize(11).setTextColor(0, 0, 0);
  pdf.text("Bill To", MARGIN, y);
  y += 6;
  pdf.setFontSize(9);
  pdf.text(doc.clientName || "—", MARGIN, y);
  y += 5;
  if (doc.clientEmail) pdf.text(doc.clientEmail, MARGIN, y), (y += 5);
  if (doc.clientAddress) pdf.text(doc.clientAddress, MARGIN, y), (y += 5);
  y += 10;

  // Table header
  const colW = [90, 20, 30, 30];
  const tableX = MARGIN;
  pdf.setFillColor(248, 248, 248);
  pdf.rect(tableX, y, colW.reduce((a, b) => a + b, 0), 8);
  pdf.setFontSize(9).setTextColor(0, 0, 0);
  pdf.text("Description", tableX + 2, y + 5.5);
  pdf.text("Qty", tableX + 92, y + 5.5);
  pdf.text("Unit Price", tableX + 114, y + 5.5);
  pdf.text("Amount", tableX + 126, y + 5.5);
  y += 10;

  doc.items.forEach((item) => {
    const amount = item.quantity * item.unitPrice;
    pdf.setFontSize(9);
    pdf.text(item.description.slice(0, 50), tableX + 2, y + 4);
    pdf.text(String(item.quantity), tableX + 92, y + 4);
    pdf.text(item.unitPrice.toFixed(2), tableX + 114, y + 4);
    pdf.text(amount.toFixed(2), tableX + 126, y + 4);
    y += 6;
  });

  const formatPdfAmount = (n: number) => (n < 0 ? `-${(-n).toFixed(2)}` : n.toFixed(2));
  y += 6;
  pdf.setFontSize(9);
  pdf.text("Subtotal", tableX + 92, y + 4);
  pdf.text(formatPdfAmount(doc.subtotal), tableX + 126, y + 4);
  y += 6;
  pdf.text(`VAT (${doc.vatRate}%)`, tableX + 92, y + 4);
  pdf.text(formatPdfAmount(doc.vatAmount), tableX + 126, y + 4);
  y += 6;
  pdf.setFontSize(10).setFont(undefined, "bold");
  pdf.text("Total", tableX + 92, y + 4);
  pdf.text(formatPdfAmount(doc.total), tableX + 126, y + 4);
  y += 10;

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

  // Password protection: optional (e.g. last 4 of client phone). jsPDF encryption varies by build.
  if (options.password) {
    try {
      (pdf as unknown as { setEncryption: (p: string) => void }).setEncryption?.(options.password);
    } catch (_) {}
  }

  const blob = pdf.output("blob");
  return { blob, contentHash };
}
