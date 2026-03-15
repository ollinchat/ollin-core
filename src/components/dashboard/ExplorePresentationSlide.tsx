"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Compass,
  MapPin,
  Search,
  ChevronDown,
  MoreHorizontal,
  Sparkles,
  Tag,
  Shield,
  Wallet,
  Home,
  List,
  BookOpen,
  X,
  Check,
  ScanLine,
  GitBranch,
} from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

// Design system: Ollin + Chargeback Fusion (investor pitch)
const OLLIN_EMERALD = "#10B981";
const CHARGEBACK_BLUE = "#0055FF";
const TEXT_PRIMARY = "#1f1f1f";
const TEXT_MUTED = "#64748B";
const BG_WHITE = "#ffffff";
const BG_SUBTLE = "#f8fafc";
const BORDER = "#e2e8f0";
const RADIUS_SHELL = "3.5rem"; // extreme rounded corners — premium mobile shell

type TabId = "all" | "deals" | "gossip" | "jobs" | "pros";

const DEFAULT_TABS: { id: TabId; labelEn: string; labelHe: string }[] = [
  { id: "all", labelEn: "ALL", labelHe: "הכל" },
  { id: "deals", labelEn: "Deals", labelHe: "מבצעים" },
  { id: "gossip", labelEn: "Gossip", labelHe: "רכילות" },
  { id: "jobs", labelEn: "Jobs", labelHe: "משרות" },
  { id: "pros", labelEn: "Pros", labelHe: "מקצוענים" },
];

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1).replace(/\.0$/, "")}km`;
}

export function ExplorePresentationSlide() {
  const { locale, setLocale } = useLocale();
  const isHe = locale === "he";

  // Tabs: customizable with edit mode (delete = remove from list with transition)
  const [tabs, setTabs] = useState(DEFAULT_TABS);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("all");

  // Scanning "wow" effect: progress bar on load
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  useEffect(() => {
    const duration = 2400;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / duration) * 100);
      setScanProgress(p);
      if (p >= 100) {
        setScanComplete(true);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  // Radius slider: 1–50 km, drives "signals" on screen
  const [radiusKm, setRadiusKm] = useState(10);
  const radiusDisplay = useMemo(() => formatDistance(radiusKm), [radiusKm]);

  // Refine (Magic Button): copy state for AI
  const [refineCopied, setRefineCopied] = useState(false);
  const handleRefine = useCallback(() => {
    const state = {
      tab: activeTab,
      radiusKm,
      timestamp: new Date().toISOString(),
      source: "Ollin Explore — sync with Gemini",
    };
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    setRefineCopied(true);
    setTimeout(() => setRefineCopied(false), 2800);
  }, [activeTab, radiusKm]);

  const removeTab = useCallback((id: TabId) => {
    if (id === "all") return; // keep ALL
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTab === id) setActiveTab("all");
      return next;
    });
  }, [activeTab]);

  return (
    <div
      className="flex flex-col mx-auto w-full max-w-[420px] min-h-[88vh] overflow-hidden bg-white shadow-2xl"
      style={{
        borderRadius: RADIUS_SHELL,
        border: `1px solid ${BORDER}`,
        color: TEXT_PRIMARY,
      }}
      dir={isHe ? "rtl" : "ltr"}
    >
      {/* Top app header: check icon, EN/עב, profile */}
      <header
        className="flex items-center justify-between shrink-0 px-4 py-3 border-b"
        style={{ borderColor: BORDER, backgroundColor: BG_WHITE }}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: BG_SUBTLE }}>
          <Check className="w-5 h-5" style={{ color: OLLIN_EMERALD }} strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!isHe ? "bg-gray-200 text-gray-800" : "text-gray-600 hover:bg-gray-100"}`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLocale("he")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isHe ? "bg-gray-200 text-gray-800" : "text-gray-600 hover:bg-gray-100"}`}
          >
            עב
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-semibold"
            style={{ backgroundColor: "#fde047", color: "#854d0e" }}
          >
            👤
          </div>
          <ChevronDown className="w-4 h-4" style={{ color: TEXT_MUTED }} />
        </div>
      </header>

      {/* Explore section: title + search + Set location */}
      <section className="shrink-0 px-4 pt-4 pb-3" style={{ backgroundColor: BG_WHITE }}>
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${OLLIN_EMERALD}18` }}
          >
            <Compass className="w-5 h-5" style={{ color: OLLIN_EMERALD }} strokeWidth={2} />
          </div>
          <h1 className="text-xl font-black tracking-tight" style={{ color: TEXT_PRIMARY }}>
            {isHe ? "גילוי" : "Explore"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 border min-w-0"
            style={{ backgroundColor: BG_WHITE, borderColor: BORDER }}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: TEXT_MUTED }} strokeWidth={2} />
            <span className="text-sm truncate" style={{ color: TEXT_MUTED }}>
              {isHe ? "חיפוש מבצעים, משרות, מקצוענים..." : "Search deals, jobs, pros..."}
            </span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 shrink-0 px-3 py-2.5 rounded-xl border font-medium text-sm transition-colors hover:opacity-90"
            style={{ borderColor: BORDER, color: TEXT_PRIMARY, backgroundColor: BG_SUBTLE }}
          >
            <MapPin className="w-4 h-4" style={{ color: OLLIN_EMERALD }} strokeWidth={2} />
            {isHe ? "הגדר מיקום" : "Set location"}
          </button>
        </div>
      </section>

      {/* Customizable tabs: edit mode = show X to delete with smooth transition */}
      <div className="shrink-0 px-4 pb-3 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 min-w-max">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="flex items-center gap-1 flex-shrink-0 transition-all duration-300 ease-out"
              style={{
                opacity: 1,
                transform: "scale(1)",
              }}
            >
              <button
                type="button"
                onClick={() => !editMode && setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98]
                  ${activeTab === tab.id ? "text-white shadow-md" : "border"}
                `}
                style={
                  activeTab === tab.id
                    ? { backgroundColor: OLLIN_EMERALD }
                    : { borderColor: BORDER, color: TEXT_PRIMARY, backgroundColor: BG_WHITE }
                }
              >
                {isHe ? tab.labelHe : tab.labelEn}
              </button>
              {editMode && tab.id !== "all" && (
                <button
                  type="button"
                  onClick={() => removeTab(tab.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-red-100 text-red-600"
                  aria-label={isHe ? "הסר" : "Remove"}
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEditMode((e) => !e)}
            className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium transition-colors ${editMode ? "bg-gray-800 text-white" : "border border-dashed"}`}
            style={editMode ? undefined : { borderColor: BORDER, color: TEXT_MUTED }}
          >
            {editMode ? (isHe ? "סיום" : "Done") : (isHe ? "ערוך" : "Edit")}
          </button>
        </div>
      </div>

      {/* Scanning hero: radar animation + progress bar */}
      <div
        className="mx-4 mb-4 rounded-2xl border overflow-hidden transition-shadow hover:shadow-md"
        style={{ backgroundColor: BG_SUBTLE, borderColor: BORDER }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <span
              className="absolute inline-flex h-full w-full rounded-full explore-slide-radar-ring opacity-30"
              style={{ backgroundColor: OLLIN_EMERALD }}
            />
            <span
              className="absolute inline-flex h-6 w-6 rounded-full explore-slide-radar-ring-delay opacity-50"
              style={{ backgroundColor: OLLIN_EMERALD }}
            />
            <ScanLine className="relative w-5 h-5" style={{ color: OLLIN_EMERALD }} strokeWidth={2} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
              {isHe ? "אולין סורקת אותות מקומיים..." : "Ollin is scanning local signals..."}
            </p>
            <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
              {isHe ? "מקור" : "Source"}: duckduckgo
            </p>
          </div>
          <button type="button" className="p-2 rounded-full hover:bg-white/80 transition-colors" style={{ color: TEXT_MUTED }} aria-label="More">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(0,0,0,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${scanProgress}%`,
                backgroundColor: OLLIN_EMERALD,
              }}
            />
          </div>
          {scanComplete && (
            <p className="text-xs font-medium mt-1.5" style={{ color: OLLIN_EMERALD }}>
              {isHe ? "סריקה הושלמה" : "Deep data scan complete"}
            </p>
          )}
        </div>
      </div>

      {/* Refine this view (Magic Button) — Google March 2026 AI integration */}
      <div className="px-4 mb-4">
        <button
          type="button"
          onClick={handleRefine}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-semibold text-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          style={{
            borderColor: `${OLLIN_EMERALD}40`,
            color: OLLIN_EMERALD,
            backgroundColor: `${OLLIN_EMERALD}08`,
          }}
        >
          <GitBranch className="w-5 h-5" strokeWidth={2} />
          {isHe ? "שפר תצוגה זו (העתק מצב)" : "Refine this view (copy state)"}
        </button>
        {refineCopied && (
          <p className="text-xs font-medium mt-2 text-center" style={{ color: OLLIN_EMERALD }}>
            {isHe ? "מצב הועתק — מוכן ל-Gemini" : "State copied — ready for AI iteration"}
          </p>
        )}
      </div>

      {/* Contextual radius slider: 1–50 km */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>
            {isHe ? "רדיוס" : "Radius"}
          </span>
          <span className="text-sm font-bold" style={{ color: OLLIN_EMERALD }}>
            {radiusDisplay} {isHe ? "ממך" : "from you"}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          className="w-full h-2.5 rounded-full appearance-none cursor-pointer bg-gray-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
          style={{
            accentColor: OLLIN_EMERALD,
            background: `linear-gradient(to right, ${OLLIN_EMERALD} 0%, ${OLLIN_EMERALD} ${((radiusKm - 1) / 49) * 100}%, ${BORDER} ${((radiusKm - 1) / 49) * 100}%, ${BORDER} 100%)`,
          }}
        />
      </div>

      {/* Feature cards: Visual Deal + Chargeback Protection (blue) */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {/* Chargeback Protection — high-priority blue card (The Edge) */}
        <article
          className="rounded-2xl overflow-hidden border-2 shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99]"
          style={{
            backgroundColor: CHARGEBACK_BLUE,
            borderColor: CHARGEBACK_BLUE,
            color: BG_WHITE,
          }}
        >
          <div className="p-4 flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                {isHe ? "הגנת הון" : "Capital Protection"}
              </p>
              <p className="text-lg font-black mt-0.5">
                ₪1,420 {isHe ? "החזר" : "refund"}
              </p>
              <p className="text-sm opacity-90 mt-1">
                {isHe ? "ערך מוכח — הגנה על עסקאות" : "Proven value — transaction protection"}
              </p>
            </div>
          </div>
        </article>

        {/* Visual Deal card: image placeholder, HOT DEAL, distance tag */}
        <article
          className="rounded-2xl overflow-hidden border shadow-md bg-white transition-all hover:shadow-lg"
          style={{ borderColor: BORDER }}
        >
          <div className="relative aspect-[16/10] bg-gray-100">
            <div className="absolute inset-0 flex items-center justify-center">
              <Tag className="w-12 h-12" style={{ color: OLLIN_EMERALD }} strokeWidth={1.5} />
            </div>
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black text-white text-xs font-bold uppercase tracking-wide">
              {isHe ? "דיל חם" : "HOT DEAL"}
            </div>
            <div
              className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-white text-xs font-bold"
              style={{ backgroundColor: OLLIN_EMERALD }}
            >
              {radiusDisplay} {isHe ? "ממך" : "from you"}
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-base" style={{ color: TEXT_PRIMARY }}>
              50% off at the new café on Main Street
            </h3>
            <p className="text-sm mt-1" style={{ color: TEXT_MUTED }}>
              Grand opening week — half off all pastries and coffee.
            </p>
          </div>
        </article>
      </div>

      {/* Bottom navigation */}
      <nav
        className="flex shrink-0 items-center justify-around py-3 border-t relative"
        style={{ borderColor: BORDER, backgroundColor: BG_WHITE }}
      >
        {[
          { icon: Wallet, label: isHe ? "ארנק" : "Wallet", active: false },
          { icon: Compass, label: isHe ? "גילוי" : "Explore", active: true },
          { icon: Home, label: isHe ? "בית" : "Home", active: false },
          { icon: List, label: isHe ? "רשימות" : "Lists", active: false },
          { icon: BookOpen, label: isHe ? "ספר" : "Book", active: false },
        ].map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            type="button"
            className="relative flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors hover:bg-gray-50 min-w-[56px]"
          >
            <Icon
              className="w-6 h-6"
              style={{ color: active ? OLLIN_EMERALD : TEXT_MUTED }}
              strokeWidth={active ? 2.5 : 2}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: active ? OLLIN_EMERALD : TEXT_MUTED }}
            >
              {label}
            </span>
            {active && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ backgroundColor: OLLIN_EMERALD }}
              />
            )}
          </button>
        ))}
      </nav>

    </div>
  );
}
