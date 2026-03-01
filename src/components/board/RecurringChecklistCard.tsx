"use client";

import React, { useState } from "react";
import { Check, Circle, ChevronDown, ChevronUp, Trash2, Bell } from "lucide-react";
import type { RecurringChecklist, RecurringChecklistItem, RecurringChecklistItemAttachment } from "@/lib/recurring-checklist-types";
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

/** Circular progress 0-100 */
function ScoreCircle({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const stroke = (score / 100) * circumference;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - stroke}
          className="text-[#008080] transition-all duration-300"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
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
  const { toggleItem, addItem, removeItem, updateChecklist } = useChecklists();
  const isCreator = currentUserId && checklist.createdBy === currentUserId;
  const canToggle = currentUserId && checklist.assignedTo === currentUserId;

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

  const handlePing = (item: RecurringChecklistItem) => {
    if (typeof window !== "undefined") {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Ollin reminder", { body: `${checklist.title}: ${item.text}` });
      }
      // Stub: in production would send push to assigned users
    }
  };

  return (
    <div className="rounded-sm bg-white border border-gray-200 shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-gray-50/50 transition-colors"
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
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 space-y-2">
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
                </button>
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
