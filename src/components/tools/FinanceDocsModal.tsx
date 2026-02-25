"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale } from "@/contexts/LocaleContext";
import { useScans } from "@/contexts/ScansContext";
import { t } from "@/lib/translations";
import { FileText, CheckCircle, Clock, ChevronLeft, Receipt } from "lucide-react";
import type { ScannedDoc, ExpenseCategory } from "@/lib/finance-types";

type Tab = "documents" | "expenses";

type Props = { onClose: () => void };

export function FinanceDocsModal({ onClose }: Props) {
  const { locale } = useLocale();
  const { docs, setDocStatus } = useScans();
  const [tab, setTab] = useState<Tab>("documents");

  const byCategory = docs.reduce<Record<ExpenseCategory, ScannedDoc[]>>(
    (acc, doc) => {
      const cat = doc.category ?? "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    },
    { Fuel: [], Food: [], Office: [], Travel: [], Other: [] }
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-soft-md max-w-md w-full max-h-[85vh] flex flex-col border-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 hover:shadow-soft transition-all flex items-center gap-1"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 flex-1 justify-center pr-16 tracking-[0.02em]">
            <FileText className="w-5 h-5 text-accent" />
            {t(locale, "tools.financeDocs")}
          </h2>
        </div>

        <div className="flex gap-1 p-2 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setTab("documents")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-medium transition-colors ${tab === "documents" ? "bg-accent-muted/80 text-accent shadow-soft" : "text-gray-600 hover:bg-gray-100"}`}
          >
            <FileText className="w-4 h-4" />
            Documents
          </button>
          <button
            type="button"
            onClick={() => setTab("expenses")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-medium transition-colors ${tab === "expenses" ? "bg-accent-muted/80 text-accent shadow-soft" : "text-gray-600 hover:bg-gray-100"}`}
          >
            <Receipt className="w-4 h-4" />
            Expenses
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === "documents" && (
            docs.length === 0 ? (
              <div className="relative py-12 px-4 flex flex-col items-center justify-center min-h-[160px]">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Image src="/logo-icon.png" alt="" width={64} height={64} className="opacity-[0.06] object-contain" aria-hidden />
                </div>
                <p className="text-gray-500 text-sm text-center relative z-10">No documents yet. Use AI Scanner to add receipts or invoices.</p>
              </div>
            ) : (
              docs.map((doc) => (
                <DocCard key={doc.id} doc={doc} onStatusChange={setDocStatus} locale={locale} />
              ))
            )
          )}
          {tab === "expenses" &&
            (Object.keys(byCategory) as ExpenseCategory[])
              .filter((cat) => byCategory[cat].length > 0)
              .map((cat) => (
                <div key={cat}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat}</h3>
                  <div className="space-y-2">
                    {byCategory[cat].map((doc) => (
                      <DocCard key={doc.id} doc={doc} onStatusChange={setDocStatus} locale={locale} />
                    ))}
                  </div>
                </div>
              ))}
          {tab === "expenses" && docs.length === 0 && (
            <div className="relative py-12 px-4 flex flex-col items-center justify-center min-h-[160px]">
              <Image src="/logo-icon.png" alt="" width={64} height={64} className="opacity-[0.06] object-contain absolute" aria-hidden />
              <p className="text-gray-500 text-sm text-center relative z-10">No expenses yet. Scan receipts to see them by category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocCard({
  doc,
  onStatusChange,
  locale,
}: {
  doc: ScannedDoc;
  onStatusChange: (id: string, status: ScannedDoc["status"]) => void;
  locale: "en" | "he";
}) {
  const isProcessed = doc.status === "Processed";
  return (
    <div className="rounded-2xl bg-white border-0 shadow-soft p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">{doc.fileName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {doc.supplier} · {doc.amount}
            {doc.category && <span className="ml-1">· {doc.category}</span>}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                isProcessed ? "bg-accent-muted text-accent" : "bg-gray-100 text-gray-600"
              }`}
            >
              {isProcessed ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {t(locale, isProcessed ? "tools.processed" : "tools.pending")}
            </span>
          </div>
        </div>
        {!isProcessed && (
          <button
            type="button"
            onClick={() => onStatusChange(doc.id, "Processed")}
            className="rounded-xl px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-accent-emerald to-accent text-white shadow-soft hover:shadow-glow-subtle transition-shadow"
          >
            Mark Processed
          </button>
        )}
      </div>
    </div>
  );
}
