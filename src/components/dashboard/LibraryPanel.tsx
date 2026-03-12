"use client";

import React, { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { useFolders } from "@/contexts/FoldersContext";
import { StickyNote, MessageSquare, Archive, FolderOpen } from "lucide-react";
import { NotebookPanel } from "@/components/board/NotebookPanel";
import InternalChatPanel from "@/components/InternalChatPanel";
import { PanelWrapper } from "@/components/dashboard/PanelWrapper";

/** System folder IDs — pinned, locked, cannot be deleted */
type SystemFolderId = "notes" | "chats" | "archive";

type LibraryPanelProps = {
  locale: "en" | "he";
  onSelectedContactChange?: (id: string | null) => void;
  onOpenBoard?: () => void;
};

/** Pinned system folders at top of sidebar (Ollin standard: charcoal active, rounded-xl) */
const SYSTEM_FOLDERS: { id: SystemFolderId; labelEn: string; labelHe: string; icon: typeof StickyNote }[] = [
  { id: "notes", labelEn: "Notes", labelHe: "הערות", icon: StickyNote },
  { id: "chats", labelEn: "Conversations", labelHe: "שיחות", icon: MessageSquare },
  { id: "archive", labelEn: "Archive", labelHe: "ארכיון", icon: Archive },
];

export function LibraryPanel({ locale, onSelectedContactChange, onOpenBoard }: LibraryPanelProps) {
  const [selectedId, setSelectedId] = useState<SystemFolderId | string>("chats");
  const { userFolders } = useFolders();
  const isHe = locale === "he";
  const isSystem = (id: string): id is SystemFolderId => SYSTEM_FOLDERS.some((f) => f.id === id);
  const contentId = isSystem(selectedId) ? selectedId : "folder";

  if (contentId === "chats") {
    return (
      <PanelWrapper className="flex-1 min-h-0">
        <InternalChatPanel locale={locale} onSelectedContactChange={onSelectedContactChange} />
      </PanelWrapper>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 bg-[#f8f9fa] overflow-hidden">
      {/* Sidebar: system folders (pinned) + separator + user folders — hidden when Chat is selected */}
      <aside className="flex-shrink-0 w-40 border-r border-gray-200/80 bg-white/60 flex flex-col py-1.5 px-1 overflow-hidden">
        {SYSTEM_FOLDERS.map(({ id, labelEn, labelHe, icon: Icon }) => {
          const isActive = selectedId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedId(id)}
              className={`w-full flex items-center gap-2 py-1.5 px-2 text-left rounded-xl text-xs font-medium transition-colors ${
                isActive ? "bg-[#374151] text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
              aria-selected={isActive}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
              <span className="truncate">{isHe ? labelHe : labelEn}</span>
            </button>
          );
        })}
        <div className="my-1 border-t border-gray-200/80" />
        {userFolders.map((f) => {
          const isActive = selectedId === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedId(f.id)}
              className={`w-full flex items-center gap-2 py-1.5 px-2 text-left rounded-xl text-xs font-medium transition-colors ${
                isActive ? "bg-[#374151] text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
              aria-selected={isActive}
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
              <span className="truncate">{f.name}</span>
            </button>
          );
        })}
      </aside>
      <PanelWrapper className="flex-1 min-h-0 flex flex-col">
        {contentId === "notes" && <NotebookPanel locale={locale} />}
        {contentId === "archive" && (
          <div className="flex-1 p-3 flex flex-col items-center justify-center text-center min-h-[200px] bg-[#f8f9fa]">
            <Archive className="w-9 h-9 text-[#008080] mb-2" strokeWidth={2} />
            <h3 className="text-xs font-semibold text-gray-900 mb-1 tracking-heading">{isHe ? "ארכיון" : "Archive"}</h3>
            <p className="text-[11px] text-gray-500 mb-2 max-w-sm">
              {isHe ? "פריטים בארכיון (משימות, פגישות, אירועים) מוצגים בלשונית הארכיון בלוח." : "Archived items are shown in the Archive tab on the Board."}
            </p>
            {onOpenBoard && (
              <button
                type="button"
                onClick={onOpenBoard}
                className="px-3 py-2 text-xs font-medium bg-[#008080] text-white hover:bg-[#006666] transition-colors rounded-xl"
              >
                {isHe ? "פתח לוח" : "Open Board"}
              </button>
            )}
          </div>
        )}
        {contentId === "folder" && (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-xs p-3">
            {isHe ? "תוכן תיקייה" : "Folder content"}
          </div>
        )}
      </PanelWrapper>
    </div>
  );
}
