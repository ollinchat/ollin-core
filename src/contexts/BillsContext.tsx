"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { generateUUID } from "@/lib/uuid";

export type BillCategory = "electricity" | "water" | "car_finance" | "fines" | "vaad_bayit" | "other";

export interface BillEntry {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: "pending" | "paid";
  category: BillCategory;
  attachmentDataUrl?: string;
  createdAt: number;
}

const STORAGE_KEY = "ollin_bills";

function loadBills(): BillEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: BillEntry[] = raw ? JSON.parse(raw) : [];
    return list.map((b) => ({ ...b, category: b.category ?? "other" }));
  } catch {
    return [];
  }
}

function saveBills(bills: BillEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  } catch (_) {}
}

type BillsContextType = {
  bills: BillEntry[];
  addBill: (b: Omit<BillEntry, "id" | "createdAt">) => void;
  updateBill: (id: string, updates: Partial<Omit<BillEntry, "id" | "createdAt">>) => void;
  removeBill: (id: string) => void;
};

const BillsContext = createContext<BillsContextType | null>(null);

export function BillsProvider({ children }: { children: React.ReactNode }) {
  const [bills, setBills] = useState<BillEntry[]>([]);
  useEffect(() => setBills(loadBills()), []);

  const addBill = useCallback((b: Omit<BillEntry, "id" | "createdAt">) => {
    const entry: BillEntry = { ...b, category: b.category ?? "other", id: generateUUID(), createdAt: Date.now() };
    setBills((prev) => {
      const next = [entry, ...prev];
      saveBills(next);
      return next;
    });
  }, []);

  const updateBill = useCallback((id: string, updates: Partial<Omit<BillEntry, "id" | "createdAt">>) => {
    setBills((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      saveBills(next);
      return next;
    });
  }, []);

  const removeBill = useCallback((id: string) => {
    setBills((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveBills(next);
      return next;
    });
  }, []);

  return (
    <BillsContext.Provider value={{ bills, addBill, updateBill, removeBill }}>
      {children}
    </BillsContext.Provider>
  );
}

export function useBills() {
  const ctx = useContext(BillsContext);
  if (!ctx) throw new Error("useBills must be used within BillsProvider");
  return ctx;
}
