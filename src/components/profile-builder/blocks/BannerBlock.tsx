"use client";

import type { ProfileBlock, BannerBlockConfig } from "@/lib/profile-builder-types";

export function BannerBlock({ block }: { block: ProfileBlock }) {
  const config = block.config as BannerBlockConfig;
  const b = config.banner ?? { image: "" };
  if (!b.image && !b.headline) return null;
  return (
    <section className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="relative aspect-[3/1] min-h-[140px] bg-gray-200">
        {b.image ? <img src={b.image} alt="" className="w-full h-full object-cover" /> : null}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-black/30">
          {b.headline ? <h3 className="text-xl sm:text-2xl font-bold text-white">{b.headline}</h3> : null}
          {b.subline ? <p className="text-white/90 text-sm mt-1">{b.subline}</p> : null}
          {b.ctaLabel && b.ctaUrl ? <a href={b.ctaUrl} target="_blank" rel="noopener noreferrer" className="mt-4 px-5 py-2.5 rounded-xl bg-white text-gray-900 font-semibold">{b.ctaLabel}</a> : null}
        </div>
      </div>
    </section>
  );
}
