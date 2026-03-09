/**
 * Document workflow: Draft → Quote → Invoice → Receipt.
 * Issued invoices are immutable; cancel via Credit Note.
 */

import {
  type BillingDocument,
  type BillingQuote,
  type BillingInvoice,
  type BillingReceipt,
  type BillingCreditNote,
  type BillingDeliveryNote,
  type BillingLineItem,
  BILLING_VAT_RATE,
  billingSubtotalFromItems,
  billingVatFromSubtotal,
} from "../types";
import * as vault from "../vault/documentVault";
import { generateUUID } from "@/lib/uuid";
import {
  getNextQuoteNumber,
  getNextInvoiceNumber,
  getNextReceiptNumber,
  getNextDeliveryNoteNumber,
} from "@/lib/document-numbering";

function nextNumber(prefix: string, existing: BillingDocument[]): string {
  const used = new Set(existing.map((d) => d.number));
  let n = 1;
  while (used.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

function baseFromItems(
  items: BillingLineItem[],
  vatRate: number = BILLING_VAT_RATE
): { subtotal: number; vatAmount: number; total: number } {
  const subtotal = billingSubtotalFromItems(items);
  const vatAmount = billingVatFromSubtotal(subtotal, vatRate);
  const total = subtotal + vatAmount;
  return { subtotal, vatAmount, total };
}

function nowIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createDraft(
  userId: string,
  clientId: string,
  clientName: string,
  clientEmail?: string,
  clientPhone?: string,
  clientAddress?: string,
  clientTaxId?: string,
  items: BillingLineItem[] = [{ id: generateUUID(), description: "Item", quantity: 1, unitPrice: 0 }]
): BillingDocument {
  const docs = vault.getAllDocuments(userId);
  const number = nextNumber("DRAFT", docs);
  const { subtotal, vatAmount, total } = baseFromItems(items);
  const now = Date.now();
  const doc: BillingDocument = {
    id: generateUUID(),
    number,
    type: "draft",
    status: "draft",
    issuerUserId: userId,
    clientId,
    clientName,
    clientEmail,
    clientPhone,
    clientAddress,
    clientTaxId,
    items,
    subtotal,
    vatRate: BILLING_VAT_RATE,
    vatAmount,
    total,
    date: nowIso(),
    createdAt: now,
    updatedAt: now,
    auditTrail: [],
  } as BillingDocument;
  return vault.createDocument(userId, doc);
}

export function convertDraftToQuote(userId: string, draftId: string): BillingQuote | null {
  const draft = vault.getDocumentById(userId, draftId);
  if (!draft || draft.type !== "draft") return null;
  const number = getNextQuoteNumber();
  const quote: BillingQuote = {
    ...draft,
    id: generateUUID(),
    number,
    type: "quote",
    status: "pending",
    auditTrail: [...draft.auditTrail, { action: "issued", at: Date.now() }],
    updatedAt: Date.now(),
  };
  vault.createDocument(userId, quote);
  vault.deleteDocument(userId, draftId);
  return quote;
}

export function convertQuoteToInvoice(userId: string, quoteId: string): BillingInvoice | null {
  const quote = vault.getDocumentById(userId, quoteId) as BillingQuote | null;
  if (!quote || quote.type !== "quote") return null;
  const number = getNextInvoiceNumber();
  const invoice: BillingInvoice = {
    ...quote,
    id: generateUUID(),
    number,
    type: "invoice",
    status: "pending",
    quoteId: quote.id,
    auditTrail: [...quote.auditTrail, { action: "issued", at: Date.now() }],
    updatedAt: Date.now(),
  };
  vault.createDocument(userId, invoice);
  return invoice;
}

export function convertDeliveryNoteToInvoice(userId: string, deliveryNoteId: string): BillingInvoice | null {
  const dn = vault.getDocumentById(userId, deliveryNoteId) as BillingDeliveryNote | null;
  if (!dn || dn.type !== "delivery_note") return null;
  if (dn.status === "canceled") return null;
  const number = getNextInvoiceNumber();
  const totals = baseFromItems(dn.items, dn.vatRate ?? BILLING_VAT_RATE);
  const invoice: BillingInvoice = {
    ...dn,
    ...totals,
    id: generateUUID(),
    number,
    type: "invoice",
    status: "pending",
    auditTrail: [...dn.auditTrail, { action: "issued", at: Date.now(), note: "Converted from delivery note" }],
    updatedAt: Date.now(),
  };
  vault.createDocument(userId, invoice);
  return invoice;
}

export function markInvoicePaid(userId: string, invoiceId: string): BillingInvoice | null {
  const doc = vault.getDocumentById(userId, invoiceId);
  if (!doc || doc.type !== "invoice") return null;
  const updated: BillingInvoice = {
    ...doc,
    status: "paid",
    auditTrail: [...doc.auditTrail, { action: "paid", at: Date.now() }],
    updatedAt: Date.now(),
  };
  vault.replaceDocument(userId, updated);
  return updated;
}

export function createReceiptForInvoice(userId: string, invoiceId: string): BillingReceipt | null {
  const invoice = vault.getDocumentById(userId, invoiceId) as BillingInvoice | null;
  if (!invoice || invoice.type !== "invoice" || invoice.status !== "paid") return null;
  const number = getNextReceiptNumber();
  const receipt: BillingReceipt = {
    ...invoice,
    id: generateUUID(),
    number,
    type: "receipt",
    invoiceId,
    auditTrail: [...invoice.auditTrail, { action: "created", at: Date.now(), note: "Receipt issued" }],
    updatedAt: Date.now(),
  };
  vault.createDocument(userId, receipt);
  return receipt;
}

/** Create a new delivery note (standalone, not from quote). */
export function createDeliveryNote(
  userId: string,
  clientId: string,
  clientName: string,
  clientEmail?: string,
  clientPhone?: string,
  clientAddress?: string,
  clientTaxId?: string,
  items: BillingLineItem[] = [{ id: generateUUID(), description: "Item", quantity: 1, unitPrice: 0 }]
): BillingDeliveryNote {
  const number = getNextDeliveryNoteNumber();
  const { subtotal, vatAmount, total } = baseFromItems(items, BILLING_VAT_RATE);
  const now = Date.now();
  const doc: BillingDeliveryNote = {
    id: generateUUID(),
    number,
    type: "delivery_note",
    status: "draft",
    issuerUserId: userId,
    clientId,
    clientName,
    clientEmail,
    clientPhone,
    clientAddress,
    clientTaxId,
    items,
    subtotal,
    vatRate: BILLING_VAT_RATE,
    vatAmount,
    total,
    date: nowIso(),
    createdAt: now,
    updatedAt: now,
    auditTrail: [],
  };
  return vault.createDocument(userId, doc) as BillingDeliveryNote;
}

/** Issue credit note for an invoice (cancel). Invoice becomes canceled and is immutable. */
export function issueCreditNote(userId: string, invoiceId: string): BillingCreditNote | null {
  const invoice = vault.getDocumentById(userId, invoiceId) as BillingInvoice | null;
  if (!invoice || invoice.type !== "invoice") return null;
  const docs = vault.getAllDocuments(userId);
  const number = nextNumber("CN", docs.filter((d) => d.type === "credit_note"));
  const credit: BillingCreditNote = {
    ...invoice,
    id: generateUUID(),
    number,
    type: "credit_note",
    status: "canceled",
    creditForInvoiceId: invoiceId,
    auditTrail: [...invoice.auditTrail, { action: "canceled", at: Date.now(), note: "Credit note issued" }],
    updatedAt: Date.now(),
  };
  vault.createDocument(userId, credit);
  const updatedInvoice: BillingInvoice = {
    ...invoice,
    status: "canceled",
    canceledByCreditNoteId: credit.id,
    auditTrail: [...invoice.auditTrail, { action: "canceled", at: Date.now() }],
    updatedAt: Date.now(),
  };
  vault.replaceDocument(userId, updatedInvoice);
  return credit;
}

export function updateDraftOrQuoteItems(
  userId: string,
  docId: string,
  items: BillingLineItem[]
): BillingDocument | null {
  const doc = vault.getDocumentById(userId, docId);
  if (!doc) return null;
  if (doc.type === "invoice" && doc.status !== "draft") return null;
  const { subtotal, vatAmount, total } = baseFromItems(items, doc.vatRate);
  return vault.updateDocument(userId, docId, (d) => ({
    ...d,
    items,
    subtotal,
    vatAmount,
    total,
    updatedAt: Date.now(),
  }));
}

export function updateDraftOrQuoteClient(
  userId: string,
  docId: string,
  client: Partial<Pick<BillingDocument, "clientName" | "clientEmail" | "clientPhone" | "clientAddress" | "clientTaxId">>
): BillingDocument | null {
  const doc = vault.getDocumentById(userId, docId);
  if (!doc) return null;
  if (doc.type === "invoice" && doc.status !== "draft") return null;
  return vault.updateDocument(userId, docId, (d) => ({
    ...d,
    ...client,
    updatedAt: Date.now(),
  }));
}

/** Cancel a quote (set status to canceled). Does not delete. */
export function cancelQuote(userId: string, quoteId: string): BillingQuote | null {
  const quote = vault.getDocumentById(userId, quoteId) as BillingQuote | null;
  if (!quote || quote.type !== "quote") return null;
  const updated: BillingQuote = {
    ...quote,
    status: "canceled",
    auditTrail: [...quote.auditTrail, { action: "canceled", at: Date.now() }],
    updatedAt: Date.now(),
  };
  vault.replaceDocument(userId, updated);
  return updated;
}

/** Cancel a delivery note (set status to canceled). Does not delete. */
export function cancelDeliveryNote(userId: string, deliveryNoteId: string): BillingDeliveryNote | null {
  const dn = vault.getDocumentById(userId, deliveryNoteId) as BillingDeliveryNote | null;
  if (!dn || dn.type !== "delivery_note") return null;
  const updated: BillingDeliveryNote = {
    ...dn,
    status: "canceled",
    auditTrail: [...dn.auditTrail, { action: "canceled", at: Date.now() }],
    updatedAt: Date.now(),
  };
  vault.replaceDocument(userId, updated);
  return updated;
}

export function duplicateDocument(userId: string, docId: string): BillingDocument | null {
  const doc = vault.getDocumentById(userId, docId);
  if (!doc) return null;
  const newDoc: BillingDocument = {
    ...doc,
    id: generateUUID(),
    number: nextNumber("DRAFT", vault.getAllDocuments(userId)),
    type: "draft",
    status: "draft",
    date: nowIso(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    contentHash: undefined,
    signedAt: undefined,
    auditTrail: [{ action: "created", at: Date.now(), note: "Duplicated" }],
    creditForInvoiceId: undefined,
    canceledByCreditNoteId: undefined,
  } as BillingDocument;
  return vault.createDocument(userId, newDoc);
}
