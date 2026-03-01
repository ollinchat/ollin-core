"use client";

import { useState, useCallback } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { useArchitect } from "@/contexts/ArchitectContext";
import {
  LayoutGrid,
  Wallet,
  Compass,
  ListTodo,
  BookOpen,
} from "lucide-react";
import { StrategicBoard } from "@/components/board/StrategicBoard";
import { IncomingCallOverlay, ActiveCallFloating, OutgoingCallBar } from "@/components/calls/LiveCallUI";
import { PaymentsPanel } from "@/components/dashboard/PaymentsPanel";
import { ExplorePanel } from "@/components/dashboard/ExplorePanel";
import { ToolFanPanel } from "@/components/dashboard/ToolFanPanel";
import { LibraryPanel } from "@/components/dashboard/LibraryPanel";

const PANEL_COUNT = 5;
const DEFAULT_PANEL_INDEX = 1;

export function DashboardPanels() {
  const { locale } = useLocale();
  const { state: architectState } = useArchitect();
  const [panelIndex, setPanelIndex] = useState(DEFAULT_PANEL_INDEX);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const onSelectedContactChange = useCallback((id: string | null) => setSelectedContactId(id), []);

  const safePanelIndex = Math.max(0, Math.min(PANEL_COUNT - 1, panelIndex));
  const setPanelIndexSafe = useCallback((value: number | ((prev: number) => number)) => {
    setPanelIndex((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      return Math.max(0, Math.min(PANEL_COUNT - 1, next));
    });
  }, []);

  const tabs = [
    { i: 0, Icon: Wallet, label: "Payments" },
    { i: 1, Icon: Compass, label: "Explore" },
    { i: 2, Icon: LayoutGrid, label: "Ollin AI" },
    { i: 3, Icon: ListTodo, label: "Board" },
    { i: 4, Icon: BookOpen, label: "Library" },
  ] as const;

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
      <IncomingCallOverlay />
      <ActiveCallFloating />
      <OutgoingCallBar />

      {/* Main content: flex child that shrinks; padding-bottom keeps bottom nav visible */}
      <div
        className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col p-3 sm:p-4 pb-2 bg-background"
        data-architect-layout={architectState.adaptiveLayoutMode}
      >
        {safePanelIndex === 0 && <div className="flex-1 min-h-0 flex flex-col"><PaymentsPanel onOpenBoard={() => setPanelIndexSafe(3)} /></div>}
        {safePanelIndex === 1 && <div className="flex-1 min-h-0 flex flex-col"><ExplorePanel /></div>}
        {safePanelIndex === 2 && <div className="flex-1 min-h-0 flex flex-col"><ToolFanPanel onOpenBoard={() => setPanelIndexSafe(3)} /></div>}
        {safePanelIndex === 3 && <div className="flex-1 min-h-0 flex flex-col"><StrategicBoard locale={locale} onBack={() => setPanelIndexSafe(2)} /></div>}
        {safePanelIndex === 4 && (
          <div className="flex-1 min-h-0 flex flex-col">
          <LibraryPanel
            locale={locale}
            onSelectedContactChange={onSelectedContactChange}
            onOpenBoard={() => setPanelIndexSafe(3)}
          />
          </div>
        )}
      </div>

      {/* Bottom nav: always visible and functional */}
      <nav className="flex-shrink-0 min-h-[56px] flex items-center justify-around border-t border-gray-200 bg-white/95 backdrop-blur-xl rounded-t-xl z-[100] shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        {tabs.map(({ i, Icon, label }) => {
          const isActive = safePanelIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setPanelIndexSafe(i)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-medium border-b-2 min-w-0 transition-colors ${
                isActive
                  ? "text-[#008080] border-[#008080] bg-[#008080]/5"
                  : "text-gray-600 border-transparent hover:bg-gray-100/80 hover:text-gray-800"
              }`}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span className="hidden sm:inline truncate">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
