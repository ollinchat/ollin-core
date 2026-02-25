"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";

export function ProfileQRCode({
  url,
  name,
  size = 128,
}: {
  url: string;
  name?: string;
  size?: number;
}) {
  const [show, setShow] = useState(false);

  if (!url) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShow(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-accent bg-accent-muted px-4 py-3 text-accent font-medium hover:bg-accent/20 transition-colors min-h-[48px]"
        aria-label="Show QR code"
      >
        <QrCode className="w-5 h-5" />
        QR
      </button>
      {show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="QR Code"
          onClick={() => setShow(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 shadow-xl max-w-[280px]"
            onClick={(e) => e.stopPropagation()}
          >
            {name && (
              <p className="text-center font-semibold text-gray-900 mb-3">{name}</p>
            )}
            <div className="flex justify-center bg-white p-2 rounded-lg">
              <QRCodeSVG value={url} size={size} level="M" includeMargin />
            </div>
            <p className="text-xs text-gray-500 text-center mt-3 break-all">{url}</p>
            <button
              type="button"
              onClick={() => setShow(false)}
              className="w-full mt-4 py-2 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
