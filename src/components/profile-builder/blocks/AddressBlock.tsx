"use client";

import { MapPin } from "lucide-react";
import type { ProfileBlock, AddressBlockConfig } from "@/lib/profile-builder-types";

export function AddressBlock({ block }: { block: ProfileBlock }) {
  const config = block.config as AddressBlockConfig;
  const addr = config.address ?? { text: "" };
  const label = addr.label ?? "Address";
  const text = addr.text ?? "";
  const mapUrl = addr.mapUrl ?? "";
  if (!text && !mapUrl) return null;
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-teal-600" />
        </div>
        <div className="min-w-0 flex-1">
          {label ? <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</p> : null}
          <p className="text-gray-900">{text || "—"}</p>
          {mapUrl ? (
            <a href={mapUrl.startsWith("http") ? mapUrl : "https://maps.google.com/?q=" + encodeURIComponent(mapUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-teal-600 text-sm font-medium hover:underline">
              View on map
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
