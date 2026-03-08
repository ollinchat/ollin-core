"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useScans } from "@/contexts/ScansContext";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import { ChevronLeft, ScanLine, FileText, Eye } from "lucide-react";
import { parseReceiptText } from "@/lib/receipt-parser";
import { DirectCameraView } from "@/components/tools/DirectCameraView";

const TEAL = "#14b8a6";

type DocWithScannedAt = { id: string; scannedAt?: number; status?: string; category?: string; [key: string]: unknown };

function formatScanDate(ts: number | undefined): string {
  if (ts == null) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function processImageFile(file: File) {
  const Tesseract = (await import("tesseract.js")).default;
  const { data } = await Tesseract.recognize(file, "eng", { logger: () => {} });
  return parseReceiptText(data.text);
}

export default function QuickScanDashboardPage() {
  const { locale } = useLocale();
  const { docs, addDoc } = useScans();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleCapture = useCallback((file: File) => {
    setCameraOpen(false);
    setProcessing(true);
    processImageFile(file).then((parsed) => {
      addDoc({
        fileName: file.name,
        date: parsed.date,
        amount: parsed.amount,
        supplier: parsed.supplier,
        vat: parsed.vat,
        status: "Pending",
        category: parsed.category,
      });
    }).catch(() => {}).finally(() => setProcessing(false));
  }, [addDoc]);

  const rows = docs as DocWithScannedAt[];

  if (cameraOpen) {
    return <DirectCameraView onCapture={handleCapture} onCancel={() => setCameraOpen(false)} />;
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border bg-white shadow-sm">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
          aria-label={locale === "he" ? "חזרה" : "Back"}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{locale === "he" ? "חזרה" : "Back"}</span>
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2 flex-1 justify-center pr-20">
          <ScanLine className="w-5 h-5" style={{ color: TEAL }} />
          {locale === "he" ? "סריקה מהירה" : "Quick Scan"}
        </h1>
      </header>

      <main className="flex-1 flex flex-col px-4 py-6 max-w-2xl mx-auto w-full">
        <section className="flex-shrink-0 py-8 text-center">
          <p className="text-gray-600 mb-6">
            {locale === "he" ? "אין מסמך עדיין. סרוק או הוסף אחד כדי להתחיל." : "No document yet. Scan or add one to start signing."}
          </p>
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            disabled={processing}
            className="inline-flex items-center justify-center gap-2 w-full max-w-sm py-4 px-6 rounded-2xl font-medium text-white shadow-lg hover:opacity-95 transition-opacity disabled:opacity-70"
            style={{ backgroundColor: TEAL }}
          >
            <ScanLine className="w-6 h-6" />
            {processing ? (locale === "he" ? "סורק…" : "Scanning…") : t(locale, "dashboard.aiScanner")}
          </button>
        </section>

        <section className="flex-shrink-0 border-t border-gray-200 pt-8 mt-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {locale === "he" ? "סריקות קודמות" : "Past Scans"}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100/80 border-b border-gray-200">
                  <th className="text-left py-3.5 px-4 font-medium text-gray-600">{locale === "he" ? "תצוגה" : "Preview"}</th>
                  <th className="text-left py-3.5 px-4 font-medium text-gray-600">{locale === "he" ? "תאריך" : "Date"}</th>
                  <th className="text-left py-3.5 px-4 font-medium text-gray-600">{locale === "he" ? "סטטוס" : "Status"}</th>
                  <th className="text-left py-3.5 px-4 font-medium text-gray-600">{locale === "he" ? "סוג" : "Type"}</th>
                  <th className="text-right py-3.5 px-4 font-medium text-gray-600">{locale === "he" ? "פעולות" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-gray-500">
                      {locale === "he" ? "אין סריקות עדיין" : "No scans yet"}
                    </td>
                  </tr>
                ) : (
                  rows.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="w-14 h-10 rounded border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden">
                          <FileText className="w-5 h-5 text-gray-400" />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{formatScanDate(doc.scannedAt)}</td>
                      <td className="py-3.5 px-4 text-gray-700">{doc.status ?? "Pending"}</td>
                      <td className="py-3.5 px-4 text-gray-600">{doc.category ?? "Receipt"}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title={locale === "he" ? "צפה" : "View"}
                          aria-label="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
