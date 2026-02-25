// Strategic Board: tasks, meetings, events

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  assignedTo?: string; // email or user id
}

export interface BoardTask {
  id: string;
  title: string;
  checklist: ChecklistItem[];
  done: boolean;
  /** When task is RECEIVED, this is who assigned it; when GIVEN, this is who we assigned it to */
  otherParty: string;
  /** Primary assignee contact id (who can check it done). Required for assignment. */
  assigneeId?: string;
  /** Assignee's 7-digit user ID for permission check (only they can mark done). */
  assigneeUserId?: string;
  /** Observer contact ids (can view, cannot check off). */
  observerIds?: string[];
  /** Timestamp when "Done" was toggled (for notification to sender) */
  doneNotifiedAt?: number;
  createdAt: number;
}

export type RSVPStatus = "attending" | "not_attending" | "pending";

export interface MeetingOrEvent {
  id: string;
  title: string;
  startAt: number;
  endAt?: number;
  location?: string;
  description?: string;
  /** Guest list with RSVP */
  guests: { email: string; name?: string; rsvp: RSVPStatus }[];
  /** Show full guest list (true) or just total count (false) */
  showFullGuestList: boolean;
  type: "meeting" | "event";
  createdAt: number;
}

export type BoardItemType = "task" | "meeting" | "event";

export interface SummarySelection {
  taskIds: string[];
  meetingIds: string[];
  eventIds: string[];
}
