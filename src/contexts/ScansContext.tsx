"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ScannedDoc } from "@/lib/finance-types";
import { loadScansFromSupabase, saveScansToSupabase } from "@/lib/supabase-sync";

const STORAGE_KEY = "ollin_scans";

function loadScansLocal(): ScannedDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveScans(docs: ScannedDoc[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (_) {}
  saveScansToSupabase(docs).catch(() => {});
}

type ScansContextType = {
  docs: ScannedDoc[];
  addDoc: (doc: Omit<ScannedDoc, "id" | "scannedAt">) => void;
  setDocStatus: (id: string, status: ScannedDoc["status"]) => void;
};

const ScansContext = createContext<ScansContextType | null>(null);

export function ScansProvider({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<ScannedDoc[]>([]);

  useEffect(() => {
    loadScansFromSupabase().then((remote) => {
      if (remote !== null && remote !== undefined) {
        setDocs(remote);
        saveScans(remote);
      } else {
        setDocs(loadScansLocal());
      }
    });
  }, []);

  const addDoc = useCallback((doc: Omit<ScannedDoc, "id" | "scannedAt">) => {
    const full: ScannedDoc = {
      ...doc,
      id: crypto.randomUUID(),
      scannedAt: Date.now(),
    };
    setDocs((prev) => {
      const next = [full, ...prev];
      saveScans(next);
      return next;
    });
  }, []);

  const setDocStatus = useCallback((id: string, status: ScannedDoc["status"]) => {
    setDocs((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, status } : d));
      saveScans(next);
      return next;
    });
  }, []);

  return (
    <ScansContext.Provider value={{ docs, addDoc, setDocStatus }}>
      {children}
    </ScansContext.Provider>
  );
}

export function useScans() {
  const ctx = useContext(ScansContext);
  if (!ctx) throw new Error("useScans must be used within ScansProvider");
  return ctx;
}
