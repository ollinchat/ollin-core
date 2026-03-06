"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type {
  CompanyProfile,
  FinanceClient,
  Quote,
  TaxInvoice,
  Receipt,
  DeliveryNote,
  Expense,
  DocStatus,
  FinanceDocStatus,
  LineItem,
} from "@/lib/finance-types";
import {
  DEFAULT_VAT_RATE,
  subtotalFromItems,
  vatFromSubtotal,
} from "@/lib/finance-types";
import { getNextQuoteNumber, getNextInvoiceNumber, getNextReceiptNumber } from "@/lib/invoice-template";
import { getNextDeliveryNoteNumber } from "@/lib/document-numbering";

const STORAGE_KEYS = {
  company: "ollin_finance_company",
  clients: "ollin_finance_clients",
  quotes: "ollin_finance_quotes",
  invoices: "ollin_finance_invoices",
  receipts: "ollin_finance_receipts",
  deliveryNotes: "ollin_finance_delivery_notes",
  expenses: "ollin_finance_expenses",
  seeded: "ollin_finance_seeded",
} as const;

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

function saveJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

const defaultCompany: CompanyProfile = { name: "", vatId: "", address: "" };

function ensureLineItems(items: LineItem[]): LineItem[] {
  return items.map((i) => ({
    ...i,
    id: i.id || crypto.randomUUID(),
  }));
}

function fromLegacyAmount(amount: string | number | undefined, description: string): LineItem[] {
  const num = typeof amount === "string" ? parseFloat(amount.replace(/,/g, "")) : Number(amount) || 0;
  return [
    { id: crypto.randomUUID(), description: description || "Item", quantity: 1, unitPrice: num },
  ];
}

function normalizeQuote(raw: unknown): Quote {
  const q = raw as Record<string, unknown>;
  const items: LineItem[] = Array.isArray(q.items) && q.items.length > 0
    ? ensureLineItems(q.items as LineItem[])
    : fromLegacyAmount(q.amount as string | number, (q.description as string) || "Item");
  const subtotal = "subtotal" in q && typeof q.subtotal === "number" ? q.subtotal : subtotalFromItems(items);
  const vatRate = (q.vatRate as number) ?? DEFAULT_VAT_RATE;
  const vatAmount = "vatAmount" in q && typeof q.vatAmount === "number" ? q.vatAmount : vatFromSubtotal(subtotal, vatRate);
  const total = "total" in q && typeof q.total === "number" ? q.total : subtotal + vatAmount;
  return {
    id: (q.id as string) || crypto.randomUUID(),
    number: (q.number as string) || "",
    status: (q.status as Quote["status"]) || "draft",
    clientId: (q.clientId as string) || "",
    clientName: (q.clientName as string) || "",
    clientEmail: q.clientEmail as string | undefined,
    clientAddress: q.clientAddress as string | undefined,
    clientVatId: q.clientVatId as string | undefined,
    clientHpNumber: q.clientHpNumber as string | undefined,
    items,
    date: (q.date as string) || new Date().toISOString().slice(0, 10),
    dueDate: q.dueDate as string | undefined,
    subtotal,
    vatRate,
    vatAmount,
    total,
    createdAt: (q.createdAt as number) || Date.now(),
  };
}

function normalizeInvoice(raw: unknown): TaxInvoice {
  const inv = raw as Record<string, unknown>;
  const items: LineItem[] = Array.isArray(inv.items) && inv.items.length > 0
    ? ensureLineItems(inv.items as LineItem[])
    : fromLegacyAmount(inv.amount as string | number, (inv.description as string) || "Item");
  const subtotal = "subtotal" in inv && typeof inv.subtotal === "number" ? inv.subtotal : subtotalFromItems(items);
  const vatRate = (inv.vatRate as number) ?? DEFAULT_VAT_RATE;
  const vatAmount = "vatAmount" in inv && typeof inv.vatAmount === "number" ? inv.vatAmount : vatFromSubtotal(subtotal, vatRate);
  const total = "total" in inv && typeof inv.total === "number" ? inv.total : subtotal + vatAmount;
  return {
    id: (inv.id as string) || crypto.randomUUID(),
    number: (inv.number as string) || "",
    status: (inv.status as TaxInvoice["status"]) || "draft",
    quoteId: inv.quoteId as string | undefined,
    clientId: (inv.clientId as string) || "",
    clientName: (inv.clientName as string) || "",
    clientEmail: inv.clientEmail as string | undefined,
    clientAddress: inv.clientAddress as string | undefined,
    clientVatId: inv.clientVatId as string | undefined,
    clientHpNumber: inv.clientHpNumber as string | undefined,
    items,
    date: (inv.date as string) || new Date().toISOString().slice(0, 10),
    dueDate: inv.dueDate as string | undefined,
    subtotal,
    vatRate,
    vatAmount,
    total,
    createdAt: (inv.createdAt as number) || Date.now(),
  };
}

function normalizeReceipt(raw: unknown): Receipt {
  const r = raw as Record<string, unknown>;
  const items: LineItem[] = Array.isArray(r.items) && r.items.length > 0
    ? ensureLineItems(r.items as LineItem[])
    : fromLegacyAmount(r.amount as string | number, (r.description as string) || "Item");
  const subtotal = "subtotal" in r && typeof r.subtotal === "number" ? r.subtotal : subtotalFromItems(items);
  const vatRate = (r.vatRate as number) ?? DEFAULT_VAT_RATE;
  const vatAmount = "vatAmount" in r && typeof r.vatAmount === "number" ? r.vatAmount : vatFromSubtotal(subtotal, vatRate);
  const total = "total" in r && typeof r.total === "number" ? r.total : subtotal + vatAmount;
  return {
    id: (r.id as string) || crypto.randomUUID(),
    number: (r.number as string) || "",
    status: (r.status as Receipt["status"]) || "draft",
    invoiceId: r.invoiceId as string | undefined,
    clientId: (r.clientId as string) || "",
    clientName: (r.clientName as string) || "",
    clientEmail: r.clientEmail as string | undefined,
    clientAddress: r.clientAddress as string | undefined,
    clientVatId: r.clientVatId as string | undefined,
    clientHpNumber: r.clientHpNumber as string | undefined,
    items,
    date: (r.date as string) || new Date().toISOString().slice(0, 10),
    subtotal,
    vatRate,
    vatAmount,
    total,
    createdAt: (r.createdAt as number) || Date.now(),
  };
}

function normalizeDeliveryNote(raw: unknown): DeliveryNote {
  const r = raw as Record<string, unknown>;
  const items: LineItem[] = Array.isArray(r.items) && r.items.length > 0
    ? ensureLineItems(r.items as LineItem[])
    : fromLegacyAmount(r.amount as string | number, (r.description as string) || "Item");
  const subtotal = "subtotal" in r && typeof r.subtotal === "number" ? r.subtotal : subtotalFromItems(items);
  const vatRate = (r.vatRate as number) ?? DEFAULT_VAT_RATE;
  const vatAmount = "vatAmount" in r && typeof r.vatAmount === "number" ? r.vatAmount : vatFromSubtotal(subtotal, vatRate);
  const total = "total" in r && typeof r.total === "number" ? r.total : subtotal + vatAmount;
  return {
    id: (r.id as string) || crypto.randomUUID(),
    number: (r.number as string) || "",
    status: (r.status as DeliveryNote["status"]) || "draft",
    clientId: (r.clientId as string) || "",
    clientName: (r.clientName as string) || "",
    clientEmail: r.clientEmail as string | undefined,
    clientAddress: r.clientAddress as string | undefined,
    clientVatId: r.clientVatId as string | undefined,
    clientHpNumber: r.clientHpNumber as string | undefined,
    items,
    date: (r.date as string) || new Date().toISOString().slice(0, 10),
    dueDate: r.dueDate as string | undefined,
    subtotal,
    vatRate,
    vatAmount,
    total,
    notes: r.notes as string | undefined,
    createdAt: (r.createdAt as number) || Date.now(),
  };
}

type QuoteInput = Omit<Quote, "id" | "number" | "status" | "createdAt"> | (Pick<Quote, "clientId" | "clientName" | "date"> & { amount?: string; description?: string; clientEmail?: string; clientAddress?: string; clientVatId?: string; clientHpNumber?: string; dueDate?: string; items?: LineItem[] });
type InvoiceInput = Omit<TaxInvoice, "id" | "number" | "status" | "createdAt"> | (Pick<TaxInvoice, "clientId" | "clientName" | "date"> & { quoteId?: string; amount?: string; description?: string; clientEmail?: string; clientAddress?: string; clientVatId?: string; clientHpNumber?: string; dueDate?: string; items?: LineItem[] });
type ReceiptInput = Omit<Receipt, "id" | "number" | "status" | "createdAt"> | (Pick<Receipt, "clientId" | "clientName" | "date"> & { invoiceId?: string; amount?: string; description?: string; clientEmail?: string; clientAddress?: string; clientVatId?: string; clientHpNumber?: string; items?: LineItem[] });

type FinanceContextType = {
  companyProfile: CompanyProfile;
  setCompanyProfile: (p: CompanyProfile) => void;
  clients: FinanceClient[];
  addClient: (c: Omit<FinanceClient, "id" | "createdAt">) => void;
  updateClient: (id: string, c: Partial<Omit<FinanceClient, "id" | "createdAt">>) => void;
  removeClient: (id: string) => void;
  quotes: Quote[];
  addQuote: (q: QuoteInput) => Quote;
  updateQuote: (id: string, updates: Partial<Pick<Quote, "items" | "date" | "dueDate" | "status">>) => void;
  updateQuoteStatus: (id: string, status: DocStatus | FinanceDocStatus) => void;
  invoices: TaxInvoice[];
  addInvoice: (inv: Omit<TaxInvoice, "id" | "number" | "status" | "createdAt">) => TaxInvoice;
  updateInvoice: (id: string, updates: Partial<Pick<TaxInvoice, "items" | "date" | "dueDate" | "status">>) => void;
  updateInvoiceStatus: (id: string, status: DocStatus | FinanceDocStatus) => void;
  cancelInvoice: (id: string) => void;
  convertQuoteToInvoice: (quoteId: string) => TaxInvoice | null;
  receipts: Receipt[];
  addReceipt: (r: Omit<Receipt, "id" | "number" | "status" | "createdAt">) => Receipt;
  issueReceiptFromInvoice: (invoiceId: string) => Receipt | null;
  cancelReceipt: (id: string) => void;
  deliveryNotes: DeliveryNote[];
  addDeliveryNote: (d: Omit<DeliveryNote, "id" | "number" | "status" | "createdAt" | "subtotal" | "vatRate" | "vatAmount" | "total"> & Partial<Pick<DeliveryNote, "subtotal" | "vatRate" | "vatAmount" | "total">>) => DeliveryNote;
  updateDeliveryNote: (id: string, updates: Partial<Pick<DeliveryNote, "items" | "date" | "dueDate" | "notes" | "status">>) => void;
  /** Effective status: sent + dueDate < today => overdue */
  getInvoiceEffectiveStatus: (inv: TaxInvoice) => DocStatus | FinanceDocStatus;
  /** Overdue invoices for Ollin / dashboard */
  overdueInvoices: TaxInvoice[];
  expenses: Expense[];
  addExpense: (e: Omit<Expense, "id" | "createdAt">) => Expense;
};

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [companyProfile, setCompanyProfileState] = useState<CompanyProfile>(defaultCompany);
  const [clients, setClients] = useState<FinanceClient[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const rawClients = loadJson<FinanceClient[]>(STORAGE_KEYS.clients, []);
    const alreadySeeded = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEYS.seeded) === "1";

    if (rawClients.length === 0 && !alreadySeeded && typeof window !== "undefined") {
      const now = Date.now();
      const t = (d: number) => new Date(now - d * 86400000).toISOString().slice(0, 10);
      const c1 = crypto.randomUUID();
      const c2 = crypto.randomUUID();
      const c3 = crypto.randomUUID();
      const seedClients: FinanceClient[] = [
        { id: c1, name: "Acme Ltd", email: "billing@acme.com", clientType: "company", address: "123 Business St", createdAt: now },
        { id: c2, name: "Beta Corp", email: "finance@beta.com", clientType: "company", createdAt: now },
        { id: c3, name: "Jane Doe", email: "jane@example.com", clientType: "private", createdAt: now },
      ];
      const items1: LineItem[] = [{ id: crypto.randomUUID(), description: "Consulting", quantity: 10, unitPrice: 120 }];
      const items2: LineItem[] = [{ id: crypto.randomUUID(), description: "License fee", quantity: 1, unitPrice: 2500 }];
      const st1 = 1200; const vat1 = 216; const tot1 = 1416;
      const st2 = 2500; const vat2 = 450; const tot2 = 2950;
      const seedQuotes: Quote[] = [
        { id: crypto.randomUUID(), number: "Q-1", status: "draft", clientId: c1, clientName: "Acme Ltd", items: items1, date: t(5), subtotal: st1, vatRate: 18, vatAmount: vat1, total: tot1, createdAt: now - 5 * 86400000 },
        { id: crypto.randomUUID(), number: "Q-2", status: "sent", clientId: c2, clientName: "Beta Corp", items: items2, date: t(3), subtotal: st2, vatRate: 18, vatAmount: vat2, total: tot2, createdAt: now - 3 * 86400000 },
      ];
      const seedInvoices: TaxInvoice[] = [
        { id: crypto.randomUUID(), number: "INV-1001", status: "paid", clientId: c1, clientName: "Acme Ltd", items: items1, date: t(10), subtotal: st1, vatRate: 18, vatAmount: vat1, total: tot1, createdAt: now - 10 * 86400000 },
        { id: crypto.randomUUID(), number: "INV-1002", status: "sent", clientId: c2, clientName: "Beta Corp", items: items2, date: t(2), dueDate: t(30), subtotal: st2, vatRate: 18, vatAmount: vat2, total: tot2, createdAt: now - 2 * 86400000 },
      ];
      const seedReceipts: Receipt[] = [
        { id: crypto.randomUUID(), number: "RCP-1", status: "paid", invoiceId: seedInvoices[0].id, clientId: c1, clientName: "Acme Ltd", items: items1, date: t(10), subtotal: st1, vatRate: 18, vatAmount: vat1, total: tot1, createdAt: now - 9 * 86400000 },
      ];
      const seedExpenses: Expense[] = [
        { id: crypto.randomUUID(), vendor: "Office Supplies Co", amount: 340, category: "Office", date: t(1), createdAt: now },
        { id: crypto.randomUUID(), vendor: "Cloud Hosting", amount: 99, category: "Infrastructure", date: t(7), createdAt: now - 7 * 86400000 },
      ];
      setCompanyProfileState({ ...defaultCompany, name: "My Company", nameEn: "My Company", vatRate: 18 });
      setClients(seedClients);
      setQuotes(seedQuotes);
      setInvoices(seedInvoices);
      setReceipts(seedReceipts);
      setDeliveryNotes([]);
      setExpenses(seedExpenses);
      saveJson(STORAGE_KEYS.company, { ...defaultCompany, name: "My Company", nameEn: "My Company", vatRate: 18 });
      saveJson(STORAGE_KEYS.clients, seedClients);
      saveJson(STORAGE_KEYS.quotes, seedQuotes);
      saveJson(STORAGE_KEYS.invoices, seedInvoices);
      saveJson(STORAGE_KEYS.receipts, seedReceipts);
      saveJson(STORAGE_KEYS.expenses, seedExpenses);
      localStorage.setItem(STORAGE_KEYS.seeded, "1");
      return;
    }

    setCompanyProfileState(loadJson(STORAGE_KEYS.company, defaultCompany));
    setClients(rawClients);
    const rawQuotes = loadJson<unknown[]>(STORAGE_KEYS.quotes, []);
    const rawInvoices = loadJson<unknown[]>(STORAGE_KEYS.invoices, []);
    const rawReceipts = loadJson<unknown[]>(STORAGE_KEYS.receipts, []);
    const rawDeliveryNotes = loadJson<unknown[]>(STORAGE_KEYS.deliveryNotes, []);
    setQuotes(rawQuotes.map(normalizeQuote));
    setInvoices(rawInvoices.map(normalizeInvoice));
    setReceipts(rawReceipts.map(normalizeReceipt));
    setDeliveryNotes(rawDeliveryNotes.map(normalizeDeliveryNote));
    const rawExpenses = loadJson<Expense[]>(STORAGE_KEYS.expenses, []);
    setExpenses(rawExpenses);
  }, []);

  useEffect(() => {
    if (expenses.length > 0) saveJson(STORAGE_KEYS.expenses, expenses);
  }, [expenses]);

  useEffect(() => {
    if (quotes.length > 0) saveJson(STORAGE_KEYS.quotes, quotes);
  }, [quotes]);
  useEffect(() => {
    if (invoices.length > 0) saveJson(STORAGE_KEYS.invoices, invoices);
  }, [invoices]);
  useEffect(() => {
    if (receipts.length > 0) saveJson(STORAGE_KEYS.receipts, receipts);
  }, [receipts]);
  useEffect(() => {
    if (deliveryNotes.length > 0) saveJson(STORAGE_KEYS.deliveryNotes, deliveryNotes);
  }, [deliveryNotes]);

  const setCompanyProfile = useCallback((p: CompanyProfile) => {
    setCompanyProfileState(p);
    saveJson(STORAGE_KEYS.company, p);
  }, []);

  const addClient = useCallback((c: Omit<FinanceClient, "id" | "createdAt">) => {
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const client: FinanceClient = { ...c, id, createdAt };
    setClients((prev) => {
      const next = [...prev, client];
      saveJson(STORAGE_KEYS.clients, next);
      return next;
    });
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Omit<FinanceClient, "id" | "createdAt">>) => {
    setClients((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, ...updates } : x));
      saveJson(STORAGE_KEYS.clients, next);
      return next;
    });
  }, []);

  const removeClient = useCallback((id: string) => {
    setClients((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveJson(STORAGE_KEYS.clients, next);
      return next;
    });
  }, []);

  const companyVatRate = companyProfile.vatRate ?? DEFAULT_VAT_RATE;
  const buildQuoteFromInput = useCallback((q: QuoteInput): Omit<Quote, "id" | "number" | "createdAt"> => {
    if ("items" in q && Array.isArray(q.items) && q.items.length > 0) {
      const items = ensureLineItems(q.items);
      const subtotal = subtotalFromItems(items);
      const vatRate = (q as Quote).vatRate ?? companyVatRate;
      const vatAmount = vatFromSubtotal(subtotal, vatRate);
      return {
        ...(q as Quote),
        items,
        subtotal,
        vatRate,
        vatAmount,
        total: subtotal + vatAmount,
        status: "draft",
      };
    }
    const legacy = q as { amount?: string; description?: string; clientId: string; clientName: string; date: string; clientEmail?: string; clientAddress?: string; clientVatId?: string; clientHpNumber?: string; dueDate?: string };
    const items = fromLegacyAmount(legacy.amount, legacy.description || "Item");
    const subtotal = subtotalFromItems(items);
    const vatAmount = vatFromSubtotal(subtotal, companyVatRate);
    return {
      clientId: legacy.clientId,
      clientName: legacy.clientName,
      clientEmail: legacy.clientEmail,
      clientAddress: legacy.clientAddress,
      clientVatId: legacy.clientVatId,
      clientHpNumber: legacy.clientHpNumber,
      items,
      date: legacy.date,
      dueDate: legacy.dueDate,
      subtotal,
      vatRate: companyVatRate,
      vatAmount,
      total: subtotal + vatAmount,
      status: "draft",
    };
  }, [companyVatRate]);

  const addQuote = useCallback((q: QuoteInput): Quote => {
    const built = buildQuoteFromInput(q);
    const id = crypto.randomUUID();
    const number = getNextQuoteNumber();
    const createdAt = Date.now();
    const quote: Quote = { ...built, id, number, createdAt };
    setQuotes((prev) => {
      const next = [quote, ...prev];
      saveJson(STORAGE_KEYS.quotes, next);
      return next;
    });
    return quote;
  }, [buildQuoteFromInput]);

  const updateQuote = useCallback((id: string, updates: Partial<Pick<Quote, "items" | "date" | "dueDate" | "status">>) => {
    setQuotes((prev) => {
      const next = prev.map((q) => {
        if (q.id !== id) return q;
        let out = { ...q, ...updates };
        if (updates.items && updates.items.length > 0) {
          const st = subtotalFromItems(updates.items);
          const vat = vatFromSubtotal(st, out.vatRate);
          out = { ...out, subtotal: st, vatAmount: vat, total: st + vat };
        }
        return out;
      });
      saveJson(STORAGE_KEYS.quotes, next);
      return next;
    });
  }, []);

  const updateQuoteStatus = useCallback((id: string, status: DocStatus | FinanceDocStatus) => {
    setQuotes((prev) => {
      const next = prev.map((q) => (q.id === id ? { ...q, status } : q));
      saveJson(STORAGE_KEYS.quotes, next);
      return next;
    });
  }, []);

  const addInvoice = useCallback((inv: Omit<TaxInvoice, "id" | "number" | "status" | "createdAt">): TaxInvoice => {
    const id = crypto.randomUUID();
    const number = getNextInvoiceNumber();
    const status: DocStatus = "draft";
    const createdAt = Date.now();
    const items = ensureLineItems(inv.items || []);
    const subtotal = inv.subtotal ?? subtotalFromItems(items);
    const vatRate = inv.vatRate ?? companyProfile.vatRate ?? DEFAULT_VAT_RATE;
    const vatAmount = inv.vatAmount ?? vatFromSubtotal(subtotal, vatRate);
    const total = inv.total ?? subtotal + vatAmount;
    const invoice: TaxInvoice = { ...inv, id, number, status, createdAt, items, subtotal, vatRate, vatAmount, total };
    setInvoices((prev) => {
      const next = [invoice, ...prev];
      saveJson(STORAGE_KEYS.invoices, next);
      return next;
    });
    return invoice;
  }, []);

  const updateInvoice = useCallback((id: string, updates: Partial<Pick<TaxInvoice, "items" | "date" | "dueDate" | "status">>) => {
    setInvoices((prev) => {
      const next = prev.map((inv) => {
        if (inv.id !== id) return inv;
        let out = { ...inv, ...updates };
        if (updates.items && updates.items.length > 0) {
          const st = subtotalFromItems(updates.items);
          const vat = vatFromSubtotal(st, out.vatRate);
          out = { ...out, subtotal: st, vatAmount: vat, total: st + vat };
        }
        return out;
      });
      saveJson(STORAGE_KEYS.invoices, next);
      return next;
    });
  }, []);

  const updateInvoiceStatus = useCallback((id: string, status: DocStatus | FinanceDocStatus) => {
    setInvoices((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, status } : x));
      saveJson(STORAGE_KEYS.invoices, next);
      return next;
    });
  }, []);

  const cancelInvoice = useCallback((id: string) => {
    setInvoices((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, status: "canceled" as const } : x));
      saveJson(STORAGE_KEYS.invoices, next);
      return next;
    });
  }, []);

  const convertQuoteToInvoice = useCallback((quoteId: string): TaxInvoice | null => {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote || quote.status === "canceled") return null;
    return addInvoice({
      quoteId: quote.id,
      clientId: quote.clientId,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      clientAddress: quote.clientAddress,
      clientVatId: quote.clientVatId,
      clientHpNumber: quote.clientHpNumber,
      items: quote.items,
      date: quote.date,
      dueDate: quote.dueDate,
      subtotal: quote.subtotal,
      vatRate: quote.vatRate,
      vatAmount: quote.vatAmount,
      total: quote.total,
    });
  }, [quotes, addInvoice]);

  const addReceipt = useCallback((r: Omit<Receipt, "id" | "number" | "status" | "createdAt">): Receipt => {
    const id = crypto.randomUUID();
    const number = getNextReceiptNumber();
    const status: DocStatus = "draft";
    const createdAt = Date.now();
    const items = ensureLineItems(r.items || []);
    const subtotal = r.subtotal ?? subtotalFromItems(items);
    const vatRate = r.vatRate ?? companyProfile.vatRate ?? DEFAULT_VAT_RATE;
    const vatAmount = r.vatAmount ?? vatFromSubtotal(subtotal, vatRate);
    const total = r.total ?? subtotal + vatAmount;
    const rec: Receipt = { ...r, id, number, status, createdAt, items, subtotal, vatRate, vatAmount, total };
    setReceipts((prev) => {
      const next = [rec, ...prev];
      saveJson(STORAGE_KEYS.receipts, next);
      return next;
    });
    return rec;
  }, []);

  const issueReceiptFromInvoice = useCallback((invoiceId: string): Receipt | null => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv || inv.status === "canceled") return null;
    return addReceipt({
      invoiceId: inv.id,
      clientId: inv.clientId,
      clientName: inv.clientName,
      clientEmail: inv.clientEmail,
      clientAddress: inv.clientAddress,
      clientVatId: inv.clientVatId,
      clientHpNumber: inv.clientHpNumber,
      items: inv.items,
      date: new Date().toISOString().slice(0, 10),
      subtotal: inv.subtotal,
      vatRate: inv.vatRate,
      vatAmount: inv.vatAmount,
      total: inv.total,
    });
  }, [invoices, addReceipt]);

  const cancelReceipt = useCallback((id: string) => {
    setReceipts((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, status: "canceled" as const } : x));
      saveJson(STORAGE_KEYS.receipts, next);
      return next;
    });
  }, []);

  const addDeliveryNote = useCallback((d: Omit<DeliveryNote, "id" | "number" | "status" | "createdAt" | "subtotal" | "vatRate" | "vatAmount" | "total"> & Partial<Pick<DeliveryNote, "subtotal" | "vatRate" | "vatAmount" | "total">>): DeliveryNote => {
    const id = crypto.randomUUID();
    const number = getNextDeliveryNoteNumber();
    const status: DocStatus = "draft";
    const createdAt = Date.now();
    const items = ensureLineItems(d.items || []);
    const subtotal = d.subtotal ?? subtotalFromItems(items);
    const vatRate = d.vatRate ?? companyProfile.vatRate ?? DEFAULT_VAT_RATE;
    const vatAmount = d.vatAmount ?? vatFromSubtotal(subtotal, vatRate);
    const total = d.total ?? subtotal + vatAmount;
    const doc: DeliveryNote = { ...d, id, number, status, createdAt, items, subtotal, vatRate, vatAmount, total };
    setDeliveryNotes((prev) => {
      const next = [doc, ...prev];
      saveJson(STORAGE_KEYS.deliveryNotes, next);
      return next;
    });
    return doc;
  }, []);

  const updateDeliveryNote = useCallback((id: string, updates: Partial<Pick<DeliveryNote, "items" | "date" | "dueDate" | "notes" | "status">>) => {
    setDeliveryNotes((prev) => {
      const next = prev.map((dn) => {
        if (dn.id !== id) return dn;
        let out = { ...dn, ...updates };
        if (updates.items && updates.items.length > 0) {
          const st = subtotalFromItems(updates.items);
          const vat = vatFromSubtotal(st, out.vatRate);
          out = { ...out, subtotal: st, vatAmount: vat, total: st + vat };
        }
        return out;
      });
      saveJson(STORAGE_KEYS.deliveryNotes, next);
      return next;
    });
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const getInvoiceEffectiveStatus = useCallback((inv: TaxInvoice): DocStatus | FinanceDocStatus => {
    if (inv.status === "canceled" || inv.status === "paid") return inv.status;
    const isSentOrActive = inv.status === "sent" || (inv.status as string) === "active";
    if (isSentOrActive && inv.dueDate && inv.dueDate < today) return "overdue";
    return inv.status;
  }, []);

  const overdueInvoices = invoices.filter((inv) => getInvoiceEffectiveStatus(inv) === "overdue");

  const addExpense = useCallback((e: Omit<Expense, "id" | "createdAt">): Expense => {
    const expense: Expense = {
      ...e,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setExpenses((prev) => {
      const next = [expense, ...prev];
      saveJson(STORAGE_KEYS.expenses, next);
      return next;
    });
    return expense;
  }, []);

  return (
    <FinanceContext.Provider
      value={{
        companyProfile,
        setCompanyProfile,
        clients,
        addClient,
        updateClient,
        removeClient,
        quotes,
        addQuote,
        updateQuote,
        updateQuoteStatus,
        invoices,
        addInvoice,
        updateInvoice,
        updateInvoiceStatus,
        cancelInvoice,
        convertQuoteToInvoice,
        receipts,
        addReceipt,
        issueReceiptFromInvoice,
        cancelReceipt,
        deliveryNotes,
        addDeliveryNote,
        updateDeliveryNote,
        getInvoiceEffectiveStatus,
        overdueInvoices,
        expenses,
        addExpense,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}
