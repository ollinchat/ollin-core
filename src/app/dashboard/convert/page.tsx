"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { ChevronLeft, FileCode2, Upload, Download, FileText } from "lucide-react";

const TEAL = "#008080";
const STORAGE_KEY = "ollin_convert_history";

type HistoryEntry = {
  id: string;
  fileName: string;
  originalFormat: string;
  convertedFormat: string;
  date: number;
  downloadUrl?: string | null;
};

const TARGET_FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
  { value: "xlsx", label: "XLSX" },
  { value: "jpg", label: "JPG" },
];

function getExtension(filename: string): string {
  const m = filename.match(/\.([^.]+)$/i);
  return m ? m[1].toUpperCase() : "FILE";
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    const toSave = entries.map((e) => ({ ...e, downloadUrl: undefined }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (_) {}
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ConvertPage() {
  const { locale } = useLocale();
  const isHe = locale === "he";
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState(TARGET_FORMATS[0].value);
  const [converting, setConverting] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const addToHistory = useCallback((entry: Omit<HistoryEntry, "id">) => {
    const newEntry: HistoryEntry = { ...entry, id: crypto.randomUUID() };
    setHistory((prev) => {
      const next = [newEntry, ...prev];
      saveHistory(next);
      return next;
    });
    return newEntry.id;
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = "";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.type.startsWith("image/") || f.type === "application/pdf" || /\.(doc|docx|xls|xlsx)$/i.test(f.name)))
      setFile(f);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const handleConvert = useCallback(() => {
    if (!file) return;
    setConverting(true);
    const originalFormat = getExtension(file.name);
    setTimeout(() => {
      const url = URL.createObjectURL(file);
      const entry: Omit<HistoryEntry, "id"> = {
        fileName: file.name,
        originalFormat,
        convertedFormat: targetFormat.toUpperCase(),
        date: Date.now(),
        downloadUrl: url,
      };
      addToHistory(entry);
      setConverting(false);
      setFile(null);
    }, 1000);
  }, [file, targetFormat, addToHistory]);

  const handleDownload = useCallback((entry: HistoryEntry) => {
    if (entry.downloadUrl) {
      const a = document.createElement("a");
      a.href = entry.downloadUrl;
      const base = entry.fileName.replace(/\.[^.]+$/, "");
      a.download = `${base}_converted.${entry.convertedFormat.toLowerCase()}`;
      a.click();
    }
  }, []);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border bg-white shadow-sm">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
          aria-label={isHe ? "חזרה" : "Back"}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{isHe ? "חזרה" : "Back"}</span>
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2 flex-1 justify-center pr-20">
          <FileCode2 className="w-5 h-5" style={{ color: TEAL }} />
          {isHe ? "המרת מסמכים" : "Document Conversion"}
        </h1>
      </header>

      <main className="flex-1 flex flex-col px-4 py-8 max-w-2xl mx-auto w-full space-y-10">
        {/* Upload & Conversion Zone */}
        <section className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {isHe ? "העלאת קובץ" : "Upload files or images"}
            </label>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
              onChange={onFileChange}
              className="hidden"
            />
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => inputRef.current?.click()}
              className={`rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center py-12 px-6 text-center ${
                dragOver
                  ? "border-[#008080] bg-[#008080]/5"
                  : "border-gray-200 bg-gray-50/80 hover:border-[#008080]/40 hover:bg-[#008080]/5"
              }`}
            >
              <Upload className="w-12 h-12 text-gray-400 mb-3" style={{ color: dragOver ? TEAL : undefined }} />
              <p className="text-sm font-medium text-gray-700 mb-1">
                {file ? file.name : (isHe ? "גרור קבצים לכאן או לחץ לבחירה" : "Drag & drop or click to upload")}
              </p>
              <p className="text-xs text-gray-500">
                {isHe ? "PDF, Word, Excel, תמונות" : "PDF, Word, Excel, Images"}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isHe ? "פורמט יעד" : "Target format"}
            </label>
            <select
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
              className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] outline-none"
            >
              {TARGET_FORMATS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleConvert}
            disabled={!file || converting}
            className="w-full rounded-3xl py-4 px-6 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#008080]/40 focus:ring-offset-2"
            style={{ backgroundColor: TEAL }}
          >
            {converting ? (isHe ? "ממיר…" : "Converting…") : (isHe ? "המר" : "Convert")}
          </button>
        </section>

        {/* Conversion History */}
        <section className="flex-shrink-0 border-t border-gray-200 pt-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {isHe ? "היסטוריית המרות" : "Conversion History"}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100/80 border-b border-gray-200">
                  <th className="text-left py-3.5 px-4 font-medium text-gray-600">{isHe ? "שם קובץ" : "File Name"}</th>
                  <th className="text-left py-3.5 px-4 font-medium text-gray-600">{isHe ? "מקור" : "Original"}</th>
                  <th className="text-left py-3.5 px-4 font-medium text-gray-600">{isHe ? "יעד" : "Converted"}</th>
                  <th className="text-left py-3.5 px-4 font-medium text-gray-600">{isHe ? "תאריך" : "Date"}</th>
                  <th className="text-right py-3.5 px-4 font-medium text-gray-600">{isHe ? "הורדה" : "Download"}</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-gray-500">
                      {isHe ? "אין המרות עדיין" : "No conversions yet"}
                    </td>
                  </tr>
                ) : (
                  history.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-gray-800 font-medium truncate max-w-[140px]" title={entry.fileName}>{entry.fileName}</td>
                      <td className="py-3.5 px-4 text-gray-600">{entry.originalFormat}</td>
                      <td className="py-3.5 px-4 text-gray-600">{entry.convertedFormat}</td>
                      <td className="py-3.5 px-4 text-gray-600">{formatDate(entry.date)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownload(entry)}
                          disabled={!entry.downloadUrl}
                          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={isHe ? "הורד" : "Download"}
                          aria-label="Download"
                        >
                          <Download className="w-4 h-4" />
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
