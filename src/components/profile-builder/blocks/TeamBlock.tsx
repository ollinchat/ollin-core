"use client";

import type { ProfileBlock, TeamBlockConfig } from "@/lib/profile-builder-types";

export function TeamBlock({ block }: { block: ProfileBlock }) {
  const config = block.config as TeamBlockConfig;
  const { title = "Our Team", members } = config.team ?? { members: [] };
  if (members.length === 0) return null;
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      {title && <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">{title}</h3>}
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1">
        {members.map((m) => (
          <a
            key={m.id}
            href={m.link || "#"}
            className="flex-shrink-0 w-32 text-center group"
            onClick={(e) => !m.link && e.preventDefault()}
          >
            <div className="w-20 h-20 rounded-full mx-auto overflow-hidden bg-gray-100 border-2 border-gray-100 group-hover:border-teal-200 transition-colors">
              {m.photo ? (
                <img src={m.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                  {(m.name || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <p className="font-medium text-gray-900 text-sm mt-2 truncate">{m.name || "—"}</p>
            <p className="text-xs text-gray-500 truncate">{m.title || "—"}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
