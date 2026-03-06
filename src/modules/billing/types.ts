/**
 * Ollin Billing Module - Types
 * Document chain: Draft → Quote → Invoice → Receipt. Immutable issued invoices; cancel via Credit Note.
 */

export const BILLING_VAT_RATE = 17; // 17% per spec

/** Issuer identity (From section on every invoice/quote) */
export interface BusinessProfile {
  legalName: string;
  taxId: string; // H.P / E.M (ח.פ / ע.מ)
  address: string;
  businessLogo: string; // data URL or URL
  bankDetails: {
    iban?: string;
    swift?: string;
    bitLink?: string; // payment link
  };
}

export const defaultBusinessProfile: BusinessProfile = {
  legalName: "",
  taxId: "",
  address: "",
  businessLogo: "",
  bankDetails: {},
};

/** Document workflow status */
export type BillingDocStatus = "draft" | "pending" | "paid" | "canceled";

/** Document type in the chain */
export type BillingDocType = "draft" | "quote" | "invoice" | "receipt" | "delivery_note" | "credit_note";

export interface BillingLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export function billingLineItemTotal(item: BillingLineItem): number {
  return item.quantity * item.unitPrice;
}

export function billingSubtotalFromItems(items: BillingLineItem[]): number {
  return items.reduce((s, i) => s + billingLineItemTotal(i), 0);
}

export function billingVatFromSubtotal(subtotal: number, ratePct: number = BILLING_VAT_RATE): number {
  return Math.round((subtotal * ratePct) / 100 * 100) / 100;
}

/** Client (To section) - minimal for billing */
export interface BillingClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}

/** Base document with common fields */
export interface BillingDocumentBase {
  id: string;
  number: string;
  type: BillingDocType;
  status: BillingDocStatus;
  issuerUserId: string; // currentUser.id who created/owns
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientTaxId?: string;
  items: BillingLineItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  date: string; // ISO date
  dueDate?: string;
  createdAt: number;
  updatedAt: number;
  /** SHA-256 hash when finalized (invoice issued / receipt) */
  contentHash?: string;
  /** Signed at timestamp when finalized */
  signedAt?: number;
  /** Hidden audit trail */
  auditTrail: AuditEntry[];
  /** For credit note: reference to canceled invoice id */
  creditForInvoiceId?: string;
  /** When invoice is canceled, id of the credit note */
  canceledByCreditNoteId?: string;
}

export interface BillingDraft extends BillingDocumentBase {
  type: "draft";
}

export interface BillingQuote extends BillingDocumentBase {
  type: "quote";
}

export interface BillingInvoice extends BillingDocumentBase {
  type: "invoice";
  quoteId?: string;
}

export interface BillingReceipt extends BillingDocumentBase {
  type: "receipt";
  invoiceId: string;
}

export interface BillingDeliveryNote extends BillingDocumentBase {
  type: "delivery_note";
}

export interface BillingCreditNote extends BillingDocumentBase {
  type: "credit_note";
  creditForInvoiceId: string;
}

export type BillingDocument =
  | BillingDraft
  | BillingQuote
  | BillingInvoice
  | BillingReceipt
  | BillingDeliveryNote
  | BillingCreditNote;

export type AuditAction = "created" | "viewed" | "signed" | "issued" | "paid" | "canceled" | "downloaded" | "shared";

export interface AuditEntry {
  action: AuditAction;
  at: number;
  userId?: string;
  note?: string;
}

export interface BillingExpense {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  date: string; // ISO date
  createdAt: number;
}
