"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Eye,
  Send,
  Share2,
  RefreshCw,
  XCircle,
  Printer,
} from "lucide-react";

export type DocTypeLabel = "Quote" | "Invoice" | "Receipt" | "Delivery Note" | "תעודת משלוח";

/** Open | Closed | Canceled for display */
export function getStatusBadge(status: string): "Open" | "Closed" | "Canceled" {
  if (status === "canceled") return "Canceled";
  if (status === "paid") return "Closed";
  return "Open";
}

const statusColors: Record<string, string> = {
  Open: "bg-[#008080]/15 text-[#006666]",
  Closed: "bg-gray-100 text-gray-700",
  Canceled: "bg-amber-100 text-amber-800",
};

type DocumentCardProps = {
  type: DocTypeLabel;
  number: string;
  clientName: string;
  total: number;
  status: string;
  effectiveStatus?: string;
  date: string;
  dueDate?: string;
  /** Document title (subject) – shown prominently when provided */
  title?: string;
  borderAccent?: "teal" | "amber" | "gold" | "slate";
  onView?: () => void;
  onSendToClient?: () => void;
  onShare?: () => void;
  onChangeStatus?: () => void;
  onCancel?: () => void;
  onPrint?: () => void;
  /** Extra actions (e.g. Convert to Invoice, Issue Receipt) */
  primaryAction?: { label: string; onClick: () => void };
  /** Inline actions (e.g. Mark Sent, Due date, Mark Paid) */
  children?: React.ReactNode;
};

export function DocumentCard({
  type,
  number,
  clientName,
  total,
  status,
  effectiveStatus,
  date,
  dueDate,
  title: docTitle,
  borderAccent = "teal",
  onView,
  onSendToClient,
  onShare,
  onChangeStatus,
  onCancel,
  onPrint,
  primaryAction,
  children,
}: DocumentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const badge = getStatusBadge(effectiveStatus || status);
  const borderClass =
    borderAccent === "teal"
      ? "border-l-4 border-[#008080]"
      : borderAccent === "gold"
        ? "border-l-4 border-amber-400"
        : borderAccent === "slate"
          ? "border-l-4 border-slate-400"
          : "border-l-4 border-amber-300";

  return (
    <div
      className={`rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden ${borderClass}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#008080] uppercase tracking-wider">
                {type}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${statusColors[badge]}`}
              >
                {badge}
              </span>
            </div>
            {docTitle != null && docTitle.trim() ? (
              <p className="font-semibold text-gray-900 mt-1 truncate" title={docTitle}>{docTitle}</p>
            ) : null}
            <p className={`font-medium text-gray-700 ${docTitle != null && docTitle.trim() ? "text-xs mt-0.5" : "mt-1"}`}>#{number}</p>
            <p className="text-sm text-gray-600 truncate">{clientName}</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {typeof total === "number" ? total.toFixed(2) : total}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#008080] text-white font-medium text-sm hover:bg-[#006666]"
              >
                {primaryAction.label}
              </button>
            )}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Quick actions"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl bg-white border border-gray-200 shadow-lg py-1">
                  {onView && (
                    <button
                      type="button"
                      onClick={() => { onView(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
                  )}
                  {onPrint && (
                    <button
                      type="button"
                      onClick={() => { onPrint(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </button>
                  )}
                  {onSendToClient && (
                    <button
                      type="button"
                      onClick={() => { onSendToClient(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Send className="w-4 h-4" /> Send to Client
                    </button>
                  )}
                  {onShare && (
                    <button
                      type="button"
                      onClick={() => { onShare(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  )}
                  {onChangeStatus && (
                    <button
                      type="button"
                      onClick={() => { onChangeStatus(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <RefreshCw className="w-4 h-4" /> Change Status
                    </button>
                  )}
                  {onCancel && (
                    <button
                      type="button"
                      onClick={() => { onCancel(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4" /> Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {date}
          {dueDate ? ` · Due ${dueDate}` : ""}
        </p>
        {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}
