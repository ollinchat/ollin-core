"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useScans } from "@/contexts/ScansContext";
import { t } from "@/lib/translations";
import { Button } from "@/components/ui/Button";
import { X, Upload, ScanLine, ChevronLeft, Camera } from "lucide-react";
import { parseReceiptText, type ParsedReceipt } from "@/lib/receipt-parser";

type Props = { onClose: () => void };

async function processImageFile(file: File): Promise<ParsedReceipt> {
  const Tesseract = (await import("tesseract.js")).default;
  const { data } = await Tesseract.recognize(file, "eng", { logger: () => {} });
  return parseReceiptText(data.text);
}

export function AIScannerModal({ onClose }: Props) {
  const { locale } = useLocale();
  const { addDoc } = useScans();
  const [file, setFile] = useState<File | null>(null);
  const [extraction, setExtraction] = useState<ParsedReceipt | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!cameraOpen) return;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((stream) => {
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => setError("Camera access denied"));
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [cameraOpen]);

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(f);
      setCameraOpen(false);
      setExtraction(null);
      setError(null);
      setUploading(true);
      processImageFile(f).then((parsed) => {
        setExtraction(parsed);
        setUploading(false);
      }).catch(() => {
        setError("OCR failed");
        setUploading(false);
      });
    }, "image/jpeg", 0.9);
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (!f.type.startsWith("image/")) {
        setError("Please select an image (e.g. receipt photo).");
        return;
      }
      setFile(f);
      setExtraction(null);
      setError(null);
      setUploading(true);

      try {
        const Tesseract = (await import("tesseract.js")).default;
        const { data } = await Tesseract.recognize(f, "eng", {
          logger: () => {},
        });
        const parsed = parseReceiptText(data.text);
        setExtraction(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "OCR failed. Try another image.");
        setExtraction(null);
      } finally {
        setUploading(false);
      }
      e.target.value = "";
    },
    []
  );

  const onAdd = useCallback(() => {
    if (!extraction || !file) return;
    addDoc({
      fileName: file.name,
      date: extraction.date,
      amount: extraction.amount,
      supplier: extraction.supplier,
      vat: extraction.vat,
      status: "Pending",
      category: extraction.category,
    });
    onClose();
  }, [extraction, file, addDoc, onClose]);

  if (cameraOpen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true">
        <video ref={videoRef} autoPlay playsInline muted className="flex-1 w-full object-cover" />
        <div className="flex-shrink-0 p-4 flex gap-3 bg-black/80">
          <button type="button" onClick={() => setCameraOpen(false)} className="flex-1 py-3 rounded-2xl bg-gray-600 text-white font-medium">Cancel</button>
          <button type="button" onClick={captureFromCamera} className="flex-1 py-3 rounded-2xl bg-accent text-white font-medium flex items-center justify-center gap-2">
            <Camera className="w-5 h-5" />
            Capture
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-soft-md max-w-md w-full border-0 overflow-hidden"
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
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 flex-1 justify-center pr-16">
            <ScanLine className="w-5 h-5 text-accent" />
            {t(locale, "dashboard.aiScanner")}
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 border-accent bg-accent-muted/30 text-accent font-medium"
            >
              <Camera className="w-10 h-10" />
              {locale === "he" ? "פתח מצלמה" : "Open camera"}
            </button>
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700 mb-2 block">{t(locale, "tools.uploadReceipt")}</span>
              <input type="file" accept="image/*" onChange={onFileChange} className="hidden" id="scanner-file" />
              <label htmlFor="scanner-file" className="rounded-2xl border-2 border-dashed border-gray-200 bg-accent-muted-soft/30 p-4 text-center hover:border-accent transition-colors cursor-pointer block">
                <Upload className="w-8 h-8 text-accent mx-auto mb-1" />
                <span className="text-sm text-gray-600">{file ? file.name : "Select image"}</span>
              </label>
            </div>
          </div>
          {uploading && (
            <div className="rounded-2xl bg-accent-muted/50 p-4 text-center">
              <p className="text-sm text-accent font-medium">Scanning…</p>
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 rounded-2xl bg-red-50 p-3">{error}</p>
          )}
          {extraction && !uploading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gray-50 p-4 space-y-2 shadow-soft">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t(locale, "tools.extraction")}</p>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">{t(locale, "tools.date")}</span><span className="font-medium">{extraction.date}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{t(locale, "tools.amount")}</span><span className="font-medium">{extraction.amount}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{t(locale, "tools.supplier")}</span><span className="font-medium truncate ms-2">{extraction.supplier}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{t(locale, "tools.vat")}</span><span className="font-medium">{extraction.vat}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{t(locale, "tools.category")}</span><span className="font-medium">{extraction.category}</span></div>
              </div>
            </motion.div>
          )}
          {extraction && !uploading && <Button fullWidth onClick={onAdd}>Add to Finance Docs</Button>}
        </div>
      </motion.div>
    </div>
  );
}
