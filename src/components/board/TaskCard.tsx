"use client";

import { useState } from "react";
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
import { Check, ChevronDown, ChevronUp, Trash2, Archive, Bell, MessageSquare } from "lucide-react";
import { generateUUID } from "@/lib/uuid";

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
  const [expanded, setExpanded] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<TaskAttachment[]>([]);

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

  return (
    <motion.div
      layout
      initial={false}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`rounded-sm bg-white overflow-hidden border border-gray-200 ${
        selected ? "ring-2 ring-accent/30 shadow-glow-subtle" : "shadow-soft"
      } ${task.done ? "shadow-glow-subtle" : ""}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((e) => !e)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded((x) => !x);
        }}
        className="w-full p-3 flex items-start gap-3 text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
        aria-expanded={expanded}
      >
        {onToggleSelect != null && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:border-accent transition-colors"
            aria-label={selected ? "Deselect" : "Select for summary"}
          >
            {selected && <Check className="w-3 h-3 text-accent" />}
          </button>
        )}
        <motion.span
          whileTap={canCheck ? { scale: 0.9 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex-shrink-0 mt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={task.done}
            onChange={(e) => canCheck && handleDoneChange(e.target.checked)}
            disabled={!canCheck}
            title={!canCheck ? (locale === "he" ? "רק המבצע יכול לסמן כהושלם" : "Only assignees can mark done") : undefined}
            className="w-5 h-5 rounded-sm border-2 border-gray-300 text-accent focus:ring-accent accent-accent disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </motion.span>
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <span className={`font-medium ${task.done ? "text-gray-500 line-through" : "text-gray-900"}`}>
            {task.title || "Untitled task"}
          </span>
          {canEditAssign ? (
            <div onClick={(e) => e.stopPropagation()}>
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
            <div className="flex items-center gap-1.5 flex-wrap">
              {assignees.length > 0 ? (
                assignees.map((u) => (
                  <UserAvatar key={u!.userId} name={u!.name} email={u!.email} imageUrl={u!.avatar} size="sm" />
                ))
              ) : (
                <UserAvatar email={task.otherParty} size="sm" />
              )}
              <p className="text-xs text-gray-500 truncate">
                {kind === "given" ? (locale === "he" ? "מבצעים:" : "Assignees:") : (locale === "he" ? "מאת:" : "From:")}{" "}
                {assignees.length > 0 ? assignees.map((u) => u!.name).join(", ") : task.otherParty}
              </p>
            </div>
          )}
        </div>
        {task.done && task.doneNotifiedAt != null && (
          <span className="text-xs text-accent flex items-center gap-0.5 flex-shrink-0" title="Sender notified">
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            pingAssignees(kind, task.id, task.title);
          }}
          className="p-1.5 rounded-sm text-[#008080] hover:bg-[#008080]/10 flex-shrink-0"
          title={locale === "he" ? "תזכורת למבצעים" : "Ping assignees"}
          aria-label="Ping"
        >
          <Bell className="w-4 h-4" />
        </button>
        {canDeleteArchive && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                archiveTask(task.id);
              }}
              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-sm flex-shrink-0"
              title={locale === "he" ? "ארכב" : "Archive"}
              aria-label="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTask(task.id);
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-sm flex-shrink-0"
              title={locale === "he" ? "מחק" : "Delete"}
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        <span className="p-1 text-gray-500 rounded-sm flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
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
                onChange={(e) => canCheck && toggleChecklistItem(item.id, e.target.checked)}
                disabled={!canCheck}
                className="w-4 h-4 rounded-sm border-gray-300 text-accent accent-accent"
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
                    className="flex-1 min-w-0 text-sm rounded-sm border border-gray-200 px-2 py-1"
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
                <span className="flex-1 min-w-0 text-sm text-gray-700">{item.label || "—"}</span>
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
            <button
              type="button"
              onClick={addChecklistItem}
              className="text-xs text-accent hover:underline"
            >
              + Add sub-task
            </button>
          )}
        </div>
      )}

      {expanded && task.checklist.length === 0 && canEditAssign && (
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

      {expanded && (
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/50 space-y-2">
          <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {locale === "he" ? "תגובות" : "Comments"}
          </p>
          {comments.length > 0 ? (
            <ul className="space-y-1.5">
              {comments.map((c) => (
                <li key={c.id} className="text-xs text-gray-700 pl-2 border-l-2 border-[#008080]/30">
                  {c.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400">{locale === "he" ? "אין תגובות עדיין." : "No comments yet."}</p>
          )}

          {canComment && (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
                placeholder={locale === "he" ? "כתוב עדכון..." : "Write an update..."}
                className="flex-1 min-w-0 text-sm rounded-sm border border-gray-200 px-2 py-1.5 bg-white"
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
                className="px-2.5 py-1.5 rounded-sm bg-[#008080] text-white text-sm font-medium disabled:opacity-50"
              >
                {locale === "he" ? "שלח" : "Send"}
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
