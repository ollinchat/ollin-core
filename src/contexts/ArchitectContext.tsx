"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * Snapshot of Explore tab activity for the Architect (Global State Bridge).
 * When exploreBridgeEnabled is true, ExplorePanel updates this so Architect
 * can offer relevant AI prompts (e.g. "Ask about Jobs you're viewing").
 */
export type ExploreContextSnapshot = {
  lastCategory?: string;
  lastQuery?: string;
  recentItemIds?: string[];
  updatedAt: number;
};

/**
 * Architect / Evolution state: features applied by Ollin Architect from the AI tab.
 * Allows the AI tab to modify Dashboard, Explore, and Payments behavior.
 * No mocks: all changes persist and drive real app behavior.
 */
type ArchitectState = {
  /** Explore: sort feed by distance (near me first) */
  exploreSortByDistance: boolean;
  /** AI-driven layout: adapts UI to desktop vs mobile (auto = detect, or force desktop/mobile) */
  adaptiveLayoutMode: "auto" | "desktop" | "mobile";
  /** Predictive payment: suggest which bill to pay first based on Board + bills history */
  predictivePaymentEnabled: boolean;
  /** Global State Bridge: Architect sees Explore activity and can offer relevant AI prompts */
  exploreBridgeEnabled: boolean;
  /** Latest Explore snapshot (set by ExplorePanel when bridge enabled) */
  exploreContextForArchitect: ExploreContextSnapshot | null;
  /** Suggested bill ID to pay first (set by predictive logic; Payments/Board can highlight it) */
  suggestedBillId: string | null;
};

const defaultState: ArchitectState = {
  exploreSortByDistance: false,
  adaptiveLayoutMode: "auto",
  predictivePaymentEnabled: false,
  exploreBridgeEnabled: false,
  exploreContextForArchitect: null,
  suggestedBillId: null,
};

type ArchitectContextValue = {
  state: ArchitectState;
  setExploreSortByDistance: (value: boolean) => void;
  setAdaptiveLayoutMode: (mode: "auto" | "desktop" | "mobile") => void;
  setPredictivePaymentEnabled: (value: boolean) => void;
  setExploreBridgeEnabled: (value: boolean) => void;
  setExploreContextForArchitect: (snapshot: ExploreContextSnapshot | null) => void;
  setSuggestedBillId: (id: string | null) => void;
};

const ArchitectContext = createContext<ArchitectContextValue | null>(null);

export function ArchitectProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ArchitectState>(defaultState);

  const setExploreSortByDistance = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, exploreSortByDistance: value }));
  }, []);

  const setAdaptiveLayoutMode = useCallback((mode: "auto" | "desktop" | "mobile") => {
    setState((prev) => ({ ...prev, adaptiveLayoutMode: mode }));
  }, []);

  const setPredictivePaymentEnabled = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, predictivePaymentEnabled: value }));
  }, []);

  const setExploreBridgeEnabled = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, exploreBridgeEnabled: value }));
  }, []);

  const setExploreContextForArchitect = useCallback((snapshot: ExploreContextSnapshot | null) => {
    setState((prev) => ({ ...prev, exploreContextForArchitect: snapshot }));
  }, []);

  const setSuggestedBillId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, suggestedBillId: id }));
  }, []);

  return (
    <ArchitectContext.Provider
      value={{
        state,
        setExploreSortByDistance,
        setAdaptiveLayoutMode,
        setPredictivePaymentEnabled,
        setExploreBridgeEnabled,
        setExploreContextForArchitect,
        setSuggestedBillId,
      }}
    >
      {children}
    </ArchitectContext.Provider>
  );
}

export function useArchitect() {
  const ctx = useContext(ArchitectContext);
  if (!ctx)
    return {
      state: defaultState,
      setExploreSortByDistance: () => {},
      setAdaptiveLayoutMode: () => {},
      setPredictivePaymentEnabled: () => {},
      setExploreBridgeEnabled: () => {},
      setExploreContextForArchitect: () => {},
      setSuggestedBillId: () => {},
    };
  return ctx;
}
