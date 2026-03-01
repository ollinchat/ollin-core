"use client";

import React, { useState, useRef } from "react";
import { Paperclip, FileText, Camera, Video, ScanLine, MapPin } from "lucide-react";
import type { TaskAttachment, TaskAttachmentType } from "@/lib/board-types";

type MediaToolboxProps = {
  onAddAttachment: (att: Omit<TaskAttachment, "id" | "createdAt">) => void;
  locale: "en" | "he";
  /** When false, still show icon but menu is read-only or limited */
  disabled?: boolean;
  /** Existing attachments count (show badge) */
  count?: number;
};

const MENU_ITEMS: { type: TaskAttachmentType; labelEn: string; labelHe: string; icon: typeof FileText }[] = [
  { type: "camera", labelEn: "Photo", labelHe: "תמונה", icon: Camera },
  { type: "scan", labelEn: "Scan", labelHe: "סריקה", icon: ScanLine },
  { type: "video", labelEn: "Video", labelHe: "וידאו", icon: Video },
  { type: "file", labelEn: "Document", labelHe: "מסמך", icon: FileText },
  { type: "location", labelEn: "Location", labelHe: "מיקום", icon: MapPin },
];

export function MediaToolbox({ onAddAttachment, locale, disabled, count = 0 }: MediaToolboxProps) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const add = (type: TaskAttachmentType, url: string, name?: string, meta?: string) => {
    onAddAttachment({ type, url, name, meta });
    setOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "file" | "image" | "camera") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      add(type, url, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCamera = () => {
    // Photo: take or upload (stubbed via image file input)
    imageInputRef.current?.click();
    setOpen(false);
  };

  const handleScan = () => {
    // Stub: could open scanner/camera in scan mode
    fileInputRef.current?.click();
    setOpen(false);
  };

  const handleLocation = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation?.getCurrentPosition) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
          add("location", url, undefined, `${latitude},${longitude}`);
        },
        () => add("location", "https://www.google.com/maps", "Location")
      );
    } else {
      add("location", "https://www.google.com/maps", "Location");
    }
    setOpen(false);
  };

  return (
    <div className="relative flex-shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => handleFileChange(e, "file")}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, "camera")}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            add("video", reader.result as string, file.name);
          };
          reader.readAsDataURL(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="p-1.5 rounded-sm text-[#008080] hover:bg-[#008080]/10 disabled:opacity-50 relative"
        title={locale === "he" ? "מדיה / קבצים" : "Media / attachments"}
        aria-label="Media"
      >
        <Paperclip className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-sm bg-[#008080] text-white text-[10px] flex items-center justify-center">
            {count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-[220px] rounded-sm border border-gray-200 bg-white shadow-lg py-1">
            {MENU_ITEMS.map(({ type, labelEn, labelHe, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  if (type === "file") fileInputRef.current?.click();
                  else if (type === "video") videoInputRef.current?.click();
                  else if (type === "camera") handleCamera();
                  else if (type === "scan") handleScan();
                  else if (type === "location") handleLocation();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-none border-0 border-b border-gray-100 last:border-b-0 hover:bg-[#008080]/10 text-gray-900 text-sm"
              >
                <Icon className="w-4 h-4 text-[#008080] shrink-0" />
                {locale === "he" ? labelHe : labelEn}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
