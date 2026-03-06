"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { BLOCK_LIBRARY } from "./block-registry";
import type { ProfileBlockType } from "@/lib/profile-builder-types";
import { getDefaultBlockConfig } from "@/lib/profile-builder-types";

const TEAL = "#008080";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ProfileBlockType) => void;
};

export function BlockPicker({ open, onClose, onSelect }: Props) {
  const handleSelect = useCallback(
    (type: ProfileBlockType) => {
      onSelect(type);
      onClose();
    },
    [onSelect, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add block</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-500 mb-4">Choose a block type to add to your profile.</p>
          <div className="grid gap-2">
            {BLOCK_LIBRARY.map((meta) => {
              const Icon = meta.icon;
              return (
                <button
                  key={meta.type}
                  type="button"
                  onClick={() => handleSelect(meta.type)}
                  className="flex items-center gap-4 w-full text-left px-4 py-3 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/50 transition-colors group"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: TEAL }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{meta.label}</p>
                    <p className="text-sm text-gray-500 truncate">{meta.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Helper: create a new block from type (for use when user picks from BlockPicker) */
export function createBlock(type: ProfileBlockType, order: number) {
  return {
    id: crypto.randomUUID(),
    type,
    order,
    config: getDefaultBlockConfig(type),
  };
}
