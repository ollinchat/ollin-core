/**
 * Recurring checklists & performance scoring
 */

export type AttachmentType = "photo" | "pdf" | "document";

export interface RecurringChecklistItemAttachment {
  type: AttachmentType;
  url: string;
  name?: string;
}

/** Feedback from assignee to creator on a checklist item (comment, media, voice) */
export interface RecurringChecklistItemFeedback {
  text?: string;
  attachments?: RecurringChecklistItemAttachment[];
  voiceUrl?: string;
  updatedAt: number;
}

export interface RecurringChecklistItem {
  id: string;
  text: string;
  isDone: boolean;
  weight: number; // points per item (default 1)
  /** Media/attachments: photo, PDF, or document */
  attachments?: RecurringChecklistItemAttachment[];
  /** Assignee feedback (comment/media/voice) for creator */
  feedback?: RecurringChecklistItemFeedback;
}

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface RecurringChecklist {
  id: string;
  title: string;
  frequency: RecurringFrequency;
  items: RecurringChecklistItem[];
  /** User ID (7-digit) of the person who must complete this checklist */
  assignedTo: string;
  /** User ID of the creator (for Founder view: Emil 0476402 can see checklists he created for others) */
  createdBy: string;
  /** When true, assignees cannot add comments/feedback on items */
  disableComments?: boolean;
  /** 0-100, computed from items */
  currentScore: number;
  /** YYYY-MM-DD of last midnight reset */
  lastResetDate: string;
  createdAt: number;
}

/** One row per checklist per interval for history/graphs (day/week/month/quarter/year) */
export interface PerformanceHistoryEntry {
  id: string;
  checklistId: string;
  date: string; // YYYY-MM-DD
  score: number;
  completedCount: number;
  totalCount: number;
  /** Interval type this snapshot represents */
  periodType: RecurringFrequency;
  /** Interval identifier, e.g. 2025-01-01, 2025-W03, 2025-01, 2025-Q1, 2025 */
  periodId: string;
  /** Human-readable label (Week of 2025‑01‑05, Q3 2025, Jan 2025, etc.) */
  periodLabel: string;
}

export const FOUNDER_USER_ID = "0476402";
