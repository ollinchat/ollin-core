"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { TimeClockEntry } from "@/lib/timeclock-types";
import { loadTimeClockFromSupabase, saveTimeClockToSupabase } from "@/lib/supabase-sync";
import { generateUUID } from "@/lib/uuid";

const STORAGE_KEY = "ollin_timeclock";

function loadEntriesFromStorage(): TimeClockEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveEntriesToStorage(entries: TimeClockEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (_) {}
}

type TimeClockContextType = {
  entries: TimeClockEntry[];
  clockIn: (note?: string, address?: string, boardId?: string) => Promise<void>;
  clockOut: (note?: string, address?: string, boardId?: string) => Promise<void>;
  updateEntryNote: (entryId: string, note: string) => void;
};

const TimeClockContext = createContext<TimeClockContextType | null>(null);

function mockLocation(): { lat: number; lng: number; label: string } {
  return { lat: 32.0853, lng: 34.7818, label: "Tel Aviv" };
}

export function TimeClockProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const fromSupabase = await loadTimeClockFromSupabase();
      if (mounted && fromSupabase != null && fromSupabase.length >= 0) {
        setEntries(fromSupabase);
        saveEntriesToStorage(fromSupabase);
        return;
      }
      const fromStorage = loadEntriesFromStorage();
      if (mounted) setEntries(fromStorage);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const recordEntry = useCallback(async (type: "in" | "out", note?: string, address?: string, boardId?: string) => {
    let lat: number | null = null;
    let lng: number | null = null;
    let label: string | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("No geolocation"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      const mock = mockLocation();
      lat = mock.lat;
      lng = mock.lng;
      label = mock.label + " (mocked)";
    }
    const entry: TimeClockEntry = {
      id: generateUUID(),
      type,
      timestamp: Date.now(),
      lat,
      lng,
      label,
      address,
      note,
      boardId: boardId?.trim() || undefined,
    };
    setEntries((prev) => {
      const next = [entry, ...prev];
      saveEntriesToStorage(next);
      saveTimeClockToSupabase(next).catch(() => {});
      return next;
    });
  }, []);

  const updateEntryNote = useCallback((entryId: string, note: string) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === entryId ? { ...e, note } : e));
      saveEntriesToStorage(next);
      saveTimeClockToSupabase(next).catch(() => {});
      return next;
    });
  }, []);

  const clockIn = useCallback(
    (note?: string, address?: string, boardId?: string) => recordEntry("in", note, address, boardId),
    [recordEntry]
  );
  const clockOut = useCallback(
    (note?: string, address?: string, boardId?: string) => recordEntry("out", note, address, boardId),
    [recordEntry]
  );

  return (
    <TimeClockContext.Provider value={{ entries, clockIn, clockOut, updateEntryNote }}>
      {children}
    </TimeClockContext.Provider>
  );
}

export function useTimeClock() {
  const ctx = useContext(TimeClockContext);
  if (!ctx) throw new Error("useTimeClock must be used within TimeClockProvider");
  return ctx;
}
