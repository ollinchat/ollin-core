"use client";

import { useRef, useState, useCallback, useEffect } from "react";

type Props = {
  onSave?: (dataUrl: string) => void;
  savedSignatureDataUrl?: string | null;
  useSavedSignature: boolean;
  onUseSavedChange: (use: boolean) => void;
  locale: "en" | "he";
  labelSign?: string;
  labelUseSaved?: string;
};

export function SignaturePad({
  onSave,
  savedSignatureDataUrl,
  useSavedSignature,
  onUseSavedChange,
  locale,
  labelSign = "Sign here",
  labelUseSaved = "Use saved signature",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#0d9488";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const ctx = getCtx();
      const point = getPoint(e);
      if (!ctx || !point) return;
      setIsDrawing(true);
      setHasDrawn(true);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    },
    [getCtx]
  );

  const move = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      const ctx = getCtx();
      const point = getPoint(e);
      if (!ctx || !point) return;
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    },
    [isDrawing, getCtx]
  );

  const end = useCallback(() => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      const dataUrl = canvas.toDataURL("image/png");
      onSave?.(dataUrl);
    }
  }, [hasDrawn, onSave]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasDrawn(false);
  }, [getCtx]);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={useSavedSignature}
          onChange={(e) => onUseSavedChange(e.target.checked)}
          className="rounded border-gray-300 text-accent accent-accent"
        />
        {labelUseSaved}
      </label>
      {useSavedSignature ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 min-h-[100px] flex items-center justify-center">
          {savedSignatureDataUrl ? (
            <img src={savedSignatureDataUrl} alt="Saved signature" className="max-h-20 max-w-[200px] object-contain" />
          ) : (
            <p className="text-sm text-gray-500">No saved signature. Add one in Profile → Signature.</p>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">{labelSign}</p>
          <canvas
            ref={canvasRef}
            width={320}
            height={120}
            className="w-full max-w-md h-[120px] rounded-2xl border-2 border-gray-200 bg-white touch-none cursor-crosshair"
            style={{ width: "100%", maxWidth: "320px" }}
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
          />
          <button type="button" onClick={clear} className="text-sm text-accent hover:underline">
            Clear
          </button>
        </>
      )}
    </div>
  );
}
