"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Compass,
  MapPin,
  Search,
  ChevronDown,
  MoreHorizontal,
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
  Building2,
  Plus,
} from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

// ——— Design system: Ollin + Chargeback (investor demo) ———
const OLLIN_EMERALD = "#10B981";
const CHARGEBACK_BLUE = "#0055FF";
const TEXT_PRIMARY = "#1f1f1f";
const TEXT_MUTED = "#64748B";
const BG_WHITE = "#ffffff";
const BG_SUBTLE = "#f8fafc";
const BORDER = "#e2e8f0";
const SHELL_RADIUS = "3.5rem";
const SHELL_HEIGHT = 850;

type TabId = "all" | "deals" | "gossip" | "local_deals" | "jobs" | "pros";
type TabEntry = { id: TabId; labelEn: string; labelHe: string };

const TAB_ALL: TabEntry = { id: "all", labelEn: "ALL", labelHe: "הכל" };

const TAB_LIBRARY: TabEntry[] = [
  { id: "deals", labelEn: "Deals", labelHe: "מבצעים" },
  { id: "gossip", labelEn: "Gossip", labelHe: "רכילות" },
  { id: "local_deals", labelEn: "Local Deals", labelHe: "מבצעים לוקאליים" },
  { id: "jobs", labelEn: "Jobs", labelHe: "משרות" },
  { id: "pros", labelEn: "Pros", labelHe: "מומחים" },
];

const DEFAULT_TABS: TabEntry[] = [
  TAB_ALL,
  TAB_LIBRARY[0],
  TAB_LIBRARY[1],
  TAB_LIBRARY[3],
  TAB_LIBRARY[4],
];

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1).replace(/\.0$/, "")}km`;
}

export function ExplorePresentationSlide() {
  const { locale, setLocale } = useLocale();
  const isHe = locale === "he";

  const [tabs, setTabs] = useState<TabEntry[]>(DEFAULT_TABS);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [isEditMode, setIsEditMode] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const availableToAdd = useMemo(
    () => TAB_LIBRARY.filter((c) => !tabs.some((t) => t.id === c.id)),
    [tabs]
  );

  const addTab = useCallback((entry: TabEntry) => {
    setTabs((prev) => (prev.some((t) => t.id === entry.id) ? prev : [...prev, entry]));
    setActiveTab(entry.id);
    setAddMenuOpen(false);
  }, []);

  const removeTab = useCallback((id: TabId) => {
    if (id === "all") return;
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTab === id) setActiveTab("all");
      return next;
    });
  }, [activeTab]);

  useEffect(() => {
    if (!addMenuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close, { passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [addMenuOpen]);

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) setActiveTab("all");
  }, [tabs, activeTab]);

  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  useEffect(() => {
    const duration = 2400;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(100, ((Date.now() - start) / duration) * 100);
      setScanProgress(p);
      if (p >= 100) setScanComplete(true);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const [radiusKm, setRadiusKm] = useState(10);
  const radiusDisplay = useMemo(() => formatDistance(radiusKm), [radiusKm]);

  const [refineCopied, setRefineCopied] = useState(false);
  const handleRefine = useCallback(() => {
    const state = {
      tabs: tabs.map((t) => ({ id: t.id, labelEn: t.labelEn, labelHe: t.labelHe })),
      activeTab,
      radiusKm,
      locale,
      timestamp: new Date().toISOString(),
      source: "Ollin Explore",
    };
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    setRefineCopied(true);
    setTimeout(() => setRefineCopied(false), 2600);
  }, [tabs, activeTab, radiusKm, locale]);

  return (
    <div
      className="flex flex-col mx-auto w-full max-w-[420px] overflow-hidden bg-white shadow-2xl"
      style={{
        height: SHELL_HEIGHT,
        borderRadius: SHELL_RADIUS,
        border: `1px solid ${BORDER}`,
        color: TEXT_PRIMARY,
      }}
      dir={isHe ? "rtl" : "ltr"}
    >
      {/* ——— Fixed header ——— */}
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
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-semibold" style={{ backgroundColor: "#fde047", color: "#854d0e" }}>
            👤
          </div>
          <ChevronDown className="w-4 h-4" style={{ color: TEXT_MUTED }} />
        </div>
      </header>

      {/* ——— Fixed top block: search, tabs, scan, refine, radius ——— */}
      <div className="shrink-0 flex flex-col" style={{ backgroundColor: BG_WHITE }}>
        <section className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${OLLIN_EMERALD}18` }}>
              <Compass className="w-5 h-5" style={{ color: OLLIN_EMERALD }} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: TEXT_PRIMARY }}>
              {isHe ? "גילוי" : "Explore"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 border min-w-0" style={{ backgroundColor: BG_WHITE, borderColor: BORDER }}>
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

        {/* Tabs row: Edit = X on non-ALL, Emerald dashed "+" opens Add menu */}
        <div className="shrink-0 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            {tabs.map((tab) => (
              <div key={tab.id} className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => !isEditMode && setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all hover:scale-[1.02] active:scale-[0.98] border"
                  style={
                    activeTab === tab.id
                      ? { backgroundColor: OLLIN_EMERALD, color: BG_WHITE }
                      : { borderColor: BORDER, color: TEXT_PRIMARY, backgroundColor: BG_WHITE }
                  }
                >
                  {isHe ? tab.labelHe : tab.labelEn}
                </button>
                {isEditMode && tab.id !== "all" && (
                  <button
                    type="button"
                    onClick={() => removeTab(tab.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-100 text-red-600 transition-colors"
                    aria-label={isHe ? "הסר" : "Remove"}
                  >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ))}
            {isEditMode && (
              <div className="relative flex-shrink-0" ref={addMenuRef}>
                <button
                  type="button"
                  onClick={() => setAddMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border-2 border-dashed min-w-[44px] justify-center transition-colors hover:bg-gray-50"
                  style={{ borderColor: OLLIN_EMERALD, color: OLLIN_EMERALD }}
                  aria-expanded={addMenuOpen}
                  aria-label={isHe ? "הוסף כרטיסייה" : "Add tab"}
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  {isHe ? "הוסף" : "Add"}
                </button>
                {addMenuOpen && (
                  <div
                    className="absolute top-full mt-1.5 z-50 min-w-[180px] rounded-xl border shadow-xl py-1.5 overflow-hidden"
                    style={{
                      backgroundColor: BG_WHITE,
                      borderColor: BORDER,
                      [isHe ? "right" : "left"]: 0,
                    }}
                  >
                    {availableToAdd.length === 0 ? (
                      <p className="px-3 py-2 text-xs" style={{ color: TEXT_MUTED }}>
                        {isHe ? "כל הקטגוריות נוספו" : "All categories added"}
                      </p>
                    ) : (
                      availableToAdd.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => addTab(entry)}
                          className="w-full text-start px-3 py-2.5 text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
                          style={{ color: TEXT_PRIMARY }}
                        >
                          <Plus className="w-4 h-4 shrink-0" style={{ color: OLLIN_EMERALD }} strokeWidth={2} />
                          {isHe ? entry.labelHe : entry.labelEn}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => { setIsEditMode((e) => !e); setAddMenuOpen(false); }}
              className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium transition-colors ${isEditMode ? "bg-gray-800 text-white" : "border border-dashed"}`}
              style={isEditMode ? undefined : { borderColor: BORDER, color: TEXT_MUTED }}
            >
              {isEditMode ? (isHe ? "סיום" : "Done") : (isHe ? "ערוך" : "Edit")}
            </button>
          </div>
        </div>

        {/* Scanning hero */}
        <div className="mx-4 mb-4 rounded-2xl border overflow-hidden" style={{ backgroundColor: BG_SUBTLE, borderColor: BORDER }}>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full explore-slide-radar-ring" style={{ backgroundColor: OLLIN_EMERALD, opacity: 0.45 }} />
              <span className="absolute inline-flex h-7 w-7 rounded-full explore-slide-radar-ring-delay" style={{ backgroundColor: OLLIN_EMERALD, opacity: 0.55 }} />
              <ScanLine className="relative w-6 h-6" style={{ color: OLLIN_EMERALD }} strokeWidth={2.5} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black" style={{ color: TEXT_PRIMARY }}>
                {isHe ? "אולין סורקת אותות מקומיים..." : "Ollin is scanning local signals..."}
              </p>
              <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>{isHe ? "מקור" : "Source"}: duckduckgo</p>
            </div>
            <button type="button" className="p-2 rounded-full hover:bg-white/80 transition-colors" style={{ color: TEXT_MUTED }} aria-label="More">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="px-4 pb-3.5">
            <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(0,0,0,0.1)" }}>
              <div className="h-full rounded-full transition-all duration-150 ease-out" style={{ width: `${scanProgress}%`, backgroundColor: OLLIN_EMERALD }} />
            </div>
            {scanComplete && (
              <p className="text-xs font-bold mt-2" style={{ color: OLLIN_EMERALD }}>
                {isHe ? "סריקה הושלמה" : "Deep data scan complete"}
              </p>
            )}
          </div>
        </div>

        {/* Refine (copy state) */}
        <div className="px-4 mb-4">
          <button
            type="button"
            onClick={handleRefine}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ borderColor: `${OLLIN_EMERALD}40`, color: OLLIN_EMERALD, backgroundColor: `${OLLIN_EMERALD}08` }}
          >
            <GitBranch className="w-5 h-5" strokeWidth={2} />
            {isHe ? "שפר תצוגה זו (העתק מצב)" : "Refine this view (copy state)"}
          </button>
          {refineCopied && (
            <p className="text-xs font-medium mt-2 text-center" style={{ color: OLLIN_EMERALD }}>
              {isHe ? "מצב הועתק" : "State copied"}
            </p>
          )}
        </div>

        {/* Radius slider */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>{isHe ? "רדיוס" : "Radius"}</span>
            <span className="text-sm font-bold" style={{ color: OLLIN_EMERALD }}>{radiusDisplay} {isHe ? "ממך" : "from you"}</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full h-2.5 rounded-full appearance-none cursor-pointer bg-gray-200"
            style={{ accentColor: OLLIN_EMERALD }}
          />
        </div>
      </div>

      {/* ——— Scrollable main content (cards/feed) ——— */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-auto touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="px-4 pb-6 space-y-4">
          {/* Capital Protection — Chargeback Blue only */}
          <article
            className="rounded-2xl overflow-hidden border-2 shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{ backgroundColor: CHARGEBACK_BLUE, borderColor: CHARGEBACK_BLUE, color: BG_WHITE }}
          >
            <div className="p-4 flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider opacity-90">{isHe ? "הגנת הון" : "Capital Protection"}</p>
                <p className="text-lg font-black mt-0.5">₪1,420 {isHe ? "החזר" : "refund"}</p>
                <p className="text-sm opacity-90 mt-1">{isHe ? "ערך מוכח — הגנה על עסקאות" : "Proven value — transaction protection"}</p>
              </div>
            </div>
          </article>

          {/* Deal card: business placeholder, font-black title */}
          <article className="rounded-2xl overflow-hidden border shadow-md bg-white transition-all hover:shadow-lg" style={{ borderColor: BORDER }}>
            <div className="relative aspect-[16/10] overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${OLLIN_EMERALD}12 0%, #f0fdf4 50%, #ecfdf5 100%)` }}>
                <Building2 className="w-14 h-14" style={{ color: OLLIN_EMERALD }} strokeWidth={1.5} />
              </div>
              <div className={`absolute top-3 px-2.5 py-1.5 rounded-lg bg-black text-white text-xs font-black uppercase tracking-wide ${isHe ? "right-3" : "left-3"}`}>
                {isHe ? "דיל חם" : "HOT DEAL"}
              </div>
              <div className={`absolute top-3 px-2.5 py-1.5 rounded-lg text-white text-xs font-black ${isHe ? "left-3" : "right-3"}`} style={{ backgroundColor: OLLIN_EMERALD }}>
                {radiusDisplay} {isHe ? "ממך" : "from you"}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-black text-base leading-snug" style={{ color: TEXT_PRIMARY }}>50% off at the new café on Main Street</h3>
              <p className="text-sm mt-1.5" style={{ color: TEXT_MUTED }}>Grand opening week — half off all pastries and coffee.</p>
            </div>
          </article>

          {/* Second deal card */}
          <article className="rounded-2xl overflow-hidden border shadow-md bg-white transition-all hover:shadow-lg" style={{ borderColor: BORDER }}>
            <div className="relative aspect-[16/10] overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(160deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)" }}>
                <Tag className="w-14 h-14" style={{ color: OLLIN_EMERALD }} strokeWidth={1.5} />
              </div>
              <div className={`absolute top-3 px-2.5 py-1.5 rounded-lg text-white text-xs font-black ${isHe ? "left-3" : "right-3"}`} style={{ backgroundColor: OLLIN_EMERALD }}>
                {radiusDisplay} {isHe ? "ממך" : "from you"}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-black text-base leading-snug" style={{ color: TEXT_PRIMARY }}>
                {isHe ? "חברת הכושר — 3 חודשים במחיר 1" : "Gym flash sale — 3 months for the price of 1"}
              </h3>
              <p className="text-sm mt-1.5" style={{ color: TEXT_MUTED }}>{isHe ? "מכון כושר באזור — הצעה מוגבלת." : "Local fitness center — limited offer."}</p>
            </div>
          </article>
        </div>
      </div>

      {/* ——— Fixed bottom navigation ——— */}
      <nav className="flex shrink-0 items-center justify-around py-3 border-t relative" style={{ borderColor: BORDER, backgroundColor: BG_WHITE }}>
        {[
          { icon: Wallet, label: isHe ? "ארנק" : "Wallet", active: false },
          { icon: Compass, label: isHe ? "גילוי" : "Explore", active: true },
          { icon: Home, label: isHe ? "בית" : "Home", active: false },
          { icon: List, label: isHe ? "רשימות" : "Lists", active: false },
          { icon: BookOpen, label: isHe ? "ספר" : "Book", active: false },
        ].map(({ icon: Icon, label, active }) => (
          <button key={label} type="button" className="relative flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl hover:bg-gray-50 min-w-[56px] transition-colors">
            <Icon className="w-6 h-6" style={{ color: active ? OLLIN_EMERALD : TEXT_MUTED }} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-medium" style={{ color: active ? OLLIN_EMERALD : TEXT_MUTED }}>{label}</span>
            {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: OLLIN_EMERALD }} />}
          </button>
        ))}
      </nav>
    </div>
  );
}
