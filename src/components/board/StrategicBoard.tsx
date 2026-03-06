"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { t } from "@/lib/translations";
import { PanelWrapper } from "@/components/dashboard/PanelWrapper";
import { useBoard } from "@/contexts/BoardContext";
import { useFolders } from "@/contexts/FoldersContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useChecklists } from "@/contexts/ChecklistsContext";
import { useProfile } from "@/contexts/ProfileContext";
import { RecurringChecklistCard } from "./RecurringChecklistCard";
import { TaskCard } from "./TaskCard";
import { MeetingEventCard } from "./MeetingEventCard";
import { MeetingEventFormModal } from "./MeetingEventFormModal";
import { CalendarGrid } from "./CalendarGrid";
import { NotebookPanel } from "./NotebookPanel";
import { SkeletonBoard } from "@/components/ui/Skeleton";
import {
  ListTodo,
  Calendar,
  Users,
  CalendarDays,
  ClipboardList,
  Wallet,
  Phone,
  FolderOpen,
  Plus,
  FileText,
  MessageSquare,
  Building2,
  Archive,
  StickyNote,
  Search,
  ChevronLeft,
  LayoutGrid,
  List,
} from "lucide-react";
import { calculateTotalBalance, type OllinFinanceEntry } from "@/lib/finance-types";
import type { TranslationKey } from "@/lib/translations";

type MainCategory = "tasks" | "calendar" | "meetings" | "checklists" | "events" | "finances" | "folders";
type TaskSubTab = "given" | "received";

/** System folders: pinned, locked (no delete/rename/move). Content inside is fully manageable. */
type SystemFolderId = "notes" | "calls" | "archive";
const SYSTEM_FOLDERS: { id: SystemFolderId; labelEn: string; labelHe: string; icon: typeof StickyNote }[] = [
  { id: "notes", labelEn: "Notes", labelHe: "הערות", icon: StickyNote },
  { id: "calls", labelEn: "Calls", labelHe: "שיחות", icon: Phone },
  { id: "archive", labelEn: "Archive", labelHe: "ארכיון", icon: Archive },
];

type StrategicBoardProps = {
  locale: "en" | "he";
  onBack?: () => void;
};

/** Notes, Calls, Archive moved into Folders as system folders (pinned at top of sidebar). */
const MAIN_CATEGORIES: { id: MainCategory; labelKey: TranslationKey; icon: typeof ListTodo }[] = [
  { id: "tasks", labelKey: "board.tasks", icon: ListTodo },
  { id: "calendar", labelKey: "board.calendar", icon: Calendar },
  { id: "meetings", labelKey: "board.meetings", icon: Users },
  { id: "checklists", labelKey: "board.checklists", icon: ClipboardList },
  { id: "events", labelKey: "board.events", icon: CalendarDays },
  { id: "finances", labelKey: "board.finances", icon: Wallet },
  { id: "folders", labelKey: "board.folders", icon: FolderOpen },
];

export function StrategicBoard({ locale, onBack }: StrategicBoardProps) {
  const [mainTab, setMainTab] = useState<MainCategory>("tasks");
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [insideFolderId, setInsideFolderId] = useState<SystemFolderId | string | null>(null);
  const [taskSubTab, setTaskSubTab] = useState<TaskSubTab>("given");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [modalFolderName, setModalFolderName] = useState("");
  const [modalSharedWithIds, setModalSharedWithIds] = useState<string[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newChecklistFrequency, setNewChecklistFrequency] = useState<"daily" | "weekly" | "monthly" | "quarterly" | "yearly">("daily");
  const [newChecklistAssignedTo, setNewChecklistAssignedTo] = useState("");
  const [meetingEventModal, setMeetingEventModal] = useState<"meeting" | "event" | null>(null);
  const [folderViewMode, setFolderViewMode] = useState<"grid" | "list">("list");

  const {
    loading: boardLoading,
    given,
    received,
    meetings,
    events,
    addGivenTask,
    addReceivedTask,
    addMeeting,
    addEvent,
    unarchiveGivenTask,
    unarchiveReceivedTask,
    unarchiveMeeting,
    unarchiveEvent,
  } = useBoard();

  const activeGiven = given.filter((t) => !t.archived);
  const activeReceived = received.filter((t) => !t.archived);
  const activeMeetings = meetings.filter((m) => !m.archived);
  const activeEvents = events.filter((e) => !e.archived);
  const archivedGiven = given.filter((t) => t.archived);
  const archivedReceived = received.filter((t) => t.archived);
  const archivedMeetings = meetings.filter((m) => m.archived);
  const archivedEvents = events.filter((e) => e.archived);
  const { userFolders, createFolder } = useFolders();
  const { contacts } = useContacts();
  const { profile } = useProfile();
  const { getChecklistsForView, addChecklist } = useChecklists();

  const currentUserId = profile?.userId ?? "";
  const viewChecklists = getChecklistsForView(currentUserId);
  const isFounder = currentUserId === "0476402";

  const [liveEntries, setLiveEntries] = useState<OllinFinanceEntry[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem("ollin_finance");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setLiveEntries(parsed);
      } catch (_) {}
    }
  }, []);
  const totalBurn = calculateTotalBalance(liveEntries);

  const handleQuickAdd = (kind: "given" | "received") => {
    const title = quickAddTitle.trim();
    if (!title) return;
    if (kind === "given") addGivenTask({ title, otherParty: "—", checklist: [], done: false, creatorId: currentUserId });
    else addReceivedTask({ title, otherParty: "—", checklist: [], done: false, creatorId: currentUserId });
    setQuickAddTitle("");
  };

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

  const handleCreateChecklist = () => {
    const title = newChecklistTitle.trim();
    if (!title || !currentUserId) return;
    const assignedTo = isFounder && newChecklistAssignedTo.trim() ? newChecklistAssignedTo.trim() : currentUserId;
    addChecklist({
      title,
      frequency: newChecklistFrequency,
      items: [],
      assignedTo,
      createdBy: currentUserId,
    });
    setNewChecklistTitle("");
    setNewChecklistAssignedTo("");
  };

  const combinedMeetingsEvents = [
    ...activeMeetings.map((m) => ({ ...m, type: "meeting" as const })),
    ...activeEvents.map((e) => ({ ...e, type: "event" as const })),
  ].sort((a, b) => a.startAt - b.startAt);

  if (boardLoading) return <SkeletonBoard />;

  const boardHeader = (
    <>
      <div className="px-3 py-2 border-b border-gray-200/80 bg-[#f8f9fa]">
        <div className="flex items-center gap-2 max-w-md mx-auto bg-white border border-gray-200 rounded-xl pl-3 pr-3 py-2 min-h-[40px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
          <input
            type="text"
            value={folderSearchQuery}
            onChange={(e) => setFolderSearchQuery(e.target.value)}
            placeholder={locale === "he" ? "חיפוש בלוח..." : "Search board..."}
            className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
        </div>
      </div>
      <div className="flex gap-1 p-1.5 border-b border-gray-200/80 bg-[#f8f9fa] overflow-x-auto scrollbar-hide">
        {MAIN_CATEGORIES.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMainTab(id)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              mainTab === id ? "bg-[#374151] text-white shadow-sm" : "text-gray-600 bg-gray-100/80 hover:bg-gray-200/90 border border-gray-200/50"
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {t(locale, labelKey)}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <PanelWrapper header={boardHeader} className="w-full bg-white border border-gray-200 rounded-xl">
      <div className="p-3">
        {mainTab === "tasks" && (
          <>
            {/* Task sub-tabs: GIVEN | RECEIVED */}
            <div className="flex gap-1 p-1 rounded-xl bg-gray-100 w-fit mb-4 border border-gray-200">
              <button
                type="button"
                onClick={() => setTaskSubTab("given")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold uppercase tracking-wide transition-colors border ${
                  taskSubTab === "given" ? "bg-white text-gray-900 border-gray-300 shadow-sm" : "text-gray-600 hover:text-gray-900 border-transparent"
                }`}
              >
                {t(locale, "board.tasksGiven")}
              </button>
              <button
                type="button"
                onClick={() => setTaskSubTab("received")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold uppercase tracking-wide transition-colors border ${
                  taskSubTab === "received" ? "bg-white text-gray-900 border-gray-300 shadow-sm" : "text-gray-600 hover:text-gray-900 border-transparent"
                }`}
              >
                {t(locale, "board.tasksReceived")}
              </button>
            </div>

            {/* Quick Add: single "+ Add" — adds to current tab (GIVEN or RECEIVED) */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <input
                type="text"
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickAdd(taskSubTab)}
                placeholder={locale === "he" ? "כותרת משימה..." : "Task title..."}
                className="flex-1 min-w-[120px] px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm"
              />
              <button
                type="button"
                onClick={() => handleQuickAdd(taskSubTab)}
                className="px-3 py-2 rounded-xl border border-[#006666] bg-[#008080] text-white text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {locale === "he" ? "הוסף משימה" : "Add Task"}
              </button>
            </div>

            <div className="space-y-3">
              {taskSubTab === "given" &&
                activeGiven.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    kind="given"
                    contacts={contacts}
                  />
                ))}
              {taskSubTab === "received" &&
                activeReceived.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    kind="received"
                    contacts={contacts}
                  />
                ))}
              {taskSubTab === "given" && activeGiven.length === 0 && (
                <p className="text-sm text-gray-500 py-4">{locale === "he" ? "אין משימות שנתתי." : "No tasks given."}</p>
              )}
              {taskSubTab === "received" && activeReceived.length === 0 && (
                <p className="text-sm text-gray-500 py-4">{locale === "he" ? "אין משימות שקיבלתי." : "No tasks received."}</p>
              )}
            </div>

            <div className="mt-4">
              <Link
                href="/dashboard/summary"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#008080]/15 text-[#008080] text-sm font-medium border border-[#008080]/30"
              >
                <FileText className="w-4 h-4" />
                {locale === "he" ? "סיכום" : "Summarize"}
              </Link>
            </div>
          </>
        )}

        {mainTab === "calendar" && (
          <CalendarGrid
            given={activeGiven}
            received={activeReceived}
            meetings={activeMeetings}
            events={activeEvents}
            locale={locale}
          />
        )}

        {mainTab === "meetings" && (
          <div className="space-y-3">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setMeetingEventModal("meeting")}
                className="px-4 py-2 rounded-xl border border-[#006666] bg-[#008080] text-white text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {locale === "he" ? "פגישה חדשה" : "New Meeting"}
              </button>
            </div>
            {activeMeetings.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">{locale === "he" ? "אין פגישות." : "No meetings."}</p>
            ) : (
              activeMeetings.map((m) => <MeetingEventCard key={m.id} item={m} currentUserId={currentUserId} />)
            )}
          </div>
        )}

        {mainTab === "checklists" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                placeholder={locale === "he" ? "שם רשימה..." : "Checklist name..."}
                className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm"
              />
              <select
                value={newChecklistFrequency}
                onChange={(e) =>
                  setNewChecklistFrequency(
                    e.target.value as "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
                  )
                }
                className="px-3 py-2 rounded border border-gray-200 bg-white text-sm"
              >
                <option value="daily">{locale === "he" ? "יומי" : "Daily"}</option>
                <option value="weekly">{locale === "he" ? "שבועי" : "Weekly"}</option>
                <option value="monthly">{locale === "he" ? "חודשי" : "Monthly"}</option>
                <option value="quarterly">{locale === "he" ? "רבעוני" : "Quarterly"}</option>
                <option value="yearly">{locale === "he" ? "שנתי" : "Yearly"}</option>
              </select>
              {isFounder && (
                <input
                  type="text"
                  value={newChecklistAssignedTo}
                  onChange={(e) => setNewChecklistAssignedTo(e.target.value)}
                  placeholder={locale === "he" ? "הוקצה ל (מזהה 7 ספרות)" : "Assigned to (7-digit ID)"}
                  className="w-24 px-2 py-2 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400"
                />
              )}
              <button
                type="button"
                onClick={handleCreateChecklist}
                className="px-4 py-2 rounded-xl bg-[#008080] text-white text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {locale === "he" ? "צור רשימה" : "Create checklist"}
              </button>
            </div>
            <div className="space-y-4">
              {viewChecklists.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  {locale === "he" ? "אין רשימות. צור רשימה למעלה." : "No checklists. Create one above."}
                </p>
              ) : (
                <>
                  {[
                    { id: "daily", label: locale === "he" ? "יומי" : "Daily" },
                    { id: "weekly", label: locale === "he" ? "שבועי" : "Weekly" },
                    { id: "monthly", label: locale === "he" ? "חודשי" : "Monthly" },
                    { id: "quarterly", label: locale === "he" ? "רבעוני" : "Quarterly" },
                    { id: "yearly", label: locale === "he" ? "שנתי" : "Yearly" },
                  ].map(({ id, label }) => {
                    const group = viewChecklists.filter((cl) => cl.frequency === id);
                    if (group.length === 0) return null;
                    const avg =
                      group.reduce((s, cl) => s + (cl.currentScore ?? 0), 0) / group.length || 0;
                    const score = Math.round(avg);
                    return (
                      <div key={id} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {label}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="tabular-nums">{score}%</span>
                            <div className="w-32 h-1.5 bg-gray-100">
                              <div
                                className="h-full bg-[#008080]"
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {group.map((cl) => (
                            <RecurringChecklistCard
                              key={cl.id}
                              checklist={cl}
                              showAssignedTo={isFounder && cl.assignedTo !== currentUserId}
                              assignedToLabel={
                                isFounder && cl.assignedTo !== currentUserId
                                  ? (locale === "he" ? "הוקצה ל: " : "Assigned to: ") +
                                    cl.assignedTo
                                  : undefined
                              }
                              locale={locale}
                              currentUserId={currentUserId}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {mainTab === "events" && (
          <div className="space-y-3">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setMeetingEventModal("event")}
                className="px-4 py-2 rounded-xl border border-[#006666] bg-[#008080] text-white text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {locale === "he" ? "אירוע חדש" : "New Event"}
              </button>
            </div>
            {activeEvents.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">{locale === "he" ? "אין אירועים." : "No events."}</p>
            ) : (
              activeEvents.map((e) => <MeetingEventCard key={e.id} item={e} currentUserId={currentUserId} />)
            )}
          </div>
        )}

        {mainTab === "finances" && (
          <div className="space-y-3">
            <Link
              href="/dashboard/finances/documents"
              className="flex items-center gap-3 w-full px-4 py-3 rounded bg-white border border-gray-200 shadow-soft text-left hover:bg-gray-50"
            >
              <Wallet className="w-5 h-5 text-[#008080] shrink-0" />
              <span className="font-medium text-gray-900">{locale === "he" ? "חשבוניות" : "Invoices"}</span>
            </Link>
            <Link
              href="/dashboard/finances/clients"
              className="flex items-center gap-3 w-full px-4 py-3 rounded bg-white border border-gray-200 shadow-soft text-left hover:bg-gray-50"
            >
              <Users className="w-5 h-5 text-[#008080] shrink-0" />
              <span className="font-medium text-gray-900">{locale === "he" ? "לקוחות / ח.פ" : "Clients / H.P"}</span>
            </Link>
            <Link
              href="/dashboard/finances/company-profile"
              className="flex items-center gap-3 w-full px-4 py-3 rounded bg-white border border-gray-200 shadow-soft text-left hover:bg-gray-50"
            >
              <Building2 className="w-5 h-5 text-[#008080] shrink-0" />
              <span className="font-medium text-gray-900">{locale === "he" ? "פרופיל חברה" : "Company Profile"}</span>
            </Link>
          </div>
        )}

        {mainTab === "folders" && (
          <div className="flex-1 min-h-0 overflow-auto flex flex-col">
            {insideFolderId === null ? (
              /* Folders: search bar + New Folder button; system first (pinned, locked). List view with slate icons. */
              <>
                <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-[#f8f9fa]">
                  <div className="flex-1 min-w-0 flex items-center gap-2 bg-white border border-gray-200 rounded-xl pl-3 pr-3 py-2.5 min-h-[40px]">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
                    <input
                      type="text"
                      value={folderSearchQuery}
                      onChange={(e) => setFolderSearchQuery(e.target.value)}
                      placeholder={locale === "he" ? "חיפוש תיקיות..." : "Search folders..."}
                      className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 text-sm outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateFolderModalOpen(true)}
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#008080] text-white hover:bg-[#006666] transition-colors shrink-0"
                    title={locale === "he" ? "תיקייה חדשה" : "New Folder"}
                    aria-label={locale === "he" ? "תיקייה חדשה" : "New Folder"}
                  >
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                  </button>
                  <div className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5 shrink-0" role="group" aria-label={locale === "he" ? "מצב תצוגה" : "View mode"}>
                    <button
                      type="button"
                      onClick={() => setFolderViewMode("grid")}
                      className={`p-2 rounded-lg transition-colors ${folderViewMode === "grid" ? "bg-slate-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                      title={locale === "he" ? "תצוגת רשת" : "Grid view"}
                      aria-pressed={folderViewMode === "grid"}
                    >
                      <LayoutGrid className="w-4 h-4" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFolderViewMode("list")}
                      className={`p-2 rounded-lg transition-colors ${folderViewMode === "list" ? "bg-slate-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                      title={locale === "he" ? "תצוגת רשימה" : "List view"}
                      aria-pressed={folderViewMode === "list"}
                    >
                      <List className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
                {folderViewMode === "grid" ? (
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {SYSTEM_FOLDERS.filter((f) => !folderSearchQuery.trim() || (locale === "he" ? f.labelHe : f.labelEn).toLowerCase().includes(folderSearchQuery.trim().toLowerCase())).map(({ id, labelEn, labelHe, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setInsideFolderId(id)}
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200/80"
                        title={locale === "he" ? "תיקיית מערכת (נעולה)" : "System folder (locked)"}
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-600 flex items-center justify-center mb-2">
                          <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                        </div>
                        <span className="text-xs font-medium text-gray-800 truncate w-full text-center">{locale === "he" ? labelHe : labelEn}</span>
                      </button>
                    ))}
                    {userFolders.filter((f) => !folderSearchQuery.trim() || f.name.toLowerCase().includes(folderSearchQuery.trim().toLowerCase())).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setInsideFolderId(f.id)}
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200/80"
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-600 flex items-center justify-center mb-2">
                          <FolderOpen className="w-6 h-6 text-white" strokeWidth={2} />
                        </div>
                        <span className="text-xs font-medium text-gray-800 truncate w-full text-center">{f.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <ul className="flex-1 min-h-0 overflow-auto divide-y divide-gray-100">
                    {SYSTEM_FOLDERS.filter((f) => !folderSearchQuery.trim() || (locale === "he" ? f.labelHe : f.labelEn).toLowerCase().includes(folderSearchQuery.trim().toLowerCase())).map(({ id, labelEn, labelHe, icon: Icon }) => (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => setInsideFolderId(id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                          title={locale === "he" ? "תיקיית מערכת (נעולה)" : "System folder (locked)"}
                        >
                          <div className="w-9 h-9 rounded-lg bg-slate-600 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-white" strokeWidth={2} />
                          </div>
                          <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">{locale === "he" ? labelHe : labelEn}</span>
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
                          <div className="w-9 h-9 rounded-lg bg-slate-600 flex items-center justify-center shrink-0">
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
              /* Inside folder: full-page content + Back button */
              <>
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setInsideFolderId(null)}
                    className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center gap-1"
                    aria-label={locale === "he" ? "חזרה" : "Back"}
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">{locale === "he" ? "חזרה" : "Back"}</span>
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
                      <p className="text-xs text-gray-600">{locale === "he" ? "שיחות והודעות — מרכז תקשורת." : "Calls and messages — communication hub."}</p>
                      <Link href="/dashboard/messages" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#008080] text-white text-xs font-medium">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {locale === "he" ? "הודעות" : "Messages"}
                      </Link>
                    </div>
                  )}
                  {insideFolderId === "archive" && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-600">{locale === "he" ? "פריטים בארכיון. לחץ 'החזר' להצגה בלוח." : "Archived items. Click Restore to show on board again."}</p>
                      {archivedGiven.length > 0 && (
                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{t(locale, "board.tasksGiven")}</h3>
                          <ul className="space-y-2">
                            {archivedGiven.map((task) => (
                              <li key={task.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200">
                                <span className="text-sm font-medium text-gray-700 truncate">{task.title || "—"}</span>
                                <button type="button" onClick={() => unarchiveGivenTask(task.id)} className="px-2 py-1 rounded-xl text-xs font-medium bg-[#008080] text-white hover:bg-[#006666]">{locale === "he" ? "החזר" : "Restore"}</button>
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
                              <li key={task.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200">
                                <span className="text-sm font-medium text-gray-700 truncate">{task.title || "—"}</span>
                                <button type="button" onClick={() => unarchiveReceivedTask(task.id)} className="px-2 py-1 rounded-xl text-xs font-medium bg-[#008080] text-white hover:bg-[#006666]">{locale === "he" ? "החזר" : "Restore"}</button>
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
                              <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200">
                                <span className="text-sm font-medium text-gray-700 truncate">{m.title}</span>
                                <button type="button" onClick={() => unarchiveMeeting(m.id)} className="px-2 py-1 rounded-xl text-xs font-medium bg-[#008080] text-white hover:bg-[#006666]">{locale === "he" ? "החזר" : "Restore"}</button>
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
                              <li key={e.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200">
                                <span className="text-sm font-medium text-gray-700 truncate">{e.title}</span>
                                <button type="button" onClick={() => unarchiveEvent(e.id)} className="px-2 py-1 rounded-xl text-xs font-medium bg-[#008080] text-white hover:bg-[#006666]">{locale === "he" ? "החזר" : "Restore"}</button>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                      {archivedGiven.length === 0 && archivedReceived.length === 0 && archivedMeetings.length === 0 && archivedEvents.length === 0 && (
                        <p className="text-sm text-gray-500 py-4">{locale === "he" ? "אין פריטים בארכיון." : "No archived items."}</p>
                      )}
                    </div>
                  )}
                  {insideFolderId && insideFolderId !== "notes" && insideFolderId !== "calls" && insideFolderId !== "archive" && (
                    <div className="py-4 text-sm text-gray-500">{locale === "he" ? "תוכן תיקייה" : "Folder content"}</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {meetingEventModal && (
        <MeetingEventFormModal
          type={meetingEventModal}
          onClose={() => setMeetingEventModal(null)}
          onSubmit={(item) => {
            if (meetingEventModal === "meeting") addMeeting({ ...item, creatorId: currentUserId });
            else addEvent({ ...item, creatorId: currentUserId });
            setMeetingEventModal(null);
          }}
        />
      )}

      {/* Create Folder Modal */}
      {createFolderModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" aria-hidden onClick={() => setCreateFolderModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">{locale === "he" ? "תיקייה חדשה" : "New Folder"}</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{locale === "he" ? "שם תיקייה" : "Folder name"}</label>
                  <input
                    type="text"
                    value={modalFolderName}
                    onChange={(e) => setModalFolderName(e.target.value)}
                    placeholder={locale === "he" ? "הזן שם תיקייה" : "Enter folder name"}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{locale === "he" ? "שתף עם..." : "Share with..."}</label>
                  <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/50 p-2 space-y-1">
                    {contacts.length === 0 ? (
                      <p className="text-xs text-gray-500 py-2 px-2">{locale === "he" ? "אין אנשי קשר. הוסף אנשי קשר להזמנה." : "No contacts. Add contacts to invite."}</p>
                    ) : (
                      contacts.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={modalSharedWithIds.includes(c.id)}
                            onChange={() => toggleModalShareContact(c.id)}
                            className="rounded border-gray-300 text-[#008080] focus:ring-[#008080]"
                          />
                          <span className="text-sm text-gray-800 truncate">{c.name || c.email || c.id}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  {locale === "he" ? "ביטול" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleCreateFolderFromModal}
                  disabled={!modalFolderName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#008080] text-white text-sm font-medium hover:bg-[#006666] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {locale === "he" ? "צור" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </PanelWrapper>
  );
}

export default StrategicBoard;
