"use client";

import { useState } from "react";
import type { ProfileBlock, GalleryBlockConfig } from "@/lib/profile-builder-types";

export function GalleryBlock({ block }: { block: ProfileBlock }) {
  const config = block.config as GalleryBlockConfig;
  const images = config.gallery?.images ?? [];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  if (images.length === 0) return null;
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      {config.gallery?.title ? <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">{config.gallery.title}</h3> : null}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <button key={img.id} type="button" onClick={() => setLightboxIndex(i)} className="aspect-square rounded-xl overflow-hidden bg-gray-100 focus:ring-2 focus:ring-teal-500">
            <img src={img.url} alt={img.caption ?? ""} className="w-full h-full object-cover hover:scale-105 transition-transform" />
          </button>
        ))}
      </div>
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxIndex(null)} role="dialog" aria-modal="true">
          <button type="button" onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 text-white text-2xl hover:opacity-80">×</button>
          <img src={images[lightboxIndex]?.url} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}
