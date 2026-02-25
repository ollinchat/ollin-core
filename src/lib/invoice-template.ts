/**
 * Israeli-standard document templates: Tax Invoice / חשבונית מס
 * Auto-numbering and headers for invoices and receipts.
 */

import { TAX_INVOICE_HEADER_EN, TAX_INVOICE_HEADER_HE } from "./finance-types";

function getCounter(key: string, defaultVal: number): number {
  if (typeof window === "undefined") return defaultVal;
  return parseInt(localStorage.getItem(key) ?? String(defaultVal), 10);
}

/** Sequential document IDs: #0001, #0002, ... (4-digit, starting from 1). */
const DOC_NUMBER_DIGITS = 4;
const DEFAULT_COUNTER = 1;

function incrementCounter(key: string, defaultVal: number): string {
  const next = getCounter(key, defaultVal) + 1;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(key, String(next));
    } catch (_) {}
  }
  return String(next).padStart(DOC_NUMBER_DIGITS, "0");
}

export function getNextQuoteNumber(): string {
  return incrementCounter("ollin_quote_counter", DEFAULT_COUNTER);
}

export function getNextInvoiceNumber(): string {
  return incrementCounter("ollin_invoice_counter", DEFAULT_COUNTER);
}

export function getNextReceiptNumber(): string {
  return incrementCounter("ollin_receipt_counter", DEFAULT_COUNTER);
}

export function getTaxInvoiceHeader(locale: "en" | "he"): string {
  return locale === "he" ? TAX_INVOICE_HEADER_HE : TAX_INVOICE_HEADER_EN;
}

/** Build HTML fragment for a tax invoice header (Israeli standards) */
export function buildTaxInvoiceHeaderHtml(locale: "en" | "he", invoiceNumber?: string): string {
  const num = invoiceNumber ?? getNextInvoiceNumber();
  const title = getTaxInvoiceHeader(locale);
  return `
    <div class="invoice-header" style="border-bottom:2px solid #0D9488;padding-bottom:1rem;margin-bottom:1.5rem;">
      <h1 style="color:#0D9488;font-size:1.5rem;margin:0;">${title}</h1>
      <p style="color:#6b7280;font-size:0.875rem;margin:0.25rem 0 0 0;">Invoice #${num}</p>
    </div>`;
}

/** Build HTML for signature overlay (for PDFs/documents). */
export function buildSignatureOverlayHtml(signatureImageDataUrl: string): string {
  return `<div class="signature-overlay" style="margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e7eb;"><img src="${signatureImageDataUrl}" alt="Signature" style="max-width:180px;height:auto;display:block;" /></div>`;
}
