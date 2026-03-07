"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Upload, FileText, X } from "lucide-react";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/jpg";
const TEAL = "#008080";

interface Hotspot {
  id: string;
  leftPercent: number;
  topPercent: number;
}

function nextId() {
  return "hs-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

function HotspotBox({
  hotspot,
  wrapperRef,
  onPositionChange,
  onRemove,
}: {
  hotspot: Hotspot;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onPositionChange: (id: string, leftPercent: number, topPercent: number) => void;
  onRemove: (id: string) => void;
}) {
  const handleDragEnd = useCallback(
    (e: MouseEvent | TouchEvent | PointerEvent) => {
      const target = (e as unknown as { target: HTMLElement }).target;
      const wrapper = wrapperRef.current;
      if (!wrapper || !target) return;
      const rect = wrapper.getBoundingClientRect();
      const boxRect = target.getBoundingClientRect();
      const centerX = boxRect.left - rect.left + boxRect.width / 2;
      const centerY = boxRect.top - rect.top + boxRect.height / 2;
      const leftPercent = Math.max(0, Math.min(100, (centerX / rect.width) * 100));
      const topPercent = Math.max(0, Math.min(100, (centerY / rect.height) * 100));
      onPositionChange(hotspot.id, leftPercent, topPercent);
    },
    [hotspot.id, onPositionChange, wrapperRef]
  );

  return (
    <motion.div
      className="absolute w-28 h-11 flex items-center justify-center rounded border-2 border-red-400 bg-red-500/20 text-red-700 text-xs font-medium cursor-grab active:cursor-grabbing select-none touch-none"
      style={{
        left: `${hotspot.leftPercent}%`,
        top: `${hotspot.topPercent}%`,
        transform: "translate(-50%, -50%)",
      }}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={wrapperRef}
      onDragEnd={handleDragEnd}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      role="presentation"
    >
      <span className="pr-5">Sign Here</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(hotspot.id);
        }}
        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-red-400/80 text-white hover:bg-red-500 transition-colors"
        aria-label="Remove signature placeholder"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

export default function DocumentSignPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf" | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const clearPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewType(null);
    setFile(null);
    setHotspots([]);
  }, [previewUrl]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const isPdf = f.type === "application/pdf";
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(url);
    setPreviewType(isPdf ? "pdf" : "image");
    setHotspots([]);
    console.log("File uploaded:", f);
    e.target.value = "";
  }, [previewUrl]);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const leftPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const topPercent = ((e.clientY - rect.top) / rect.height) * 100;
    setHotspots((prev) => [...prev, { id: nextId(), leftPercent, topPercent }]);
  }, []);

  const handleHotspotPositionChange = useCallback((id: string, leftPercent: number, topPercent: number) => {
    setHotspots((prev) => prev.map((h) => (h.id === id ? { ...h, leftPercent, topPercent } : h)));
  }, []);

  const handleHotspotRemove = useCallback((id: string) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="flex-1 text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5" style={{ color: TEAL }} />
          Sign document
        </h1>
      </header>

      <main className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full min-h-0">
        {!file && !previewUrl ? (
          <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 py-12 px-6 cursor-pointer hover:bg-teal-50 hover:border-teal-300 transition-colors">
            <input
              type="file"
              accept={ACCEPT}
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-white"
              style={{ backgroundColor: TEAL }}
            >
              <Upload className="w-7 h-7" />
            </div>
            <span className="text-base font-semibold text-gray-800">Upload / Scan document</span>
            <span className="text-sm text-gray-500 mt-1">PDF, JPG or PNG</span>
          </label>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 mb-4 flex-shrink-0">
              <p className="text-sm text-gray-600 truncate flex-1 min-w-0">{file?.name ?? "Document"}</p>
              <button
                type="button"
                onClick={clearPreview}
                className="flex-shrink-0 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
                style={{ color: TEAL }}
              >
                Change file
              </button>
            </div>

            <div className="flex-1 min-h-[300px] rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col">
              <div className="flex-1 min-h-[280px] overflow-auto p-4">
                {previewType === "image" && previewUrl && (
                  <div
                    ref={wrapperRef}
                    className="relative inline-block min-w-full max-w-full"
                  >
                    <img src={previewUrl} alt="Document" className="block max-w-full h-auto" />
                    <div
                      className="absolute inset-0 cursor-crosshair z-10"
                      onClick={handleOverlayClick}
                      role="button"
                      tabIndex={0}
                      aria-label="Click to place signature"
                    />
                    {hotspots.map((h) => (
                      <HotspotBox
                        key={h.id}
                        hotspot={h}
                        wrapperRef={wrapperRef}
                        onPositionChange={handleHotspotPositionChange}
                        onRemove={handleHotspotRemove}
                      />
                    ))}
                  </div>
                )}

                {previewType === "pdf" && previewUrl && (
                  <div className="relative w-full" style={{ height: "900px" }}>
                    <iframe
                      src={previewUrl}
                      title="Document"
                      className="w-full h-full border-0 rounded-lg"
                    />
                    <div
                      ref={wrapperRef}
                      className="absolute inset-0 cursor-crosshair rounded-lg z-10"
                      onClick={handleOverlayClick}
                      role="button"
                      tabIndex={0}
                      aria-label="Click to place signature"
                    >
                      {hotspots.map((h) => (
                        <HotspotBox
                          key={h.id}
                          hotspot={h}
                          wrapperRef={wrapperRef}
                          onPositionChange={handleHotspotPositionChange}
                          onRemove={handleHotspotRemove}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {previewUrl && !previewType && (
                  <p className="text-sm text-gray-500 py-8 text-center">Loading preview…</p>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3 text-center flex-shrink-0">
              Click on the document to place a &quot;Sign Here&quot; box. Drag to reposition · Click <strong>X</strong> to remove.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
