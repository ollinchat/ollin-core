"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, Circle, ChevronDown, ChevronUp, Trash2, Bell, MessageSquare, Paperclip, X, Mic, ImagePlus, Pencil, Repeat } from "lucide-react";
import type { RecurringChecklist, RecurringChecklistItem, RecurringChecklistItemAttachment, RecurringChecklistItemFeedback } from "@/lib/recurring-checklist-types";
import type { TaskAttachmentType } from "@/lib/board-types";
import { useChecklists } from "@/contexts/ChecklistsContext";
import { useBoard } from "@/contexts/BoardContext";
import { useProfile } from "@/contexts/ProfileContext";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { MediaToolbox } from "./MediaToolbox";

type RecurringChecklistCardProps = {
  checklist: RecurringChecklist;
  /** When true (Founder view), show who it's assigned to */
  showAssignedTo?: boolean;
  assignedToLabel?: string;
  locale: "en" | "he";
  /** Current user ID; only creator can add/remove items and delete checklist */
  currentUserId?: string;
};

/** High-quality circular progress ring (SVG) */
function ScoreCircle({ score, size = 48 }: { score: number; size?: number }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-[var(--clean-border)]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-[var(--clean-accent)] transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-[var(--clean-text)] tabular-nums">
        {score}%
      </span>
    </div>
  );
}

export function RecurringChecklistCard({
  checklist,
  showAssignedTo,
  assignedToLabel,
  locale,
  currentUserId,
}: RecurringChecklistCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(checklist.title);
  const [feedbackTrayItemId, setFeedbackTrayItemId] = useState<string | null>(null);
  const [feedbackTrayText, setFeedbackTrayText] = useState("");
  const [feedbackTrayAttachments, setFeedbackTrayAttachments] = useState<RecurringChecklistItemAttachment[]>([]);
  const [feedbackTrayVisible, setFeedbackTrayVisible] = useState(false);
  const feedbackPhotoRef = useRef<HTMLInputElement>(null);
  const { toggleItem, addItem, removeItem, updateChecklist } = useChecklists();

  useEffect(() => {
    if (feedbackTrayItemId) setFeedbackTrayVisible(true);
    else setFeedbackTrayVisible(false);
  }, [feedbackTrayItemId]);
  useEffect(() => {
    setEditTitleValue(checklist.title);
  }, [checklist.title]);
  const isCreator = currentUserId && checklist.createdBy === currentUserId;
  const isReceived = currentUserId && checklist.assignedTo === currentUserId && !isCreator;
  const canToggle = currentUserId && checklist.assignedTo === currentUserId;
  const commentsDisabled = !!checklist.disableComments;

  const handleToggle = (itemId: string) => {
    if (!canToggle) return;
    toggleItem(checklist.id, itemId);
  };

  const handleAddItem = () => {
    const t = newItemText.trim();
    if (!t) return;
    addItem(checklist.id, t);
    setNewItemText("");
  };

  const mapAttachmentType = (t: TaskAttachmentType): RecurringChecklistItemAttachment["type"] => {
    if (t === "image" || t === "video" || t === "camera") return "photo";
    return "document";
  };
  const handleAddAttachment = (
    item: RecurringChecklistItem,
    att: { type: TaskAttachmentType; url: string; name?: string }
  ) => {
    if (!isCreator) return;
    const mapped: RecurringChecklistItemAttachment = {
      type: mapAttachmentType(att.type),
      url: att.url,
      name: att.name,
    };
    const nextItems = checklist.items.map((i) =>
      i.id === item.id ? { ...i, attachments: [...(i.attachments ?? []), mapped] } : i
    );
    updateChecklist(checklist.id, { items: nextItems });
  };

  const openFeedbackTray = (item: RecurringChecklistItem) => {
    if (commentsDisabled || !canToggle) return;
    setFeedbackTrayItemId(item.id);
    setFeedbackTrayText(item.feedback?.text ?? "");
    setFeedbackTrayAttachments(item.feedback?.attachments ?? []);
  };

  const saveFeedbackTray = () => {
    if (!feedbackTrayItemId) return;
    const feedback: RecurringChecklistItemFeedback = {
      text: feedbackTrayText.trim() || undefined,
      attachments: feedbackTrayAttachments.length > 0 ? feedbackTrayAttachments : undefined,
      updatedAt: Date.now(),
    };
    const nextItems = checklist.items.map((i) =>
      i.id === feedbackTrayItemId ? { ...i, feedback } : i
    );
    updateChecklist(checklist.id, { items: nextItems });
    setFeedbackTrayItemId(null);
    setFeedbackTrayText("");
    setFeedbackTrayAttachments([]);
  };

  const addFeedbackAttachment = (att: { type: TaskAttachmentType; url: string; name?: string }) => {
    const mapped: RecurringChecklistItemAttachment = {
      type: mapAttachmentType(att.type),
      url: att.url,
      name: att.name,
    };
    setFeedbackTrayAttachments((prev) => [...prev, mapped]);
  };

  const hasFeedback = (item: RecurringChecklistItem) => {
    const f = item.feedback;
    return !!(f?.text?.trim() || (f?.attachments && f.attachments.length > 0) || f?.voiceUrl);
  };

  const handlePing = (item: RecurringChecklistItem) => {
    if (typeof window !== "undefined") {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Ollin reminder", { body: `${checklist.title}: ${item.text}` });
      }
      // Stub: in production would send push to assigned users
    }
  };

  const handleSaveTitle = () => {
    const v = editTitleValue.trim();
    if (v && v !== checklist.title) updateChecklist(checklist.id, { title: v });
    setEditingTitle(false);
  };

  return (
    <div className={`clean-card overflow-visible flex ${isCreator ? "border-l-4 border-l-[var(--clean-accent)]/60" : ""}`}>
      <div className="w-[3px] flex-shrink-0 bg-[var(--clean-accent)]" aria-hidden />
      <div className="flex-1 min-w-0">
      <button
        type="button"
        onClick={() => !editingTitle && setExpanded((e) => !e)}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-[var(--clean-border)]/50 transition-colors"
      >
        <ScoreCircle score={checklist.currentScore} />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {isCreator && (
            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--clean-accent)] bg-[var(--clean-accent)]/10 rounded">
              {locale === "he" ? "בעלים" : "Owner"}
            </span>
          )}
          {showAssignedTo && (assignedToLabel || checklist.assignedTo) && (
            <UserAvatar name={checklist.assignedTo} size="sm" className="flex-shrink-0" />
          )}
          <div className="min-w-0">
            {editingTitle ? (
              <input
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") { setEditTitleValue(checklist.title); setEditingTitle(false); } }}
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-[13px] text-[var(--clean-text)] tracking-wide w-full px-1 py-0.5 border border-[var(--clean-accent)] rounded focus:outline-none"
                autoFocus
              />
            ) : (
              <h3 className="font-medium text-[13px] text-[var(--clean-text)] tracking-wide truncate">{checklist.title}</h3>
            )}
            <p className="text-xs text-[var(--clean-text-secondary)] capitalize">{checklist.frequency}</p>
            {showAssignedTo && assignedToLabel && (
              <p className="text-xs text-[var(--clean-accent)] mt-0.5 truncate">{assignedToLabel}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Repeat (תזמון) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRepeatOpen((o) => !o); }}
              className="p-1.5 rounded text-[var(--clean-text-secondary)] hover:text-[var(--clean-accent)] hover:bg-[var(--clean-accent)]/10 transition-colors"
              title={locale === "he" ? "תזמון" : "Repeat"}
              aria-label={locale === "he" ? "תזמון" : "Repeat"}
            >
              <Repeat className="w-4 h-4" strokeWidth={1.75} />
            </button>
            {repeatOpen && (
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setRepeatOpen(false)} aria-hidden />
                <div className="absolute right-0 top-full mt-1 z-[9999] min-w-[120px] rounded border border-[var(--clean-border)] bg-white shadow-lg py-1" style={{ position: "absolute" }}>
                  {(["daily", "weekly", "monthly"] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => {
                        const isChange = checklist.frequency !== freq;
                        updateChecklist(checklist.id, { frequency: freq });
                        setRepeatOpen(false);
                        if (isChange && currentUserIdForTask && isCreator) {
                          const now = new Date();
                          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                          addGivenTask({
                            title: checklist.title,
                            otherParty: "—",
                            checklist: [],
                            done: false,
                            creatorId: currentUserIdForTask,
                            priority: "low",
                            dueDate: todayStart,
                            recurringChecklistId: checklist.id,
                            assigneeIds: checklist.assignedTo ? [checklist.assignedTo] : undefined,
                            assigneeUserId: checklist.assignedTo,
                          });
                        }
                      }}
                      className={`w-full px-3 py-2 text-left text-[12px] font-medium transition-colors ${checklist.frequency === freq ? "text-[var(--clean-accent)] bg-[var(--clean-accent)]/10" : "text-[var(--clean-text)] hover:bg-gray-100"}`}
                    >
                      {freq === "daily" ? (locale === "he" ? "יומי" : "Daily") : freq === "weekly" ? (locale === "he" ? "שבועי" : "Weekly") : locale === "he" ? "חודשי" : "Monthly"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {isCreator && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); setEditingTitle(true); }} className="p-1.5 rounded text-[var(--clean-text-secondary)] hover:text-[var(--clean-accent)] hover:bg-[var(--clean-accent)]/10 transition-colors" title={locale === "he" ? "ערוך" : "Edit"} aria-label="Edit">
                <Pencil className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); if (typeof window !== "undefined" && window.confirm(locale === "he" ? "למחוק את הרשימה?" : "Delete this checklist?")) removeChecklist(checklist.id); }} className="p-1.5 rounded text-[var(--clean-text-secondary)] hover:text-red-500 hover:bg-red-50 transition-colors" title={locale === "he" ? "מחק" : "Delete"} aria-label="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-[var(--clean-text-secondary)] shrink-0" strokeWidth={1.75} />
        ) : (
          <ChevronDown className="w-5 h-5 text-[var(--clean-text-secondary)] shrink-0" strokeWidth={1.75} />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-[var(--clean-border)] space-y-2">
          <ul className="space-y-1">
            {checklist.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => canToggle && handleToggle(item.id)}
                  disabled={!canToggle}
                  className={`flex items-center gap-2 w-full text-left py-1.5 px-2 hover:bg-[var(--clean-border)]/50 transition-colors ${!canToggle ? "opacity-75 cursor-not-allowed" : ""}`}
                >
                  <span className="flex-shrink-0 w-5 h-5 border border-[var(--clean-border)] flex items-center justify-center">
                    {item.isDone ? (
                      <Check className="w-3 h-3 text-[var(--clean-accent)]" strokeWidth={2.5} />
                    ) : (
                      <Circle className="w-3 h-3 text-[var(--clean-border)]" strokeWidth={1.75} />
                    )}
                  </span>
                  <span
                    className={`flex-1 text-[13px] ${item.isDone ? "text-[var(--clean-text-secondary)] line-through" : "text-[var(--clean-text)]"}`}
                  >
                    {item.text}
                  </span>
                  {hasFeedback(item) && (
                    <span className="flex-shrink-0 text-[var(--clean-accent)]" title={locale === "he" ? "יש תגובה" : "Has feedback"}>
                      <Paperclip className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </span>
                  )}
                </button>
                {!isReceived && !commentsDisabled && canToggle && (
                  <button
                    type="button"
                    onClick={() => openFeedbackTray(item)}
                    className={`p-1 flex-shrink-0 transition-colors ${feedbackTrayItemId === item.id ? "bg-[var(--clean-accent)]/10 text-[var(--clean-accent)]" : "text-[var(--clean-text-secondary)] hover:bg-[var(--clean-accent)]/5 hover:text-[var(--clean-accent)]"}`}
                    title={locale === "he" ? "תגובה / מדיה" : "Comment / feedback"}
                    aria-label="Comment"
                  >
                    <MessageSquare className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                )}
                {!isReceived && (
                  <button
                    type="button"
                    onClick={() => handlePing(item)}
                    className="p-1 text-[var(--clean-text-secondary)] hover:text-[var(--clean-accent)] hover:bg-[var(--clean-accent)]/5 flex-shrink-0 transition-colors"
                    title={locale === "he" ? "שלח תזכורת" : "Send reminder (ping)"}
                    aria-label="Ping"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                )}
                {!isReceived && (
                  <MediaToolbox
                    onAddAttachment={(att) => handleAddAttachment(item, att)}
                    locale={locale}
                    disabled={!isCreator && !canToggle}
                    count={(item.attachments ?? []).length}
                  />
                )}
                {isCreator && (
                  <>
                    <button
                      type="button"
                      onClick={() => removeItem(checklist.id, item.id)}
                      className="p-1 text-[var(--clean-text-secondary)] hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label={locale === "he" ? "מחק" : "Remove"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {/* Feedback tray: bottom sheet (slide up) with colorful action icons */}
          {feedbackTrayItemId && (
            <>
              <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => { setFeedbackTrayItemId(null); setFeedbackTrayText(""); setFeedbackTrayAttachments([]); }} aria-hidden />
              <div
                className="fixed left-0 right-0 bottom-0 z-50 rounded-t-sm bg-white border-t border-gray-100 shadow-lg transition-transform duration-200 ease-out"
                style={{ transform: feedbackTrayVisible ? "translateY(0)" : "translateY(100%)" }}
              >
                <input
                  ref={feedbackPhotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => addFeedbackAttachment({ type: "image", url: reader.result as string, name: file.name });
                      reader.readAsDataURL(file);
                    }
                    e.target.value = "";
                  }}
                />
                <div className="p-4 pb-safe space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{locale === "he" ? "תגובה / מדיה" : "Comment & feedback"}</span>
                    <button type="button" onClick={() => { setFeedbackTrayItemId(null); setFeedbackTrayText(""); setFeedbackTrayAttachments([]); }} className="p-2 rounded-sm text-gray-400 hover:bg-gray-100" aria-label="Close">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <textarea
                    value={feedbackTrayText}
                    onChange={(e) => setFeedbackTrayText(e.target.value)}
                    placeholder={locale === "he" ? "הקלד תגובה..." : "Type a response..."}
                    rows={3}
                    className="w-full px-4 py-3 rounded-sm bg-gray-100 border-0 text-gray-900 placeholder-gray-500 text-sm resize-none focus:ring-2 focus:ring-[#008080] focus:bg-white transition-all"
                  />
                  <div className="flex items-center justify-center gap-4 py-2">
                    <button type="button" className="flex flex-col items-center gap-1.5 p-3 rounded-sm bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors min-w-[64px]" title={locale === "he" ? "הקלטת קול" : "Voice note"} aria-label="Voice">
                      <Mic className="w-5 h-5" strokeWidth={2} />
                      <span className="text-xs font-medium">Voice</span>
                    </button>
                    <button type="button" onClick={() => feedbackPhotoRef.current?.click()} className="flex flex-col items-center gap-1.5 p-3 rounded-sm bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors min-w-[64px]" aria-label="Photo">
                      <ImagePlus className="w-5 h-5" strokeWidth={2} />
                      <span className="text-xs font-medium">Photo</span>
                    </button>
                    <div className="flex flex-col items-center min-w-[64px]">
                      <MediaToolbox
                        onAddAttachment={addFeedbackAttachment}
                        locale={locale}
                        disabled={false}
                        count={feedbackTrayAttachments.length}
                      />
                      <span className="text-xs font-medium text-gray-500 mt-1.5">Files</span>
                    </div>
                  </div>
                  <button type="button" onClick={saveFeedbackTray} className="w-full py-3 rounded-sm bg-[#008080] text-white text-sm font-bold hover:bg-[#006666] transition-colors">
                    {locale === "he" ? "שמור" : "Save"}
                  </button>
                </div>
              </div>
            </>
          )}
          {isCreator && (
          <div className="flex gap-2 pt-3 border-t border-[var(--clean-border)] mt-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              placeholder={locale === "he" ? "הוסף פריט לרשימה..." : "Add item to checklist..."}
              className="flex-1 min-w-0 px-3 py-2 rounded border border-[var(--clean-border)] bg-white text-[13px] font-medium text-[var(--clean-text)] placeholder-[var(--clean-text-secondary)] focus:border-[var(--clean-accent)] outline-none transition-colors"
            />
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-2 rounded bg-[var(--clean-accent)] text-white text-[13px] font-medium hover:bg-[var(--clean-accent-hover)] transition-colors shrink-0"
            >
              +
            </button>
          </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
