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
} from "lucide-react";
import { PanelWrapper } from "@/components/dashboard/PanelWrapper";
import {
  loadFinancialDashboard,
  saveFinancialDashboard,
  DEFAULT_FINANCIAL_DASHBOARD,
  type FinancialDashboardState,
} from "@/lib/financial-dashboard-storage";
import {
  FinancialOverview,
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
  const [activeTab, setActiveTab] = useState<PaymentsTabId>(() =>
    initialTab && PAYMENTS_TAB_IDS.includes(initialTab) ? initialTab : "overview"
  );
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
    if (initialTab && PAYMENTS_TAB_IDS.includes(initialTab)) setActiveTab(initialTab);
  }, [initialTab]);

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

  const tabLabels: { id: PaymentsTabId; labelEn: string; labelHe: string }[] = [
    { id: "overview", labelEn: "Overview", labelHe: "סקירה" },
    { id: "apps", labelEn: "Apps & subs", labelHe: "אפליקציות" },
    { id: "memberships", labelEn: "Memberships", labelHe: "מנויים" },
    { id: "home", labelEn: "Home", labelHe: "בית" },
    { id: "auto", labelEn: "Auto", labelHe: "רכב" },
    { id: "investments", labelEn: "Invest", labelHe: "השקעות" },
    { id: "payments", labelEn: "Bills", labelHe: "חשבונות" },
    { id: "invoices", labelEn: "Invoices", labelHe: "חשבוניות" },
  ];

  const header = (
    <>
      <div className="px-4 py-3 border-b border-[var(--clean-border)] bg-white flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--clean-text)] tracking-wide flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[var(--clean-accent)]" strokeWidth={1.75} />
          {isHe ? "מרכז פיננסי" : "Finance"}
        </h2>
        {activeTab === "payments" && (
          <button
            type="button"
            onClick={() => setShowForm((o) => !o)}
            className="p-2 border border-[var(--clean-accent)] bg-[var(--clean-accent)] text-white hover:bg-[var(--clean-accent-hover)] transition-colors"
            aria-label={isHe ? "הוסף חשבון" : "Add bill"}
          >
            <Plus className="w-5 h-5" strokeWidth={1.75} />
          </button>
        )}
      </div>
      <div className="flex border-b border-[var(--clean-border)] bg-white overflow-x-auto scrollbar-hide">
        {tabLabels.map(({ id, labelEn, labelHe }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (id === "invoices") {
                router.push("/dashboard/finances/documents");
                return;
              }
              setActiveTab(id);
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
              activeTab === id
                ? "border-[var(--clean-accent)] text-[var(--clean-accent)]"
                : "border-transparent text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)]"
            }`}
          >
            {id === "overview" && <BarChart3 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
            {id === "apps" && <LayoutGrid className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
            {id === "memberships" && <Dumbbell className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
            {id === "home" && <Home className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
            {id === "auto" && <Car className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
            {id === "investments" && <TrendingUp className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
            {id === "payments" && <Wallet className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
            {id === "invoices" && <FileText className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
            {isHe ? labelHe : labelEn}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <PanelWrapper header={header} className="clean-app border border-[var(--clean-border)] bg-white flex flex-col">
      {activeTab === "overview" && (
        <FinancialOverview isHe={isHe} totalDue={totalDue} fd={fd} setFd={setFd} />
      )}

      {activeTab === "apps" && <AppsSubscriptionsTab isHe={isHe} fd={fd} setFd={setFd} />}

      {activeTab === "memberships" && <MembershipsTab isHe={isHe} fd={fd} setFd={setFd} />}

      {activeTab === "home" && <HomeFixedTab isHe={isHe} fd={fd} setFd={setFd} />}

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
