/**
 * Document numbering: user-configurable start numbers per type.
 * Settings page can read/update; invoice-template uses these for next number.
 */

import type { DocumentNumberingConfig } from "./finance-types";
import { DEFAULT_DOC_NUMBERING } from "./finance-types";

const STORAGE_KEY = "ollin_doc_numbering";

export function loadDocumentNumbering(): DocumentNumberingConfig {
  if (typeof window === "undefined") return { ...DEFAULT_DOC_NUMBERING };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DOC_NUMBERING };
    const parsed = JSON.parse(raw) as Partial<DocumentNumberingConfig>;
    return {
      quote: typeof parsed.quote === "number" ? parsed.quote : DEFAULT_DOC_NUMBERING.quote,
      invoice: typeof parsed.invoice === "number" ? parsed.invoice : DEFAULT_DOC_NUMBERING.invoice,
      receipt: typeof parsed.receipt === "number" ? parsed.receipt : DEFAULT_DOC_NUMBERING.receipt,
      deliveryNote: typeof parsed.deliveryNote === "number" ? parsed.deliveryNote : DEFAULT_DOC_NUMBERING.deliveryNote,
    };
  } catch {
    return { ...DEFAULT_DOC_NUMBERING };
  }
}

export function saveDocumentNumbering(config: DocumentNumberingConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (_) {}
}

function getAndIncrement(key: keyof DocumentNumberingConfig): number {
  const config = loadDocumentNumbering();
  const next = config[key];
  saveDocumentNumbering({ ...config, [key]: next + 1 });
  return next;
}

function formatDocNumber(n: number): string {
  return String(n).padStart(3, "0");
}

export function getNextQuoteNumber(): string {
  return formatDocNumber(getAndIncrement("quote"));
}

export function getNextInvoiceNumber(): string {
  return formatDocNumber(getAndIncrement("invoice"));
}

export function getNextReceiptNumber(): string {
  return formatDocNumber(getAndIncrement("receipt"));
}

export function getNextDeliveryNoteNumber(): string {
  return formatDocNumber(getAndIncrement("deliveryNote"));
}

/** Preview the next number for a type without incrementing (for form display). */
export function getNextNumberPreview(key: keyof DocumentNumberingConfig): string {
  const config = loadDocumentNumbering();
  return String(config[key]).padStart(3, "0");
}
