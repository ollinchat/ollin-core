"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type {
  CompanyProfile,
  FinanceClient,
  Quote,
  TaxInvoice,
  Receipt,
  FinanceDocStatus,
} from "@/lib/finance-types";
import { getNextQuoteNumber, getNextInvoiceNumber, getNextReceiptNumber } from "@/lib/invoice-template";

const STORAGE_KEYS = {
  company: "ollin_finance_company",
  clients: "ollin_finance_clients",
  quotes: "ollin_finance_quotes",
  invoices: "ollin_finance_invoices",
  receipts: "ollin_finance_receipts",
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

type FinanceContextType = {
  companyProfile: CompanyProfile;
  setCompanyProfile: (p: CompanyProfile) => void;
  clients: FinanceClient[];
  addClient: (c: Omit<FinanceClient, "id" | "createdAt">) => void;
  updateClient: (id: string, c: Partial<Omit<FinanceClient, "id" | "createdAt">>) => void;
  removeClient: (id: string) => void;
  quotes: Quote[];
  addQuote: (q: Omit<Quote, "id" | "number" | "status" | "createdAt">) => Quote;
  invoices: TaxInvoice[];
  addInvoice: (inv: Omit<TaxInvoice, "id" | "number" | "status" | "createdAt">) => TaxInvoice;
  cancelInvoice: (id: string) => void;
  convertQuoteToInvoice: (quoteId: string) => TaxInvoice | null;
  receipts: Receipt[];
  addReceipt: (r: Omit<Receipt, "id" | "number" | "status" | "createdAt">) => Receipt;
  cancelReceipt: (id: string) => void;
};

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [companyProfile, setCompanyProfileState] = useState<CompanyProfile>(defaultCompany);
  const [clients, setClients] = useState<FinanceClient[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    setCompanyProfileState(loadJson(STORAGE_KEYS.company, defaultCompany));
    setClients(loadJson(STORAGE_KEYS.clients, []));
    setQuotes(loadJson(STORAGE_KEYS.quotes, []));
    setInvoices(loadJson(STORAGE_KEYS.invoices, []));
    setReceipts(loadJson(STORAGE_KEYS.receipts, []));
  }, []);

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

  const addQuote = useCallback((q: Omit<Quote, "id" | "number" | "status" | "createdAt">): Quote => {
    const id = crypto.randomUUID();
    const number = getNextQuoteNumber();
    const status: FinanceDocStatus = "active";
    const createdAt = Date.now();
    const quote: Quote = { ...q, id, number, status, createdAt };
    setQuotes((prev) => {
      const next = [quote, ...prev];
      saveJson(STORAGE_KEYS.quotes, next);
      return next;
    });
    return quote;
  }, []);

  const addInvoice = useCallback((inv: Omit<TaxInvoice, "id" | "number" | "status" | "createdAt">): TaxInvoice => {
    const id = crypto.randomUUID();
    const number = getNextInvoiceNumber();
    const status: FinanceDocStatus = "active";
    const createdAt = Date.now();
    const invoice: TaxInvoice = { ...inv, id, number, status, createdAt };
    setInvoices((prev) => {
      const next = [invoice, ...prev];
      saveJson(STORAGE_KEYS.invoices, next);
      return next;
    });
    return invoice;
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
    const invoice = addInvoice({
      quoteId: quote.id,
      clientId: quote.clientId,
      clientName: quote.clientName,
      amount: quote.amount,
      description: quote.description,
      date: quote.date,
    });
    return invoice;
  }, [quotes, addInvoice]);

  const addReceipt = useCallback((r: Omit<Receipt, "id" | "number" | "status" | "createdAt">): Receipt => {
    const id = crypto.randomUUID();
    const number = getNextReceiptNumber();
    const status: FinanceDocStatus = "active";
    const createdAt = Date.now();
    const rec: Receipt = { ...r, id, number, status, createdAt };
    setReceipts((prev) => {
      const next = [rec, ...prev];
      saveJson(STORAGE_KEYS.receipts, next);
      return next;
    });
    return rec;
  }, []);

  const cancelReceipt = useCallback((id: string) => {
    setReceipts((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, status: "canceled" as const } : x));
      saveJson(STORAGE_KEYS.receipts, next);
      return next;
    });
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
        invoices,
        addInvoice,
        cancelInvoice,
        convertQuoteToInvoice,
        receipts,
        addReceipt,
        cancelReceipt,
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
