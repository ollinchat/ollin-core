"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useBills } from "@/contexts/BillsContext";
import { useBoard } from "@/contexts/BoardContext";
import { useArchitect } from "@/contexts/ArchitectContext";
import type { BillCategory } from "@/contexts/BillsContext";
import { parseBillFromFile, type BillExtraction } from "@/lib/bill-parser";
import {
  Wallet,
  Plus,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  ListTodo,
  Check,
  X,
  BarChart3,
  FileText,
  LayoutGrid,
  Dumbbell,
  Home,
  Car,
  TrendingUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { PanelWrapper } from "@/components/dashboard/PanelWrapper";
import { createPortal } from "react-dom";
import {
  loadFinancialDashboard,
  saveFinancialDashboard,
  DEFAULT_FINANCIAL_DASHBOARD,
  type FinancialDashboardState,
} from "@/lib/financial-dashboard-storage";
import {
  MinimalFinancialOverview,
  AppsSubscriptionsTab,
  MembershipsTab,
  HomeFixedTab,
  AutoTab,
  InvestmentsTab,
} from "@/components/dashboard/financial-dashboard-ui";

const CATEGORIES: { value: BillCategory; labelEn: string; labelHe: string }[] = [
  { value: "electricity", labelEn: "Electricity", labelHe: "חשמל" },
  { value: "water", labelEn: "Water", labelHe: "מים" },
  { value: "car_finance", labelEn: "Car Finance", labelHe: "מימון רכב" },
  { value: "fines", labelEn: "Fines", labelHe: "קנסות" },
  { value: "vaad_bayit", labelEn: "Building Committee (Va'ad Bayit)", labelHe: "ועד בית" },
  { value: "other", labelEn: "Other", labelHe: "אחר" },
];

export type PaymentsTabId =
  | "overview"
  | "payments"
  | "invoices"
  | "apps"
  | "memberships"
  | "home"
  | "auto"
  | "investments";

const PAYMENTS_TAB_IDS: PaymentsTabId[] = [
  "overview",
  "payments",
  "invoices",
  "apps",
  "memberships",
  "home",
  "auto",
  "investments",
];

type PaymentsPanelProps = {
  onOpenBoard?: () => void;
  initialTab?: PaymentsTabId;
};

export function PaymentsPanel({ onOpenBoard, initialTab }: PaymentsPanelProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const { bills, addBill, updateBill, removeBill } = useBills();
  const { addGivenTask } = useBoard();
  const { state: architectState, setSuggestedBillId } = useArchitect();

  const DEFAULT_VISIBLE_TABS: PaymentsTabId[] = ["overview", "invoices"];
  const TABS_FOR_ADD: PaymentsTabId[] = ["apps", "memberships", "home", "auto", "investments"];
  const STORAGE_VISIBLE_TABS_KEY = "ollin_finance_visible_tabs_v1";
  const STORAGE_PRIVACY_KEY = "ollin_finance_privacy_v1";
  const shouldIncludePaymentsByUrl = initialTab === "payments";
  const BASE_VISIBLE_TABS: PaymentsTabId[] = shouldIncludePaymentsByUrl ? ["overview", "invoices", "payments"] : DEFAULT_VISIBLE_TABS;

  const [visibleTabs, setVisibleTabs] = useState<PaymentsTabId[]>(() => {
    if (typeof window === "undefined") return BASE_VISIBLE_TABS;
    try {
      const raw = localStorage.getItem(STORAGE_VISIBLE_TABS_KEY);
      if (!raw) return BASE_VISIBLE_TABS;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return BASE_VISIBLE_TABS;
      const safe = parsed.filter(
        (x): x is PaymentsTabId =>
          typeof x === "string" && PAYMENTS_TAB_IDS.includes(x as PaymentsTabId) && (shouldIncludePaymentsByUrl ? true : x !== "payments")
      );
      const next = Array.from(new Set([...BASE_VISIBLE_TABS, ...safe]));
      return next.filter((t) => (shouldIncludePaymentsByUrl ? true : t !== "payments"));
    } catch {
      return BASE_VISIBLE_TABS;
    }
  });

  const [activeTab, setActiveTab] = useState<PaymentsTabId>(() => {
    if (!initialTab || !PAYMENTS_TAB_IDS.includes(initialTab)) return BASE_VISIBLE_TABS[0];
    return initialTab;
  });

  const [tabsEditMode, setTabsEditMode] = useState(false);
  const [addTabsOpen, setAddTabsOpen] = useState(false);
  const [draggingTab, setDraggingTab] = useState<PaymentsTabId | null>(null);
  const tabLongPressTimerRef = useRef<number | null>(null);

  /** Blur amounts by default; sync from localStorage after mount to avoid SSR/client mismatch. */
  const [privacyMode, setPrivacyMode] = useState(true);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PRIVACY_KEY);
      if (raw !== null) setPrivacyMode(raw === "1");
    } catch {
      /* keep default true */
    }
  }, []);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<BillCategory | "">("");
  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState<BillCategory>("other");
  const [attachment, setAttachment] = useState<string | undefined>();
  const [aiExtracting, setAiExtracting] = useState(false);
  const [scanResult, setScanResult] = useState<BillExtraction | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const [fd, setFd] = useState<FinancialDashboardState>(DEFAULT_FINANCIAL_DASHBOARD);
  const [fdReady, setFdReady] = useState(false);

  useEffect(() => {
    setFd(loadFinancialDashboard());
    setFdReady(true);
  }, []);

  useEffect(() => {
    if (!fdReady) return;
    saveFinancialDashboard(fd);
  }, [fd, fdReady]);

  useEffect(() => {
    if (!initialTab || !PAYMENTS_TAB_IDS.includes(initialTab)) return;
    setVisibleTabs((prev) => (prev.includes(initialTab) ? prev : [...prev, initialTab]));
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) setActiveTab(visibleTabs[0] ?? "overview");
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_VISIBLE_TABS_KEY, JSON.stringify(visibleTabs));
    } catch {}
  }, [visibleTabs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_PRIVACY_KEY, privacyMode ? "1" : "0");
    } catch {}
  }, [privacyMode]);

  useEffect(() => {
    if (activeTab === "invoices") router.push("/dashboard/finances/documents");
  }, [activeTab, router]);

  const isHe = locale === "he";

  const filtered = useMemo(() => {
    let list = bills;
    if (dateFrom) list = list.filter((b) => b.dueDate >= dateFrom);
    if (dateTo) list = list.filter((b) => b.dueDate <= dateTo);
    if (categoryFilter) list = list.filter((b) => (b.category ?? "other") === categoryFilter);
    return list;
  }, [bills, dateFrom, dateTo, categoryFilter]);

  const totalDue = useMemo(
    () => filtered.filter((b) => b.status === "pending").reduce((s, b) => s + b.amount, 0),
    [filtered]
  );

  const suggestedBillId = useMemo(() => {
    if (!architectState.predictivePaymentEnabled) return null;
    const pending = bills.filter((b) => b.status === "pending").sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    return pending[0]?.id ?? null;
  }, [architectState.predictivePaymentEnabled, bills]);

  useEffect(() => {
    setSuggestedBillId(suggestedBillId);
  }, [suggestedBillId, setSuggestedBillId]);

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (!provider.trim() || isNaN(amt) || amt < 0) return;
    addBill({
      provider: provider.trim(),
      amount: amt,
      currency: "ILS",
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      status: "pending",
      category,
      attachmentDataUrl: attachment,
    });
    setProvider("");
    setAmount("");
    setDueDate("");
    setAttachment(undefined);
    setShowForm(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => setAttachment(r.result as string);
    r.readAsDataURL(file);
    e.target.value = "";
  };

  const onAiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiExtracting(true);
    setScanResult(null);
    try {
      const extracted = await parseBillFromFile(file);
      if (extracted) {
        setScanResult(extracted);
        setProvider(extracted.provider);
        setAmount(String(extracted.amount || ""));
        setDueDate(extracted.dueDate || "");
        const r = new FileReader();
        r.onload = () => setAttachment(r.result as string);
        r.readAsDataURL(file);
      }
    } finally {
      setAiExtracting(false);
    }
    e.target.value = "";
  };

  const mapCategoryToBill = (c?: BillExtraction["category"]): BillCategory => {
    if (c === "electricity") return "electricity";
    if (c === "water") return "water";
    if (c === "vaad_bayit") return "vaad_bayit";
    return "other";
  };

  const handleAddToBoard = () => {
    if (!scanResult) return;
    const title = isHe
      ? `שלם ${scanResult.provider} — ${scanResult.amount.toFixed(2)} ₪ עד ${scanResult.dueDate}`
      : `Pay ${scanResult.provider} — ₪${scanResult.amount.toFixed(2)} by ${scanResult.dueDate}`;
    addGivenTask({
      title,
      otherParty: "Self",
      done: false,
      checklist: [],
    });
    setScanResult(null);
    onOpenBoard?.();
  };

  const handleAddToPaymentsFromScan = () => {
    if (!scanResult) return;
    addBill({
      provider: scanResult.provider,
      amount: scanResult.amount,
      currency: scanResult.currency || "ILS",
      dueDate: scanResult.dueDate,
      status: "pending",
      category: mapCategoryToBill(scanResult.category),
      attachmentDataUrl: attachment,
    });
    setScanResult(null);
    setShowForm(false);
  };

  const handleUseScanInForm = () => {
    if (scanResult) {
      setProvider(scanResult.provider);
      setAmount(String(scanResult.amount));
      setDueDate(scanResult.dueDate);
      setCategory(mapCategoryToBill(scanResult.category));
    }
    setScanResult(null);
    setShowForm(true);
  };

  const tabLabel = (id: PaymentsTabId) => {
    const map: Record<PaymentsTabId, { labelEn: string; labelHe: string }> = {
      overview: { labelEn: "Overview", labelHe: "סקירה" },
      payments: { labelEn: "Bills", labelHe: "חשבונות" },
      invoices: { labelEn: "Invoices", labelHe: "חשבוניות" },
      apps: { labelEn: "Apps & subs", labelHe: "אפליקציות" },
      memberships: { labelEn: "Memberships", labelHe: "מנויים" },
      home: { labelEn: "Home", labelHe: "בית" },
      auto: { labelEn: "Auto", labelHe: "רכב" },
      investments: { labelEn: "Invest", labelHe: "השקעות" },
    };
    const v = map[id];
    return isHe ? v.labelHe : v.labelEn;
  };

  const deletableTab = (id: PaymentsTabId) => id !== "overview" && id !== "invoices";

  const addTabIcon = (id: PaymentsTabId) => {
    switch (id) {
      case "apps":
        return <LayoutGrid className="w-5 h-5 text-[var(--clean-accent)]" strokeWidth={1.8} />;
      case "memberships":
        return <Dumbbell className="w-5 h-5 text-[var(--clean-accent)]" strokeWidth={1.8} />;
      case "home":
        return <Home className="w-5 h-5 text-[var(--clean-accent)]" strokeWidth={1.8} />;
      case "auto":
        return <Car className="w-5 h-5 text-[var(--clean-accent)]" strokeWidth={1.8} />;
      case "investments":
        return <TrendingUp className="w-5 h-5 text-[var(--clean-accent)]" strokeWidth={1.8} />;
      case "overview":
      case "invoices":
      case "payments":
      default:
        return null;
    }
  };

  const header = (
    <>
      <div className="px-4 py-3 border-b border-[var(--clean-border)] bg-white flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--clean-text)] tracking-wide">
          {isHe ? "מרכז פיננסי" : "Finance"}
        </h2>
        <button
          type="button"
          onClick={() => setPrivacyMode((o) => !o)}
          className="p-2 rounded-xl border border-[var(--clean-border)] bg-white text-[var(--clean-accent)] hover:bg-[#008080]/5 transition-colors"
          aria-label={isHe ? "פרטיות (טשטוש)" : "Privacy (blur)"}
        >
          {privacyMode ? <EyeOff className="w-5 h-5" strokeWidth={2} /> : <Eye className="w-5 h-5" strokeWidth={2} />}
        </button>
      </div>

      <div className="flex border-b border-[var(--clean-border)] bg-white overflow-x-auto scrollbar-hide px-2 items-center">
        <div className="flex-1 flex items-end gap-1 py-2 overflow-x-auto scrollbar-hide">
          {visibleTabs.map((id) => (
            <div key={id} className="relative">
              <button
                type="button"
                draggable={tabsEditMode}
                onDragStart={() => setDraggingTab(id)}
                onDragOver={(e) => {
                  if (!tabsEditMode) return;
                  e.preventDefault();
                  if (!draggingTab || draggingTab === id) return;
                  setVisibleTabs((prev) => {
                    const fromIndex = prev.indexOf(draggingTab);
                    const toIndex = prev.indexOf(id);
                    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
                    const next = [...prev];
                    const [moved] = next.splice(fromIndex, 1);
                    next.splice(toIndex, 0, moved);
                    return next;
                  });
                }}
                onClick={() => {
                  if (id === "invoices") router.push("/dashboard/finances/documents");
                  else setActiveTab(id);
                }}
                onPointerDown={() => {
                  if (tabsEditMode) return;
                  if (tabLongPressTimerRef.current) window.clearTimeout(tabLongPressTimerRef.current);
                  tabLongPressTimerRef.current = window.setTimeout(() => setTabsEditMode(true), 520);
                }}
                onPointerUp={() => {
                  if (tabLongPressTimerRef.current) window.clearTimeout(tabLongPressTimerRef.current);
                  tabLongPressTimerRef.current = null;
                }}
                onPointerLeave={() => {
                  if (tabLongPressTimerRef.current) window.clearTimeout(tabLongPressTimerRef.current);
                  tabLongPressTimerRef.current = null;
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setTabsEditMode(true);
                }}
                className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === id
                    ? "border-[var(--clean-accent)] text-[var(--clean-accent)]"
                    : "border-transparent text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)]"
                } ${tabsEditMode ? "animate-wiggle" : ""}`}
                style={tabsEditMode ? { animationDuration: "1.15s" } : undefined}
              >
                {tabLabel(id)}
              </button>

              {tabsEditMode && deletableTab(id) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisibleTabs((prev) => {
                      const next = prev.filter((t) => t !== id);
                      return next.length >= 1 ? next : prev;
                    });
                    if (activeTab === id) setActiveTab("overview");
                  }}
                  className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_1px_6px_rgba(239,68,68,0.20)] hover:bg-red-600"
                  aria-label={isHe ? "מחק טאבים" : "Delete tab"}
                >
                  <X className="w-2.5 h-2.5" strokeWidth={3} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAddTabsOpen(true)}
          className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 text-[var(--clean-accent)] hover:bg-gray-100 transition-colors flex items-center justify-center shrink-0 shadow-sm"
          aria-label={isHe ? "הוסף טאבים" : "Add tabs"}
        >
          <Plus className="w-5 h-5" strokeWidth={2.25} />
        </button>
      </div>

      {addTabsOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/20 backdrop-blur-sm"
            onClick={() => setAddTabsOpen(false)}
            aria-hidden
          >
            <div
              className="w-[92vw] max-w-[520px] rounded-2xl bg-white/95 border border-slate-200 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-slate-700">{isHe ? "הוסף טאבים" : "Add tabs"}</p>
                <button
                  type="button"
                  onClick={() => setAddTabsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900"
                  aria-label={isHe ? "סגור" : "Close"}
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {TABS_FOR_ADD.filter((t) => !visibleTabs.includes(t)).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setVisibleTabs((prev) => [...prev, id]);
                        setActiveTab(id);
                        setAddTabsOpen(false);
                      }}
                      className="p-3 rounded-2xl border border-slate-200/70 bg-white hover:bg-slate-50 transition-colors text-left shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                          {addTabIcon(id)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-slate-800 truncate">{tabLabel(id)}</div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {isHe ? "הוסף ללוח" : "Add to dashboard"}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {TABS_FOR_ADD.filter((t) => !visibleTabs.includes(t)).length === 0 && (
                    <div className="col-span-2 text-center text-[13px] text-slate-600 py-6">
                      {isHe ? "כל הטאבים כבר מופיעים" : "All tabs already added"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );

  return (
    <PanelWrapper header={header} className="clean-app border border-[var(--clean-border)] bg-white flex flex-col">
      {activeTab === "overview" && (
        <MinimalFinancialOverview isHe={isHe} fd={fd} privacyMode={privacyMode} />
      )}

      {activeTab === "apps" && <AppsSubscriptionsTab isHe={isHe} fd={fd} setFd={setFd} />}

      {activeTab === "memberships" && <MembershipsTab isHe={isHe} fd={fd} setFd={setFd} />}

      {activeTab === "home" && <HomeFixedTab isHe={isHe} fd={fd} setFd={setFd} bills={bills} />}

      {activeTab === "auto" && <AutoTab isHe={isHe} fd={fd} setFd={setFd} />}

      {activeTab === "investments" && <InvestmentsTab isHe={isHe} fd={fd} setFd={setFd} />}

      {activeTab === "payments" && (
        <>
          <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--clean-border)] bg-white space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-[var(--clean-border)] px-3 py-2 text-[13px] text-[var(--clean-text)] bg-white"
              />
              <span className="text-[var(--clean-text-secondary)]">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-[var(--clean-border)] px-3 py-2 text-[13px] text-[var(--clean-text)] bg-white"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as BillCategory | "")}
              className="border border-[var(--clean-border)] px-3 py-2 text-[13px] w-full bg-white text-[var(--clean-text)]"
            >
              <option value="">{isHe ? "כל הקטגוריות" : "All categories"}</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{isHe ? c.labelHe : c.labelEn}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-[13px] font-medium">
              <span className="text-[var(--clean-text-secondary)]">{isHe ? "סה\"כ לתשלום:" : "Total Due:"}</span>
              <span className="text-[var(--clean-accent)]">{totalDue.toFixed(2)} ₪</span>
            </div>
          </div>

          {scanResult && (
            <div className="flex-shrink-0 px-4 py-4 border-b border-[var(--clean-border)] bg-white">
              <div className="max-w-lg mx-auto border border-[var(--clean-border)] bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--clean-border)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--clean-accent)]" strokeWidth={1.75} />
                  <span className="text-[13px] font-medium text-[var(--clean-text)]">{isHe ? "תוצאות סריקה" : "Scan result"}</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-medium text-[var(--clean-text-secondary)] uppercase tracking-wide">{isHe ? "ספק" : "Provider"}</span>
                    <span className="text-[13px] font-medium text-[var(--clean-text)] text-right max-w-[70%]">{scanResult.provider}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[var(--clean-text-secondary)] uppercase tracking-wide">{isHe ? "סכום" : "Amount"}</span>
                    <span className="text-lg font-semibold text-[var(--clean-accent)]">{scanResult.amount.toFixed(2)} ₪</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[var(--clean-text-secondary)] uppercase tracking-wide">{isHe ? "תאריך יעד" : "Due date"}</span>
                    <span className="text-[13px] font-medium text-[var(--clean-text)]">{scanResult.dueDate != null ? String(scanResult.dueDate) : ""}</span>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-[var(--clean-border)] flex flex-wrap gap-2 bg-white">
                  <button
                    type="button"
                    onClick={handleAddToBoard}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--clean-accent)] text-white text-[13px] font-medium hover:bg-[var(--clean-accent-hover)]"
                  >
                    <ListTodo className="w-4 h-4" strokeWidth={1.75} />
                    {isHe ? "הוסף ללוח" : "Add to Board"}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToPaymentsFromScan}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-[var(--clean-accent)] text-[var(--clean-accent)] text-[13px] font-medium hover:bg-[var(--clean-accent)]/5"
                  >
                    <Check className="w-4 h-4" strokeWidth={1.75} />
                    {isHe ? "הוסף לתשלומים" : "Add to Payments"}
                  </button>
                  <button type="button" onClick={handleUseScanInForm} className="inline-flex items-center gap-2 px-3 py-2 border border-[var(--clean-border)] text-[var(--clean-text)] text-[13px] font-medium hover:bg-[var(--clean-border)]/50">
                    {isHe ? "ערוך בטופס" : "Edit in form"}
                  </button>
                  <button type="button" onClick={() => setScanResult(null)} className="inline-flex items-center gap-2 px-3 py-2 text-[var(--clean-text-secondary)] text-[13px] font-medium hover:bg-[var(--clean-border)]/50">
                    <X className="w-4 h-4" strokeWidth={1.75} />
                    {isHe ? "סגור" : "Dismiss"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showForm && (
            <div className="flex-shrink-0 p-4 border-b border-[var(--clean-border)] bg-white space-y-3">
              <div className="flex gap-2">
                <input ref={aiFileInputRef} type="file" accept="image/*,application/pdf" onChange={onAiFileChange} className="hidden" />
                <button
                  type="button"
                  disabled={aiExtracting}
                  onClick={() => aiFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 border border-[var(--clean-accent)] px-3 py-2 text-[13px] text-[var(--clean-accent)] bg-[var(--clean-accent)]/5"
                >
                  <Sparkles className="w-4 h-4" strokeWidth={1.75} />
                  {aiExtracting ? (isHe ? "מחלץ..." : "Extracting...") : (isHe ? "AI מחלץ מחשבון/תמונה" : "AI extract from bill/photo")}
                </button>
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value as BillCategory)} className="w-full border border-[var(--clean-border)] px-3 py-2 text-[13px] bg-white text-[var(--clean-text)]">
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{isHe ? c.labelHe : c.labelEn}</option>
                ))}
              </select>
              <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={isHe ? "ספק" : "Provider"} className="w-full border border-[var(--clean-border)] px-3 py-2 text-[13px] text-[var(--clean-text)] bg-white placeholder-[var(--clean-text-secondary)]" />
              <input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={isHe ? "סכום" : "Amount"} className="w-full border border-[var(--clean-border)] px-3 py-2 text-[13px] text-[var(--clean-text)] bg-white placeholder-[var(--clean-text-secondary)]" />
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-[var(--clean-border)] px-3 py-2 text-[13px] text-[var(--clean-text)] bg-white" />
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 border border-[var(--clean-border)] px-3 py-2 text-[13px] text-[var(--clean-accent)] hover:bg-[var(--clean-accent)]/5">
                  <ImageIcon className="w-4 h-4" strokeWidth={1.75} />
                  {attachment ? (isHe ? "תמונה מצורפת" : "Photo attached") : (isHe ? "צרף חשבון" : "Attach bill")}
                </button>
                {attachment && <img src={attachment} alt="" className="w-10 h-10 object-cover border border-[var(--clean-border)]" />}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-[var(--clean-border)] text-[var(--clean-text-secondary)] text-[13px] font-medium hover:bg-[var(--clean-border)]/50">{isHe ? "ביטול" : "Cancel"}</button>
                <button type="button" onClick={handleAdd} className="flex-1 py-2.5 bg-[var(--clean-accent)] text-white text-[13px] font-medium hover:bg-[var(--clean-accent-hover)]">{isHe ? "הוסף" : "Add"}</button>
              </div>
            </div>
          )}

          <ul className="flex-1 min-h-0 p-4 space-y-3 overflow-y-auto bg-white">
            {filtered.length === 0 && <li className="text-[13px] text-[var(--clean-text-secondary)] py-4 text-center">{isHe ? "אין חשבונות. הוסף עם +" : "No bills. Add with +."}</li>}
            {filtered.map((b) => {
              const cat = (b.category ?? "other") as BillCategory;
              const catLabel = CATEGORIES.find((c) => c.value === cat);
              const isPayFirst = architectState.predictivePaymentEnabled && architectState.suggestedBillId === b.id;
              return (
                <li
                  key={b.id}
                  className={`border bg-white p-4 flex items-center gap-4 ${isPayFirst ? "border-[var(--clean-accent)]" : "border-[var(--clean-border)]"}`}
                >
                  {b.attachmentDataUrl && <img src={b.attachmentDataUrl} alt="" className="w-12 h-12 object-cover flex-shrink-0 border border-[var(--clean-border)]" />}
                  <div className="flex-1 min-w-0">
                    {isPayFirst && (
                      <p className="text-xs font-medium text-[var(--clean-accent)] uppercase tracking-wide mb-0.5">{isHe ? "שלם קודם — מומלץ" : "Pay this first — suggested"}</p>
                    )}
                    <p className="font-medium text-[var(--clean-text)] text-[13px] truncate">{b.provider}</p>
                    <p className="text-xs text-[var(--clean-text-secondary)] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
                      {b.dueDate != null ? String(b.dueDate) : ""}
                      {catLabel && <span className="ml-1">· {isHe ? catLabel.labelHe : catLabel.labelEn}</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-[var(--clean-accent)] text-[13px]">{b.amount.toFixed(2)} ₪</p>
                    <select
                      value={b.status}
                      onChange={(e) => updateBill(b.id, { status: e.target.value as "pending" | "paid" })}
                      className="text-xs border border-[var(--clean-border)] mt-0.5 px-2 py-1 bg-white text-[var(--clean-text)]"
                    >
                      <option value="pending">{isHe ? "ממתין" : "Pending"}</option>
                      <option value="paid">{isHe ? "שולם" : "Paid"}</option>
                    </select>
                  </div>
                  <button type="button" onClick={() => removeBill(b.id)} className="text-red-500 hover:underline text-xs">×</button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {activeTab === "invoices" && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-white flex items-center justify-center">
          <p className="text-[13px] text-[var(--clean-text-secondary)]">{isHe ? "מעבר למסמכים…" : "Redirecting to Documents…"}</p>
        </div>
      )}
    </PanelWrapper>
  );
}
