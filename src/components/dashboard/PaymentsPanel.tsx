"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { useBills } from "@/contexts/BillsContext";
import { useBoard } from "@/contexts/BoardContext";
import { useArchitect } from "@/contexts/ArchitectContext";
import type { BillCategory } from "@/contexts/BillsContext";
import { parseBillFromFile, type BillExtraction } from "@/lib/bill-parser";
import { Wallet, Plus, Image as ImageIcon, Calendar, Sparkles, ListTodo, Check, X } from "lucide-react";
import { PanelWrapper } from "@/components/dashboard/PanelWrapper";

const CATEGORIES: { value: BillCategory; labelEn: string; labelHe: string }[] = [
  { value: "electricity", labelEn: "Electricity", labelHe: "חשמל" },
  { value: "water", labelEn: "Water", labelHe: "מים" },
  { value: "car_finance", labelEn: "Car Finance", labelHe: "מימון רכב" },
  { value: "fines", labelEn: "Fines", labelHe: "קנסות" },
  { value: "vaad_bayit", labelEn: "Building Committee (Va'ad Bayit)", labelHe: "ועד בית" },
  { value: "other", labelEn: "Other", labelHe: "אחר" },
];

type PaymentsPanelProps = { onOpenBoard?: () => void };

export function PaymentsPanel({ onOpenBoard }: PaymentsPanelProps) {
  const { locale } = useLocale();
  const { bills, addBill, updateBill, removeBill } = useBills();
  const { addGivenTask } = useBoard();
  const { state: architectState, setSuggestedBillId } = useArchitect();
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

  // Predictive Payment: suggest which bill to pay first (earliest due among pending) — uses real Board/bills history
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

  const header = (
    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-900 tracking-heading flex items-center gap-2">
        <Wallet className="w-5 h-5 text-[#008080]" strokeWidth={2} />
        {isHe ? "תשלומים" : "Payments"}
      </h2>
      <button type="button" onClick={() => setShowForm((o) => !o)} className="p-2.5 rounded-xl bg-[#008080] text-white hover:bg-[#006666] transition-colors" aria-label="Add bill">
        <Plus className="w-5 h-5" strokeWidth={2} />
      </button>
    </div>
  );

  return (
    <PanelWrapper header={header} className="border border-gray-200 bg-white">
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-200 px-3 py-2 text-sm" />
          <span className="text-gray-400">–</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as BillCategory | "")} className="border border-gray-200 px-3 py-2 text-sm w-full">
          <option value="">{isHe ? "כל הקטגוריות" : "All categories"}</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{isHe ? c.labelHe : c.labelEn}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-gray-600">{isHe ? "סה\"כ לתשלום:" : "Total Due:"}</span>
          <span className="text-[#008080]">{totalDue.toFixed(2)} ₪</span>
        </div>
      </div>

      {/* Scan result — Gemini-style clean card */}
      {scanResult && (
        <div className="flex-shrink-0 px-4 py-4 lg:px-6 border-b border-gray-200/80 bg-[#fafafa]">
          <div className="max-w-lg mx-auto rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#008080]" strokeWidth={2} />
              <span className="text-sm font-semibold text-gray-900">{isHe ? "תוצאות סריקה" : "Scan result"}</span>
            </div>
            <div className="p-4 lg:p-5 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{isHe ? "ספק" : "Provider"}</span>
                <span className="text-sm font-semibold text-gray-900 text-right max-w-[70%]">{scanResult.provider}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{isHe ? "סכום" : "Amount"}</span>
                <span className="text-lg font-bold text-[#008080]">{scanResult.amount.toFixed(2)} ₪</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{isHe ? "תאריך יעד" : "Due date"}</span>
                <span className="text-sm font-medium text-gray-800">{scanResult.dueDate != null ? String(scanResult.dueDate) : ""}</span>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAddToBoard}
                className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#008080] text-white text-sm font-medium hover:bg-[#006666]"
              >
                <ListTodo className="w-4 h-4" strokeWidth={2} />
                {isHe ? "הוסף ללוח" : "Add to Board"}
              </button>
              <button
                type="button"
                onClick={handleAddToPaymentsFromScan}
                className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#008080]/40 text-[#008080] text-sm font-medium hover:bg-[#008080]/5"
              >
                <Check className="w-4 h-4" strokeWidth={2} />
                {isHe ? "הוסף לתשלומים" : "Add to Payments"}
              </button>
              <button type="button" onClick={handleUseScanInForm} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-100">
                {isHe ? "ערוך בטופס" : "Edit in form"}
              </button>
              <button type="button" onClick={() => setScanResult(null)} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-500 text-sm font-medium hover:bg-gray-100">
                <X className="w-4 h-4" strokeWidth={2} />
                {isHe ? "סגור" : "Dismiss"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-gray-50/50 space-y-3">
          <div className="flex gap-2">
            <input ref={aiFileInputRef} type="file" accept="image/*,application/pdf" onChange={onAiFileChange} className="hidden" />
            <button
              type="button"
              disabled={aiExtracting}
              onClick={() => aiFileInputRef.current?.click()}
              className="flex items-center gap-1.5 border border-[#008080]/50 px-3 py-2 text-sm text-[#008080] bg-[#008080]/5"
            >
              <Sparkles className="w-4 h-4" strokeWidth={2} />
              {aiExtracting ? (isHe ? "מחלץ..." : "Extracting...") : (isHe ? "AI מחלץ מחשבון/תמונה" : "AI extract from bill/photo")}
            </button>
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value as BillCategory)} className="w-full border border-gray-200 px-3 py-2 text-sm">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{isHe ? c.labelHe : c.labelEn}</option>
            ))}
          </select>
          <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={isHe ? "ספק" : "Provider"} className="w-full border border-gray-200 px-3 py-2 text-sm" />
          <input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={isHe ? "סכום" : "Amount"} className="w-full border border-gray-200 px-3 py-2 text-sm" />
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-gray-200 px-3 py-2 text-sm" />
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-sm text-[#008080]">
              <ImageIcon className="w-4 h-4" strokeWidth={2} />
              {attachment ? (isHe ? "תמונה מצורפת" : "Photo attached") : (isHe ? "צרף חשבון" : "Attach bill")}
            </button>
            {attachment && <img src={attachment} alt="" className="w-10 h-10 object-cover border border-gray-200" />}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-300 text-sm">{isHe ? "ביטול" : "Cancel"}</button>
            <button type="button" onClick={handleAdd} className="flex-1 py-2.5 bg-[#008080] text-white text-sm">{isHe ? "הוסף" : "Add"}</button>
          </div>
        </div>
      )}

      <ul className="flex-1 min-h-0 p-6 space-y-3">
        {filtered.length === 0 && <li className="text-sm text-gray-500 py-4 text-center">{isHe ? "אין חשבונות. הוסף עם +" : "No bills. Add with +."}</li>}
        {filtered.map((b) => {
          const cat = (b.category ?? "other") as BillCategory;
          const catLabel = CATEGORIES.find((c) => c.value === cat);
          const isPayFirst = architectState.predictivePaymentEnabled && architectState.suggestedBillId === b.id;
          return (
            <li key={b.id} className={`border bg-white p-6 flex items-center gap-4 ${isPayFirst ? "border-[#008080] ring-1 ring-[#008080]/30" : "border-gray-200"}`}>
              {b.attachmentDataUrl && <img src={b.attachmentDataUrl} alt="" className="w-12 h-12 object-cover flex-shrink-0 border border-gray-200" />}
              <div className="flex-1 min-w-0">
                {isPayFirst && (
                  <p className="text-xs font-semibold text-[#008080] uppercase tracking-wide mb-0.5">{isHe ? "שלם קודם — מומלץ" : "Pay this first — suggested"}</p>
                )}
                <p className="font-medium text-gray-900 truncate">{b.provider}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={2} />{b.dueDate != null ? String(b.dueDate) : ""}
                  {catLabel && <span className="ml-1">· {isHe ? catLabel.labelHe : catLabel.labelEn}</span>}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-[#008080]">{b.amount.toFixed(2)} ₪</p>
                <select value={b.status} onChange={(e) => updateBill(b.id, { status: e.target.value as "pending" | "paid" })} className="text-xs border border-gray-200 mt-0.5 px-2 py-1">
                  <option value="pending">{isHe ? "ממתין" : "Pending"}</option>
                  <option value="paid">{isHe ? "שולם" : "Paid"}</option>
                </select>
              </div>
              <button type="button" onClick={() => removeBill(b.id)} className="text-red-500 hover:underline text-xs">×</button>
            </li>
          );
        })}
      </ul>
    </PanelWrapper>
  );
}
