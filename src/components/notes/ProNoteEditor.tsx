"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Minus,
  Palette,
  Pencil,
  Check,
} from "lucide-react";

const TEAL = "#008080";

function getFirstLinePlain(html: string): string {
  if (!html || !html.trim()) return "";
  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (!div) return "";
  div.innerHTML = html;
  const text = (div.textContent || "").replace(/\s+/g, " ").trim();
  const firstLine = text.split("\n")[0] || text;
  return firstLine.slice(0, 200) || "";
}

type ProNoteEditorProps = {
  body: string;
  onBack: () => void;
  onSave: (updates: { body: string; title: string }) => void;
  locale: "en" | "he";
};

export function ProNoteEditor({ body, onBack, onSave, locale }: ProNoteEditorProps) {
  const isHe = locale === "he";
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastXY, setLastXY] = useState<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState("#000000");
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== body) el.innerHTML = body || "";
  }, [body]);

  const syncToSave = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML || "";
    const title = getFirstLinePlain(html);
    onSave({ body: html, title: title || (isHe ? "ללא כותרת" : "Untitled") });
  }, [onSave, isHe]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onInput = () => {
      const html = el.innerHTML || "";
      const title = getFirstLinePlain(html);
      onSave({ body: html, title: title || (isHe ? "ללא כותרת" : "Untitled") });
    };
    el.addEventListener("input", onInput);
    return () => el.removeEventListener("input", onInput);
  }, [onSave, isHe]);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    syncToSave();
  };

  const getCanvasCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }
    return ctx;
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    setLastXY({ x, y });
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    const ctx = getCanvasCtx();
    if (!ctx || lastXY === null) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastXY.x, lastXY.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    setLastXY({ x, y });
  };

  const endDraw = () => {
    setIsDrawing(false);
    setLastXY(null);
  };

  const insertDrawing = () => {
    const canvas = canvasRef.current;
    const el = editorRef.current;
    if (!canvas || !el) return;
    const dataUrl = canvas.toDataURL("image/png");
    const img = document.createElement("img");
    img.src = dataUrl;
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    document.execCommand("insertHTML", false, img.outerHTML);
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawMode(false);
    syncToSave();
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f8f9fa] overflow-hidden rounded-xl">
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200/80 bg-white">
        <button type="button" onClick={onBack} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center gap-1" aria-label={isHe ? "חזרה" : "Back"}>
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{isHe ? "חזרה" : "Back"}</span>
        </button>
      </div>

      {/* Formatting toolbar */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-100 bg-white">
        <button type="button" onClick={() => exec("bold")} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" title="Bold" aria-label="Bold"><Bold className="w-4 h-4" strokeWidth={2} /></button>
        <button type="button" onClick={() => exec("italic")} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" title="Italic" aria-label="Italic"><Italic className="w-4 h-4" strokeWidth={2} /></button>
        <button type="button" onClick={() => exec("underline")} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" title="Underline" aria-label="Underline"><Underline className="w-4 h-4" strokeWidth={2} /></button>
        <span className="w-px h-5 bg-gray-200 mx-0.5" aria-hidden />
        <button type="button" onClick={() => exec("fontSize", "5")} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" title={isHe ? "הגדל גודל" : "Increase size"} aria-label="Size+"><Type className="w-4 h-4" strokeWidth={2} /></button>
        <button type="button" onClick={() => exec("fontSize", "1")} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" title={isHe ? "הקטן גודל" : "Decrease size"} aria-label="Size-"><Minus className="w-4 h-4" strokeWidth={2} /></button>
        <span className="w-px h-5 bg-gray-200 mx-0.5" aria-hidden />
        <button type="button" onClick={() => exec("justifyLeft")} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" title={isHe ? "ישר לשמאל" : "Align left"} aria-label="Align left"><AlignLeft className="w-4 h-4" strokeWidth={2} /></button>
        <button type="button" onClick={() => exec("justifyCenter")} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" title={isHe ? "מרכז" : "Center"} aria-label="Center"><AlignCenter className="w-4 h-4" strokeWidth={2} /></button>
        <button type="button" onClick={() => exec("justifyRight")} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" title={isHe ? "ישר לימין" : "Align right"} aria-label="Align right"><AlignRight className="w-4 h-4" strokeWidth={2} /></button>
        <button type="button" onClick={() => { document.execCommand("insertHTML", false, '<span dir="rtl"></span>'); editorRef.current?.focus(); syncToSave(); }} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 text-xs font-medium" title="RTL">{isHe ? "RTL" : "RTL"}</button>
        <span className="w-px h-5 bg-gray-200 mx-0.5" aria-hidden />
        <div className="relative">
          <button type="button" onClick={() => setShowColorPicker((v) => !v)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center gap-1" title={isHe ? "צבע טקסט" : "Text color"} aria-label="Color">
            <Palette className="w-4 h-4" strokeWidth={2} />
            <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: color }} />
          </button>
          {showColorPicker && (
            <>
              <div className="fixed inset-0 z-30" aria-hidden onClick={() => setShowColorPicker(false)} />
              <div className="absolute left-0 top-full mt-1 z-40 p-2 rounded-xl bg-white border border-gray-200 shadow-lg">
                <input type="color" value={color} onChange={(e) => { setColor(e.target.value); exec("foreColor", e.target.value); setShowColorPicker(false); }} className="w-10 h-10 cursor-pointer border-0 rounded" />
              </div>
            </>
          )}
        </div>
        <span className="w-px h-5 bg-gray-200 mx-0.5" aria-hidden />
        {!drawMode ? (
          <button type="button" onClick={() => setDrawMode(true)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center gap-1" title={isHe ? "שירטוט" : "Draw"} aria-label="Draw">
            <Pencil className="w-4 h-4" strokeWidth={2} />
            <span className="text-xs font-medium">{isHe ? "שירטוט" : "Draw"}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button type="button" onClick={insertDrawing} className="p-2 rounded-lg bg-[#008080] text-white flex items-center gap-1" title={isHe ? "הוסף שירטוט" : "Insert drawing"}>
              <Check className="w-4 h-4" strokeWidth={2} />
              <span className="text-xs font-medium">{isHe ? "הוסף" : "Insert"}</span>
            </button>
            <button type="button" onClick={() => setDrawMode(false)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 text-xs">{isHe ? "ביטול" : "Cancel"}</button>
          </div>
        )}
      </div>

      {/* Editor + Draw overlay wrapper */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
      {drawMode && (
        <div className="absolute inset-0 z-20 flex flex-col bg-white border-t border-gray-100">
          <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">{isHe ? "מצב שירטוט" : "Draw mode"}</span>
            <div className="flex gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" title="Pen color" />
              <button type="button" onClick={insertDrawing} className="px-3 py-1.5 rounded-xl bg-[#008080] text-white text-xs font-medium">{isHe ? "הוסף לפתק" : "Insert"}</button>
              <button type="button" onClick={() => setDrawMode(false)} className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs">{isHe ? "ביטול" : "Cancel"}</button>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            className="flex-1 w-full touch-none cursor-crosshair"
            style={{ minHeight: 200 }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
      )}

      {/* Editor: first line = title (no separate title field) */}
      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-b-xl border border-t-0 border-gray-200/80">
        <div
          ref={editorRef}
          contentEditable
          data-placeholder={isHe ? "כתוב כאן — השורה הראשונה תהיה הכותרת" : "Write here — first line becomes the title"}
          className="min-h-full w-full p-4 text-base text-gray-900 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
          style={{ direction: isHe ? "rtl" : "ltr" }}
          suppressContentEditableWarning
        />
      </div>
      </div>
    </div>
  );
}
