"use client";

import React, { useState } from "react";
import Link from "next/link";
import { t } from "@/lib/translations";
import { useFolders } from "@/contexts/FoldersContext";
import { useBoard } from "@/contexts/BoardContext";
import { useContacts } from "@/contexts/ContactsContext";
import { NotebookPanel } from "./NotebookPanel";
import {
  FolderOpen,
  Plus,
  Search,
  ChevronLeft,
  LayoutGrid,
  List,
  StickyNote,
  Phone,
  Archive,
  MessageSquare,
} from "lucide-react";

type SystemFolderId = "notes" | "calls" | "archive";
const SYSTEM_FOLDERS: { id: SystemFolderId; labelEn: string; labelHe: string; icon: typeof StickyNote }[] = [
  { id: "notes", labelEn: "Notes", labelHe: "הערות", icon: StickyNote },
  { id: "calls", labelEn: "Calls", labelHe: "שיחות", icon: Phone },
  { id: "archive", labelEn: "Archive", labelHe: "ארכיון", icon: Archive },
];

type FoldersPageContentProps = {
  locale: "en" | "he";
};

export function FoldersPageContent({ locale }: FoldersPageContentProps) {
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [insideFolderId, setInsideFolderId] = useState<SystemFolderId | string | null>(null);
  const [folderViewMode, setFolderViewMode] = useState<"grid" | "list">("list");
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [modalFolderName, setModalFolderName] = useState("");
  const [modalSharedWithIds, setModalSharedWithIds] = useState<string[]>([]);

  const { userFolders, createFolder } = useFolders();
  const { contacts } = useContacts();
  const {
    given: givenTasks,
    received: receivedTasks,
    meetings,
    events,
    unarchiveGivenTask,
    unarchiveReceivedTask,
    unarchiveMeeting,
    unarchiveEvent,
  } = useBoard();

  const archivedGiven = givenTasks.filter((t) => t.archived);
  const archivedReceived = receivedTasks.filter((t) => t.archived);
  const archivedMeetings = meetings.filter((m) => m.archived);
  const archivedEvents = events.filter((e) => e.archived);

  const handleCreateFolderFromModal = () => {
    const name = modalFolderName.trim();
    if (!name) return;
    createFolder(name);
    setModalFolderName("");
    setModalSharedWithIds([]);
    setCreateFolderModalOpen(false);
  };

  const toggleModalShareContact = (contactId: string) => {
    setModalSharedWithIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const isHe = locale === "he";

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {insideFolderId === null ? (
        <>
          <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-white">
            <div className="flex-1 min-w-0 flex items-center gap-2 bg-white border border-gray-100 rounded-sm pl-3 pr-3 py-2.5 min-h-[40px]">
              <Search className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
              <input
                type="text"
                value={folderSearchQuery}
                onChange={(e) => setFolderSearchQuery(e.target.value)}
                placeholder={isHe ? "חיפוש תיקיות..." : "Search folders..."}
                className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 text-sm outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setCreateFolderModalOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-sm bg-[#008080] text-white hover:bg-[#006666] transition-all duration-150 shrink-0"
              title={isHe ? "תיקייה חדשה" : "New Folder"}
              aria-label={isHe ? "תיקייה חדשה" : "New Folder"}
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <div className="flex items-center rounded-sm border border-gray-100 bg-white p-0.5 shrink-0" role="group" aria-label={isHe ? "מצב תצוגה" : "View mode"}>
              <button
                type="button"
                onClick={() => setFolderViewMode("grid")}
                className={`p-2 rounded-sm transition-all duration-150 ${folderViewMode === "grid" ? "bg-slate-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                title={isHe ? "תצוגת רשת" : "Grid view"}
                aria-pressed={folderViewMode === "grid"}
              >
                <LayoutGrid className="w-4 h-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setFolderViewMode("list")}
                className={`p-2 rounded-sm transition-all duration-150 ${folderViewMode === "list" ? "bg-slate-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                title={isHe ? "תצוגת רשימה" : "List view"}
                aria-pressed={folderViewMode === "list"}
              >
                <List className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>
          {folderViewMode === "grid" ? (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 flex-1 overflow-auto">
              {SYSTEM_FOLDERS.filter((f) => !folderSearchQuery.trim() || (isHe ? f.labelHe : f.labelEn).toLowerCase().includes(folderSearchQuery.trim().toLowerCase())).map(({ id, labelEn, labelHe, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setInsideFolderId(id)}
                  className="flex flex-col items-center justify-center p-4 rounded-sm bg-white hover:bg-gray-50 transition-all duration-150 border border-gray-100"
                  title={isHe ? "תיקיית מערכת (נעולה)" : "System folder (locked)"}
                >
                  <div className="w-12 h-12 rounded-sm bg-slate-600 flex items-center justify-center mb-2">
                    <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <span className="text-xs font-medium text-gray-800 truncate w-full text-center">{isHe ? labelHe : labelEn}</span>
                </button>
              ))}
              {userFolders.filter((f) => !folderSearchQuery.trim() || f.name.toLowerCase().includes(folderSearchQuery.trim().toLowerCase())).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setInsideFolderId(f.id)}
                  className="flex flex-col items-center justify-center p-4 rounded-sm bg-white hover:bg-gray-50 transition-all duration-150 border border-gray-100"
                >
                  <div className="w-12 h-12 rounded-sm bg-slate-600 flex items-center justify-center mb-2">
                    <FolderOpen className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <span className="text-xs font-medium text-gray-800 truncate w-full text-center">{f.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <ul className="flex-1 min-h-0 overflow-auto divide-y divide-gray-100">
              {SYSTEM_FOLDERS.filter((f) => !folderSearchQuery.trim() || (isHe ? f.labelHe : f.labelEn).toLowerCase().includes(folderSearchQuery.trim().toLowerCase())).map(({ id, labelEn, labelHe, icon: Icon }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setInsideFolderId(id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    title={isHe ? "תיקיית מערכת (נעולה)" : "System folder (locked)"}
                  >
                    <div className="w-9 h-9 rounded-sm bg-slate-600 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-white" strokeWidth={2} />
                    </div>
                    <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">{isHe ? labelHe : labelEn}</span>
                    <span className="text-xs text-gray-400 shrink-0">—</span>
                  </button>
                </li>
              ))}
              {userFolders.filter((f) => !folderSearchQuery.trim() || f.name.toLowerCase().includes(folderSearchQuery.trim().toLowerCase())).map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setInsideFolderId(f.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-sm bg-slate-600 flex items-center justify-center shrink-0">
                      <FolderOpen className="w-4 h-4 text-white" strokeWidth={2} />
                    </div>
                    <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">{f.name}</span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {new Date(f.createdAt).toLocaleDateString(locale === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setInsideFolderId(null)}
              className="p-2 rounded-sm text-slate-500 hover:text-gray-900 hover:bg-gray-50 flex items-center gap-1 transition-all duration-150"
              aria-label={isHe ? "חזרה" : "Back"}
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">{isHe ? "חזרה" : "Back"}</span>
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-3">
            {insideFolderId === "notes" && (
              <div className="min-h-[320px]">
                <NotebookPanel locale={locale} />
              </div>
            )}
            {insideFolderId === "calls" && (
              <div className="space-y-3">
                <p className="text-xs text-gray-600">{isHe ? "שיחות והודעות — מרכז תקשורת." : "Calls and messages — communication hub."}</p>
                <Link href="/dashboard/messages" className="inline-flex items-center gap-2 px-3 py-2 rounded-sm bg-[#008080] text-white text-xs font-bold">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {isHe ? "הודעות" : "Messages"}
                </Link>
              </div>
            )}
            {insideFolderId === "archive" && (
              <div className="space-y-4">
                <p className="text-xs text-gray-600">{isHe ? "פריטים בארכיון. לחץ 'החזר' להצגה בלוח." : "Archived items. Click Restore to show on board again."}</p>
                {archivedGiven.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{t(locale, "board.tasksGiven")}</h3>
                    <ul className="space-y-2">
                      {archivedGiven.map((task) => (
                        <li key={task.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-sm bg-white border border-gray-100">
                          <span className="text-sm font-semibold text-gray-900 truncate">{task.title || "—"}</span>
                          <button type="button" onClick={() => unarchiveGivenTask(task.id)} className="px-2.5 py-1.5 rounded-sm text-xs font-semibold bg-[#008080] text-white hover:bg-[#006666]">{isHe ? "החזר" : "Restore"}</button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {archivedReceived.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{t(locale, "board.tasksReceived")}</h3>
                    <ul className="space-y-2">
                      {archivedReceived.map((task) => (
                        <li key={task.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-sm bg-white border border-gray-100">
                          <span className="text-sm font-semibold text-gray-900 truncate">{task.title || "—"}</span>
                          <button type="button" onClick={() => unarchiveReceivedTask(task.id)} className="px-2.5 py-1.5 rounded-sm text-xs font-semibold bg-[#008080] text-white hover:bg-[#006666]">{isHe ? "החזר" : "Restore"}</button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {archivedMeetings.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{t(locale, "board.meetings")}</h3>
                    <ul className="space-y-2">
                      {archivedMeetings.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-sm bg-white border border-gray-100">
                          <span className="text-sm font-semibold text-gray-900 truncate">{m.title}</span>
                          <button type="button" onClick={() => unarchiveMeeting(m.id)} className="px-2.5 py-1.5 rounded-sm text-xs font-semibold bg-[#008080] text-white hover:bg-[#006666]">{isHe ? "החזר" : "Restore"}</button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {archivedEvents.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{t(locale, "board.events")}</h3>
                    <ul className="space-y-2">
                      {archivedEvents.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-sm bg-white border border-gray-100">
                          <span className="text-sm font-semibold text-gray-900 truncate">{e.title}</span>
                          <button type="button" onClick={() => unarchiveEvent(e.id)} className="px-2.5 py-1.5 rounded-sm text-xs font-semibold bg-[#008080] text-white hover:bg-[#006666]">{isHe ? "החזר" : "Restore"}</button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {archivedGiven.length === 0 && archivedReceived.length === 0 && archivedMeetings.length === 0 && archivedEvents.length === 0 && (
                  <p className="text-sm text-gray-500 py-4">{isHe ? "אין פריטים בארכיון." : "No archived items."}</p>
                )}
              </div>
            )}
            {insideFolderId && insideFolderId !== "notes" && insideFolderId !== "calls" && insideFolderId !== "archive" && (
              <div className="py-4 text-sm text-gray-500">{isHe ? "תוכן תיקייה" : "Folder content"}</div>
            )}
          </div>
        </>
      )}

      {createFolderModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" aria-hidden onClick={() => setCreateFolderModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="clean-modal w-full max-w-md overflow-hidden bg-white" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-[var(--clean-border)]">
                <h2 className="text-lg font-semibold text-[var(--clean-text)] tracking-wide">{isHe ? "תיקייה חדשה" : "New Folder"}</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[var(--clean-text)] mb-1.5">{isHe ? "שם תיקייה" : "Folder name"}</label>
                  <input
                    type="text"
                    value={modalFolderName}
                    onChange={(e) => setModalFolderName(e.target.value)}
                    placeholder={isHe ? "הזן שם תיקייה" : "Enter folder name"}
                    className="w-full px-4 py-2.5 border border-[var(--clean-border)] bg-white text-[var(--clean-text)] placeholder-[var(--clean-text-secondary)] text-[13px] font-medium focus:border-[var(--clean-accent)] outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[var(--clean-text)] mb-1.5">{isHe ? "שתף עם..." : "Share with..."}</label>
                  <div className="max-h-32 overflow-y-auto border border-[var(--clean-border)] bg-white p-2 space-y-1">
                    {contacts.length === 0 ? (
                      <p className="text-xs text-[var(--clean-text-secondary)] py-2 px-2">{isHe ? "אין אנשי קשר. הוסף אנשי קשר להזמנה." : "No contacts. Add contacts to invite."}</p>
                    ) : (
                      contacts.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 py-2 px-2 hover:bg-[var(--clean-border)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={modalSharedWithIds.includes(c.id)}
                            onChange={() => toggleModalShareContact(c.id)}
                            className="border-[var(--clean-border)] text-[var(--clean-accent)] focus:ring-0 w-4 h-4"
                          />
                          <span className="text-[13px] font-medium text-[var(--clean-text)] truncate">{c.name || c.email || c.id}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-[var(--clean-border)] flex justify-end gap-2">
                <button type="button" onClick={() => setCreateFolderModalOpen(false)} className="px-4 py-2.5 text-[13px] font-medium text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)] border border-[var(--clean-border)] hover:bg-[var(--clean-border)]">
                  {isHe ? "ביטול" : "Cancel"}
                </button>
                <button type="button" onClick={handleCreateFolderFromModal} disabled={!modalFolderName.trim()} className="px-4 py-2.5 bg-[var(--clean-accent)] text-white text-[13px] font-medium hover:bg-[var(--clean-accent-hover)] disabled:opacity-50 disabled:pointer-events-none">
                  {isHe ? "צור" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
