"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type {
  RecurringChecklist,
  RecurringChecklistItem,
  PerformanceHistoryEntry,
  RecurringFrequency,
} from "@/lib/recurring-checklist-types";
import { FOUNDER_USER_ID } from "@/lib/recurring-checklist-types";
import { generateUUID } from "@/lib/uuid";

const CHECKLISTS_KEY = "ollin_recurring_checklists";
const HISTORY_KEY = "ollin_performance_history";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const WEEK_START: "sunday" | "monday" = "monday"; // TODO: make configurable via settings

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  let diff: number;
  if (WEEK_START === "monday") {
    // move to Monday (1); Sunday (0) should go back 6 days
    diff = day === 0 ? -6 : 1 - day;
  } else {
    // week starts Sunday
    diff = -day;
  }
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getQuarter(date: Date): 1 | 2 | 3 | 4 {
  const m = date.getMonth(); // 0-based
  if (m < 3) return 1;
  if (m < 6) return 2;
  if (m < 9) return 3;
  return 4;
}

function getPeriodId(freq: RecurringFrequency, dateStr: string): string {
  const d = parseDate(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-based
  switch (freq) {
    case "daily":
      return dateStr;
    case "weekly": {
      const ws = startOfWeek(d);
      return `W:${formatDate(ws)}`; // week id = week start date
    }
    case "monthly":
      return `M:${y}-${String(m + 1).padStart(2, "0")}`;
    case "quarterly": {
      const q = getQuarter(d);
      return `Q:${y}-Q${q}`;
    }
    case "yearly":
      return `Y:${y}`;
    default:
      return dateStr;
  }
}

function getPeriodLabel(freq: RecurringFrequency, dateStr: string): string {
  const d = parseDate(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth();
  switch (freq) {
    case "daily":
      return dateStr;
    case "weekly": {
      const ws = startOfWeek(d);
      return `Week of ${formatDate(ws)}`;
    }
    case "monthly": {
      const monthName = d.toLocaleDateString("en", { month: "short" });
      return `${monthName} ${y}`;
    }
    case "quarterly": {
      const q = getQuarter(d);
      return `Q${q} ${y}`;
    }
    case "yearly":
      return String(y);
    default:
      return dateStr;
  }
}

function loadChecklists(): RecurringChecklist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHECKLISTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChecklists(data: RecurringChecklist[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHECKLISTS_KEY, JSON.stringify(data));
  } catch (_) {}
}

function loadHistory(): PerformanceHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as PerformanceHistoryEntry[] | any[]) : [];
    // Backwards compat: older entries may not have period fields
    return parsed.map((e: any) => {
      if (e.periodId && e.periodType && e.periodLabel) return e as PerformanceHistoryEntry;
      const freq: RecurringFrequency = (e.frequency as RecurringFrequency) || "daily";
      const date: string = typeof e.date === "string" ? e.date : todayStr();
      return {
        ...e,
        periodType: freq,
        periodId: getPeriodId(freq, date),
        periodLabel: getPeriodLabel(freq, date),
      } as PerformanceHistoryEntry;
    });
  } catch {
    return [];
  }
}

function saveHistory(data: PerformanceHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
  } catch (_) {}
}

/** Score = (completed weighted sum / total weighted sum) * 100, or (completed count / total count) * 100 if no weights */
export function computeChecklistScore(checklist: RecurringChecklist): number {
  const items = checklist.items;
  if (items.length === 0) return 0;
  const totalWeight = items.reduce((s, i) => s + (i.weight || 1), 0);
  const completedWeight = items.filter((i) => i.isDone).reduce((s, i) => s + (i.weight || 1), 0);
  return totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100);
}

function applyScore(cl: RecurringChecklist): RecurringChecklist {
  return { ...cl, currentScore: computeChecklistScore(cl) };
}

type ChecklistsContextType = {
  checklists: RecurringChecklist[];
  history: PerformanceHistoryEntry[];
  /** Checklists visible to current user (own + as founder: ones they created for others) */
  getChecklistsForView: (userId: string) => RecurringChecklist[];
  addChecklist: (payload: Omit<RecurringChecklist, "id" | "currentScore" | "lastResetDate" | "createdAt">) => void;
  updateChecklist: (id: string, updates: Partial<Pick<RecurringChecklist, "title" | "frequency" | "items" | "assignedTo" | "disableComments">>) => void;
  removeChecklist: (id: string) => void;
  toggleItem: (checklistId: string, itemId: string) => void;
  addItem: (checklistId: string, text: string, weight?: number) => void;
  removeItem: (checklistId: string, itemId: string) => void;
  getHistoryForChecklist: (checklistId: string) => PerformanceHistoryEntry[];
  /** For AI brief: human-readable summary of team checklists (e.g. for Founder) */
  getChecklistBrief: (userId: string) => string | undefined;
};

const ChecklistsContext = createContext<ChecklistsContextType | null>(null);

export function ChecklistsProvider({ children }: { children: React.ReactNode }) {
  const [checklists, setChecklists] = useState<RecurringChecklist[]>([]);
  const [history, setHistory] = useState<PerformanceHistoryEntry[]>([]);

  useEffect(() => {
    setChecklists(loadChecklists());
    setHistory(loadHistory());
  }, []);

  const runMidnightSync = useCallback(() => {
    const today = todayStr();
    const todayDate = parseDate(today);
    setChecklists((prev) => {
      let next = [...prev];
      let changed = false;
      const newHistory: PerformanceHistoryEntry[] = [];
      for (let i = 0; i < next.length; i++) {
        const cl = next[i];
        const last = cl.lastResetDate || today;
        const lastPeriodId = getPeriodId(cl.frequency, last);
        const currentPeriodId = getPeriodId(cl.frequency, today);
        // If we've moved into a new interval, snapshot previous and reset
        if (lastPeriodId !== currentPeriodId) {
          const score = computeChecklistScore(cl);
          const completed = cl.items.filter((x) => x.isDone).length;
          newHistory.push({
            id: generateUUID(),
            checklistId: cl.id,
            date: last,
            score,
            completedCount: completed,
            totalCount: cl.items.length,
            periodType: cl.frequency,
            periodId: lastPeriodId,
            periodLabel: getPeriodLabel(cl.frequency, last),
          });
          next[i] = applyScore({
            ...cl,
            lastResetDate: today,
            items: cl.items.map((it) => ({ ...it, isDone: false })),
          });
          changed = true;
        } else if (!cl.lastResetDate) {
          // Initialize lastResetDate for existing checklists
          next[i] = applyScore({
            ...cl,
            lastResetDate: today,
          });
          changed = true;
        }
      }
      if (changed) {
        setHistory((h) => {
          const combined = [...newHistory, ...h];
          saveHistory(combined);
          return combined;
        });
        saveChecklists(next);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    runMidnightSync();
    const t = setInterval(runMidnightSync, 60_000);
    return () => clearInterval(t);
  }, [runMidnightSync]);

  const getChecklistsForView = useCallback(
    (userId: string): RecurringChecklist[] => {
      const isFounder = userId === FOUNDER_USER_ID;
      return checklists.filter(
        (c) => c.assignedTo === userId || (isFounder && c.createdBy === userId)
      );
    },
    [checklists]
  );

  const addChecklist = useCallback(
    (payload: Omit<RecurringChecklist, "id" | "currentScore" | "lastResetDate" | "createdAt">) => {
      const today = todayStr();
      const newOne: RecurringChecklist = {
        ...payload,
        id: generateUUID(),
        currentScore: 0,
        lastResetDate: today,
        createdAt: Date.now(),
        items: payload.items.map((it) => ({
          ...it,
          id: it.id || generateUUID(),
          weight: it.weight ?? 1,
        })),
      };
      newOne.currentScore = computeChecklistScore(newOne);
      setChecklists((prev) => {
        const next = [...prev, newOne];
        saveChecklists(next);
        return next;
      });
    },
    []
  );

  const updateChecklist = useCallback(
    (id: string, updates: Partial<Pick<RecurringChecklist, "title" | "frequency" | "items" | "assignedTo" | "disableComments">>) => {
      setChecklists((prev) => {
        const next = prev.map((c) =>
          c.id === id ? applyScore({ ...c, ...updates }) : c
        );
        saveChecklists(next);
        return next;
      });
    },
    []
  );

  const removeChecklist = useCallback((id: string) => {
    setChecklists((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveChecklists(next);
      return next;
    });
  }, []);

  const toggleItem = useCallback((checklistId: string, itemId: string) => {
    setChecklists((prev) => {
      const next = prev.map((c) => {
        if (c.id !== checklistId) return c;
        const items = c.items.map((it) =>
          it.id === itemId ? { ...it, isDone: !it.isDone } : it
        );
        return applyScore({ ...c, items });
      });
      saveChecklists(next);
      return next;
    });
  }, []);

  const addItem = useCallback((checklistId: string, text: string, weight = 1) => {
    const newItem: RecurringChecklistItem = {
      id: generateUUID(),
      text,
      isDone: false,
      weight,
    };
    setChecklists((prev) => {
      const next = prev.map((c) =>
        c.id === checklistId
          ? applyScore({ ...c, items: [...c.items, newItem] })
          : c
      );
      saveChecklists(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((checklistId: string, itemId: string) => {
    setChecklists((prev) => {
      const next = prev.map((c) =>
        c.id === checklistId
          ? applyScore({ ...c, items: c.items.filter((i) => i.id !== itemId) })
          : c
      );
      saveChecklists(next);
      return next;
    });
  }, []);

  const getHistoryForChecklist = useCallback(
    (checklistId: string) =>
      history
        .filter((e) => e.checklistId === checklistId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [history]
  );

  const getChecklistBrief = useCallback(
    (userId: string): string | undefined => {
      const list = getChecklistsForView(userId);
      if (list.length === 0) return undefined;
      const parts: string[] = [];
      for (const cl of list) {
        const done = cl.items.filter((i) => i.isDone).length;
        const total = cl.items.length;
        const pct = cl.currentScore;
        const pending = cl.items.filter((i) => !i.isDone).map((i) => i.text);
        if (pending.length > 0) {
          parts.push(
            `${cl.title}: ${done}/${total} (${pct}%). Still to do: ${pending.slice(0, 3).join("; ")}${pending.length > 3 ? "…" : ""}`
          );
        } else {
          parts.push(`${cl.title}: ${done}/${total} (${pct}%) — all done.`);
        }
      }
      return parts.join(" ");
    },
    [checklists, getChecklistsForView]
  );

  const value: ChecklistsContextType = {
    checklists,
    history,
    getChecklistsForView,
    addChecklist,
    updateChecklist,
    removeChecklist,
    toggleItem,
    addItem,
    removeItem,
    getHistoryForChecklist,
    getChecklistBrief,
  };

  return (
    <ChecklistsContext.Provider value={value}>
      {children}
    </ChecklistsContext.Provider>
  );
}

export function useChecklists() {
  const ctx = useContext(ChecklistsContext);
  if (!ctx) throw new Error("useChecklists must be used within ChecklistsProvider");
  return ctx;
}
