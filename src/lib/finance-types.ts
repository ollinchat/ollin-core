/**
 * OLLIN FINANCE DNA - CORE TYPES
 * Document workflow: Quote → Invoice → Receipt. Lifecycle: Draft → Sent → Paid → Overdue.
 */

export const TAX_INVOICE_HEADER_EN = "Tax Invoice";
export const TAX_INVOICE_HEADER_HE = "חשבונית מס";
export const QUOTE_HEADER_EN = "Quote";
export const QUOTE_HEADER_HE = "הצעת מחיר";
export const RECEIPT_HEADER_EN = "Receipt";
export const RECEIPT_HEADER_HE = "קבלה";
export const DELIVERY_NOTE_HEADER_EN = "Delivery Note";
export const DELIVERY_NOTE_HEADER_HE = "תעודת משלוח";

export const DEFAULT_VAT_RATE = 18; // Israel default (screenshots)

/** Document numbering: starting number per type (user-configurable on settings page) */
export interface DocumentNumberingConfig {
  quote: number;
  invoice: number;
  receipt: number;
  deliveryNote: number;
}

export const DEFAULT_DOC_NUMBERING: DocumentNumberingConfig = {
  quote: 1,
  invoice: 1,
  receipt: 1,
  deliveryNote: 1,
};

export type Currency = "USD" | "ILS" | "EUR" | "OTHER";

/** Document lifecycle */
export type DocStatus = "draft" | "sent" | "paid" | "overdue";

/** Legacy: single-status for backward compat */
export type FinanceDocStatus = "active" | "canceled";

export type ClientType = "company" | "private";

/** עוסק מורשה = authorized, עוסק פטור = exempt */
export type DealerType = "authorized" | "exempt";

export interface CompanyProfile {
  name: string;
  nameHe?: string;
  nameEn?: string;
  vatId: string;
  address: string;
  /** עוסק מורשה / עוסק פטור */
  dealerType?: DealerType;
  /** Default VAT % (e.g. 18) */
  vatRate?: number;
  signature?: string;
  logo?: string;
}

/** Corporate: P.C. / H.P. (ח.פ) number; Private: optional ID */
export interface FinanceClient {
  id: string;
  name: string;
  email: string;
  clientType: ClientType;
  vatId?: string;
  hpNumber?: string; // Company registration (P.C. / ח.פ)
  address?: string;
  createdAt: number;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export function lineItemTotal(item: LineItem): number {
  return item.quantity * item.unitPrice;
}

export function subtotalFromItems(items: LineItem[]): number {
  return items.reduce((s, i) => s + lineItemTotal(i), 0);
}

export function vatFromSubtotal(subtotal: number, ratePct: number = DEFAULT_VAT_RATE): number {
  return Math.round((subtotal * ratePct) / 100 * 100) / 100;
}

export interface Quote {
  id: string;
  number: string;
  status: DocStatus | FinanceDocStatus;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientVatId?: string;
  clientHpNumber?: string;
  items: LineItem[];
  date: string;
  dueDate?: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  createdAt: number;
}

export interface TaxInvoice {
  id: string;
  number: string;
  status: DocStatus | FinanceDocStatus;
  quoteId?: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientVatId?: string;
  clientHpNumber?: string;
  items: LineItem[];
  date: string;
  dueDate?: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  createdAt: number;
}

export interface Receipt {
  id: string;
  number: string;
  status: DocStatus | FinanceDocStatus;
  invoiceId?: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientVatId?: string;
  clientHpNumber?: string;
  items: LineItem[];
  date: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  createdAt: number;
}

/** Delivery Note / תעודת משלוח */
export interface DeliveryNote {
  id: string;
  number: string;
  status: DocStatus | FinanceDocStatus;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientVatId?: string;
  clientHpNumber?: string;
  items: LineItem[];
  date: string;
  dueDate?: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  /** Warranty / duration / notes (bilingual) */
  notes?: string;
  createdAt: number;
}

/** Expense entry (receipt scan / manual): Vendor, Amount, Category */
export interface Expense {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  /** Optional receipt image (data URL or URL) for AI scan source */
  receiptImageUrl?: string;
  date: string;
  createdAt: number;
}

// --- Legacy R&D entries (Strategic Board burn) ---
export interface OllinFinanceEntry {
  id: string;
  category: "logistics" | "production" | "rnd" | "infrastructure";
  amount: number;
  currency: Currency;
  status: "pending" | "cleared";
  date: string;
  description: string;
}

export const calculateTotalBalance = (entries: OllinFinanceEntry[] = []) => {
  if (!entries || !Array.isArray(entries)) return 0;
  return entries.reduce((acc, entry) => {
    return acc + (entry && entry.status === "cleared" ? (entry.amount || 0) : 0);
  }, 0);
};

// --- Scans / expense categories (FinanceDocsModal) ---
export type ExpenseCategory = "Fuel" | "Food" | "Office" | "Travel" | "Other";
export interface ScannedDoc {
  id: string;
  category?: ExpenseCategory;
  amount?: number;
  date?: string;
  vendor?: string;
  [key: string]: unknown;
}