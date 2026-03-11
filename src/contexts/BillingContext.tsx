"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import type { BusinessProfile } from "@/contexts/ChatEngineContext";
import type { BillingClient, BillingDocument, BillingExpense, BillingLineItem } from "@/modules/billing/types";
import { defaultBusinessProfile } from "@/modules/billing/types";
import * as documentService from "@/modules/billing/services/documentService";
import * as vault from "@/modules/billing/vault/documentVault";
import * as auditService from "@/modules/billing/services/auditService";
import { generateDocumentPdf } from "@/modules/billing/services/pdfService";
import { generateUUID } from "@/lib/uuid";

const CLIENTS_PREFIX = "ollin_billing_clients_";
const EXPENSES_PREFIX = "ollin_billing_expenses_";
const SEEDED_PREFIX = "ollin_billing_seeded_";

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

type BillingContextType = {
  businessProfile: BusinessProfile | undefined;
  setBusinessProfile: (profile: BusinessProfile) => void;
  documents: BillingDocument[];
  refreshDocuments: () => void;
  clients: BillingClient[];
  addClient: (c: Omit<BillingClient, "id">) => BillingClient | null;
  updateClient: (id: string, patch: Partial<Omit<BillingClient, "id">>) => void;
  removeClient: (id: string) => void;
  expenses: BillingExpense[];
  addExpense: (e: Omit<BillingExpense, "id" | "createdAt">) => BillingExpense | null;
  removeExpense: (id: string) => void;
  createDraft: (client: BillingClient, items?: BillingLineItem[], notes?: string, title?: string) => BillingDocument | null;
  convertToQuote: (draftId: string) => BillingDocument | null;
  convertQuoteToInvoice: (quoteId: string) => BillingDocument | null;
  createDeliveryNote: (client: BillingClient, items?: BillingLineItem[], notes?: string, title?: string) => BillingDocument | null;
  convertDeliveryNoteToInvoice: (deliveryNoteId: string) => BillingDocument | null;
  markPaid: (invoiceId: string) => BillingDocument | null;
  createReceipt: (invoiceId: string) => BillingDocument | null;
  issueCreditNote: (invoiceId: string) => BillingDocument | null;
  issueNegativeReceipt: (receiptId: string) => BillingDocument | null;
  cancelQuote: (quoteId: string) => BillingDocument | null;
  cancelDeliveryNote: (deliveryNoteId: string) => BillingDocument | null;
  duplicateDoc: (docId: string) => BillingDocument | null;
  updateDocItems: (docId: string, items: BillingLineItem[]) => BillingDocument | null;
  updateDocClient: (docId: string, client: Partial<BillingClient>) => BillingDocument | null;
  downloadPdf: (docId: string, options?: { password?: string; qrDataUrl?: string }) => Promise<void>;
  /** Returns PDF blob for sharing (e.g. Web Share API with file). */
  getPdfBlob: (docId: string) => Promise<Blob | null>;
  getShareLink: (docId: string) => string;
  logViewed: (docId: string) => void;
};

const BillingContext = createContext<BillingContextType | null>(null);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, updateBusinessProfile } = useInternalMessages();
  const [documents, setDocuments] = useState<BillingDocument[]>([]);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [expenses, setExpenses] = useState<BillingExpense[]>([]);
  const userId = currentUser?.id ?? "";

  const businessProfile = currentUser?.businessProfile;

  const setBusinessProfile = useCallback(
    (profile: BusinessProfile) => {
      updateBusinessProfile(() => profile);
    },
    [updateBusinessProfile]
  );

  const refreshDocuments = useCallback(() => {
    if (!userId) {
      setDocuments([]);
      return;
    }
    setDocuments(vault.getAllDocuments(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setDocuments([]);
      setClients([]);
      setExpenses([]);
      return;
    }

    const clientsKey = CLIENTS_PREFIX + userId;
    const expensesKey = EXPENSES_PREFIX + userId;
    const seededKey = SEEDED_PREFIX + userId;
    const alreadySeeded = typeof window !== "undefined" && localStorage.getItem(seededKey) === "1";

    // Seed sample data once so the UI is populated immediately.
    if (!alreadySeeded && typeof window !== "undefined") {
      const existingDocs = vault.getAllDocuments(userId);
      const existingClients = loadJson<BillingClient[]>(clientsKey, []);
      if (existingDocs.length === 0) {
        const now = Date.now();
        const isoDaysAgo = (days: number) => new Date(now - days * 86400000).toISOString().slice(0, 10);

        const seed1: BillingClient = { id: generateUUID(), name: "Acme Ltd", email: "billing@acme.com", phone: "+1 555 0101", address: "123 Business St", taxId: "512345678" };
        const seed2: BillingClient = { id: generateUUID(), name: "Beta Corp", email: "finance@beta.com", phone: "+1 555 0202", address: "45 Market Ave", taxId: "598765432" };
        const seed3: BillingClient = { id: generateUUID(), name: "Jane Doe", email: "jane@example.com", phone: "+1 555 0303" };
        const seededClients = [seed1, seed2, seed3];
        const mergedClients = existingClients.length > 0 ? [...existingClients, ...seededClients] : seededClients;
        saveJson(clientsKey, mergedClients);

        const c1 = existingClients[0] ?? seed1;
        const c2 = existingClients[1] ?? seed2;
        const c3 = existingClients[2] ?? seed3;

        const vatRate = 17;
        const items1: BillingLineItem[] = [{ id: generateUUID(), description: "Consulting (10h)", quantity: 10, unitPrice: 120 }];
        const items2: BillingLineItem[] = [{ id: generateUUID(), description: "Annual license", quantity: 1, unitPrice: 2500 }];
        const subtotal1 = 1200;
        const vat1 = Math.round((subtotal1 * vatRate) / 100 * 100) / 100;
        const total1 = subtotal1 + vat1;
        const subtotal2 = 2500;
        const vat2 = Math.round((subtotal2 * vatRate) / 100 * 100) / 100;
        const total2 = subtotal2 + vat2;

        const invPaidId = generateUUID();
        const invOverdueId = generateUUID();

        const docs: BillingDocument[] = [
          {
            id: generateUUID(),
            number: "Q-1001",
            type: "quote",
            status: "pending",
            issuerUserId: userId,
            clientId: c1.id,
            clientName: c1.name,
            clientEmail: c1.email,
            clientPhone: c1.phone,
            clientAddress: c1.address,
            clientTaxId: c1.taxId,
            items: items1,
            subtotal: subtotal1,
            vatRate,
            vatAmount: vat1,
            total: total1,
            date: isoDaysAgo(6),
            dueDate: isoDaysAgo(1),
            title: "Consulting proposal – phase 1",
            createdAt: now - 6 * 86400000,
            updatedAt: now - 6 * 86400000,
            auditTrail: [],
          },
          {
            id: invOverdueId,
            number: "INV-1001",
            type: "invoice",
            status: "pending",
            issuerUserId: userId,
            clientId: c2.id,
            clientName: c2.name,
            clientEmail: c2.email,
            clientPhone: c2.phone,
            clientAddress: c2.address,
            clientTaxId: c2.taxId,
            items: items2,
            subtotal: subtotal2,
            vatRate,
            vatAmount: vat2,
            total: total2,
            date: isoDaysAgo(40),
            dueDate: isoDaysAgo(10), // overdue
            title: "Annual license renewal",
            createdAt: now - 40 * 86400000,
            updatedAt: now - 40 * 86400000,
            auditTrail: [],
          },
          {
            id: invPaidId,
            number: "INV-1002",
            type: "invoice",
            status: "paid",
            issuerUserId: userId,
            clientId: c1.id,
            clientName: c1.name,
            clientEmail: c1.email,
            clientPhone: c1.phone,
            clientAddress: c1.address,
            clientTaxId: c1.taxId,
            items: items1,
            subtotal: subtotal1,
            vatRate,
            vatAmount: vat1,
            total: total1,
            date: isoDaysAgo(12),
            title: "Consulting invoice – Acme",
            createdAt: now - 12 * 86400000,
            updatedAt: now - 12 * 86400000,
            auditTrail: [],
          },
          {
            id: generateUUID(),
            number: "RCP-2001",
            type: "receipt",
            status: "paid",
            issuerUserId: userId,
            invoiceId: invPaidId,
            clientId: c1.id,
            clientName: c1.name,
            clientEmail: c1.email,
            clientPhone: c1.phone,
            clientAddress: c1.address,
            clientTaxId: c1.taxId,
            items: items1,
            subtotal: subtotal1,
            vatRate,
            vatAmount: vat1,
            total: total1,
            date: isoDaysAgo(11),
            createdAt: now - 11 * 86400000,
            updatedAt: now - 11 * 86400000,
            auditTrail: [],
          },
          {
            id: generateUUID(),
            number: "DN-3001",
            type: "delivery_note",
            status: "draft",
            issuerUserId: userId,
            clientId: c3.id,
            clientName: c3.name,
            clientEmail: c3.email,
            clientPhone: c3.phone,
            items: [{ id: generateUUID(), description: "Hardware delivery", quantity: 1, unitPrice: 0 }],
            subtotal: 0,
            vatRate,
            vatAmount: 0,
            total: 0,
            date: isoDaysAgo(2),
            createdAt: now - 2 * 86400000,
            updatedAt: now - 2 * 86400000,
            auditTrail: [],
          },
        ];

        docs.forEach((d) => vault.createDocument(userId, d));

        const seededExpenses: BillingExpense[] = [
          { id: generateUUID(), vendor: "Cloud Hosting", amount: 99, category: "Infrastructure", date: isoDaysAgo(7), createdAt: now - 7 * 86400000 },
          { id: generateUUID(), vendor: "Office Supplies Co", amount: 340, category: "Office", date: isoDaysAgo(1), createdAt: now - 1 * 86400000 },
        ];
        saveJson(expensesKey, seededExpenses);

        localStorage.setItem(seededKey, "1");
      }
    }

    refreshDocuments();
    setClients(loadJson<BillingClient[]>(clientsKey, []));
    setExpenses(loadJson<BillingExpense[]>(expensesKey, []));
  }, [userId, refreshDocuments]);

  const addClient = useCallback(
    (c: Omit<BillingClient, "id">): BillingClient | null => {
      if (!userId) return null;
      const client: BillingClient = { ...c, id: generateUUID() };
      const key = CLIENTS_PREFIX + userId;
      setClients((prev) => {
        const next = [client, ...prev];
        saveJson(key, next);
        return next;
      });
      return client;
    },
    [userId]
  );

  const updateClient = useCallback(
    (id: string, patch: Partial<Omit<BillingClient, "id">>) => {
      if (!userId) return;
      const key = CLIENTS_PREFIX + userId;
      setClients((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
        saveJson(key, next);
        return next;
      });
    },
    [userId]
  );

  const removeClient = useCallback(
    (id: string) => {
      if (!userId) return;
      const key = CLIENTS_PREFIX + userId;
      setClients((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveJson(key, next);
        return next;
      });
    },
    [userId]
  );

  const addExpense = useCallback(
    (e: Omit<BillingExpense, "id" | "createdAt">): BillingExpense | null => {
      if (!userId) return null;
      const expense: BillingExpense = { ...e, id: generateUUID(), createdAt: Date.now() };
      const key = EXPENSES_PREFIX + userId;
      setExpenses((prev) => {
        const next = [expense, ...prev];
        saveJson(key, next);
        return next;
      });
      return expense;
    },
    [userId]
  );

  const removeExpense = useCallback(
    (id: string) => {
      if (!userId) return;
      const key = EXPENSES_PREFIX + userId;
      setExpenses((prev) => {
        const next = prev.filter((e) => e.id !== id);
        saveJson(key, next);
        return next;
      });
    },
    [userId]
  );

  const createDraft = useCallback(
    (client: BillingClient, items?: BillingLineItem[], notes?: string, title?: string) => {
      if (!userId) return null;
      const doc = documentService.createDraft(
        userId,
        client.id,
        client.name,
        client.email,
        client.phone,
        client.address,
        client.taxId,
        items,
        notes,
        title
      );
      refreshDocuments();
      return doc;
    },
    [userId, refreshDocuments]
  );

  const convertToQuote = useCallback(
    (draftId: string) => {
      if (!userId) return null;
      const q = documentService.convertDraftToQuote(userId, draftId);
      refreshDocuments();
      return q;
    },
    [userId, refreshDocuments]
  );

  const convertQuoteToInvoice = useCallback(
    (quoteId: string) => {
      if (!userId) return null;
      const inv = documentService.convertQuoteToInvoice(userId, quoteId);
      refreshDocuments();
      return inv;
    },
    [userId, refreshDocuments]
  );

  const createDeliveryNote = useCallback(
    (client: BillingClient, items?: BillingLineItem[], notes?: string, title?: string) => {
      if (!userId) return null;
      const doc = documentService.createDeliveryNote(
        userId,
        client.id,
        client.name,
        client.email,
        client.phone,
        client.address,
        client.taxId,
        items,
        notes,
        title
      );
      refreshDocuments();
      return doc;
    },
    [userId, refreshDocuments]
  );

  const convertDeliveryNoteToInvoice = useCallback(
    (deliveryNoteId: string) => {
      if (!userId) return null;
      const inv = documentService.convertDeliveryNoteToInvoice(userId, deliveryNoteId);
      refreshDocuments();
      return inv;
    },
    [userId, refreshDocuments]
  );

  const markPaid = useCallback(
    (invoiceId: string) => {
      if (!userId) return null;
      const doc = documentService.markInvoicePaid(userId, invoiceId);
      refreshDocuments();
      return doc;
    },
    [userId, refreshDocuments]
  );

  const createReceipt = useCallback(
    (invoiceId: string) => {
      if (!userId) return null;
      const doc = documentService.createReceiptForInvoice(userId, invoiceId);
      refreshDocuments();
      return doc;
    },
    [userId, refreshDocuments]
  );

  const issueCreditNote = useCallback(
    (invoiceId: string) => {
      if (!userId) return null;
      const doc = documentService.issueCreditNote(userId, invoiceId);
      refreshDocuments();
      return doc;
    },
    [userId, refreshDocuments]
  );

  const issueNegativeReceipt = useCallback(
    (receiptId: string) => {
      if (!userId) return null;
      const doc = documentService.issueNegativeReceipt(userId, receiptId);
      refreshDocuments();
      return doc;
    },
    [userId, refreshDocuments]
  );

  const cancelQuote = useCallback(
    (quoteId: string) => {
      if (!userId) return null;
      const doc = documentService.cancelQuote(userId, quoteId);
      refreshDocuments();
      return doc;
    },
    [userId, refreshDocuments]
  );

  const cancelDeliveryNote = useCallback(
    (deliveryNoteId: string) => {
      if (!userId) return null;
      const doc = documentService.cancelDeliveryNote(userId, deliveryNoteId);
      refreshDocuments();
      return doc;
    },
    [userId, refreshDocuments]
  );

  const duplicateDoc = useCallback(
    (docId: string) => {
      if (!userId) return null;
      const doc = documentService.duplicateDocument(userId, docId);
      refreshDocuments();
      return doc;
    },
    [userId, refreshDocuments]
  );

  const updateDocItems = useCallback(
    (docId: string, items: BillingLineItem[]) => {
      if (!userId) return null;
      const doc = documentService.updateDraftOrQuoteItems(userId, docId, items);
      refreshDocuments();
      return doc;
    },
    [userId, refreshDocuments]
  );

  const updateDocClient = useCallback(
    (docId: string, client: Partial<BillingClient>) => {
      if (!userId) return null;
      const doc = documentService.updateDraftOrQuoteClient(userId, docId, client);
      refreshDocuments();
      return doc;
    },
    [userId, refreshDocuments]
  );

  const fromProfile: BusinessProfile = useMemo(
    () => businessProfile || defaultBusinessProfile,
    [businessProfile]
  );

  const downloadPdf = useCallback(
    async (docId: string, options?: { password?: string; qrDataUrl?: string }) => {
      if (!userId) return;
      const doc = vault.getDocumentById(userId, docId);
      if (!doc) return;
      auditService.logDownloaded(userId, docId);
      const { blob, contentHash } = await generateDocumentPdf(doc, fromProfile, {
        password: options?.password,
        qrDataUrl: options?.qrDataUrl,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.type}-${doc.number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [userId, fromProfile]
  );

  const getPdfBlob = useCallback(
    async (docId: string): Promise<Blob | null> => {
      if (!userId) return null;
      const doc = vault.getDocumentById(userId, docId);
      if (!doc) return null;
      try {
        const { blob } = await generateDocumentPdf(doc, fromProfile, {});
        return blob;
      } catch {
        return null;
      }
    },
    [userId, fromProfile]
  );

  const getShareLink = useCallback(
    (docId: string) => {
      if (typeof window === "undefined") return "";
      return `${window.location.origin}/billing/doc/${encodeURIComponent(userId)}/${encodeURIComponent(docId)}`;
    },
    [userId]
  );

  const logViewed = useCallback(
    (docId: string) => {
      if (userId) auditService.logViewed(userId, docId);
    },
    [userId]
  );

  const value = useMemo(
    () => ({
      businessProfile,
      setBusinessProfile,
      documents,
      refreshDocuments,
      clients,
      addClient,
      updateClient,
      removeClient,
      expenses,
      addExpense,
      removeExpense,
      createDraft,
      convertToQuote,
      convertQuoteToInvoice,
      createDeliveryNote,
      convertDeliveryNoteToInvoice,
      markPaid,
      createReceipt,
      issueCreditNote,
      issueNegativeReceipt,
      cancelQuote,
      cancelDeliveryNote,
      duplicateDoc,
      updateDocItems,
      updateDocClient,
      downloadPdf,
      getPdfBlob,
      getShareLink,
      logViewed,
    }),
    [
      businessProfile,
      setBusinessProfile,
      documents,
      refreshDocuments,
      clients,
      addClient,
      updateClient,
      removeClient,
      expenses,
      addExpense,
      removeExpense,
      createDraft,
      convertToQuote,
      convertQuoteToInvoice,
      createDeliveryNote,
      convertDeliveryNoteToInvoice,
      markPaid,
      createReceipt,
      issueCreditNote,
      issueNegativeReceipt,
      cancelQuote,
      cancelDeliveryNote,
      duplicateDoc,
      updateDocItems,
      updateDocClient,
      downloadPdf,
      getPdfBlob,
      getShareLink,
      logViewed,
    ]
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within BillingProvider");
  return ctx;
}
