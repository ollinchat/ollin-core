"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BLOCK_LIBRARY } from "@/components/profile-builder/block-registry";
import { generateUUID } from "@/lib/uuid";

const TEAL = "#008080";

export default function ProfileBuilderPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocks, setBlocks] = useState<{ id: string; label: string }[]>([]);

  const addPlaceholderBlock = (label: string) => {
    setBlocks((prev) => [...prev, { id: generateUUID(), label }]);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-gray-50">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center px-4 py-3 border-b border-gray-100 bg-white z-10">
        <Link href="/dashboard" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </div>

      {/* Fixed Header: Cover + Profile Picture + Social Icons */}
      <header className="relative w-full flex-shrink-0">
        {/* Cover Photo */}
        <div className="w-full h-44 sm:h-52 bg-gradient-to-br from-teal-600 to-teal-800" />
        {/* Profile Picture - circular, overlapping cover */}
        <div className="flex flex-col items-center -mt-16 relative z-10 pb-4">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-white border-4 border-white shadow-lg flex items-center justify-center text-4xl font-bold text-teal-600">
            A
          </div>
          <h1 className="mt-3 text-xl font-bold text-gray-900">Your Name</h1>
          <p className="text-teal-600 font-medium text-sm">Professional Title</p>
          {/* Social Icons row */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-teal-100 hover:text-teal-600" aria-label="Instagram">IG</a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-teal-100 hover:text-teal-600" aria-label="LinkedIn">in</a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-teal-100 hover:text-teal-600" aria-label="Facebook">f</a>
          </div>
        </div>
      </header>

      {/* Placeholder cards (blocks added by user) */}
      <main className="flex-1 px-4 py-6 space-y-4">
        {blocks.map((b) => (
          <div key={b.id} className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">{b.label}</p>
            <p className="text-gray-400 text-xs mt-1">Placeholder block</p>
          </div>
        ))}
      </main>

      {/* Floating Add Block button - bottom center */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="px-6 py-4 rounded-2xl text-white font-semibold shadow-lg hover:opacity-90 flex items-center gap-2"
            style={{ backgroundColor: TEAL }}
          >
            Add Block
          </button>
        </div>
      </div>

      {/* Grid Menu - 9 options */}
      {menuOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Choose a block</h2>
            <div className="grid grid-cols-3 gap-3">
              {BLOCK_LIBRARY.map((meta) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={meta.type}
                    type="button"
                    onClick={() => addPlaceholderBlock(meta.label)}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: TEAL }}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setMenuOpen(false)} className="w-full mt-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
