"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useFinance } from "@/contexts/FinanceContext";
import { useLocale } from "@/contexts/LocaleContext";
import { ChevronLeft, Receipt, Upload, Loader2 } from "lucide-react";
import type { Expense } from "@/lib/finance-types";

/** Stub AI: "extract" vendor, amount, category from receipt image (simulated) */
async function extractFromReceiptImage(_dataUrl: string): Promise<{ vendor: string; amount: number; category: string }> {
  await new Promise((r) => setTimeout(r, 800));
  return {
    vendor: "Vendor (AI)",
    amount: 0,
    category: "General",
  };
}

export default function ExpensesPage() {
  const { locale } = useLocale();
  const { expenses, addExpense } = useFinance();
  const [scanning, setScanning] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [extracted, setExtracted] = useState<{ vendor: string; amount: number; category: string } | null>(null);
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setReceiptDataUrl(dataUrl);
      setScanning(true);
      setExtracted(null);
      try {
        const result = await extractFromReceiptImage(dataUrl);
        setExtracted(result);
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveExpense = () => {
    if (!extracted) return;
    addExpense({
      vendor: extracted.vendor,
      amount: extracted.amount,
      category: extracted.category,
      date: new Date().toISOString().slice(0, 10),
      receiptImageUrl: receiptDataUrl ?? undefined,
    });
    setShowScanModal(false);
    setExtracted(null);
    setReceiptDataUrl(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-4 border-b border-gray-200 bg-white">
        <Link
          href="/dashboard/finances"
          className="p-2 rounded-sm text-gray-600 hover:bg-gray-100 flex items-center gap-1"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{locale === "he" ? "חזרה" : "Back"}</span>
        </Link>
        <h1 className="flex-1 text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#008080]" />
          {locale === "he" ? "הוצאות" : "Expenses"}
        </h1>
        <button
          type="button"
          onClick={() => setShowScanModal(true)}
          className="px-3 py-2 rounded-sm border border-[#006666] bg-[#008080] text-white text-sm font-medium flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {locale === "he" ? "סרוק קבלה (AI)" : "Scan Receipt (AI)"}
        </button>
      </header>
      <div className="flex-1 p-4">
        {expenses.length === 0 ? (
          <div className="rounded-sm border border-gray-200 bg-white p-8 text-center">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {locale === "he" ? "אין הוצאות. העלה קבלה לסריקה אוטומטית (Vendor, סכום, קטגוריה)." : "No expenses. Upload a receipt for AI scan (Vendor, Amount, Category)."}
            </p>
            <button
              type="button"
              onClick={() => setShowScanModal(true)}
              className="mt-4 px-4 py-2 rounded-sm bg-[#008080] text-white text-sm font-medium"
            >
              {locale === "he" ? "סרוק קבלה" : "Scan receipt"}
            </button>
          </div>
        ) : (
          <div className="rounded-sm border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 font-semibold text-gray-700">{locale === "he" ? "ספק" : "Vendor"}</th>
                  <th className="px-3 py-2 font-semibold text-gray-700">{locale === "he" ? "סכום" : "Amount"}</th>
                  <th className="px-3 py-2 font-semibold text-gray-700">{locale === "he" ? "קטגוריה" : "Category"}</th>
                  <th className="px-3 py-2 font-semibold text-gray-700">{locale === "he" ? "תאריך" : "Date"}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-gray-900">{e.vendor}</td>
                    <td className="px-3 py-2 tabular-nums font-medium">{e.amount.toFixed(2)} ₪</td>
                    <td className="px-3 py-2 text-gray-600">{e.category}</td>
                    <td className="px-3 py-2 text-gray-500">{e.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !scanning && setShowScanModal(false)}>
          <div
            className="bg-white rounded-sm border border-gray-200 shadow-lg max-w-md w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {locale === "he" ? "העלאת קבלה — חילוץ AI" : "Upload receipt — AI extraction"}
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            {!receiptDataUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-200 rounded-sm text-gray-500 hover:border-[#008080] hover:text-[#008080] flex flex-col items-center gap-2"
              >
                <Upload className="w-10 h-10" />
                {locale === "he" ? "לחץ להעלאת תמונת קבלה" : "Click to upload receipt image"}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="max-h-40 overflow-hidden rounded-sm border border-gray-200">
                  <img src={receiptDataUrl} alt="Receipt" className="w-full h-auto object-contain" />
                </div>
                {scanning ? (
                  <div className="flex items-center gap-2 text-[#008080]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {locale === "he" ? "מחלץ נתונים..." : "Extracting Vendor, Amount, Category..."}
                  </div>
                ) : extracted && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <label className="font-medium text-gray-600">{locale === "he" ? "ספק" : "Vendor"}</label>
                    <input
                      type="text"
                      value={extracted.vendor}
                      onChange={(e) => setExtracted((p) => (p ? { ...p, vendor: e.target.value } : null))}
                      className="rounded-sm border border-gray-200 px-2 py-1"
                    />
                    <label className="font-medium text-gray-600">{locale === "he" ? "סכום" : "Amount"}</label>
                    <input
                      type="number"
                      step={0.01}
                      value={extracted.amount || ""}
                      onChange={(e) => setExtracted((p) => (p ? { ...p, amount: parseFloat(e.target.value) || 0 } : null))}
                      className="rounded-sm border border-gray-200 px-2 py-1"
                    />
                    <label className="font-medium text-gray-600">{locale === "he" ? "קטגוריה" : "Category"}</label>
                    <input
                      type="text"
                      value={extracted.category}
                      onChange={(e) => setExtracted((p) => (p ? { ...p, category: e.target.value } : null))}
                      className="rounded-sm border border-gray-200 px-2 py-1"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => !scanning && setShowScanModal(false)}
                className="flex-1 py-2 rounded-sm border border-gray-200 text-gray-700 font-medium"
              >
                {locale === "he" ? "ביטול" : "Cancel"}
              </button>
              {extracted && (
                <button
                  type="button"
                  onClick={handleSaveExpense}
                  className="flex-1 py-2 rounded-sm bg-[#008080] text-white font-medium"
                >
                  {locale === "he" ? "שמור הוצאה" : "Save expense"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
