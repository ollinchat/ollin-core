"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useNotes } from "@/contexts/NotesContext";
import { InternalChatPanel } from "@/components/InternalChatPanel";
import { LayoutGrid, StickyNote, ScanLine, FileText, CalendarDays, Plus } from "lucide-react";

export type ChatSourceId = "ollin" | "whatsapp" | "telegram" | "gmail" | "discord" | "signal" | "slack" | "viber";

interface ConversationsViewProps {
  locale: "en" | "he";
  onSelectedContactChange?: (id: string | null) => void;
}

const TOOLS: { href: string; labelEn: string; labelHe: string; icon: typeof ScanLine }[] = [
  { href: "/dashboard", labelEn: "Scanner", labelHe: "סורק", icon: ScanLine },
  { href: "/dashboard/finances/documents", labelEn: "Invoices", labelHe: "חשבוניות", icon: FileText },
  { href: "/dashboard/events/new", labelEn: "Events", labelHe: "אירועים", icon: CalendarDays },
];

export function ConversationsView({ locale, onSelectedContactChange }: ConversationsViewProps) {
  const isHe = locale === "he";
  const { folders, getNotesInFolder } = useNotes();
  const defaultFolderId = folders[0]?.id ?? "default";
  const recentNotes = (defaultFolderId ? getNotesInFolder(defaultFolderId) : []).slice(0, 6);
  const [notesExpanded, setNotesExpanded] = useState(false);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sidebar: Tools + Notes (Pixel Perfect restoration) */}
      <aside className="flex-shrink-0 w-36 sm:w-40 border-r border-gray-200/80 bg-white/80 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 px-2 py-3 border-b border-gray-100">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2} />
            {isHe ? "כלים" : "Tools"}
          </p>
          <div className="space-y-0.5">
            {TOOLS.map(({ href, labelEn, labelHe, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] text-xs font-medium transition-colors">
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                <span className="truncate">{isHe ? labelHe : labelEn}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-t border-gray-100">
          <button type="button" onClick={() => setNotesExpanded((e) => !e)} className="flex-shrink-0 flex items-center justify-between w-full px-2 py-2 text-left hover:bg-gray-50 rounded-lg">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5" strokeWidth={2} />
              {isHe ? "פתקים" : "Notes"}
            </p>
            <span className="text-gray-400 text-xs">{notesExpanded ? "−" : "+"}</span>
          </button>
          {notesExpanded && (
            <ul className="flex-1 overflow-y-auto px-1 pb-2 space-y-0.5">
              {recentNotes.length === 0 && <li className="text-[10px] text-gray-400 py-2 px-2">{isHe ? "אין פתקים" : "No notes"}</li>}
              {recentNotes.map((note) => (
                <li key={note.id}>
                  <Link href="/dashboard" className="block py-1.5 px-2 rounded-lg hover:bg-gray-50 text-gray-700 text-xs truncate" title={note.title || (isHe ? "ללא כותרת" : "Untitled")}>
                    {note.title || (isHe ? "ללא כותרת" : "Untitled")}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/dashboard" className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-[#008080] hover:bg-[#008080]/10 text-xs font-medium">
                  <Plus className="w-3 h-3" strokeWidth={2.5} />
                  {isHe ? "פתק חדש" : "New note"}
                </Link>
              </li>
            </ul>
          )}
        </div>
      </aside>
      {/* Main: InternalChatPanel (channels + list/thread; Ollin AI = persisted chat with [TASK]) */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        <InternalChatPanel locale={locale} compact={false} onSelectedContactChange={onSelectedContactChange} />
      </div>
    </div>
  );
}
