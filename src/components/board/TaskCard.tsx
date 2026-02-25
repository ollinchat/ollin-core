"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useBoard } from "@/contexts/BoardContext";
import { useProfile } from "@/contexts/ProfileContext";
import { t } from "@/lib/translations";
import type { BoardTask, ChecklistItem } from "@/lib/board-types";
import type { Contact } from "@/contexts/ContactsContext";
import { Check, ChevronDown, ChevronUp, User, Users } from "lucide-react";

type TaskCardProps = {
  task: BoardTask;
  kind: "given" | "received";
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Resolve assigneeId/observerIds to names */
  contacts?: Contact[];
};

export function TaskCard({ task, kind, selected, onToggleSelect, contacts = [] }: TaskCardProps) {
  const assigneeName = task.assigneeId && contacts.length ? (contacts.find((c) => c.id === task.assigneeId)?.name || contacts.find((c) => c.id === task.assigneeId)?.email || task.otherParty) : task.otherParty;
  const observerNames = (task.observerIds || [])
    .map((id) => contacts.find((c) => c.id === id)?.name || contacts.find((c) => c.id === id)?.email)
    .filter(Boolean) as string[];
  const { locale } = useLocale();
  const { profile } = useProfile();
  const { setTaskDone, updateGivenTask, updateReceivedTask, notifySenderTaskDone } = useBoard();
  const [expanded, setExpanded] = useState(true);
  /** Only the primary assignee can mark the task done; observers cannot. */
  const canCheck = !task.assigneeUserId || profile?.userId === task.assigneeUserId;

  const updateTask = kind === "given" ? updateGivenTask : updateReceivedTask;

  const handleDoneChange = (checked: boolean) => {
    setTaskDone(kind, task.id, checked);
    if (checked) notifySenderTaskDone(task.id); // placeholder: real-time notification to sender
  };

  const checklistDone = task.checklist.filter((c) => c.done).length;
  const checklistTotal = task.checklist.length;
  const progress = checklistTotal ? (checklistDone / checklistTotal) * 100 : 0;

  const toggleChecklistItem = (itemId: string, done: boolean) => {
    const nextChecklist = task.checklist.map((c) =>
      c.id === itemId ? { ...c, done } : c
    );
    updateTask(task.id, { checklist: nextChecklist });
  };

  const addChecklistItem = () => {
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      label: "",
      done: false,
    };
    updateTask(task.id, { checklist: [...task.checklist, newItem] });
  };

  return (
    <motion.div
      layout
      initial={false}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`rounded-2xl bg-white overflow-hidden border-0 ${
        selected ? "ring-2 ring-accent/30 shadow-glow-subtle" : "shadow-soft"
      } ${task.done ? "shadow-glow-subtle" : ""}`}
    >
      <div className="p-3 flex items-start gap-3">
        {onToggleSelect != null && (
          <button
            type="button"
            onClick={onToggleSelect}
            className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:border-accent transition-colors"
            aria-label={selected ? "Deselect" : "Select for summary"}
          >
            {selected && <Check className="w-3 h-3 text-accent" />}
          </button>
        )}
        <label className={`flex-1 min-w-0 flex items-start gap-2 ${canCheck ? "cursor-pointer" : "cursor-not-allowed"}`}>
          <motion.span whileTap={canCheck ? { scale: 0.9 } : undefined} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={task.done}
              onChange={(e) => canCheck && handleDoneChange(e.target.checked)}
              disabled={!canCheck}
              title={!canCheck ? (locale === "he" ? "רק המבצע יכול לסמן כהושלם" : "Only the assignee can mark done") : undefined}
              className="w-5 h-5 rounded-md border-2 border-gray-300 text-accent focus:ring-accent accent-accent disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </motion.span>
          <div className="min-w-0 flex-1">
            <span className={`font-medium ${task.done ? "text-gray-500 line-through" : "text-gray-900"}`}>
              {task.title || "Untitled task"}
            </span>
            {(assigneeName || observerNames.length > 0) && (
              <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {assigneeName && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {kind === "given" ? "Assignee:" : "From:"} {assigneeName}
                  </span>
                )}
                {observerNames.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Observers: {observerNames.join(", ")}
                  </span>
                )}
              </p>
            )}
            {!assigneeName && !observerNames.length && task.otherParty && (
              <p className="text-xs text-gray-500 mt-0.5">{kind === "given" ? "To:" : "From:"} {task.otherParty}</p>
            )}
          </div>
        </label>
        {task.done && task.doneNotifiedAt != null && (
          <span className="text-xs text-accent flex items-center gap-0.5 flex-shrink-0" title="Sender notified">
            {t(locale, "board.notified")}
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {checklistTotal > 0 && (
        <div className="px-3 pb-2">
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent-emerald to-accent"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {checklistDone}/{checklistTotal} sub-tasks
          </p>
        </div>
      )}

      {expanded && task.checklist.length > 0 && (
        <div className="border-t border-gray-100 px-3 py-2 space-y-1.5 bg-gray-50/50">
          {task.checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => toggleChecklistItem(item.id, e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-accent accent-accent"
              />
              <input
                type="text"
                value={item.label}
                onChange={(e) => {
                  const next = task.checklist.map((c) =>
                    c.id === item.id ? { ...c, label: e.target.value } : c
                  );
                  updateTask(task.id, { checklist: next });
                }}
                placeholder="Sub-task"
                className="flex-1 min-w-0 text-sm rounded-lg border border-gray-200 px-2 py-1"
              />
              <input
                type="text"
                value={item.assignedTo ?? ""}
                onChange={(e) => {
                  const next = task.checklist.map((c) =>
                    c.id === item.id ? { ...c, assignedTo: e.target.value || undefined } : c
                  );
                  updateTask(task.id, { checklist: next });
                }}
                placeholder="Assign (email)"
                className="w-24 text-xs rounded border border-gray-200 px-2 py-1"
                title="Assign to (email/user)"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addChecklistItem}
            className="text-xs text-accent hover:underline"
          >
            + Add sub-task
          </button>
        </div>
      )}

      {expanded && task.checklist.length === 0 && (
        <div className="border-t border-gray-100 px-3 py-2">
          <button
            type="button"
            onClick={addChecklistItem}
            className="text-sm text-accent hover:underline"
          >
            + Add checklist
          </button>
        </div>
      )}
    </motion.div>
  );
}
