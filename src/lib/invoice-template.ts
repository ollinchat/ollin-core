/**
 * Israeli-standard document templates: Tax Invoice / חשבונית מס
 * Auto-numbering and headers for invoices and receipts.
 */

import { TAX_INVOICE_HEADER_EN, TAX_INVOICE_HEADER_HE } from "./finance-types";
import { getNextInvoiceNumber, getNextQuoteNumber, getNextReceiptNumber } from "./document-numbering";

export { getNextQuoteNumber, getNextInvoiceNumber, getNextReceiptNumber };

export function getTaxInvoiceHeader(locale: "en" | "he"): string {
  return locale === "he" ? TAX_INVOICE_HEADER_HE : TAX_INVOICE_HEADER_EN;
}

/** Build HTML fragment for a tax invoice header (Israeli standards) */
export function buildTaxInvoiceHeaderHtml(locale: "en" | "he", invoiceNumber?: string): string {
  const num = invoiceNumber ?? getNextInvoiceNumber();
  const title = getTaxInvoiceHeader(locale);
  return `
    <div class="invoice-header" style="border-bottom:2px solid #06B6D4;padding-bottom:1rem;margin-bottom:1.5rem;">
      <h1 style="color:#06B6D4;font-size:1.5rem;margin:0;">${title}</h1>
      <p style="color:#6b7280;font-size:0.875rem;margin:0.25rem 0 0 0;">Invoice #${num}</p>
    </div>`;
}

/** Build HTML for signature overlay (for PDFs/documents). */
export function buildSignatureOverlayHtml(signatureImageDataUrl: string): string {
  return `<div class="signature-overlay" style="margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e7eb;"><img src="${signatureImageDataUrl}" alt="Signature" style="max-width:180px;height:auto;display:block;" /></div>`;
}
