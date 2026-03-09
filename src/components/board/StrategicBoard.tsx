"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { t } from "@/lib/translations";
import { generateUUID } from "@/lib/uuid";
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
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { Contact } from "@/contexts/ContactsContext";
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
  MessageCircleOff,
  Building2,
  Archive,
  StickyNote,
  Search,
  ChevronLeft,
  LayoutGrid,
  List,
  Mic,
  ImagePlus,
  Send,
  Paperclip,
  Camera,
  X,
  Clock,
  User,
} from "lucide-react";
import { calculateTotalBalance, type OllinFinanceEntry } from "@/lib/finance-types";
import type { TranslationKey } from "@/lib/translations";
import type { TaskAttachment } from "@/lib/board-types";

type MainCategory = "tasks" | "calendar" | "meetings" | "checklists" | "events" | "finances" | "folders";
type TaskSubTab = "given" | "received";

/** System folders: pinned, locked (no delete/rename/move). Content inside is fully manageable. */
type SystemFolderId = "notes" | "calls" | "archive";
const SYSTEM_FOLDERS: { id: SystemFolderId; labelEn: string; labelHe: string; icon: typeof StickyNote }[] = [
  { id: "notes", labelEn: "Notes", labelHe: "הערות", icon: StickyNote },
  { id: "calls", labelEn: "Calls", labelHe: "שיחות", icon: Phone },
  { id: "archive", labelEn: "Archive", labelHe: "ארכיון", icon: Archive },
];

const MAIN_CATEGORY_IDS: MainCategory[] = ["tasks", "calendar", "meetings", "checklists", "events", "finances", "folders"];
function isValidMainCategory(t: string | null | undefined): t is MainCategory {
  return t != null && MAIN_CATEGORY_IDS.includes(t as MainCategory);
}

type StrategicBoardProps = {
  locale: "en" | "he";
  onBack?: () => void;
  initialMainTab?: string | null;
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

export function StrategicBoard({ locale, onBack, initialMainTab }: StrategicBoardProps) {
  const [mainTab, setMainTab] = useState<MainCategory>(() => (isValidMainCategory(initialMainTab) ? initialMainTab : "tasks"));
  useEffect(() => {
    if (isValidMainCategory(initialMainTab)) setMainTab(initialMainTab);
  }, [initialMainTab]);
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [insideFolderId, setInsideFolderId] = useState<SystemFolderId | string | null>(null);
  const [taskSubTab, setTaskSubTab] = useState<TaskSubTab>("given");
  const [quickAddText, setQuickAddText] = useState("");
  const [quickAddDueDate, setQuickAddDueDate] = useState<string | null>(null);
  const [quickAddPriority, setQuickAddPriority] = useState<"low" | "medium" | "high">("low");
  const [quickAddNoComments, setQuickAddNoComments] = useState(false);
  const [quickAddAttachments, setQuickAddAttachments] = useState<TaskAttachment[]>([]);
  const quickAddFileRef = useRef<HTMLInputElement>(null);
  const quickAddImageRef = useRef<HTMLInputElement>(null);
  const quickAddCameraRef = useRef<HTMLInputElement>(null);
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [modalFolderName, setModalFolderName] = useState("");
  const [modalSharedWithIds, setModalSharedWithIds] = useState<string[]>([]);
  const [checklistSubTab, setChecklistSubTab] = useState<"given" | "received">("given");
  const [newChecklistModalOpen, setNewChecklistModalOpen] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newChecklistFrequency, setNewChecklistFrequency] = useState<"daily" | "weekly" | "monthly" | "quarterly" | "yearly">("daily");
  const [newChecklistWeeklyDay, setNewChecklistWeeklyDay] = useState(1); // 0=Sun, 1=Mon...
  const [newChecklistMonthlyDay, setNewChecklistMonthlyDay] = useState(1);
  const [newChecklistAssignedTo, setNewChecklistAssignedTo] = useState("");
  const [newChecklistDisableComments, setNewChecklistDisableComments] = useState(false);
  const [newChecklistInitialItems, setNewChecklistInitialItems] = useState<string[]>([""]);
  const [newChecklistDailyTime, setNewChecklistDailyTime] = useState("09:00");
  const [newChecklistAssignPickerOpen, setNewChecklistAssignPickerOpen] = useState(false);
  const [newChecklistAssignSearch, setNewChecklistAssignSearch] = useState("");
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

  const addQuickAddAttachment = (file: File, type: TaskAttachment["type"]) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setQuickAddAttachments((prev) => [
        ...prev,
        { id: generateUUID(), type, url, name: file.name, createdAt: Date.now() },
      ]);
    };
    reader.readAsDataURL(file);
  };

  /** First line or full text is the task title */
  const handleQuickAdd = (kind: "given" | "received") => {
    const raw = quickAddText.trim();
    if (!raw) return;
    const title = raw.includes("\n") ? raw.split("\n")[0].trim() || raw : raw;
    const dueDateMs = quickAddDueDate ? new Date(quickAddDueDate).getTime() : undefined;
    const payload = {
      title,
      otherParty: "—",
      checklist: [],
      done: false,
      creatorId: currentUserId,
      priority: quickAddPriority,
      ...(dueDateMs && { dueDate: dueDateMs }),
      ...(quickAddNoComments && { comments: [] }),
      ...(quickAddAttachments.length > 0 && { attachments: quickAddAttachments }),
    };
    if (kind === "given") addGivenTask(payload);
    else addReceivedTask(payload);
    setQuickAddText("");
    setQuickAddDueDate(null);
    setQuickAddPriority("low");
    setQuickAddNoComments(false);
    setQuickAddAttachments([]);
  };

  const [quickAddDatePickerOpen, setQuickAddDatePickerOpen] = useState(false);

  /** True if selected date falls within the next 7 days (for input border) */
  const isQuickAddDueNextWeek = quickAddDueDate
    ? (() => {
        const d = new Date(quickAddDueDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return d >= now && d <= in7;
      })()
    : false;

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

  const givenChecklists = viewChecklists.filter((c) => c.createdBy === currentUserId);
  const receivedChecklists = viewChecklists.filter((c) => c.assignedTo === currentUserId);
  const viewChecklistsFiltered = checklistSubTab === "given" ? givenChecklists : receivedChecklists;

  const handleCreateChecklist = () => {
    const title = newChecklistTitle.trim();
    if (!title || !currentUserId) return;
    const assignedTo = isFounder && newChecklistAssignedTo.trim() ? newChecklistAssignedTo.trim() : currentUserId;
    const items = newChecklistInitialItems
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({ id: generateUUID(), text, isDone: false, weight: 1 }));
    addChecklist({
      title,
      frequency: newChecklistFrequency,
      items,
      assignedTo,
      createdBy: currentUserId,
      disableComments: newChecklistDisableComments,
    });
    setNewChecklistTitle("");
    setNewChecklistAssignedTo("");
    setNewChecklistDisableComments(false);
    setNewChecklistInitialItems([""]);
    setNewChecklistModalOpen(false);
  };

  const combinedMeetingsEvents = [
    ...activeMeetings.map((m) => ({ ...m, type: "meeting" as const })),
    ...activeEvents.map((e) => ({ ...e, type: "event" as const })),
  ].sort((a, b) => a.startAt - b.startAt);

  if (boardLoading) return <SkeletonBoard />;

  const boardHeader = (
    <>
      <div className="px-3 py-2 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2 max-w-md mx-auto bg-white border border-gray-100 rounded-sm pl-3 pr-3 py-2 min-h-[40px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2} />
          <input
            type="text"
            value={folderSearchQuery}
            onChange={(e) => setFolderSearchQuery(e.target.value)}
            placeholder={locale === "he" ? "חיפוש בלוח..." : "Search board..."}
            className="flex-1 min-w-0 bg-transparent text-sm font-medium text-gray-900 placeholder-slate-400 outline-none"
          />
        </div>
      </div>
      <div className="flex gap-0 p-1 border-b border-gray-100 bg-white overflow-x-auto scrollbar-hide">
        {MAIN_CATEGORIES.filter((c) => c.id !== "checklists").map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMainTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
              mainTab === id ? "bg-[#008080] text-white" : "text-slate-600 bg-transparent hover:bg-gray-50 border border-transparent"
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
    <PanelWrapper header={boardHeader} className="w-full bg-white border border-gray-100 rounded-sm">
      <div className="p-3 bg-white min-h-full">
        {mainTab === "tasks" && (
          <>
            {/* Task sub-tabs: GIVEN | RECEIVED | Checklist button */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex gap-0 p-0.5 rounded-sm border border-gray-100 bg-white">
                <button
                  type="button"
                  onClick={() => setTaskSubTab("given")}
                  className={`px-4 py-2.5 rounded-sm text-sm font-semibold uppercase tracking-wide transition-all duration-150 ${
                    taskSubTab === "given" ? "bg-[#008080] text-white" : "text-slate-600 hover:text-gray-900 bg-transparent hover:bg-gray-50"
                  }`}
                >
                  {t(locale, "board.tasksGiven")}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskSubTab("received")}
                  className={`px-4 py-2.5 rounded-sm text-sm font-semibold uppercase tracking-wide transition-all duration-150 ${
                    taskSubTab === "received" ? "bg-[#008080] text-white" : "text-slate-600 hover:text-gray-900 bg-transparent hover:bg-gray-50"
                  }`}
                >
                  {t(locale, "board.tasksReceived")}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMainTab("checklists")}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-sm border border-gray-100 bg-white text-slate-600 hover:border-gray-200 hover:text-[#008080] text-sm font-semibold transition-all duration-150"
                aria-label={locale === "he" ? "רשימות" : "Checklists"}
              >
                <ListTodo className="w-4 h-4" />
                <Plus className="w-3 h-3" />
                {locale === "he" ? "רשימות" : "Checklists"}
              </button>
            </div>

            {/* Minimalist task creation: clean white input + action row */}
            <div
              className={`mb-4 rounded-sm border bg-white transition-all duration-150 ${
                isQuickAddDueNextWeek ? "border-amber-300" : "border-gray-100 focus-within:border-[#008080] focus-within:ring-1 focus-within:ring-[#008080]/15"
              }`}
            >
              <textarea
                value={quickAddText}
                onChange={(e) => setQuickAddText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleQuickAdd(taskSubTab);
                  }
                }}
                placeholder={locale === "he" ? "משימה חדשה..." : "New task..."}
                rows={2}
                className="w-full min-h-[52px] max-h-24 px-4 py-3 rounded-t-sm bg-white text-gray-900 placeholder-slate-400 text-sm font-medium resize-none border-0 focus:ring-0 focus:outline-none"
              />
              <div className="flex items-center justify-between gap-1 px-2 py-2 border-t border-gray-100 rounded-b-sm bg-white">
                <div className="flex items-center gap-0.5">
                  {/* Priority dots: high=red, medium=amber, low=Ollin green (default) */}
                  {(["high", "medium", "low"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setQuickAddPriority(quickAddPriority === p ? "low" : p)}
                      className={`w-6 h-6 rounded-sm flex items-center justify-center transition-all duration-150 ${
                        quickAddPriority === p
                          ? p === "high"
                            ? "bg-red-500"
                            : p === "medium"
                              ? "bg-amber-500"
                              : "bg-[#008080]"
                          : "bg-gray-100 hover:bg-gray-200 border border-transparent"
                      }`}
                      title={p === "high" ? "High" : p === "medium" ? "Medium" : "Low"}
                      aria-label={p === "high" ? "High priority" : p === "medium" ? "Medium priority" : "Low priority"}
                    >
                      <span className="sr-only">{p}</span>
                    </button>
                  ))}
                  <span className="w-px h-4 bg-gray-100 mx-1" aria-hidden />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setQuickAddDatePickerOpen((o) => !o)}
                      className={`p-1.5 rounded-sm transition-all duration-150 ${quickAddDueDate ? "text-[#008080]" : "text-slate-400 hover:text-[#008080]"}`}
                      title={locale === "he" ? "תאריך" : "Date"}
                      aria-label="Pick date"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    {quickAddDatePickerOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setQuickAddDatePickerOpen(false)} aria-hidden />
                        <div className="absolute left-0 bottom-full mb-1 z-20 p-2 rounded-sm bg-white border border-gray-100 shadow-lg">
                          <input
                            type="date"
                            value={quickAddDueDate ?? ""}
                            onChange={(e) => {
                              setQuickAddDueDate(e.target.value || null);
                              setQuickAddDatePickerOpen(false);
                            }}
                            className="text-sm font-medium border border-gray-100 rounded-sm px-2 py-1.5 text-gray-900"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => quickAddFileRef.current?.click()}
                    className={`p-1.5 rounded-sm transition-all duration-150 ${quickAddAttachments.some((a) => a.type === "file") ? "text-[#008080]" : "text-slate-400 hover:text-[#008080]"}`}
                    title={locale === "he" ? "מסמכים" : "Documents"}
                    aria-label="Attach document"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    ref={quickAddFileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) for (let i = 0; i < files.length; i++) addQuickAddAttachment(files[i], "file");
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => quickAddImageRef.current?.click()}
                    className={`p-1.5 rounded-sm transition-all duration-150 ${quickAddAttachments.some((a) => a.type === "image") ? "text-[#008080]" : "text-slate-400 hover:text-[#008080]"}`}
                    title={locale === "he" ? "תמונה" : "Image"}
                    aria-label="Attach image"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  <input
                    ref={quickAddImageRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) for (let i = 0; i < files.length; i++) addQuickAddAttachment(files[i], "image");
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => quickAddCameraRef.current?.click()}
                    className={`p-1.5 rounded-sm transition-all duration-150 ${quickAddAttachments.some((a) => a.type === "camera") ? "text-[#008080]" : "text-slate-400 hover:text-[#008080]"}`}
                    title={locale === "he" ? "מצלמה" : "Camera"}
                    aria-label="Take photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={quickAddCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) addQuickAddAttachment(file, "camera");
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {}}
                    className="p-1.5 rounded-sm text-slate-400 hover:text-[#008080] transition-all duration-150"
                    title={locale === "he" ? "קול" : "Voice"}
                    aria-label="Voice"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAddNoComments((c) => !c)}
                    className={`p-1.5 rounded-sm transition-all duration-150 ${quickAddNoComments ? "text-[#008080]" : "text-slate-400 hover:text-[#008080]"}`}
                    title={locale === "he" ? "ללא תגובות" : "No comments"}
                    aria-label="No comments"
                    aria-pressed={quickAddNoComments}
                  >
                    <MessageCircleOff className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(taskSubTab)}
                  className="p-2 rounded-sm bg-[#008080] text-white hover:bg-[#006666] transition-all duration-150 flex items-center justify-center border-0"
                  aria-label={locale === "he" ? "שלח משימה" : "Add task"}
                >
                  <Send className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-white text-[#008080] text-sm font-semibold border border-gray-100 hover:border-[#008080]/30"
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
                className="px-4 py-2.5 rounded-sm border border-gray-100 bg-[#008080] text-white text-sm font-semibold flex items-center gap-1"
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
            <button
              type="button"
              onClick={() => setMainTab("tasks")}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#008080] font-medium mb-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {locale === "he" ? "חזרה למשימות" : "Back to Tasks"}
            </button>
            {/* GIVEN / RECEIVED toggle - same style as Tasks view */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-0 p-0.5 rounded-sm border border-gray-100 bg-white">
                <button
                  type="button"
                  onClick={() => setChecklistSubTab("given")}
                  className={`px-4 py-2.5 rounded-sm text-sm font-semibold uppercase tracking-wide transition-all duration-150 ${
                    checklistSubTab === "given" ? "bg-[#008080] text-white" : "text-slate-600 hover:text-gray-900 bg-transparent hover:bg-gray-50"
                  }`}
                >
                  {t(locale, "board.tasksGiven")}
                </button>
                <button
                  type="button"
                  onClick={() => setChecklistSubTab("received")}
                  className={`px-4 py-2.5 rounded-sm text-sm font-semibold uppercase tracking-wide transition-all duration-150 ${
                    checklistSubTab === "received" ? "bg-[#008080] text-white" : "text-slate-600 hover:text-gray-900 bg-transparent hover:bg-gray-50"
                  }`}
                >
                  {t(locale, "board.tasksReceived")}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setNewChecklistModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-sm border border-gray-100 bg-[#008080] text-white text-sm font-semibold hover:bg-[#006666] transition-all duration-150"
                aria-label={locale === "he" ? "רשימה חדשה" : "New checklist"}
              >
                <ListTodo className="w-4 h-4" />
                <Plus className="w-3 h-3" />
                {locale === "he" ? "רשימה חדשה" : "New Checklist"}
              </button>
            </div>
            {/* New Checklist modal - premium, reordered flow */}
            {newChecklistModalOpen && (() => {
              const assignableContacts: { id: string; name: string; email: string; userId: string; avatar?: string }[] = [
                ...(currentUserId && profile?.name ? [{ id: "me", name: profile.name, email: profile?.email ?? "", userId: currentUserId }] : []),
                ...contacts.filter((c): c is Contact & { userId: string } => !!c.userId).map((c) => ({ id: c.id, name: c.name, email: c.email, userId: c.userId!, avatar: c.avatar })),
              ];
              const filteredAssignable = newChecklistAssignSearch.trim()
                ? assignableContacts.filter((c) => c.name.toLowerCase().includes(newChecklistAssignSearch.toLowerCase()))
                : assignableContacts;
              const selectedContact = assignableContacts.find((c) => c.userId === newChecklistAssignedTo);
              return (
                <>
                  <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" onClick={() => { setNewChecklistModalOpen(false); setNewChecklistAssignPickerOpen(false); }} aria-hidden />
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                      className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-sm bg-white border border-gray-100 shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{locale === "he" ? "רשימה חדשה" : "New Checklist"}</h2>
                        <button type="button" onClick={() => setNewChecklistModalOpen(false)} className="p-2 rounded-sm text-slate-400 hover:text-gray-900 transition-colors" aria-label="Close">
                          <X className="w-5 h-5" strokeWidth={2} />
                        </button>
                      </div>

                      {/* 1. Top: Checklist name */}
                      <div className="px-6 pt-6">
                        <input
                          type="text"
                          value={newChecklistTitle}
                          onChange={(e) => setNewChecklistTitle(e.target.value)}
                          placeholder={locale === "he" ? "שם הרשימה" : "Checklist name"}
                          className="w-full px-4 py-3.5 rounded-sm border border-gray-100 bg-white text-gray-900 placeholder-slate-400 text-base font-semibold focus:ring-1 focus:ring-[#008080]/20 focus:border-[#008080]/40 transition-all"
                        />
                      </div>

                      {/* 2. Middle: Item list with dividers + add input + Add another task button */}
                      <div className="px-6 pt-8">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{locale === "he" ? "פריטים" : "Items"}</p>
                        {newChecklistInitialItems.filter(Boolean).length > 0 ? (
                          <ul className="border border-gray-100 rounded-sm divide-y divide-gray-100 overflow-hidden">
                            {newChecklistInitialItems.map((item, idx) =>
                              !item.trim() ? null : (
                                <li key={idx} className="flex items-center justify-between gap-2 px-4 py-3 bg-white">
                                  <span className="text-sm font-medium text-gray-900 truncate">{item}</span>
                                  <button type="button" onClick={() => setNewChecklistInitialItems((prev) => prev.filter((_, i) => i !== idx))} className="p-1 rounded-sm hover:bg-gray-50 text-slate-400 hover:text-gray-700 transition-colors shrink-0" aria-label="Remove">
                                    <X className="w-4 h-4" strokeWidth={2} />
                                  </button>
                                </li>
                              )
                            )}
                          </ul>
                        ) : null}
                        <input
                          type="text"
                          placeholder={locale === "he" ? "הוסף פריט..." : "Add item..."}
                          className="w-full mt-2 px-4 py-3 rounded-sm border border-gray-100 bg-white text-sm text-gray-900 placeholder-slate-400 focus:ring-1 focus:ring-[#008080]/20 focus:border-[#008080]/40 transition-all"
                          onKeyDown={(e) => {
                            const v = (e.target as HTMLInputElement).value.trim();
                            if (e.key === "Enter" && v) { setNewChecklistInitialItems((prev) => [...prev.filter(Boolean), v]); (e.target as HTMLInputElement).value = ""; }
                            }}
                          onBlur={(e) => {
                            const v = (e.target as HTMLInputElement).value.trim();
                            if (v) { setNewChecklistInitialItems((prev) => [...prev.filter(Boolean), v]); (e.target as HTMLInputElement).value = ""; }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => (document.querySelector('[placeholder*="Add item"], [placeholder*="הוסף פריט"]') as HTMLInputElement)?.focus()}
                          className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3.5 rounded-sm border border-gray-100 bg-white text-slate-600 text-sm font-semibold hover:border-gray-200 hover:text-gray-900 transition-colors"
                        >
                          <Plus className="w-4 h-4" strokeWidth={2.5} />
                          {locale === "he" ? "הוסף משימה נוספת" : "Add another task"}
                        </button>
                      </div>

                      {/* 3. Bottom: Settings (Recurrence, Assignment, Comments) */}
                      <div className="px-6 pt-8 space-y-6">
                        <div>
                          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">
                            <Clock className="w-4 h-4 text-blue-600" strokeWidth={2} />
                            {locale === "he" ? "חזרה" : "Recurrence"}
                          </p>
                          <div className="flex gap-0 p-0.5 rounded-sm border border-gray-100 bg-white" role="group">
                            {(["daily", "weekly", "monthly"] as const).map((freq) => (
                              <button
                                key={freq}
                                type="button"
                                onClick={() => setNewChecklistFrequency(freq)}
                                className={`flex-1 py-3 rounded-sm text-sm font-bold transition-all ${
                                  newChecklistFrequency === freq ? "bg-[#008080] text-white" : "text-slate-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                              >
                                {freq === "daily" ? (locale === "he" ? "יומי" : "Daily") : freq === "weekly" ? (locale === "he" ? "שבועי" : "Weekly") : locale === "he" ? "חודשי" : "Monthly"}
                              </button>
                            ))}
                          </div>
                          {newChecklistFrequency === "daily" && (
                            <div className="mt-3 flex items-center gap-3">
                              <Clock className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2} />
                              <input
                                type="time"
                                value={newChecklistDailyTime}
                                onChange={(e) => setNewChecklistDailyTime(e.target.value)}
                                className="flex-1 px-4 py-3 rounded-sm border border-gray-100 bg-white text-base font-semibold text-gray-900 focus:ring-1 focus:ring-[#008080]/20 focus:border-[#008080]/40"
                              />
                            </div>
                          )}
                          {newChecklistFrequency === "weekly" && (
                            <div className="mt-3 grid grid-cols-7 gap-1">
                              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => setNewChecklistWeeklyDay(d)}
                                  className={`py-2.5 rounded-sm text-xs font-bold transition-all ${
                                    newChecklistWeeklyDay === d ? "bg-[#008080] text-white" : "bg-white text-slate-600 hover:bg-gray-50 border border-gray-100"
                                  }`}
                                >
                                  {new Date(2025, 0, 5 + d).toLocaleDateString(locale === "he" ? "he" : "en", { weekday: "narrow" })}
                                </button>
                              ))}
                            </div>
                          )}
                          {newChecklistFrequency === "monthly" && (
                            <div className="mt-3 grid grid-cols-7 gap-1">
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => setNewChecklistMonthlyDay(day)}
                                  className={`py-2 rounded-sm text-xs font-bold transition-all ${
                                    newChecklistMonthlyDay === day ? "bg-[#008080] text-white" : "bg-white text-slate-600 hover:bg-gray-50 border border-gray-100"
                                  }`}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {isFounder && (
                          <div>
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                              <User className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                              {locale === "he" ? "הוקצה ל" : "Assign to"}
                            </p>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setNewChecklistAssignPickerOpen((o) => !o)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-sm bg-white border border-gray-100 text-left focus:ring-1 focus:ring-[#008080]/20 focus:border-[#008080]/40 transition-all"
                              >
                                {selectedContact ? (
                                  <>
                                    <UserAvatar name={selectedContact.name} email={selectedContact.email} imageUrl={selectedContact.avatar} size="md" className="flex-shrink-0 ring-2 ring-[#008080]/20 rounded-sm" />
                                    <span className="text-sm font-bold text-gray-900 truncate">{selectedContact.name}</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                    <span className="text-sm font-medium text-gray-500">{locale === "he" ? "בחר משתמש" : "Select user"}</span>
                                  </>
                                )}
                              </button>
                              {newChecklistAssignPickerOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1 py-2 rounded-sm bg-white border border-gray-100 shadow-lg max-h-64 overflow-y-auto z-10">
                                  <div className="px-3 pb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-white border border-gray-100">
                                      <Search className="w-4 h-4 text-gray-500" strokeWidth={2} />
                                      <input
                                        type="text"
                                        value={newChecklistAssignSearch}
                                        onChange={(e) => setNewChecklistAssignSearch(e.target.value)}
                                        placeholder={locale === "he" ? "חיפוש..." : "Search..."}
                                        className="flex-1 min-w-0 bg-transparent text-sm font-medium text-gray-900 placeholder-gray-400 outline-none"
                                      />
                                    </div>
                                  </div>
                                  <ul className="py-1">
                                    {filteredAssignable.map((c) => (
                                      <li key={c.userId}>
                                        <button
                                          type="button"
                                          onClick={() => { setNewChecklistAssignedTo(c.userId); setNewChecklistAssignPickerOpen(false); setNewChecklistAssignSearch(""); }}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/80 border-b border-gray-100 last:border-0 transition-colors"
                                        >
                                          <UserAvatar name={c.name} email={c.email} imageUrl={c.avatar} size="md" className="flex-shrink-0 ring-2 ring-gray-200 rounded-sm" />
                                          <span className="text-sm font-bold text-gray-900 truncate">{c.name}</span>
                                        </button>
                                      </li>
                                    ))}
                                    {filteredAssignable.length === 0 && <li className="px-4 py-3 text-sm font-medium text-gray-400">{locale === "he" ? "אין תוצאות" : "No results"}</li>}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <label className="flex items-center gap-3 cursor-pointer py-2">
                          <MessageCircleOff className="w-4 h-4 text-slate-400" strokeWidth={2} />
                          <input
                            type="checkbox"
                            checked={newChecklistDisableComments}
                            onChange={(e) => setNewChecklistDisableComments(e.target.checked)}
                            className="rounded-sm border-gray-300 text-[#008080] focus:ring-[#008080] w-4 h-4"
                          />
                          <span className="text-sm font-semibold text-gray-700">{locale === "he" ? "השבת תגובות" : "Disable comments"}</span>
                        </label>
                      </div>

                      <div className="px-6 py-5 flex justify-end gap-3 border-t border-gray-100 mt-6">
                        <button type="button" onClick={() => setNewChecklistModalOpen(false)} className="px-5 py-3 rounded-sm text-sm font-semibold text-slate-600 hover:text-gray-900 border border-gray-100 hover:bg-gray-50 transition-colors">
                          {locale === "he" ? "ביטול" : "Cancel"}
                        </button>
                        <button type="button" onClick={handleCreateChecklist} className="px-5 py-3 rounded-sm bg-[#008080] text-white text-sm font-semibold hover:bg-[#006666] transition-colors">
                          {locale === "he" ? "צור רשימה" : "Create"}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
            <div className="space-y-4">
              {viewChecklistsFiltered.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  {checklistSubTab === "given"
                    ? (locale === "he" ? "אין רשימות שיצרת." : "No checklists you created.")
                    : (locale === "he" ? "אין רשימות שהוקצו אליך." : "No checklists assigned to you.")}
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
                    const group = viewChecklistsFiltered.filter((cl) => cl.frequency === id);
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
                            <div className="w-32 h-1.5 bg-gray-100 rounded-sm">
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
                className="px-4 py-2.5 rounded-sm border border-gray-100 bg-[#008080] text-white text-sm font-semibold flex items-center gap-1"
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
              className="flex items-center gap-3 w-full px-4 py-3 rounded-sm bg-white border border-gray-100 text-left hover:bg-gray-50/80"
            >
              <Wallet className="w-5 h-5 text-[#008080] shrink-0" />
              <span className="font-medium text-gray-900">{locale === "he" ? "חשבוניות" : "Invoices"}</span>
            </Link>
            <Link
              href="/dashboard/finances/clients"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-sm bg-white border border-gray-100 text-left hover:bg-gray-50/80"
            >
              <Users className="w-5 h-5 text-[#008080] shrink-0" />
              <span className="font-medium text-gray-900">{locale === "he" ? "לקוחות / ח.פ" : "Clients / H.P"}</span>
            </Link>
            <Link
              href="/dashboard/finances/company-profile"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-sm bg-white border border-gray-100 text-left hover:bg-gray-50/80"
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
                <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-white">
                  <div className="flex-1 min-w-0 flex items-center gap-2 bg-white border border-gray-100 rounded-sm pl-3 pr-3 py-2.5 min-h-[40px]">
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
                    className="flex items-center justify-center w-10 h-10 rounded-sm bg-[#008080] text-white hover:bg-[#006666] transition-all duration-150 shrink-0"
                    title={locale === "he" ? "תיקייה חדשה" : "New Folder"}
                    aria-label={locale === "he" ? "תיקייה חדשה" : "New Folder"}
                  >
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                  </button>
                  <div className="flex items-center rounded-sm border border-gray-100 bg-white p-0.5 shrink-0" role="group" aria-label={locale === "he" ? "מצב תצוגה" : "View mode"}>
                    <button
                      type="button"
                      onClick={() => setFolderViewMode("grid")}
                      className={`p-2 rounded-sm transition-all duration-150 ${folderViewMode === "grid" ? "bg-slate-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                      title={locale === "he" ? "תצוגת רשת" : "Grid view"}
                      aria-pressed={folderViewMode === "grid"}
                    >
                      <LayoutGrid className="w-4 h-4" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFolderViewMode("list")}
                      className={`p-2 rounded-sm transition-all duration-150 ${folderViewMode === "list" ? "bg-slate-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
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
                        className="flex flex-col items-center justify-center p-4 rounded-sm bg-white hover:bg-gray-50 transition-all duration-150 border border-gray-100"
                        title={locale === "he" ? "תיקיית מערכת (נעולה)" : "System folder (locked)"}
                      >
                        <div className="w-12 h-12 rounded-sm bg-slate-600 flex items-center justify-center mb-2">
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
                    {SYSTEM_FOLDERS.filter((f) => !folderSearchQuery.trim() || (locale === "he" ? f.labelHe : f.labelEn).toLowerCase().includes(folderSearchQuery.trim().toLowerCase())).map(({ id, labelEn, labelHe, icon: Icon }) => (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => setInsideFolderId(id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                          title={locale === "he" ? "תיקיית מערכת (נעולה)" : "System folder (locked)"}
                        >
                          <div className="w-9 h-9 rounded-sm bg-slate-600 flex items-center justify-center shrink-0">
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
              /* Inside folder: full-page content + Back button */
              <>
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setInsideFolderId(null)}
                    className="p-2 rounded-sm text-slate-500 hover:text-gray-900 hover:bg-gray-50 flex items-center gap-1 transition-all duration-150"
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
                      <Link href="/dashboard/messages" className="inline-flex items-center gap-2 px-3 py-2 rounded-sm bg-[#008080] text-white text-xs font-bold">
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
                              <li key={task.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-sm bg-white border border-gray-100">
                                <span className="text-sm font-semibold text-gray-900 truncate">{task.title || "—"}</span>
                                <button type="button" onClick={() => unarchiveGivenTask(task.id)} className="px-2.5 py-1.5 rounded-sm text-xs font-semibold bg-[#008080] text-white hover:bg-[#006666]">{locale === "he" ? "החזר" : "Restore"}</button>
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
                                <button type="button" onClick={() => unarchiveReceivedTask(task.id)} className="px-2.5 py-1.5 rounded-sm text-xs font-semibold bg-[#008080] text-white hover:bg-[#006666]">{locale === "he" ? "החזר" : "Restore"}</button>
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
                                <button type="button" onClick={() => unarchiveMeeting(m.id)} className="px-2.5 py-1.5 rounded-sm text-xs font-semibold bg-[#008080] text-white hover:bg-[#006666]">{locale === "he" ? "החזר" : "Restore"}</button>
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
                                <button type="button" onClick={() => unarchiveEvent(e.id)} className="px-2.5 py-1.5 rounded-sm text-xs font-semibold bg-[#008080] text-white hover:bg-[#006666]">{locale === "he" ? "החזר" : "Restore"}</button>
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
          contacts={contacts}
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
              className="w-full max-w-md rounded-sm bg-white border border-gray-100 shadow-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">{locale === "he" ? "תיקייה חדשה" : "New Folder"}</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{locale === "he" ? "שם תיקייה" : "Folder name"}</label>
                  <input
                    type="text"
                    value={modalFolderName}
                    onChange={(e) => setModalFolderName(e.target.value)}
                    placeholder={locale === "he" ? "הזן שם תיקייה" : "Enter folder name"}
                    className="w-full px-4 py-2.5 rounded-sm border border-gray-100 bg-white text-gray-900 placeholder-slate-400 text-sm font-medium focus:ring-1 focus:ring-[#008080]/20 focus:border-[#008080]/40 outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{locale === "he" ? "שתף עם..." : "Share with..."}</label>
                  <div className="max-h-32 overflow-y-auto rounded-sm border border-gray-100 bg-white p-2 space-y-1">
                    {contacts.length === 0 ? (
                      <p className="text-xs text-gray-500 py-2 px-2">{locale === "he" ? "אין אנשי קשר. הוסף אנשי קשר להזמנה." : "No contacts. Add contacts to invite."}</p>
                    ) : (
                      contacts.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 py-2 px-2 rounded-sm hover:bg-gray-100 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={modalSharedWithIds.includes(c.id)}
                            onChange={() => toggleModalShareContact(c.id)}
                            className="rounded-sm border-gray-300 text-[#008080] focus:ring-[#008080]"
                          />
                          <span className="text-sm font-medium text-gray-800 truncate">{c.name || c.email || c.id}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateFolderModalOpen(false)}
                  className="px-4 py-2.5 rounded-sm border border-gray-100 text-slate-600 text-sm font-semibold hover:bg-gray-50"
                >
                  {locale === "he" ? "ביטול" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleCreateFolderFromModal}
                  disabled={!modalFolderName.trim()}
                  className="px-4 py-2.5 rounded-sm bg-[#008080] text-white text-sm font-semibold hover:bg-[#006666] disabled:opacity-50 disabled:pointer-events-none"
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
