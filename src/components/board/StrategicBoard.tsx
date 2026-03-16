"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { t } from "@/lib/translations";
import { generateUUID } from "@/lib/uuid";
import { PanelWrapper } from "@/components/dashboard/PanelWrapper";
import { useBoard } from "@/contexts/BoardContext";
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
  MessageSquare,
  MessageCircleOff,
  Building2,
  Search,
  ChevronLeft,
  Mic,
  ImagePlus,
  Send,
  Paperclip,
  Camera,
  X,
  Clock,
  User,
  Lock,
} from "lucide-react";
import { UserSelector, buildInternalUsers } from "./UserSelector";
import { calculateTotalBalance, type OllinFinanceEntry } from "@/lib/finance-types";
import type { TranslationKey } from "@/lib/translations";
import type { BoardTask, TaskAttachment } from "@/lib/board-types";

type MainCategory = "tasks" | "calendar" | "meetings" | "checklists" | "events";
type TaskSubTab = "given" | "received";

const MAIN_CATEGORY_IDS: MainCategory[] = ["tasks", "calendar", "meetings", "checklists", "events"];
function isValidMainCategory(t: string | null | undefined): t is MainCategory {
  return t != null && MAIN_CATEGORY_IDS.includes(t as MainCategory);
}

type StrategicBoardProps = {
  locale: "en" | "he";
  onBack?: () => void;
  initialMainTab?: string | null;
};

const MAIN_CATEGORIES: { id: MainCategory; labelKey: TranslationKey; icon: typeof ListTodo }[] = [
  { id: "tasks", labelKey: "board.tasks", icon: ListTodo },
  { id: "calendar", labelKey: "board.calendar", icon: Calendar },
  { id: "meetings", labelKey: "board.meetings", icon: Users },
  { id: "checklists", labelKey: "board.checklists", icon: ClipboardList },
  { id: "events", labelKey: "board.events", icon: CalendarDays },
];

/** Task date key for grouping: "today" | "yesterday" | ISO date string */
function getTaskDateKey(task: BoardTask): string {
  const ts = task.dueDate ?? task.createdAt;
  const d = new Date(ts);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (dayStart === todayStart) return "today";
  if (dayStart === yesterdayStart) return "yesterday";
  return d.toISOString().slice(0, 10);
}

function getTaskDateLabel(key: string, locale: "en" | "he"): string {
  if (key === "today") return locale === "he" ? "היום" : "Today";
  if (key === "yesterday") return locale === "he" ? "אתמול" : "Yesterday";
  const d = new Date(key);
  return d.toLocaleDateString(locale === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
}

/** Order date keys: today first, yesterday, then chronological */
function orderDateKeys(keys: string[]): string[] {
  const rest = keys.filter((k) => k !== "today" && k !== "yesterday").sort();
  const out: string[] = [];
  if (keys.includes("today")) out.push("today");
  if (keys.includes("yesterday")) out.push("yesterday");
  return [...out, ...rest];
}

export function StrategicBoard({ locale, onBack, initialMainTab }: StrategicBoardProps) {
  const [mainTab, setMainTab] = useState<MainCategory>(() => (isValidMainCategory(initialMainTab) ? initialMainTab : "tasks"));
  useEffect(() => {
    if (isValidMainCategory(initialMainTab)) setMainTab(initialMainTab);
  }, [initialMainTab]);
  const [taskSubTab, setTaskSubTab] = useState<TaskSubTab>("given");
  const [quickAddText, setQuickAddText] = useState("");
  const [quickAddDueDate, setQuickAddDueDate] = useState<string | null>(null);
  const [quickAddPriority, setQuickAddPriority] = useState<"low" | "medium" | "high">("low");
  const [quickAddNoComments, setQuickAddNoComments] = useState(false);
  const [quickAddAttachments, setQuickAddAttachments] = useState<TaskAttachment[]>([]);
  const [quickAddAssigneeIds, setQuickAddAssigneeIds] = useState<string[]>([]);
  const [quickAddDueTime, setQuickAddDueTime] = useState<string>("09:00");
  const [quickAddAttachMenuOpen, setQuickAddAttachMenuOpen] = useState(false);
  const [quickAddUserPickerOpen, setQuickAddUserPickerOpen] = useState(false);
  const [quickAddDuePickerOpen, setQuickAddDuePickerOpen] = useState(false);
  const [quickAddChecklistMode, setQuickAddChecklistMode] = useState(false);
  const [quickAddChecklistItems, setQuickAddChecklistItems] = useState<string[]>([""]);
  const [quickAddExpanded, setQuickAddExpanded] = useState(false);
  const [quickAddPlaceholderStep, setQuickAddPlaceholderStep] = useState(0);
  const quickAddCardRef = useRef<HTMLDivElement>(null);
  const quickAddTextareaRef = useRef<HTMLTextAreaElement>(null);
  const quickAddFileRef = useRef<HTMLInputElement>(null);
  const quickAddImageRef = useRef<HTMLInputElement>(null);
  const quickAddCameraRef = useRef<HTMLInputElement>(null);
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

  const sortedGiven = React.useMemo(() => {
    return [...activeGiven].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.dueDate ?? a.createdAt) - (b.dueDate ?? b.createdAt);
    });
  }, [activeGiven]);
  const sortedReceived = React.useMemo(() => {
    return [...activeReceived].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.dueDate ?? a.createdAt) - (b.dueDate ?? b.createdAt);
    });
  }, [activeReceived]);

  const groupedGiven = React.useMemo(() => {
    const map = new Map<string, BoardTask[]>();
    for (const task of sortedGiven) {
      const key = getTaskDateKey(task);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return orderDateKeys(Array.from(map.keys())).map((key) => ({ key, label: getTaskDateLabel(key, locale), tasks: map.get(key)! }));
  }, [sortedGiven, locale]);
  const groupedReceived = React.useMemo(() => {
    const map = new Map<string, BoardTask[]>();
    for (const task of sortedReceived) {
      const key = getTaskDateKey(task);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return orderDateKeys(Array.from(map.keys())).map((key) => ({ key, label: getTaskDateLabel(key, locale), tasks: map.get(key)! }));
  }, [sortedReceived, locale]);

  const activeMeetings = meetings.filter((m) => !m.archived);
  const activeEvents = events.filter((e) => !e.archived);
  const archivedGiven = given.filter((t) => t.archived);
  const archivedReceived = received.filter((t) => t.archived);
  const archivedMeetings = meetings.filter((m) => m.archived);
  const archivedEvents = events.filter((e) => e.archived);
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

  useEffect(() => {
    const closePopovers = (e: MouseEvent) => {
      const el = quickAddCardRef.current;
      if (el && !el.contains(e.target as Node)) {
        setQuickAddAttachMenuOpen(false);
        setQuickAddUserPickerOpen(false);
        setQuickAddDuePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", closePopovers);
    return () => document.removeEventListener("mousedown", closePopovers);
  }, []);

  useEffect(() => {
    if (quickAddExpanded && quickAddTextareaRef.current) {
      const t = setTimeout(() => quickAddTextareaRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [quickAddExpanded]);

  useEffect(() => {
    if (quickAddExpanded) return;
    const id = setInterval(() => {
      setQuickAddPlaceholderStep((s) => (s + 1) % 3);
    }, 500);
    return () => clearInterval(id);
  }, [quickAddExpanded]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const el = quickAddCardRef.current;
      if (!el || !quickAddExpanded) return;
      if (!el.contains(e.target as Node) && !quickAddText.trim()) {
        setQuickAddExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [quickAddExpanded, quickAddText]);

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

  const quickAddInternalUsers = useMemo(
    () =>
      buildInternalUsers(
        profile ? { userId: profile.userId, name: profile.name, email: profile.email, profileImage: (profile as { profileImage?: string }).profileImage } : null,
        contacts
      ),
    [profile, contacts]
  );

  /** Standard task: first line or full text is title. Checklist mode: title from first item, checklist from items. */
  const handleQuickAdd = (kind: "given" | "received") => {
    let title: string;
    let checklist: { id: string; label: string; done: boolean }[] = [];
    if (quickAddChecklistMode) {
      const nonEmpty = quickAddChecklistItems.map((s) => s.trim()).filter(Boolean);
      if (nonEmpty.length === 0) return;
      title = nonEmpty[0] || (locale === "he" ? "רשימה" : "Checklist");
      checklist = nonEmpty.map((label) => ({ id: generateUUID(), label, done: false }));
    } else {
      const raw = quickAddText.trim();
      if (!raw) return;
      title = raw.includes("\n") ? raw.split("\n")[0].trim() || raw : raw;
    }
    let dueDateMs: number | undefined;
    if (quickAddDueDate) {
      const dateTimeStr = `${quickAddDueDate}T${quickAddDueTime || "09:00"}`;
      dueDateMs = new Date(dateTimeStr).getTime();
    }
    const payload = {
      title,
      otherParty: "—",
      checklist,
      done: false,
      creatorId: currentUserId,
      priority: quickAddPriority,
      ...(dueDateMs && { dueDate: dueDateMs }),
      ...(quickAddNoComments && { comments: [] }),
      ...(quickAddAttachments.length > 0 && { attachments: quickAddAttachments }),
      ...(kind === "given" && quickAddAssigneeIds.length > 0 && { assigneeIds: quickAddAssigneeIds, assigneeUserId: quickAddAssigneeIds[0] }),
    };
    if (kind === "given") addGivenTask(payload);
    else addReceivedTask(payload);
    setQuickAddText("");
    setQuickAddChecklistMode(false);
    setQuickAddChecklistItems([""]);
    setQuickAddExpanded(false);
    setQuickAddDueDate(null);
    setQuickAddDueTime("09:00");
    setQuickAddPriority("low");
    setQuickAddNoComments(false);
    setQuickAddAttachments([]);
    setQuickAddAssigneeIds([]);
  };

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

  const viewChecklistsFiltered = viewChecklists;

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
      <div className="flex gap-0 border-b border-[var(--clean-border)] bg-white overflow-x-auto scrollbar-hide">
        {MAIN_CATEGORIES.filter((c) => c.id !== "checklists").map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMainTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-all duration-150 border-b-2 -mb-px ${
              mainTab === id
                ? "border-[var(--clean-accent)] text-[var(--clean-accent)]"
                : "border-transparent text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            {t(locale, labelKey)}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <PanelWrapper header={boardHeader} className="clean-app w-full bg-white min-h-full">
      <div className="p-3 min-h-full bg-white">
        {mainTab === "tasks" && (
          <>
            {/* Task sub-tabs: GIVEN | RECEIVED | CHECKLISTS (text only) */}
            <div className="flex flex-wrap items-center gap-6 mb-4">
              <button
                type="button"
                onClick={() => setTaskSubTab("given")}
                className={`px-0 py-2 text-[13px] font-medium tracking-wide border-b-2 -mb-px transition-all duration-150 ${
                  taskSubTab === "given"
                    ? "border-[var(--clean-accent)] text-[var(--clean-text)] font-semibold"
                    : "border-transparent text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)]"
                }`}
              >
                {locale === "he" ? "נתתי" : "Given"}
              </button>
              <button
                type="button"
                onClick={() => setTaskSubTab("received")}
                className={`px-0 py-2 text-[13px] font-medium tracking-wide border-b-2 -mb-px transition-all duration-150 ${
                  taskSubTab === "received"
                    ? "border-[var(--clean-accent)] text-[var(--clean-text)] font-semibold"
                    : "border-transparent text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)]"
                }`}
              >
                {locale === "he" ? "קיבלתי" : "Received"}
              </button>
              <button
                type="button"
                onClick={() => setMainTab("checklists")}
                className="px-0 py-2 text-[13px] font-medium tracking-wide border-b-2 -mb-px border-transparent text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)] transition-all duration-150"
              >
                {locale === "he" ? "רשימות משימות" : "Checklists"}
              </button>
            </div>

            {/* Task creation: elegant minimalist preview → smooth expansion to full block */}
            <div
              ref={quickAddCardRef}
              className={`mb-4 overflow-visible rounded-xl transition-all duration-300 ease-out ${
                quickAddExpanded
                  ? "bg-white border border-[var(--clean-border)] shadow-sm"
                  : "bg-[var(--clean-border)]/30 border border-[var(--clean-border)]/50"
              } ${isQuickAddDueNextWeek ? "border-amber-300" : ""}`}
            >
              {/* Collapsed: clear frame, left-aligned placeholder, subtle and quiet */}
              <button
                type="button"
                onClick={() => setQuickAddExpanded(true)}
                className={`w-full text-left flex items-center min-h-[52px] px-4 py-3 text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)] hover:bg-[var(--clean-border)]/20 border-0 bg-transparent transition-colors duration-200 ${!quickAddExpanded ? "rounded-xl" : "hidden"}`}
                aria-expanded={quickAddExpanded}
                aria-label={locale === "he" ? "משימה חדשה" : "New task"}
              >
                <span className="text-[13px] font-normal tracking-wide inline-block min-w-[10ch] transition-opacity duration-300">
                  {locale === "he"
                    ? (["משימה חדשה.", "משימה חדשה..", "משימה חדשה..."] as const)[quickAddPlaceholderStep]
                    : (["New Task.", "New Task..", "New Task..."] as const)[quickAddPlaceholderStep]}
                </span>
              </button>
              {/* Expanded: full form — same radius for seamless transition */}
              <div
                className="overflow-hidden transition-all duration-300 ease-out rounded-b-xl"
                style={{ maxHeight: quickAddExpanded ? "900px" : "0", opacity: quickAddExpanded ? 1 : 0 }}
              >
                {quickAddExpanded && (
                  <>
                    <div className="flex items-center justify-end px-2 pt-1.5 pb-0">
                      <button
                        type="button"
                        onClick={() => setQuickAddExpanded(false)}
                        className="p-1.5 text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)] rounded transition-colors"
                        aria-label={locale === "he" ? "סגור" : "Close"}
                      >
                        <ChevronLeft className="w-4 h-4 rotate-90" />
                      </button>
                    </div>
                    {/* Content area: task textarea or checklist line items + Checklist link */}
                    {quickAddChecklistMode ? (
                <div className="px-4 py-3 border-0 bg-white">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[12px] font-medium text-[var(--clean-text-secondary)]">
                      {locale === "he" ? "פריטי רשימה" : "List items"}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setQuickAddChecklistMode(false); setQuickAddChecklistItems([""]); }}
                      className="text-[12px] font-medium text-[var(--clean-accent)] hover:underline"
                    >
                      {locale === "he" ? "← משימה בודדת" : "← Single task"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {quickAddChecklistItems.map((item, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const next = [...quickAddChecklistItems];
                            next[i] = e.target.value;
                            setQuickAddChecklistItems(next);
                          }}
                          placeholder={locale === "he" ? `פריט ${i + 1}` : `Item ${i + 1}`}
                          className="flex-1 min-w-0 px-3 py-2 text-[13px] font-medium border border-[var(--clean-border)] rounded text-[var(--clean-text)] bg-white placeholder-[var(--clean-text-secondary)]"
                        />
                        <button
                          type="button"
                          onClick={() => setQuickAddChecklistItems((prev) => (prev.length <= 1 ? [""] : prev.filter((_, j) => j !== i)))}
                          className="p-2 text-[var(--clean-text-secondary)] hover:text-red-500 rounded border border-transparent hover:border-red-200"
                          aria-label={locale === "he" ? "הסר" : "Remove"}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setQuickAddChecklistItems((prev) => [...prev, ""])}
                      className="w-full py-2 text-[12px] font-medium text-[var(--clean-accent)] border border-dashed border-[var(--clean-border)] rounded hover:bg-[var(--clean-accent)]/5"
                    >
                      + {locale === "he" ? "הוסף פריט" : "Add item"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <textarea
                    ref={quickAddTextareaRef}
                    value={quickAddText}
                    onChange={(e) => setQuickAddText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleQuickAdd(taskSubTab);
                      }
                    }}
                    placeholder={locale === "he" ? "משימה חדשה..." : "New task..."}
                    rows={3}
                    className="w-full min-h-[56px] max-h-32 px-4 py-3 bg-transparent text-[var(--clean-text)] placeholder-[var(--clean-text-secondary)] text-[13px] font-medium resize-none border-0 focus:ring-0 focus:outline-none tracking-wide"
                  />
                  <div className="px-4 pb-2">
                    <button
                      type="button"
                      onClick={() => setQuickAddChecklistMode(true)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--clean-text-secondary)] hover:text-[var(--clean-accent)] transition-colors"
                    >
                      <ClipboardList className="w-3.5 h-3.5" strokeWidth={1.75} />
                      {locale === "he" ? "רשימת משימות" : "Checklist"}
                    </button>
                  </div>
                </>
              )}
              {/* Bottom toolbar: + | Select Users | Due Date | Mute | Send */}
              <div className="flex flex-wrap items-center gap-1 px-4 py-2.5 border-t border-[var(--clean-border)] bg-white">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setQuickAddAttachMenuOpen((o) => !o); setQuickAddUserPickerOpen(false); setQuickAddDuePickerOpen(false); }}
                    className={`p-2 rounded border border-[var(--clean-border)] transition-all duration-150 flex items-center justify-center ${
                      quickAddAttachments.length > 0 ? "text-[var(--clean-accent)] bg-[var(--clean-accent)]/10 border-[var(--clean-accent)]/40" : "text-[var(--clean-text-secondary)] hover:text-[var(--clean-accent)] hover:border-[#E2E8F0] bg-white"
                    }`}
                    aria-expanded={quickAddAttachMenuOpen}
                    aria-label={locale === "he" ? "צרף" : "Attach"}
                  >
                    <Plus className="w-4 h-4" strokeWidth={2} />
                  </button>
                  {quickAddAttachMenuOpen && (
                    <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 rounded border border-[var(--clean-border)] bg-white shadow-lg py-1 px-1 z-[9999]" style={{ position: "absolute" }}>
                      <button type="button" onClick={() => { quickAddImageRef.current?.click(); setQuickAddAttachMenuOpen(false); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-[var(--clean-text)] hover:bg-gray-100 rounded">
                        <ImagePlus className="w-3.5 h-3.5" /> {locale === "he" ? "תמונה" : "Photo"}
                      </button>
                      <button type="button" onClick={() => { quickAddCameraRef.current?.click(); setQuickAddAttachMenuOpen(false); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-[var(--clean-text)] hover:bg-gray-100 rounded">
                        <Camera className="w-3.5 h-3.5" /> {locale === "he" ? "מצלמה" : "Camera"}
                      </button>
                      <button type="button" onClick={() => { quickAddFileRef.current?.click(); setQuickAddAttachMenuOpen(false); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-[var(--clean-text)] hover:bg-gray-100 rounded">
                        <Paperclip className="w-3.5 h-3.5" /> {locale === "he" ? "קובץ" : "File"}
                      </button>
                    </div>
                  )}
                </div>
                <input ref={quickAddFileRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" multiple onChange={(e) => { const files = e.target.files; if (files) for (let i = 0; i < files.length; i++) addQuickAddAttachment(files[i], "file"); e.target.value = ""; }} />
                <input ref={quickAddImageRef} type="file" accept="image/*" className="hidden" multiple onChange={(e) => { const files = e.target.files; if (files) for (let i = 0; i < files.length; i++) addQuickAddAttachment(files[i], "image"); e.target.value = ""; }} />
                <input ref={quickAddCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) addQuickAddAttachment(file, "camera"); e.target.value = ""; }} />
                <span className="w-px h-5 bg-[var(--clean-border)]" aria-hidden />
                {taskSubTab === "given" && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setQuickAddUserPickerOpen((o) => !o); setQuickAddAttachMenuOpen(false); setQuickAddDuePickerOpen(false); }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded border text-[12px] font-medium transition-all duration-150 ${
                        quickAddAssigneeIds.length > 0
                          ? "border-[var(--clean-accent)]/50 text-[var(--clean-accent)] bg-[var(--clean-accent)]/5"
                          : "border-[var(--clean-border)] text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)] hover:border-[#E2E8F0] bg-white"
                      }`}
                      aria-expanded={quickAddUserPickerOpen}
                    >
                      {quickAddAssigneeIds.length > 0 ? (
                        <span className="flex items-center -space-x-1.5">
                          {quickAddInternalUsers
                            .filter((u) => quickAddAssigneeIds.includes(u.userId))
                            .map((u) => (
                              <UserAvatar
                                key={u.userId}
                                name={u.name}
                                email={u.email}
                                imageUrl={u.avatar}
                                size="sm"
                                className="ring-2 ring-white"
                              />
                            ))}
                        </span>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5" />
                          {locale === "he" ? "משתמש" : "Select User"}
                        </>
                      )}
                    </button>
                    {quickAddUserPickerOpen && (
                      <div className="absolute bottom-full left-0 mb-1 w-64 rounded border border-[var(--clean-border)] bg-white shadow-lg p-2 z-[9999]" style={{ position: "absolute" }}>
                        <UserSelector
                          users={quickAddInternalUsers}
                          multiple
                          multipleValue={quickAddAssigneeIds}
                          onMultipleChange={setQuickAddAssigneeIds}
                          onChange={() => {}}
                          locale={locale}
                          placeholder={locale === "he" ? "בחר צוות" : "Select team members"}
                        />
                        <button type="button" onClick={() => setQuickAddUserPickerOpen(false)} className="mt-2 w-full py-1.5 text-[12px] font-medium text-[var(--clean-accent)] border border-[var(--clean-border)] rounded">
                          {locale === "he" ? "סגור" : "Done"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {taskSubTab === "given" && <span className="w-px h-5 bg-[var(--clean-border)]" aria-hidden />}
                {/* Due Date (slim, in toolbar) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setQuickAddDuePickerOpen((o) => !o); setQuickAddAttachMenuOpen(false); setQuickAddUserPickerOpen(false); }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded border border-[var(--clean-border)] text-[12px] font-medium text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)] hover:border-[#E2E8F0] bg-white transition-all duration-150"
                    aria-expanded={quickAddDuePickerOpen}
                  >
                    <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
                    {quickAddDueDate && quickAddDueTime
                      ? (() => {
                          const d = new Date(`${quickAddDueDate}T${quickAddDueTime}`);
                          const today = new Date();
                          const isToday = d.toDateString() === today.toDateString();
                          return isToday
                            ? (locale === "he" ? "היום" : "Today") + " " + d.toLocaleTimeString(locale === "he" ? "he-IL" : "en-US", { hour: "numeric", minute: "2-digit" })
                            : d.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
                        })()
                      : locale === "he"
                        ? "תאריך"
                        : "Due"}
                  </button>
                  {quickAddDuePickerOpen && (
                    <div className="absolute bottom-full left-0 mb-1 flex items-center gap-1 rounded border border-[var(--clean-border)] bg-white shadow-lg p-2 z-[9999]" style={{ position: "absolute" }}>
                      <input
                        type="datetime-local"
                        value={quickAddDueDate ? `${quickAddDueDate}T${quickAddDueTime || "09:00"}` : ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v) {
                            const [datePart, timePart] = v.split("T");
                            setQuickAddDueDate(datePart || null);
                            setQuickAddDueTime(timePart || "09:00");
                          } else {
                            setQuickAddDueDate(null);
                            setQuickAddDueTime("09:00");
                          }
                        }}
                        className="text-[12px] font-medium border border-[var(--clean-border)] px-2 py-1 rounded text-[var(--clean-text)] bg-white"
                      />
                      <button type="button" onClick={() => setQuickAddDuePickerOpen(false)} className="p-1.5 text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)] rounded" aria-label="Close">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <span className="flex-1 min-w-2" aria-hidden />
                <button
                  type="button"
                  onClick={() => setQuickAddNoComments((c) => !c)}
                  className={`p-2 rounded border transition-all duration-150 flex items-center justify-center ${
                    quickAddNoComments
                      ? "bg-red-600 text-white border-red-600 ring-2 ring-red-500/50"
                      : "border-[var(--clean-border)] text-[var(--clean-text-secondary)] hover:text-[var(--clean-accent)] hover:border-[#E2E8F0] bg-white"
                  }`}
                  title={locale === "he" ? "ביטול הודעות — תגובות נעולות" : "Disable comments — comments locked"}
                  aria-label={locale === "he" ? "ביטול הודעות" : "Disable comments"}
                  aria-pressed={quickAddNoComments}
                >
                  {quickAddNoComments ? <Lock className="w-4 h-4" /> : <MessageCircleOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(taskSubTab)}
                  className="p-2 bg-[var(--clean-accent)] text-white hover:bg-[var(--clean-accent-hover)] transition-all duration-150 flex items-center justify-center border-0 rounded"
                  aria-label={locale === "he" ? "שלח משימה" : "Add task"}
                >
                  <Send className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {taskSubTab === "given" && activeGiven.length === 0 && (
                <p className="text-[13px] text-[var(--clean-text-secondary)] py-4">{locale === "he" ? "אין משימות שנתתי." : "No tasks given."}</p>
              )}
              {taskSubTab === "received" && activeReceived.length === 0 && (
                <p className="text-[13px] text-[var(--clean-text-secondary)] py-4">{locale === "he" ? "אין משימות שקיבלתי." : "No tasks received."}</p>
              )}
              {taskSubTab === "given" &&
                groupedGiven.map(({ key: dateKey, label, tasks }) => (
                  <div key={dateKey} className="space-y-2">
                    <div className="sticky top-0 z-10 py-1.5 px-1 bg-white border-b border-[var(--clean-border)]">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--clean-text-secondary)]">
                        {label}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} kind="given" contacts={contacts} />
                      ))}
                    </div>
                  </div>
                ))}
              {taskSubTab === "received" &&
                groupedReceived.map(({ key: dateKey, label, tasks }) => (
                  <div key={dateKey} className="space-y-2">
                    <div className="sticky top-0 z-10 py-1.5 px-1 bg-white border-b border-[var(--clean-border)]">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--clean-text-secondary)]">
                        {label}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} kind="received" contacts={contacts} />
                      ))}
                    </div>
                  </div>
                ))}
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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <button
                type="button"
                onClick={() => setMainTab("tasks")}
                className="flex items-center gap-1.5 text-[13px] text-[var(--clean-text-secondary)] hover:text-[var(--clean-accent)] font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                {locale === "he" ? "חזרה למשימות" : "Back to Tasks"}
              </button>
              <button
                type="button"
                onClick={() => setNewChecklistModalOpen(true)}
                className="text-[13px] font-medium text-[var(--clean-accent)] hover:underline"
                aria-label={locale === "he" ? "רשימה חדשה" : "New checklist"}
              >
                + {locale === "he" ? "רשימה חדשה" : "Add New Checklist"}
              </button>
            </div>
            {/* New Checklist modal - clean, 1px border */}
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
                  <div className="fixed inset-0 z-40 bg-black/20" onClick={() => { setNewChecklistModalOpen(false); setNewChecklistAssignPickerOpen(false); }} aria-hidden />
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                      className="clean-modal w-full max-w-md max-h-[90vh] overflow-y-auto bg-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--clean-border)]">
                        <h2 className="text-xl font-semibold text-[var(--clean-text)] tracking-wide">{locale === "he" ? "רשימה חדשה" : "New Checklist"}</h2>
                        <button type="button" onClick={() => setNewChecklistModalOpen(false)} className="p-2 text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)] transition-colors" aria-label="Close">
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
                          className="w-full px-4 py-3 border border-[var(--clean-border)] bg-white text-[var(--clean-text)] placeholder-[var(--clean-text-secondary)] text-[13px] font-medium focus:border-[var(--clean-accent)] outline-none transition-colors"
                        />
                      </div>

                      {/* 2. Middle: Item list with dividers + add input + Add another task button */}
                      <div className="px-6 pt-8">
                        <p className="text-xs font-medium uppercase tracking-wider text-[var(--clean-text-secondary)] mb-3">{locale === "he" ? "פריטים" : "Items"}</p>
                        {newChecklistInitialItems.filter(Boolean).length > 0 ? (
                          <ul className="border border-[var(--clean-border)] divide-y divide-[var(--clean-border)] overflow-hidden">
                            {newChecklistInitialItems.map((item, idx) =>
                              !item.trim() ? null : (
                                <li key={idx} className="flex items-center justify-between gap-2 px-4 py-3 bg-white">
                                  <span className="text-sm font-medium text-gray-900 truncate">{item}</span>
                                  <button type="button" onClick={() => setNewChecklistInitialItems((prev) => prev.filter((_, i) => i !== idx))} className="p-1 hover:bg-[var(--clean-border)] text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)] transition-colors shrink-0" aria-label="Remove">
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
                          className="w-full mt-2 px-4 py-3 border border-[var(--clean-border)] bg-white text-[13px] text-[var(--clean-text)] placeholder-[var(--clean-text-secondary)] focus:border-[var(--clean-accent)] outline-none transition-colors"
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
                          className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 border border-[var(--clean-border)] bg-white text-[var(--clean-text-secondary)] text-[13px] font-medium hover:border-[#E2E8F0] hover:text-[var(--clean-text)] transition-colors"
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
                          <div className="flex gap-0 border border-[var(--clean-border)] bg-white" role="group">
                            {(["daily", "weekly", "monthly"] as const).map((freq) => (
                              <button
                                key={freq}
                                type="button"
                                onClick={() => setNewChecklistFrequency(freq)}
                                className={`flex-1 py-3 text-[13px] font-medium transition-all border-b-2 -mb-px ${
                                  newChecklistFrequency === freq ? "border-[var(--clean-accent)] text-[var(--clean-accent)]" : "border-transparent text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)]"
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
                                className="flex-1 px-4 py-3 border border-[var(--clean-border)] bg-white text-[13px] font-medium text-[var(--clean-text)] focus:border-[var(--clean-accent)] outline-none"
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
                                  className={`py-2.5 text-xs font-medium transition-all border border-transparent ${
                                    newChecklistWeeklyDay === d ? "bg-[var(--clean-accent)] text-white border-[var(--clean-accent)]" : "bg-white text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)] border border-[var(--clean-border)]"
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
                                  className={`py-2 text-xs font-medium transition-all border border-transparent ${
                                    newChecklistMonthlyDay === day ? "bg-[var(--clean-accent)] text-white border-[var(--clean-accent)]" : "bg-white text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)] border border-[var(--clean-border)]"
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
                            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--clean-text-secondary)] mb-2">
                              <User className="w-4 h-4 text-[var(--clean-accent)]" strokeWidth={1.75} />
                              {locale === "he" ? "הוקצה ל" : "Assign to"}
                            </p>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setNewChecklistAssignPickerOpen((o) => !o)}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-[var(--clean-border)] text-left focus:border-[var(--clean-accent)] outline-none transition-colors"
                              >
                                {selectedContact ? (
                                  <>
                                    <UserAvatar name={selectedContact.name} email={selectedContact.email} imageUrl={selectedContact.avatar} size="md" className="flex-shrink-0 border border-[var(--clean-accent)]" />
                                    <span className="text-[13px] font-medium text-[var(--clean-text)] truncate">{selectedContact.name}</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                    <span className="text-[13px] font-medium text-[var(--clean-text-secondary)]">{locale === "he" ? "בחר משתמש" : "Select user"}</span>
                                  </>
                                )}
                              </button>
                              {newChecklistAssignPickerOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1 py-2 bg-white border border-[var(--clean-border)] max-h-64 overflow-y-auto z-10">
                                  <div className="px-3 pb-2 border-b border-[var(--clean-border)]">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[var(--clean-border)]">
                                      <Search className="w-4 h-4 text-[var(--clean-text-secondary)]" strokeWidth={1.75} />
                                      <input
                                        type="text"
                                        value={newChecklistAssignSearch}
                                        onChange={(e) => setNewChecklistAssignSearch(e.target.value)}
                                        placeholder={locale === "he" ? "חיפוש..." : "Search..."}
                                        className="flex-1 min-w-0 bg-transparent text-[13px] font-medium text-[var(--clean-text)] placeholder-[var(--clean-text-secondary)] outline-none"
                                      />
                                    </div>
                                  </div>
                                  <ul className="py-1">
                                    {filteredAssignable.map((c) => (
                                      <li key={c.userId}>
                                        <button
                                          type="button"
                                          onClick={() => { setNewChecklistAssignedTo(c.userId); setNewChecklistAssignPickerOpen(false); setNewChecklistAssignSearch(""); }}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--clean-border)] border-b border-[var(--clean-border)] last:border-0 transition-colors"
                                        >
                                          <UserAvatar name={c.name} email={c.email} imageUrl={c.avatar} size="md" className="flex-shrink-0 border border-[var(--clean-border)]" />
                                          <span className="text-[13px] font-medium text-[var(--clean-text)] truncate">{c.name}</span>
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
                          <MessageCircleOff className="w-4 h-4 text-[var(--clean-text-secondary)]" strokeWidth={1.75} />
                          <input
                            type="checkbox"
                            checked={newChecklistDisableComments}
                            onChange={(e) => setNewChecklistDisableComments(e.target.checked)}
                            className="border-[var(--clean-border)] text-[var(--clean-accent)] focus:ring-0 w-4 h-4"
                          />
                          <span className="text-[13px] font-medium text-[var(--clean-text)]">{locale === "he" ? "השבת תגובות" : "Disable comments"}</span>
                        </label>
                      </div>

                      <div className="px-6 py-5 flex justify-end gap-3 border-t border-[var(--clean-border)] mt-6">
                        <button type="button" onClick={() => setNewChecklistModalOpen(false)} className="px-5 py-2.5 text-[13px] font-medium text-[var(--clean-text-secondary)] hover:text-[var(--clean-text)] border border-[var(--clean-border)] hover:bg-[var(--clean-border)] transition-colors">
                          {locale === "he" ? "ביטול" : "Cancel"}
                        </button>
                        <button type="button" onClick={handleCreateChecklist} className="px-5 py-2.5 bg-[var(--clean-accent)] text-white text-[13px] font-medium hover:bg-[var(--clean-accent-hover)] transition-colors">
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
                <p className="text-sm text-[var(--clean-text-secondary)] py-6">
                  {locale === "he" ? "אין רשימות. הוסף רשימה חדשה למעלה." : "No checklists. Add a new one above."}
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

    </PanelWrapper>
  );
}

export default StrategicBoard;
