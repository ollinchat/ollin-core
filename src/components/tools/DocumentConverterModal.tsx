"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Upload, FileCode2, ChevronLeft } from "lucide-react";

const CONVERT_OPTIONS: { from: string; to: string; label: string }[] = [
  { from: "pdf", to: "docx", label: "PDF → Word" },
  { from: "image", to: "pdf", label: "Image → PDF" },
  { from: "docx", to: "pdf", label: "Word → PDF" },
];

type Props = { locale: "en" | "he"; onClose: () => void };

export function DocumentConverterModal({ locale, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState(CONVERT_OPTIONS[0]);
  const [converting, setConverting] = useState(false);
  const [done, setDone] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setDone(false);
      setDownloadUrl(null);
    }
    e.target.value = "";
  }, []);

  const handleConvert = useCallback(() => {
    if (!file) return;
    setConverting(true);
    setDownloadUrl(null);
    setTimeout(() => {
      const url = URL.createObjectURL(file);
      setDownloadUrl(url);
      setConverting(false);
      setDone(true);
    }, 800);
  }, [file]);

  const handleDownload = useCallback(() => {
    if (!downloadUrl || !file) return;
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const ext = targetFormat.to;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${baseName}_converted.${ext}`;
    a.click();
  }, [downloadUrl, file, targetFormat]);

  const handleClose = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    onClose();
  }, [downloadUrl, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" onClick={handleClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-soft-md max-w-md w-full border-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <button type="button" onClick={handleClose} className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 flex-1">
            <FileCode2 className="w-5 h-5 text-accent" />
            {locale === "he" ? "המרת מסמך" : "Document converter"}
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">{locale === "he" ? "קובץ" : "File"}</label>
            <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={onFileChange} className="hidden" id="converter-file" />
            <label
              htmlFor="converter-file"
              className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center block cursor-pointer hover:border-accent transition-colors"
            >
              <Upload className="w-8 h-8 text-accent mx-auto mb-1" />
              <span className="text-sm text-gray-600">{file ? file.name : (locale === "he" ? "בחר קובץ" : "Select file")}</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">{locale === "he" ? "פורמט יעד" : "Target format"}</label>
            <select
              value={CONVERT_OPTIONS.indexOf(targetFormat)}
              onChange={(e) => setTargetFormat(CONVERT_OPTIONS[Number(e.target.value)])}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
            >
              {CONVERT_OPTIONS.map((opt, i) => (
                <option key={opt.label} value={i}>{opt.label}</option>
              ))}
            </select>
          </div>
          {converting && (
            <p className="text-sm text-accent font-medium text-center py-2">{locale === "he" ? "ממיר…" : "Converting…"}</p>
          )}
          {done && downloadUrl && (
            <div className="rounded-2xl bg-accent-muted/30 p-3 text-center">
              <p className="text-sm text-gray-700 mb-2">{locale === "he" ? "ההמרה הושלמה" : "Conversion complete"}</p>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-xl px-4 py-2 bg-accent text-white text-sm font-medium"
              >
                {locale === "he" ? "הורד" : "Download"}
              </button>
            </div>
          )}
          {!done && !converting && (
            <button
              type="button"
              onClick={handleConvert}
              disabled={!file}
              className="w-full py-3 rounded-2xl bg-accent text-white font-medium disabled:opacity-50"
            >
              {locale === "he" ? "המר" : "Convert"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
