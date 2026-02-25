"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useBoard } from "@/contexts/BoardContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { buildSignatureOverlayHtml } from "@/lib/invoice-template";
import { t } from "@/lib/translations";
import { TaskCard } from "./TaskCard";
import { MeetingEventCard } from "./MeetingEventCard";
import { SummaryPage } from "./SummaryPage";
import { MeetingEventFormModal } from "./MeetingEventFormModal";
import {
  ListTodo,
  Users,
  Plus,
  FileText,
  Receipt,
  FolderOpen,
  ScanLine,
  Play,
  Trash2,
  Calendar as CalendarIcon,
  ChevronLeft,
  Share2,
  Pencil,
} from "lucide-react";
import type { BoardTask, MeetingOrEvent } from "@/lib/board-types";
import { useScans } from "@/contexts/ScansContext";
import { useCalls } from "@/contexts/CallsContext";
import { useFolders } from "@/contexts/FoldersContext";
import { AIScannerModal } from "@/components/tools/AIScannerModal";
import type { ExpenseCategory, ScannedDoc } from "@/lib/finance-types";
import type { Contact } from "@/contexts/ContactsContext";
import { useFinance } from "@/contexts/FinanceContext";

function AddTaskModal({
  locale,
  contacts,
  onClose,
  onSubmit,
}: {
  locale: "en" | "he";
  contacts: Contact[];
  onClose: () => void;
  onSubmit: (payload: { title: string; assigneeId: string; observerIds: string[] }) => void;
}) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [observerIds, setObserverIds] = useState<Set<string>>(new Set());

  const toggleObserver = (id: string) => {
    setObserverIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!title.trim() || !assigneeId) return;
    onSubmit({ title: title.trim(), assigneeId, observerIds: Array.from(observerIds) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{locale === "he" ? "הוסף משימה" : "Add task"}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">{locale === "he" ? "כותרת" : "Title"}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={locale === "he" ? "כותרת המשימה" : "Task title"}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">{locale === "he" ? "משויך (חובה)" : "Assignee (required)"}</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 bg-white"
            >
              <option value="">— {locale === "he" ? "בחר" : "Select"} —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.email} {c.userId ? `(${c.userId})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">{locale === "he" ? "צופים (אופציונלי)" : "Observers (optional)"}</label>
            <div className="max-h-28 overflow-y-auto rounded-xl border border-gray-200 p-2 space-y-1">
              {contacts.filter((c) => c.id !== assigneeId).map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={observerIds.has(c.id)} onChange={() => toggleObserver(c.id)} className="rounded border-gray-300 text-teal-600" />
                  <span className="text-sm text-gray-800">{c.name || c.email}</span>
                </label>
              ))}
              {contacts.length <= 1 && <p className="text-xs text-gray-500 py-1">{locale === "he" ? "הוסף אנשי קשר ב-Ollin" : "Add contacts in Ollin"}</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
            {locale === "he" ? "ביטול" : "Cancel"}
          </button>
          <button type="button" onClick={handleSubmit} disabled={!title.trim() || !assigneeId} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50">
            {locale === "he" ? "הוסף" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FoldersTab({ locale, docs }: { locale: "en" | "he"; docs: ScannedDoc[] }) {
  const { userFolders, createFolder, renameFolder } = useFolders();
  const [newFolderName, setNewFolderName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [openedFolderId, setOpenedFolderId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");

  const handleCreate = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNew(false);
    }
  };

  const handleShareFolder = (name: string) => {
    const url = typeof window !== "undefined" ? window.location.origin + "/dashboard?tab=folders" : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: name, text: `Folder: ${name}`, url }).catch(() => {
        navigator.clipboard?.writeText(url);
      });
    } else {
      navigator.clipboard?.writeText(url);
    }
  };

  const startRename = (f: { id: string; name: string }) => {
    setRenamingId(f.id);
    setRenamingValue(f.name);
  };

  const saveRename = () => {
    if (renamingId) {
      renameFolder(renamingId, renamingValue.trim());
      setRenamingId(null);
      setRenamingValue("");
    }
  };

  const openedFolder = openedFolderId ? userFolders.find((f) => f.id === openedFolderId) : null;

  return (
    <div className="p-4 space-y-4">
      {openedFolder ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setOpenedFolderId(null)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors w-full sm:w-auto"
            aria-label={locale === "he" ? "חזרה" : "Back"}
          >
            <ChevronLeft className="w-4 h-4" />
            {locale === "he" ? "חזרה" : "Back"}
          </button>
          <h3 className="text-lg font-semibold text-gray-900">{openedFolder.name}</h3>
          <p className="text-sm text-gray-500 py-6 text-center rounded-xl bg-gray-50 border border-gray-100">
            {locale === "he" ? "אין קבצים בתיקייה זו." : "No files in this folder."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-accent" />
              {t(locale, "board.folders")}
            </p>
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="py-2 px-3 rounded-xl bg-teal-500 text-white text-sm font-medium hover:bg-teal-600"
            >
              {locale === "he" ? "צור תיקייה" : "Create Folder"}
            </button>
          </div>
          {showNew && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={locale === "he" ? "שם תיקייה" : "Folder name"}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <button type="button" onClick={handleCreate} className="py-2 px-3 rounded-xl bg-teal-500 text-white text-sm font-medium">
                {locale === "he" ? "צור" : "Create"}
              </button>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t(locale, "dashboard.scannedDocs")}</p>
            {docs.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center rounded-2xl bg-gray-50">No scanned docs. Use AI Scanner from Tools Hub.</p>
            ) : (
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li key={doc.id} className="rounded-2xl bg-white shadow-sm border border-gray-100 px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName || doc.supplier}</p>
                      <p className="text-xs text-gray-500">{doc.date} · {doc.amount}{doc.category ? ` · ${doc.category}` : ""}</p>
                    </div>
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {userFolders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{locale === "he" ? "תיקיות" : "Folders"}</p>
              {userFolders.map((f) => (
                <div
                  key={f.id}
                  className="rounded-2xl bg-white shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-2 group"
                >
                  <button
                    type="button"
                    onClick={() => setOpenedFolderId(f.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left"
                  >
                    <FolderOpen className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    {renamingId === f.id ? (
                      <input
                        type="text"
                        value={renamingValue}
                        onChange={(e) => setRenamingValue(e.target.value)}
                        onBlur={saveRename}
                        onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") { setRenamingId(null); setRenamingValue(""); } }}
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm min-w-0"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900 truncate">{f.name}</span>
                    )}
                  </button>
                  {renamingId !== f.id && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleShareFolder(f.name)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Share"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startRename(f)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Rename"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-8 px-4 min-h-[120px] flex flex-col items-center justify-center text-center">
      {children}
    </div>
  );
}

/** Detect if quick-add text is "for me" (received) or "assign to X" (given). Returns { kind, title, otherParty }. */
function parseQuickAdd(text: string): { kind: "given" | "received"; title: string; otherParty: string } {
  const raw = text.trim();
  if (!raw) return { kind: "received", title: "", otherParty: "—" };

  const lower = raw.toLowerCase();
  const forMePatterns = [
    /^remind me\s+(?:to\s+)?(.+)$/i,
    /^for me\s*[:\-]?\s*(.+)$/i,
    /^my task\s*[:\-]?\s*(.+)$/i,
    /^i need to\s+(.+)$/i,
    /^i have to\s+(.+)$/i,
    /^don't forget\s+(?:to\s+)?(.+)$/i,
    /^don't forget\s*[:\-]?\s*(.+)$/i,
  ];
  for (const re of forMePatterns) {
    const m = raw.match(re);
    if (m) return { kind: "received", title: (m[1] || raw).trim(), otherParty: "—" };
  }

  const assignPatterns = [
    /^assign to\s+(.+)$/i,
    /^give to\s+(.+)$/i,
    /^send to\s+(.+)$/i,
    /^assign\s+(.+)$/i,
  ];
  for (const re of assignPatterns) {
    const m = raw.match(re);
    if (m) {
      const rest = m[1].trim();
      const colon = rest.match(/^([^:]+):\s*(.+)$/);
      const otherParty = colon ? colon[1].trim().slice(0, 80) : rest.split(/\n|[,.]/)[0].trim().slice(0, 80);
      const title = colon ? colon[2].trim() : (rest === otherParty ? "Task" : rest);
      return { kind: "given", title: title || "Task", otherParty: otherParty || "—" };
    }
  }

  if (/^for\s+me\b/i.test(lower)) return { kind: "received", title: raw.replace(/^for\s+me\s*[:\-]?\s*/i, "").trim() || raw, otherParty: "—" };

  return { kind: "received", title: raw, otherParty: "—" };
}

function FinanceQuickStats() {
  const { quotes, invoices, clients } = useFinance();
  const quoteCount = quotes.filter((q) => q.status === "active").length;
  const invoiceCount = invoices.filter((i) => i.status !== "cancelled").length;
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <span className="text-gray-700">
        <strong className="text-gray-900">{quoteCount}</strong> {quoteCount === 1 ? "Quote" : "Quotes"}
      </span>
      <span className="text-gray-400">·</span>
      <span className="text-gray-700">
        <strong className="text-gray-900">{invoiceCount}</strong> {invoiceCount === 1 ? "Invoice" : "Invoices"}
      </span>
      <span className="text-gray-400">·</span>
      <span className="text-gray-700">
        <strong className="text-gray-900">{clients.length}</strong> {clients.length === 1 ? "Client" : "Clients"}
      </span>
    </div>
  );
}

type MainCategory = "tasks" | "calendar" | "meetings" | "events" | "finances" | "calls" | "folders";
type TasksSubTab = "given" | "received";
type FinanceSubTab = "documents" | "clients" | "company" | "expenses";

export function StrategicBoard({ locale, onBack }: { locale: "en" | "he"; onBack?: () => void }) {
  const [mainCategory, setMainCategory] = useState<MainCategory>("tasks");
  const [tasksSubTab, setTasksSubTab] = useState<TasksSubTab>("given");
  const [financeSubTab, setFinanceSubTab] = useState<FinanceSubTab>("documents");
  const [summaryPageOpen, setSummaryPageOpen] = useState(false);
  const [quickAddInput, setQuickAddInput] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [callSummaryId, setCallSummaryId] = useState<string | null>(null);
  const [meetingEventForm, setMeetingEventForm] = useState<"meeting" | "event" | null>(null);
  const {
    given,
    received,
    meetings,
    events,
    addGivenTask,
    addReceivedTask,
    addMeeting,
    addEvent,
    summarySelection,
    setSummarySelection,
  } = useBoard();
  const { profile } = useProfile();
  const { contacts } = useContacts();
  const { sendText } = useInternalMessages();
  const { docs } = useScans();
  const { calls, addCall, removeCall, setCallSummary } = useCalls();

  const submitQuickAdd = useCallback(() => {
    const { kind, title, otherParty } = parseQuickAdd(quickAddInput);
    if (!title) return;
    setQuickAddInput("");
    if (kind === "given") {
      addGivenTask({ title, otherParty, checklist: [], done: false });
    } else {
      addReceivedTask({ title, otherParty, checklist: [], done: false });
    }
  }, [quickAddInput, addGivenTask, addReceivedTask]);

  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);

  const addTask = () => setAddTaskModalOpen(true);

  const handleAddTaskSubmit = useCallback(
    (payload: { title: string; assigneeId: string; observerIds: string[] }) => {
      const assignee = contacts.find((c) => c.id === payload.assigneeId);
      const otherParty = assignee ? assignee.name || assignee.email : "—";
      const assigneeUserId = assignee?.userId;
      if (tasksSubTab === "given") {
        addGivenTask({
          title: payload.title.trim(),
          otherParty,
          checklist: [],
          done: false,
          assigneeId: payload.assigneeId,
          assigneeUserId,
          observerIds: payload.observerIds.length ? payload.observerIds : undefined,
        });
        sendText(payload.assigneeId, `New task assigned to you: ${payload.title.trim()}`);
      } else {
        addReceivedTask({
          title: payload.title.trim(),
          otherParty,
          checklist: [],
          done: false,
          assigneeId: payload.assigneeId,
          assigneeUserId,
          observerIds: payload.observerIds.length ? payload.observerIds : undefined,
        });
      }
      setAddTaskModalOpen(false);
    },
    [tasksSubTab, contacts, addGivenTask, addReceivedTask, sendText]
  );

  const addMeetingItem = () => setMeetingEventForm("meeting");
  const addEventItem = () => setMeetingEventForm("event");

  const toggleTaskSelection = (id: string) => {
    setSummarySelection((prev) => {
      const set = new Set(prev.taskIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, taskIds: Array.from(set) };
    });
  };

  const toggleMeetingSelection = (id: string) => {
    setSummarySelection((prev) => {
      const set = new Set(prev.meetingIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, meetingIds: Array.from(set) };
    });
  };

  const toggleEventSelection = (id: string) => {
    setSummarySelection((prev) => {
      const set = new Set(prev.eventIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, eventIds: Array.from(set) };
    });
  };

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const buildSummaryHtml = useCallback((): string => {
    const selectedGiven = given.filter((t) => summarySelection.taskIds.includes(t.id));
    const selectedReceived = received.filter((t) => summarySelection.taskIds.includes(t.id));
    const selectedMeetings = meetings.filter((m) => summarySelection.meetingIds.includes(m.id));
    const selectedEvents = events.filter((e) => summarySelection.eventIds.includes(e.id));
    const date = new Date().toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { dateStyle: "long" });
    const taskRow = (t: { title: string; otherParty: string; done: boolean }) =>
      `<tr><td>${escapeHtml(t.title || "—")}</td><td>${escapeHtml(t.otherParty)}</td><td>${t.done ? "✓ Done" : "In progress"}</td></tr>`;
    const meetingRow = (m: { title: string; startAt: number }) =>
      `<tr><td>${escapeHtml(m.title)}</td><td>${new Date(m.startAt).toLocaleString(locale === "he" ? "he-IL" : "en-US", { dateStyle: "short", timeStyle: "short" })}</td></tr>`;
    let body = "";
    if (selectedGiven.length > 0) body += `<h2>${escapeHtml(t(locale, "board.tasksGiven"))}</h2><table><thead><tr><th>Task</th><th>Assigned to</th><th>Status</th></tr></thead><tbody>${selectedGiven.map(taskRow).join("")}</tbody></table>`;
    if (selectedReceived.length > 0) body += `<h2>${escapeHtml(t(locale, "board.tasksReceived"))}</h2><table><thead><tr><th>Task</th><th>From</th><th>Status</th></tr></thead><tbody>${selectedReceived.map(taskRow).join("")}</tbody></table>`;
    if (selectedMeetings.length > 0) body += `<h2>${escapeHtml(t(locale, "board.meetings"))}</h2><table><thead><tr><th>Meeting</th><th>When</th></tr></thead><tbody>${selectedMeetings.map(meetingRow).join("")}</tbody></table>`;
    if (selectedEvents.length > 0) body += `<h2>${escapeHtml(t(locale, "board.events"))}</h2><table><thead><tr><th>Event</th><th>When</th></tr></thead><tbody>${selectedEvents.map(meetingRow).join("")}</tbody></table>`;
    const signatureBlock = profile?.signatureImage ? buildSignatureOverlayHtml(profile.signatureImage) : "";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Executive Summary — Progress Report</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet"><style>
      body{font-family:'DM Sans',system-ui,-apple-system,sans-serif;max-width:720px;margin:0 auto;padding:0 1.5rem;color:#1a1a1a;line-height:1.5;font-size:15px;}
      .exec-header{border-bottom:3px solid #0D9488;padding:1.25rem 0;margin-bottom:1.5rem;}
      h1{color:#0D9488;font-weight:700;font-size:1.5rem;letter-spacing:-0.02em;margin:0;}
      .meta{color:#6b7280;font-size:0.8125rem;margin-top:0.25rem;}
      h2{font-size:0.875rem;font-weight:700;margin-top:1.5rem;margin-bottom:0.5rem;color:#374151;padding-left:0.75rem;border-left:4px solid #0D9488;}
      table{width:100%;border-collapse:collapse;font-size:0.875rem;border:1px solid #e5e7eb;}
      th,td{text-align:left;padding:0.625rem 0.75rem;border-bottom:1px solid #e5e7eb;}
      th{font-weight:600;color:#374151;background:#f0fdfa;}
      tr:hover td{background:#f0fdfa;}
    </style></head><body><div class="exec-header"><h1>Executive Summary</h1><p class="meta">${escapeHtml(date)} — Strategic progress report</p></div>${body || "<p>No items selected.</p>"}${signatureBlock}</body></html>`;
  }, [given, received, meetings, events, summarySelection, locale, profile?.signatureImage]);

  const mainCategories: { id: MainCategory; labelKey: "board.tasks" | "board.calendar" | "board.meetings" | "board.events" | "board.finances" | "board.calls" | "board.folders" }[] = [
    { id: "tasks", labelKey: "board.tasks" },
    { id: "calendar", labelKey: "board.calendar" },
    { id: "meetings", labelKey: "board.meetings" },
    { id: "events", labelKey: "board.events" },
    { id: "finances", labelKey: "board.finances" },
    { id: "calls", labelKey: "board.calls" },
    { id: "folders", labelKey: "board.folders" },
  ];

  const byCategory = docs.reduce<Record<ExpenseCategory, typeof docs>>(
    (acc, doc) => {
      const cat = doc.category ?? "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    },
    { Fuel: [], Food: [], Office: [], Travel: [], Other: [] }
  );

  const taskSubTabs: { id: TasksSubTab; labelKey: "board.tasksGiven" | "board.tasksReceived" }[] = [
    { id: "given", labelKey: "board.tasksGiven" },
    { id: "received", labelKey: "board.tasksReceived" },
  ];

  if (summaryPageOpen) {
    return (
      <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-soft-md border-0 overflow-hidden flex flex-col min-h-0 flex-1">
        <SummaryPage
          onBack={() => setSummaryPageOpen(false)}
          onGenerate={() => {
            const html = buildSummaryHtml();
            const w = window.open("", "_blank");
            if (w) { w.document.write(html); w.document.close(); }
            setSummarySelection({ taskIds: [], meetingIds: [], eventIds: [] });
            setSummaryPageOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: Back + title + Summarize (opens full page) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-xl pl-2 pr-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
            </button>
          )}
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 tracking-[0.02em]">
            <ListTodo className="w-5 h-5 text-accent flex-shrink-0" />
            {t(locale, "dashboard.strategicBoard")}
          </h2>
        </div>
        <motion.button
          type="button"
          onClick={() => setSummaryPageOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium bg-gradient-to-r from-accent-emerald to-accent text-white shadow-soft hover:shadow-glow-subtle transition-shadow"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FileText className="w-4 h-4" />
          {t(locale, "board.summarize")}
        </motion.button>
      </div>

      {/* Quick Add */}
      <div className="flex gap-2">
        <input
          type="text"
          value={quickAddInput}
          onChange={(e) => setQuickAddInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitQuickAdd()}
          placeholder={t(locale, "board.quickAddPlaceholder")}
          className="flex-1 rounded-2xl border-0 bg-white shadow-soft px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-accent/30 min-h-[44px]"
        />
        <motion.button
          type="button"
          onClick={submitQuickAdd}
          disabled={!quickAddInput.trim()}
          className={`rounded-2xl px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-2 ${
            quickAddInput.trim()
              ? "bg-gradient-to-r from-accent-emerald to-accent text-white border-transparent hover:shadow-glow-subtle shadow-soft"
              : "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          whileTap={{ scale: 0.98 }}
        >
          {t(locale, "board.quickAdd")}
        </motion.button>
      </div>

      {/* Top-level: Tasks | Meetings & Events */}
      <div className="flex gap-1 p-1.5 rounded-full bg-gray-100/80 overflow-x-auto">
        {mainCategories.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMainCategory(id)}
            className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              mainCategory === id ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {mainCategory === id && (
              <motion.span
                layoutId="board-category-pill"
                className="absolute inset-0 rounded-full bg-white shadow-soft"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{t(locale, labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Sub-tabs when Tasks: Given | Received */}
      {mainCategory === "tasks" && (
        <div className="flex gap-1 p-1.5 rounded-full bg-gray-100/80 overflow-x-auto">
          {taskSubTabs.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTasksSubTab(id)}
              className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                tasksSubTab === id ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tasksSubTab === id && (
                <motion.span
                  layoutId="board-tasks-pill"
                  className="absolute inset-0 rounded-full bg-white shadow-soft"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t(locale, labelKey)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content card */}
      <div className="rounded-3xl bg-white shadow-soft min-h-[200px] border-0 overflow-hidden">
        {mainCategory === "tasks" && tasksSubTab === "given" && (
          <div className="p-4 space-y-3">
            <motion.button
              type="button"
              onClick={addTask}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-accent hover:text-accent hover:bg-accent-muted-soft/50 text-sm font-medium transition-colors"
              whileTap={{ scale: 0.99 }}
            >
              <Plus className="w-4 h-4" />
              {t(locale, "board.addTask")}
            </motion.button>
            {given.length === 0 ? (
              <EmptyState>
                <p className="text-gray-500 text-sm text-center">No tasks given yet.</p>
              </EmptyState>
            ) : (
              given.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  kind="given"
                  selected={summarySelection.taskIds.includes(task.id)}
                  onToggleSelect={() => toggleTaskSelection(task.id)}
                  contacts={contacts}
                />
              ))
            )}
          </div>
        )}

        {mainCategory === "tasks" && tasksSubTab === "received" && (
          <div className="p-4 space-y-3">
            <motion.button
              type="button"
              onClick={addTask}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-accent hover:text-accent hover:bg-accent-muted-soft/50 text-sm font-medium transition-colors"
              whileTap={{ scale: 0.99 }}
            >
              <Plus className="w-4 h-4" />
              {t(locale, "board.addTask")}
            </motion.button>
            {received.length === 0 ? (
              <EmptyState>
                <p className="text-gray-500 text-sm text-center">No tasks received yet.</p>
              </EmptyState>
            ) : (
              received.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  kind="received"
                  selected={summarySelection.taskIds.includes(task.id)}
                  onToggleSelect={() => toggleTaskSelection(task.id)}
                  contacts={contacts}
                />
              ))
            )}
          </div>
        )}

        {mainCategory === "calendar" && (
          <div className="p-6 text-center">
            <div className="py-8">
              <CalendarIcon className="w-12 h-12 text-teal-600 mx-auto mb-3" />
              <p className="text-gray-600 text-sm font-medium">Calendar</p>
              <p className="text-gray-500 text-xs mt-1">
                Synced with Meetings & Events.
              </p>
              <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-100 p-4 text-left text-xs text-gray-500">
                Upcoming: {meetings.length + events.length} items
              </div>
            </div>
          </div>
        )}

        {mainCategory === "meetings" && (
          <div className="p-4 space-y-3">
            <motion.button
              type="button"
              onClick={addMeetingItem}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-accent hover:text-accent hover:bg-accent-muted-soft/50 text-sm font-medium transition-colors"
              whileTap={{ scale: 0.99 }}
            >
              <Plus className="w-4 h-4" />
              {t(locale, "board.addMeeting")}
            </motion.button>
            {meetings.length === 0 ? (
              <EmptyState>
                <p className="text-gray-500 text-sm text-center">No meetings yet.</p>
              </EmptyState>
            ) : (
              meetings.map((m) => (
                <MeetingEventCard
                  key={m.id}
                  item={m}
                  selected={summarySelection.meetingIds.includes(m.id)}
                  onToggleSelect={() => toggleMeetingSelection(m.id)}
                />
              ))
            )}
          </div>
        )}

        {mainCategory === "events" && (
          <div className="p-4 space-y-3">
            <Link
              href="/dashboard/events/new"
              className="block w-full text-center py-3 rounded-2xl bg-accent/10 text-accent font-medium text-sm hover:bg-accent/20 mb-2"
            >
              {locale === "he" ? "טופס אירוע מלא (תאריך, מיקום, אורחים)" : "Full event form (date, location, guests)"}
            </Link>
            <motion.button
              type="button"
              onClick={addEventItem}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-accent hover:text-accent hover:bg-accent-muted-soft/50 text-sm font-medium transition-colors"
              whileTap={{ scale: 0.99 }}
            >
              <Plus className="w-4 h-4" />
              {t(locale, "board.addEvent")}
            </motion.button>
            {events.length === 0 ? (
              <EmptyState>
                <p className="text-gray-500 text-sm text-center">No events yet.</p>
              </EmptyState>
            ) : (
              events.map((e) => (
                <MeetingEventCard
                  key={e.id}
                  item={e}
                  selected={summarySelection.eventIds.includes(e.id)}
                  onToggleSelect={() => toggleEventSelection(e.id)}
                />
              ))
            )}
          </div>
        )}

        {mainCategory === "finances" && (
          <div className="p-4 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{locale === "he" ? "כספים" : "Finance"}</h3>
              <FinanceQuickStats />
            </div>
            <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-gray-100/80">
              {(["documents", "clients", "company", "expenses"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFinanceSubTab(tab)}
                  className={`flex-1 min-w-0 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${financeSubTab === tab ? "bg-white shadow-soft text-gray-900" : "text-gray-600"}`}
                >
                  {tab === "documents" ? (locale === "he" ? "מסמכים" : "Documents") : tab === "clients" ? (locale === "he" ? "לקוחות" : "Clients") : tab === "company" ? (locale === "he" ? "חברה" : "Company") : t(locale, "finance.expenses")}
                </button>
              ))}
            </div>
            {financeSubTab === "documents" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{locale === "he" ? "הצעות מחיר ממוספרות, חשבוניות ו-PDF." : "Auto-numbered quotes, invoices and PDF export."}</p>
                <Link href="/dashboard/finances/documents" className="block w-full py-3 rounded-2xl bg-accent/10 text-accent font-medium text-sm text-center hover:bg-accent/20">
                  {locale === "he" ? "פתח מסמכים" : "Open Documents"}
                </Link>
              </div>
            )}
            {financeSubTab === "clients" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{locale === "he" ? "רשימת לקוחות וטופס לקוח חדש." : "Client list and new client form."}</p>
                <Link href="/dashboard/finances/clients" className="block w-full py-3 rounded-2xl bg-accent/10 text-accent font-medium text-sm text-center hover:bg-accent/20">
                  {locale === "he" ? "פתח לקוחות" : "Open Clients"}
                </Link>
              </div>
            )}
            {financeSubTab === "company" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{locale === "he" ? "פרופיל חברה וחתימה דיגיטלית ל-PDF." : "Company profile and digital signature for PDFs."}</p>
                <Link href="/dashboard/finances/company-profile" className="block w-full py-3 rounded-2xl bg-accent/10 text-accent font-medium text-sm text-center hover:bg-accent/20">
                  {locale === "he" ? "פתח פרופיל חברה" : "Open Company Profile"}
                </Link>
              </div>
            )}
            {financeSubTab === "expenses" && (
              <>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-accent-emerald to-accent text-white shadow-soft font-medium text-sm"
                >
                  <ScanLine className="w-5 h-5" />
                  {t(locale, "finance.scanReceipt")}
                </button>
                <div className="space-y-2">
                  {(Object.keys(byCategory) as ExpenseCategory[])
                    .filter((cat) => byCategory[cat].length > 0)
                    .map((cat) => (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{cat}</p>
                        {byCategory[cat].map((doc) => (
                          <div key={doc.id} className="rounded-xl bg-white shadow-soft px-3 py-2 text-sm">
                            {doc.supplier || doc.fileName} · {doc.amount} · {doc.date}
                          </div>
                        ))}
                      </div>
                    ))}
                  {docs.length === 0 && (
                    <p className="text-sm text-gray-500 py-4 text-center">No expenses. Scan a receipt to add.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {mainCategory === "calls" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t(locale, "calls.recordedCalls")}</p>
              <button
                type="button"
                onClick={() => addCall({ title: "Sample call", date: Date.now() })}
                className="text-xs font-medium text-accent hover:underline"
              >
                + {t(locale, "calls.addCall")}
              </button>
            </div>
            {calls.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center rounded-2xl bg-gray-50">{t(locale, "calls.noCalls")}</p>
            ) : (
              calls.map((call) => (
                <div
                  key={call.id}
                  className="rounded-2xl bg-white shadow-soft px-4 py-3 flex items-center gap-2 border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{call.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(call.date).toLocaleString(locale === "he" ? "he-IL" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    {call.summary && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{call.summary}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {}}
                      className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-accent"
                      aria-label="Play"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCall(call.id)}
                      className="p-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCallSummaryId(call.id)}
                      className="rounded-xl px-3 py-2 text-sm font-medium bg-gradient-to-r from-accent-emerald to-accent text-white shadow-soft"
                    >
                      {t(locale, "calls.summarize")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {mainCategory === "folders" && (
          <FoldersTab locale={locale} docs={docs} />
        )}
      </div>

      {scannerOpen && <AIScannerModal onClose={() => setScannerOpen(false)} />}
      {meetingEventForm === "meeting" && (
        <MeetingEventFormModal
          type="meeting"
          onClose={() => setMeetingEventForm(null)}
          onSubmit={(m) => { addMeeting(m); setMeetingEventForm(null); }}
        />
      )}
      {meetingEventForm === "event" && (
        <MeetingEventFormModal
          type="event"
          onClose={() => setMeetingEventForm(null)}
          onSubmit={(e) => { addEvent(e); setMeetingEventForm(null); }}
        />
      )}
      {addTaskModalOpen && (
        <AddTaskModal
          locale={locale}
          contacts={contacts}
          onClose={() => setAddTaskModalOpen(false)}
          onSubmit={handleAddTaskSubmit}
        />
      )}
      {callSummaryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCallSummaryId(null)}>
          <div className="bg-white rounded-3xl shadow-soft-md max-w-sm w-full p-6 border-0" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(locale, "calls.summarize")}</h3>
            <p className="text-sm text-gray-600 mb-4">AI summary for this call. (Connect speech-to-text for full transcript.)</p>
            <textarea
              placeholder="Summary will appear here…"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm min-h-[100px]"
              defaultValue={calls.find((c) => c.id === callSummaryId)?.summary}
              onChange={(e) => {
                const id = callSummaryId;
                if (id) setCallSummary(id, e.target.value);
              }}
            />
            <button type="button" onClick={() => setCallSummaryId(null)} className="mt-4 w-full py-2.5 rounded-2xl bg-gradient-to-r from-accent-emerald to-accent text-white font-medium">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
