// Strategic Board: tasks, meetings, events

/** Media/attachment on a task or checklist item */
export type TaskAttachmentType = "file" | "image" | "video" | "camera" | "scan" | "location";

export interface TaskAttachment {
  id: string;
  type: TaskAttachmentType;
  url: string;
  name?: string;
  /** For location: lat,lng or place name */
  meta?: string;
  createdAt: number;
}

/** Reply/comment on a task (e.g. assignee update on RECEIVED tasks) */
export interface TaskReply {
  id: string;
  userId: string;
  text: string;
  attachments?: TaskAttachment[];
  createdAt: number;
}

export interface TaskComment {
  id: string;
  userId: string;
  text: string;
  attachments?: TaskAttachment[];
  createdAt: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  /** Internal user ID (7-digit) for assignment; use UserSelector, not email */
  assignedTo?: string;
  attachments?: TaskAttachment[];
}

export interface BoardTask {
  id: string;
  title: string;
  checklist: ChecklistItem[];
  done: boolean;
  /** When task is RECEIVED, this is who assigned it; when GIVEN, this is who we assigned it to (display only) */
  otherParty: string;
  /** When task is RECEIVED, contact id of sender (for task-permission filtering). */
  senderContactId?: string;
  /** Multi-assign: internal user IDs (7-digit). Use UserSelector with avatars. */
  assigneeIds?: string[];
  /**
   * Legacy fields (backward compat with older saved board data).
   * Prefer `assigneeIds`.
   */
  assigneeId?: string;
  assigneeUserId?: string;
  observerIds?: string[];
  /** Timestamp when "Done" was toggled (for notification to sender) */
  doneNotifiedAt?: number;
  /** User ID of creator; only creator can edit, delete, or archive */
  creatorId?: string;
  /** Optional due date (ms) for calendar display */
  dueDate?: number;
  /** Reminder: minutes before due date (e.g. 15, 60, 1440) */
  reminderMinutesBefore?: number;
  /** Priority for accent bar (green / yellow / red) */
  priority?: "low" | "medium" | "high";
  /** Task-level attachments (proof of completion, updates) */
  attachments?: TaskAttachment[];
  /** Comments thread (creator + assignees can post text/media) */
  comments?: TaskComment[];
  /** Legacy comments field */
  replies?: TaskReply[];
  /** Archived: hidden from active board, shown in History/Archive */
  archived?: boolean;
  archivedAt?: number;
  createdAt: number;
  /** When set, this task was auto-created from a recurring checklist (link back to checklist) */
  recurringChecklistId?: string;
}

export type RSVPStatus = "attending" | "not_attending" | "pending";

export interface MeetingOrEvent {
  id: string;
  title: string;
  startAt: number;
  endAt?: number;
  location?: string;
  description?: string;
  /** Optional cover/header image (data URL or URL) */
  imageUrl?: string;
  /** Guest list with RSVP */
  guests: { email: string; name?: string; rsvp: RSVPStatus }[];
  /** Show full guest list (true) or just total count (false) */
  showFullGuestList: boolean;
  type: "meeting" | "event";
  /** User ID of creator; only creator can edit, delete, or archive */
  creatorId?: string;
  archived?: boolean;
  archivedAt?: number;
  createdAt: number;
}

export type BoardItemType = "task" | "meeting" | "event";

export interface SummarySelection {
  taskIds: string[];
  meetingIds: string[];
  eventIds: string[];
}
