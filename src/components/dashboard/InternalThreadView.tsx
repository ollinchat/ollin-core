"use client";

import React from "react";

type InternalThreadViewProps = {
  contactId: string;
  contactName?: string;
  locale?: string;
  onBack?: () => void;
};

/** Simple thread view for Internal Chat tab when a contact is selected. */
export function InternalThreadView({ contactId, contactName, locale, onBack }: InternalThreadViewProps) {
  const isHe = locale === "he";
  const name = contactName || contactId;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg text-[#008080] hover:bg-[#008080]/10 transition-colors"
            aria-label={isHe ? "חזרה" : "Back"}
          >
            ←
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-[#008080]/20 flex items-center justify-center text-[#008080] font-semibold shrink-0">
          {(name || "?").slice(0, 1).toUpperCase()}
        </div>
        <span className="font-medium text-gray-200 truncate">{name}</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-gray-500 mb-2">
          {isHe ? "שיחה פנימית עם" : "Internal chat with"} <strong>{name}</strong>
        </p>
        <p className="text-xs text-gray-500 max-w-xs">
          {isHe ? "הודעות משיחות פנימיות יופיעו כאן." : "Messages from internal conversations will appear here."}
        </p>
      </div>
    </div>
  );
}
