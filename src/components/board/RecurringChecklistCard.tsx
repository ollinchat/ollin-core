"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, Circle, ChevronDown, ChevronUp, Trash2, Bell, MessageSquare, Paperclip, X, Mic, ImagePlus } from "lucide-react";
import type { RecurringChecklist, RecurringChecklistItem, RecurringChecklistItemAttachment, RecurringChecklistItemFeedback } from "@/lib/recurring-checklist-types";
import type { TaskAttachmentType } from "@/lib/board-types";
import { useChecklists } from "@/contexts/ChecklistsContext";
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
          className="text-gray-100"
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
          className="text-[#008080] transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700 tabular-nums">
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
  const [expanded, setExpanded] = useState(true);
  const [newItemText, setNewItemText] = useState("");
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
  const isCreator = currentUserId && checklist.createdBy === currentUserId;
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

  return (
    <div className="rounded-sm bg-white border border-gray-100 overflow-hidden transition-all duration-150 hover:border-gray-200">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        <ScoreCircle score={checklist.currentScore} />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {showAssignedTo && (assignedToLabel || checklist.assignedTo) && (
            <UserAvatar name={checklist.assignedTo} size="sm" className="flex-shrink-0" />
          )}
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{checklist.title}</h3>
            <p className="text-xs text-gray-500 capitalize">{checklist.frequency}</p>
            {showAssignedTo && assignedToLabel && (
              <p className="text-xs text-[#008080] mt-0.5 truncate">{assignedToLabel}</p>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100/80 space-y-2">
          <ul className="space-y-1">
            {checklist.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => canToggle && handleToggle(item.id)}
                  disabled={!canToggle}
                  className={`flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-sm hover:bg-gray-50 transition-colors ${!canToggle ? "opacity-75 cursor-not-allowed" : ""}`}
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-sm border-2 flex items-center justify-center border-gray-300">
                    {item.isDone ? (
                      <Check className="w-3 h-3 text-[#008080]" strokeWidth={3} />
                    ) : (
                      <Circle className="w-3 h-3 text-gray-300" />
                    )}
                  </span>
                  <span
                    className={`flex-1 text-sm ${item.isDone ? "text-gray-500 line-through" : "text-gray-900"}`}
                  >
                    {item.text}
                  </span>
                  {hasFeedback(item) && (
                    <span className="flex-shrink-0 text-[#008080]" title={locale === "he" ? "יש תגובה" : "Has feedback"}>
                      <Paperclip className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
                {!commentsDisabled && canToggle && (
                  <button
                    type="button"
                    onClick={() => openFeedbackTray(item)}
                    className={`p-1 rounded-sm flex-shrink-0 ${feedbackTrayItemId === item.id ? "bg-[#008080]/15 text-[#008080]" : "text-gray-500 hover:bg-[#008080]/10 hover:text-[#008080]"}`}
                    title={locale === "he" ? "תגובה / מדיה" : "Comment / feedback"}
                    aria-label="Comment"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handlePing(item)}
                  className="p-1 rounded-sm text-[#008080] hover:bg-[#008080]/10 flex-shrink-0"
                  title={locale === "he" ? "שלח תזכורת" : "Send reminder (ping)"}
                  aria-label="Ping"
                >
                  <Bell className="w-4 h-4" />
                </button>
                <MediaToolbox
                  onAddAttachment={(att) => handleAddAttachment(item, att)}
                  locale={locale}
                  disabled={!isCreator && !canToggle}
                  count={(item.attachments ?? []).length}
                />
                {isCreator && (
                  <>
                    <button
                      type="button"
                      onClick={() => removeItem(checklist.id, item.id)}
                      className="p-1 rounded-sm text-gray-400 hover:text-red-500 hover:bg-red-50"
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
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              placeholder={locale === "he" ? "פריט חדש..." : "New item..."}
              className="flex-1 px-2.5 py-1.5 rounded-sm border border-gray-200 text-sm"
            />
            <button
              type="button"
              onClick={handleAddItem}
              className="px-2.5 py-1.5 rounded-sm bg-[#008080] text-white text-sm font-medium"
            >
              +
            </button>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
