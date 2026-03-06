/**
 * Document vault - localStorage persistence per issuer (currentUser.id).
 * Issued invoices are immutable; cancel only via credit note.
 */

import type { BillingDocument, AuditEntry, AuditAction } from "../types";

const STORAGE_PREFIX = "ollin_billing_docs_";

function storageKey(userId: string): string {
  return STORAGE_PREFIX + userId;
}

function loadDocs(userId: string): BillingDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDocs(userId: string, docs: BillingDocument[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(docs));
  } catch (_) {}
}

export function getAllDocuments(userId: string): BillingDocument[] {
  return loadDocs(userId).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getDocumentById(userId: string, docId: string): BillingDocument | null {
  return loadDocs(userId).find((d) => d.id === docId) ?? null;
}

function appendAudit(doc: BillingDocument, action: AuditAction, note?: string): BillingDocument {
  const entry: AuditEntry = { action, at: Date.now(), note };
  return {
    ...doc,
    auditTrail: [...(doc.auditTrail || []), entry],
    updatedAt: Date.now(),
  };
}

export function createDocument(userId: string, doc: BillingDocument): BillingDocument {
  const withAudit = appendAudit(doc, "created");
  const docs = loadDocs(userId);
  docs.push(withAudit);
  saveDocs(userId, docs);
  return withAudit;
}

export function updateDocument(
  userId: string,
  docId: string,
  updater: (d: BillingDocument) => BillingDocument
): BillingDocument | null {
  const docs = loadDocs(userId);
  const index = docs.findIndex((d) => d.id === docId);
  if (index === -1) return null;
  const current = docs[index];
  if (current.type === "invoice" && current.status !== "draft") return null;
  const next = updater(current);
  docs[index] = next;
  saveDocs(userId, docs);
  return next;
}

export function logAudit(userId: string, docId: string, action: AuditAction, note?: string): void {
  const docs = loadDocs(userId);
  const index = docs.findIndex((d) => d.id === docId);
  if (index === -1) return;
  docs[index] = appendAudit(docs[index], action, note);
  saveDocs(userId, docs);
}

export function deleteDocument(userId: string, docId: string): boolean {
  const docs = loadDocs(userId);
  const doc = docs.find((d) => d.id === docId);
  if (!doc) return false;
  if (doc.type === "invoice" && doc.status !== "draft") return false;
  const filtered = docs.filter((d) => d.id !== docId);
  saveDocs(userId, filtered);
  return true;
}

export function replaceDocument(userId: string, doc: BillingDocument): void {
  const docs = loadDocs(userId).filter((d) => d.id !== doc.id);
  docs.push(doc);
  saveDocs(userId, docs);
}
