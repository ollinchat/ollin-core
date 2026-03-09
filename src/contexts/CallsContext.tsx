"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { generateUUID } from "@/lib/uuid";

export interface CallRecording {
  id: string;
  title: string;
  date: number;
  summary?: string;
}

const STORAGE_KEY = "ollin_calls";

function loadCalls(): CallRecording[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCalls(calls: CallRecording[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(calls));
  } catch (_) {}
}

type CallsContextType = {
  calls: CallRecording[];
  addCall: (rec: Omit<CallRecording, "id">) => void;
  removeCall: (id: string) => void;
  setCallSummary: (id: string, summary: string) => void;
};

const CallsContext = createContext<CallsContextType | null>(null);

export function CallsProvider({ children }: { children: React.ReactNode }) {
  const [calls, setCalls] = useState<CallRecording[]>([]);
  useEffect(() => {
    setCalls(loadCalls());
  }, []);
  const addCall = useCallback((rec: Omit<CallRecording, "id">) => {
    const entry: CallRecording = { ...rec, id: generateUUID() };
    setCalls((prev) => {
      const next = [entry, ...prev];
      saveCalls(next);
      return next;
    });
  }, []);
  const removeCall = useCallback((id: string) => {
    setCalls((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveCalls(next);
      return next;
    });
  }, []);
  const setCallSummary = useCallback((id: string, summary: string) => {
    setCalls((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, summary } : c));
      saveCalls(next);
      return next;
    });
  }, []);
  return (
    <CallsContext.Provider value={{ calls, addCall, removeCall, setCallSummary }}>
      {children}
    </CallsContext.Provider>
  );
}

export function useCalls() {
  const ctx = useContext(CallsContext);
  if (!ctx) throw new Error("useCalls must be used within CallsProvider");
  return ctx;
}
