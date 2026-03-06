"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import type { MiniSiteData } from "@/lib/minisite-types";
import { defaultMiniSiteData } from "@/lib/minisite-types";

const STORAGE_PREFIX = "ollin_minisite_";

function loadMiniSite(userId: string): MiniSiteData {
  if (typeof window === "undefined") return { ...defaultMiniSiteData };
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return { ...defaultMiniSiteData };
    const parsed = JSON.parse(raw) as MiniSiteData;
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
      headline: typeof parsed.headline === "string" ? parsed.headline : "",
      location: typeof parsed.location === "string" ? parsed.location : "",
      profileImage: typeof parsed.profileImage === "string" ? parsed.profileImage : "",
      coverImage: typeof parsed.coverImage === "string" ? parsed.coverImage : "",
      cvItems: Array.isArray(parsed.cvItems) ? parsed.cvItems : [],
      portfolioItems: Array.isArray(parsed.portfolioItems) ? parsed.portfolioItems : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    };
  } catch {
    return { ...defaultMiniSiteData };
  }
}

function saveMiniSite(userId: string, data: MiniSiteData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(data));
  } catch (_) {}
}

type MiniSiteContextType = {
  getMiniSite: (userId: string) => MiniSiteData;
  updateMiniSite: (userId: string, updater: (prev: MiniSiteData) => MiniSiteData) => void;
};

const MiniSiteContext = createContext<MiniSiteContextType | null>(null);

export function MiniSiteProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Record<string, MiniSiteData>>({});

  const getMiniSite = useCallback((userId: string): MiniSiteData => {
    if (cache[userId]) return cache[userId];
    return loadMiniSite(userId);
  }, [cache]);

  const updateMiniSite = useCallback((userId: string, updater: (prev: MiniSiteData) => MiniSiteData) => {
    const prev = loadMiniSite(userId);
    const next = updater(prev);
    saveMiniSite(userId, next);
    setCache((c) => ({ ...c, [userId]: next }));
  }, []);

  const value = useMemo(() => ({ getMiniSite, updateMiniSite }), [getMiniSite, updateMiniSite]);
  return <MiniSiteContext.Provider value={value}>{children}</MiniSiteContext.Provider>;
}

export function useMiniSite() {
  const ctx = useContext(MiniSiteContext);
  if (!ctx) return { getMiniSite: (id: string) => ({ ...defaultMiniSiteData }), updateMiniSite: () => {} };
  return ctx;
}

export function useMiniSiteData(userId: string): [MiniSiteData, (updater: (prev: MiniSiteData) => MiniSiteData) => void] {
  const { getMiniSite, updateMiniSite } = useMiniSite();
  const [data, setData] = useState<MiniSiteData>(() => getMiniSite(userId));

  useEffect(() => {
    setData(getMiniSite(userId));
  }, [userId, getMiniSite]);

  // Real-time sync: when another tab updates this user's mini-site, refresh
  useEffect(() => {
    if (!userId) return;
    const key = STORAGE_PREFIX + userId;
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setData(JSON.parse(e.newValue) as MiniSiteData);
        } catch (_) {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  const update = useCallback((updater: (prev: MiniSiteData) => MiniSiteData) => {
    updateMiniSite(userId, updater);
    setData((prev) => updater(prev));
  }, [userId, updateMiniSite]);

  return [data, update];
}
