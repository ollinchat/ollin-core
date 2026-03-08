"use client";

import { useCallback, useRef, useEffect } from "react";
import { Camera } from "lucide-react";

const TEAL = "#14b8a6";

type Props = {
  onCapture: (file: File) => void;
  onCancel: () => void;
};

/**
 * Fullscreen camera only. No modal, no file picker.
 * Capture produces a File; parent handles OCR/add to scans etc.
 */
export function DirectCameraView({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((stream) => {
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => onCancel());
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [onCancel]);

  const capture = useCallback(() => {
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
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
    }, "image/jpeg", 0.9);
  }, [onCapture]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true">
      <video ref={videoRef} autoPlay playsInline muted className="flex-1 w-full object-cover" />
      <div className="flex-shrink-0 p-4 flex gap-3 bg-black/80">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-2xl bg-gray-600 text-white font-medium">Cancel</button>
        <button type="button" onClick={capture} className="flex-1 py-3 rounded-2xl text-white font-medium flex items-center justify-center gap-2" style={{ backgroundColor: TEAL }}>
          <Camera className="w-5 h-5" />
          Capture
        </button>
      </div>
    </div>
  );
}
