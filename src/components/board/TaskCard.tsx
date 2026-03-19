"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useBoard } from "@/contexts/BoardContext";
import { useProfile } from "@/contexts/ProfileContext";
import { t } from "@/lib/translations";
import type { BoardTask, ChecklistItem, TaskAttachment, TaskComment } from "@/lib/board-types";
import type { Contact } from "@/contexts/ContactsContext";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { UserSelector, buildInternalUsers } from "./UserSelector";
import { MediaToolbox } from "./MediaToolbox";
import { Check, ChevronDown, ChevronUp, Trash2, Archive, Bell, MessageSquare, ListChecks } from "lucide-react";
import { generateUUID } from "@/lib/uuid";

const NUDGE_KEY_PREFIX = "ollin_nudge_";
const NUDGE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const NUDGE_MAX_PER_DAY = 3;

function getNudgeState(taskId: string): { canNudge: boolean; nextAt?: number; tooltip: string } {
  if (typeof window === "undefined") return { canNudge: true, tooltip: "" };
  try {
    const raw = localStorage.getItem(NUDGE_KEY_PREFIX + taskId);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recent = timestamps.filter((t) => t > oneDayAgo);
    const last = recent.length > 0 ? Math.max(...recent) : 0;
    const cooldownEnd = last + NUDGE_COOLDOWN_MS;
    if (recent.length >= NUDGE_MAX_PER_DAY) {
      const nextDay = new Date(last);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      return { canNudge: false, tooltip: `Max ${NUDGE_MAX_PER_DAY} nudges per day` };
    }
    if (now < cooldownEnd) {
      const mins = Math.ceil((cooldownEnd - now) / 60000);
      return { canNudge: false, nextAt: cooldownEnd, tooltip: `Next nudge in ${mins} min` };
    }
    return { canNudge: true, tooltip: "" };
  } catch {
    return { canNudge: true, tooltip: "" };
  }
}

function recordNudge(taskId: string): void {
  try {
    const raw = localStorage.getItem(NUDGE_KEY_PREFIX + taskId);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const next = [...timestamps.filter((t) => t > oneDayAgo), now];
    localStorage.setItem(NUDGE_KEY_PREFIX + taskId, JSON.stringify(next));
  } catch (_) {}
}

type TaskCardProps = {
  task: BoardTask;
  kind: "given" | "received";
  selected?: boolean;
  onToggleSelect?: () => void;
  contacts?: Contact[];
};

export function TaskCard({ task, kind, selected, onToggleSelect, contacts = [] }: TaskCardProps) {
  const { locale } = useLocale();
  const { profile } = useProfile();
  const {
    setTaskDone,
    updateGivenTask,
    updateReceivedTask,
    removeGivenTask,
    removeReceivedTask,
    archiveGivenTask,
    archiveReceivedTask,
    notifySenderTaskDone,
    pingAssignees,
  } = useBoard();
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<TaskAttachment[]>([]);
  const [nudgeVersion, setNudgeVersion] = useState(0);
  const nudgeState = useMemo(() => getNudgeState(task.id), [task.id, nudgeVersion]);

  const internalUsers = buildInternalUsers(profile, contacts);
  const legacyAssigneeIds = task.assigneeUserId ? [task.assigneeUserId] : [];
  const assigneeIds = task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : legacyAssigneeIds;
  const assignees = assigneeIds
    .map((id) => internalUsers.find((u) => u.userId === id))
    .filter(Boolean);

  const canCheck =
    kind === "received"
      ? true
      : assigneeIds.length === 0
        ? true
        : Boolean(profile?.userId && assigneeIds.includes(profile.userId));
  const isCreator = !task.creatorId || profile?.userId === task.creatorId;

  /** GIVEN: creator = full menu; assignee = only Media. RECEIVED: current user = toggle + Media + Reply only */
  const canUseMedia = kind === "given" ? (isCreator || canCheck) : true;
  const canEditAssign = kind === "given" && isCreator;
  const canDeleteArchive = kind === "given" && isCreator;
  const canComment =
    Boolean(profile?.userId) && (isCreator || kind === "received" || assigneeIds.includes(profile!.userId!));

  const updateTask = kind === "given" ? updateGivenTask : updateReceivedTask;
  const removeTask = kind === "given" ? removeGivenTask : removeReceivedTask;
  const archiveTask = kind === "given" ? archiveGivenTask : archiveReceivedTask;

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
      id: generateUUID(),
      label: "",
      done: false,
    };
    updateTask(task.id, { checklist: [...task.checklist, newItem] });
  };

  const generateChecklistFromTitle = () => {
    const text = (task.title || "").trim();
    if (!text) return;
    const parts = text.split(/[,;]|\n/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const newItems: ChecklistItem[] = parts.map((label) => ({
      id: generateUUID(),
      label,
      done: false,
    }));
    updateTask(task.id, { checklist: [...task.checklist, ...newItems] });
  };

  const addTaskAttachment = (att: Omit<TaskAttachment, "id" | "createdAt">) => {
    const newAtt: TaskAttachment = {
      ...att,
      id: generateUUID(),
      createdAt: Date.now(),
    };
    updateTask(task.id, { attachments: [...(task.attachments ?? []), newAtt] });
  };

  const addChecklistItemAttachment = (itemId: string, att: Omit<TaskAttachment, "id" | "createdAt">) => {
    const newAtt: TaskAttachment = {
      ...att,
      id: generateUUID(),
      createdAt: Date.now(),
    };
    const next = task.checklist.map((c) =>
      c.id === itemId ? { ...c, attachments: [...(c.attachments ?? []), newAtt] } : c
    );
    updateTask(task.id, { checklist: next });
  };

  const addCommentAttachment = (att: Omit<TaskAttachment, "id" | "createdAt">) => {
    const newAtt: TaskAttachment = {
      ...att,
      id: generateUUID(),
      createdAt: Date.now(),
    };
    setCommentAttachments((prev) => [...prev, newAtt]);
  };

  const comments: TaskComment[] = (task.comments as TaskComment[] | undefined) ??
    ((task.replies as unknown as TaskComment[] | undefined) ?? []);

  const submitComment = () => {
    const text = commentText.trim();
    if (!text || !profile?.userId) return;
    const newComment: TaskComment = {
      id: generateUUID(),
      userId: profile.userId,
      text,
      attachments: commentAttachments.length > 0 ? commentAttachments : undefined,
      createdAt: Date.now(),
    };
    updateTask(task.id, { comments: [...comments, newComment] });
    setCommentText("");
    setCommentAttachments([]);
  };

  const priority = task.priority ?? "low";
  const priorityBarColor =
    priority === "high" ? "bg-rose-400" : priority === "medium" ? "bg-amber-400" : "bg-emerald-400";
  const priorityMeta =
    priority === "high"
      ? { label: locale === "he" ? "גבוה" : "High", dotClass: "bg-rose-400", textClass: "text-rose-700" }
      : priority === "medium"
        ? { label: locale === "he" ? "בינוני" : "Medium", dotClass: "bg-amber-400", textClass: "text-amber-700" }
        : { label: locale === "he" ? "נמוך" : "Low", dotClass: "bg-emerald-400", textClass: "text-emerald-700" };

  const dueDateLabel =
    task.dueDate != null
      ? (() => {
          const d = new Date(task.dueDate);
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
          if (dayStart === todayStart) return locale === "he" ? "היום" : "Today";
          if (dayStart === yesterdayStart) return locale === "he" ? "אתמול" : "Yesterday";
          return d.toLocaleDateString(locale === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short" });
        })()
      : null;

  return (
    <motion.div
      layout
      initial={false}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className={`clean-card overflow-hidden flex ${selected ? "border-[var(--clean-accent)]" : ""} ${task.done ? "bg-gray-50/60" : ""}`}
    >
      {/* Short vertical pill (24px h, 4px w) */}
      <div className="flex-shrink-0 pl-3 pr-2 py-2.5 flex items-center" aria-hidden>
        <div className={`w-[4px] h-5 ${priorityBarColor}`} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((e) => !e)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded((x) => !x);
        }}
        className={`w-full px-4 flex items-center gap-2 text-left hover:bg-[var(--clean-border)]/50 transition-all duration-150 cursor-pointer ${expanded ? "py-3" : "py-2.5"}`}
        aria-expanded={expanded}
      >
        {onToggleSelect != null && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className="flex-shrink-0 w-5 h-5 border border-[var(--clean-border)] flex items-center justify-center hover:border-[var(--clean-accent)] hover:text-[var(--clean-accent)] transition-colors text-[var(--clean-text-secondary)]"
            aria-label={selected ? "Deselect" : "Select for summary"}
          >
            {selected && <Check className="w-3 h-3 text-[var(--clean-accent)]" strokeWidth={2} />}
          </button>
        )}
        <motion.span
          whileTap={canCheck ? { scale: 0.9 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={task.done}
            onChange={(e) => canCheck && handleDoneChange(e.target.checked)}
            disabled={!canCheck}
            title={!canCheck ? (locale === "he" ? "רק המבצע יכול לסמן כהושלם" : "Only assignees can mark done") : undefined}
            className="w-4 h-4 border border-[var(--clean-border)] text-slate-700 focus:ring-0 accent-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </motion.span>
        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-[13px] tracking-wide truncate ${task.done ? "text-[var(--clean-text-secondary)] line-through" : "text-[var(--clean-text)]"}`}>
            {task.title || "Untitled task"}
          </span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${priorityMeta.textClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dotClass}`} aria-hidden />
            {priorityMeta.label}
          </span>
          {dueDateLabel && (
            <span className="text-[10px] text-[var(--clean-text-secondary)] font-medium">
              {dueDateLabel}
            </span>
          )}
          {!expanded && checklistTotal > 0 && (
            <span className="text-[10px] text-[var(--clean-text-secondary)]">
              {checklistDone}/{checklistTotal}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!nudgeState.canNudge) return;
            recordNudge(task.id);
            setNudgeVersion((v) => v + 1);
            pingAssignees(kind, task.id, task.title);
          }}
          disabled={!nudgeState.canNudge}
          title={nudgeState.tooltip || (locale === "he" ? "תזכורת למבצעים" : "Ping assignees")}
          className={`p-1.5 flex-shrink-0 transition-colors ${
            nudgeState.canNudge
              ? "text-[var(--clean-text-secondary)] hover:text-[var(--clean-accent)] hover:bg-[var(--clean-accent)]/5"
              : "text-gray-300 cursor-not-allowed"
          }`}
          aria-label="Nudge"
        >
          <Bell className="w-4 h-4" strokeWidth={1.75} />
        </button>
        {expanded && (
          <>
            {canEditAssign ? (
              <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                <UserSelector
                  users={internalUsers}
                  multiple
                  multipleValue={assigneeIds}
                  onChange={() => {}}
                  onMultipleChange={(userIds) => {
                    updateTask(task.id, {
                      assigneeIds: userIds,
                      assigneeUserId: userIds[0],
                    });
                  }}
                  locale={locale}
                  placeholder={locale === "he" ? "בחר משתמשים" : "Select users"}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
                {assignees.length > 0 ? (
                  assignees.map((u) => (
                    <UserAvatar key={u!.userId} name={u!.name} email={u!.email} imageUrl={u!.avatar} size="sm" />
                  ))
                ) : (
                  <UserAvatar email={task.otherParty} size="sm" />
                )}
                <p className="text-xs text-[var(--clean-text-secondary)] truncate max-w-[120px]">
                  {assignees.length > 0 ? assignees.map((u) => u!.name).join(", ") : task.otherParty}
                </p>
              </div>
            )}
            {task.done && task.doneNotifiedAt != null && (
              <span className="text-xs text-[var(--clean-accent)] flex items-center gap-0.5 flex-shrink-0" title="Sender notified">
                {t(locale, "board.notified")}
              </span>
            )}
            <span onClick={(e) => e.stopPropagation()}>
              <MediaToolbox
                onAddAttachment={addTaskAttachment}
                locale={locale}
                disabled={!canUseMedia}
                count={(task.attachments ?? []).length}
              />
            </span>
            {canDeleteArchive && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveTask(task.id);
                  }}
                  className="p-1.5 text-[var(--clean-text-secondary)] hover:text-amber-600 hover:bg-amber-50 flex-shrink-0 transition-colors"
                  title={locale === "he" ? "ארכב" : "Archive"}
                  aria-label="Archive"
                >
                  <Archive className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTask(task.id);
                  }}
                  className="p-1.5 text-[var(--clean-text-secondary)] hover:text-red-600 hover:bg-red-50 flex-shrink-0 transition-colors"
                  title={locale === "he" ? "מחק" : "Delete"}
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </>
            )}
          </>
        )}
        <span className="p-1 text-[var(--clean-text-secondary)] flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" strokeWidth={1.75} /> : <ChevronDown className="w-4 h-4" strokeWidth={1.75} />}
        </span>
      </div>

      {expanded && checklistTotal > 0 && (
        <div className="px-4 pb-3 pl-6">
          <div className="h-1 bg-[var(--clean-border)] overflow-hidden">
            <motion.div
              className="h-full bg-[var(--clean-accent)]"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
          <p className="text-xs text-[var(--clean-text-secondary)] mt-1">
            {checklistDone}/{checklistTotal} sub-tasks
          </p>
        </div>
      )}

      {expanded && task.checklist.length > 0 && (
        <div className="border-t border-[var(--clean-border)] px-4 py-3 pl-6 space-y-1.5 bg-white">
          {task.checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => canCheck && toggleChecklistItem(item.id, e.target.checked)}
                disabled={!canCheck}
                className="w-4 h-4 border-[var(--clean-border)] text-[var(--clean-accent)] accent-[var(--clean-accent)]"
              />
              {canEditAssign ? (
                <>
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
                    className="flex-1 min-w-0 text-[13px] border border-[var(--clean-border)] px-2 py-1 focus:border-[var(--clean-accent)] outline-none"
                  />
                  <UserSelector
                    users={internalUsers}
                    value={item.assignedTo}
                    onChange={(userId) => {
                      const next = task.checklist.map((c) =>
                        c.id === item.id ? { ...c, assignedTo: userId } : c
                      );
                      updateTask(task.id, { checklist: next });
                    }}
                    locale={locale}
                  />
                </>
              ) : (
                <span className="flex-1 min-w-0 text-[13px] text-[var(--clean-text)]">{item.label || "—"}</span>
              )}
              <MediaToolbox
                onAddAttachment={(att) => addChecklistItemAttachment(item.id, att)}
                locale={locale}
                disabled={!canUseMedia}
                count={(item.attachments ?? []).length}
              />
            </div>
          ))}
          {canEditAssign && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={addChecklistItem} className="text-xs text-[var(--clean-accent)] hover:underline">
                + Add sub-task
              </button>
              <button
                type="button"
                onClick={generateChecklistFromTitle}
                className="inline-flex items-center gap-1 text-xs text-[var(--clean-accent)] hover:underline"
                title={locale === "he" ? "צור רשימה מהכותרת" : "Generate checklist from task title"}
              >
                <ListChecks className="w-3.5 h-3.5" />
                {locale === "he" ? "צור רשימה" : "Generate Checklist"}
              </button>
            </div>
          )}
        </div>
      )}

      {expanded && task.checklist.length === 0 && canEditAssign && (
        <div className="border-t border-[var(--clean-border)] px-4 py-3 pl-6 flex flex-wrap items-center gap-2">
          <button type="button" onClick={addChecklistItem} className="text-sm text-[var(--clean-accent)] hover:underline">
            + Add checklist
          </button>
          <button
            type="button"
            onClick={generateChecklistFromTitle}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--clean-accent)] hover:underline"
            title={locale === "he" ? "צור רשימה מהכותרת" : "Generate checklist from task title"}
          >
            <ListChecks className="w-4 h-4" />
            {locale === "he" ? "צור רשימה מהכותרת" : "Generate Checklist"}
          </button>
        </div>
      )}

      {expanded && (
        <div className="border-t border-[var(--clean-border)] px-4 py-3 pl-6 bg-white space-y-2">
          <p className="text-xs font-medium text-[var(--clean-text-secondary)] flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
            {locale === "he" ? "תגובות" : "Comments"}
          </p>
          {comments.length > 0 ? (
            <ul className="space-y-1.5">
              {comments.map((c) => (
                <li key={c.id} className="text-xs text-[var(--clean-text)] pl-2 border-l-2 border-[var(--clean-accent)]">
                  {c.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--clean-text-secondary)]">{locale === "he" ? "אין תגובות עדיין." : "No comments yet."}</p>
          )}

          {canComment && (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
                placeholder={locale === "he" ? "כתוב עדכון..." : "Write an update..."}
                className="flex-1 min-w-0 text-[13px] border border-[var(--clean-border)] px-2 py-1.5 bg-white focus:border-[var(--clean-accent)] outline-none"
              />
              <MediaToolbox
                onAddAttachment={addCommentAttachment}
                locale={locale}
                disabled={!canUseMedia}
                count={commentAttachments.length}
              />
              <button
                type="button"
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="px-2.5 py-1.5 bg-[var(--clean-accent)] text-white text-[13px] font-medium disabled:opacity-50 transition-colors"
              >
                {locale === "he" ? "שלח" : "Send"}
              </button>
            </div>
          )}
        </div>
      )}
      </div>
    </motion.div>
  );
}
