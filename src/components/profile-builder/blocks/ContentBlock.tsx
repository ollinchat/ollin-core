"use client";

import type { ProfileBlock, ContentBlockConfig } from "@/lib/profile-builder-types";

export function ContentBlock({ block }: { block: ProfileBlock }) {
  const config = block.config as ContentBlockConfig;
  const data = config.content;
  if (!data) return null;
  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{data.title || "Content"}</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{data.text || "—"}</p>
      </div>
    </section>
  );
}
