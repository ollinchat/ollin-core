"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type {
  BoardTask,
  MeetingOrEvent,
  RSVPStatus,
  SummarySelection,
} from "@/lib/board-types";
import { loadBoardFromSupabase, saveBoardToSupabase } from "@/lib/supabase-sync";
import { generateUUID } from "@/lib/uuid";

const STORAGE_KEY = "ollin_board";

function loadBoardLocal(): {
  given: BoardTask[];
  received: BoardTask[];
  meetings: MeetingOrEvent[];
  events: MeetingOrEvent[];
} {
  if (typeof window === "undefined")
    return { given: [], received: [], meetings: [], events: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { given: [], received: [], meetings: [], events: [] };
    return JSON.parse(raw);
  } catch {
    return { given: [], received: [], meetings: [], events: [] };
  }
}

function saveBoard(data: ReturnType<typeof loadBoardLocal>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
  saveBoardToSupabase(data).catch(() => {});
}

type BoardContextType = {
  loading: boolean;
  given: BoardTask[];
  received: BoardTask[];
  meetings: MeetingOrEvent[];
  events: MeetingOrEvent[];
  addGivenTask: (task: Omit<BoardTask, "id" | "createdAt">) => void;
  addReceivedTask: (task: Omit<BoardTask, "id" | "createdAt">) => void;
  updateGivenTask: (id: string, updates: Partial<BoardTask>) => void;
  updateReceivedTask: (id: string, updates: Partial<BoardTask>) => void;
  removeGivenTask: (id: string) => void;
  removeReceivedTask: (id: string) => void;
  setTaskDone: (kind: "given" | "received", id: string, done: boolean) => void;
  addMeeting: (m: Omit<MeetingOrEvent, "id" | "createdAt">) => void;
  addEvent: (e: Omit<MeetingOrEvent, "id" | "createdAt">) => void;
  removeMeeting: (id: string) => void;
  removeEvent: (id: string) => void;
  updateMeetingOrEvent: (
    type: "meeting" | "event",
    id: string,
    updates: Partial<MeetingOrEvent>
  ) => void;
  setGuestRSVP: (
    type: "meeting" | "event",
    itemId: string,
    guestEmail: string,
    rsvp: RSVPStatus
  ) => void;
  toggleGuestListVisibility: (type: "meeting" | "event", itemId: string) => void;
  summarySelection: SummarySelection;
  setSummarySelection: (s: SummarySelection | ((prev: SummarySelection) => SummarySelection)) => void;
  notifySenderTaskDone: (taskId: string) => void;
  archiveGivenTask: (id: string) => void;
  archiveReceivedTask: (id: string) => void;
  unarchiveGivenTask: (id: string) => void;
  unarchiveReceivedTask: (id: string) => void;
  archiveMeeting: (id: string) => void;
  archiveEvent: (id: string) => void;
  unarchiveMeeting: (id: string) => void;
  unarchiveEvent: (id: string) => void;
  pingAssignees: (kind: "given" | "received", taskId: string, taskTitle: string) => void;
};

const BoardContext = createContext<BoardContextType | null>(null);

type BoardPayload = {
  given: BoardTask[];
  received: BoardTask[];
  meetings: MeetingOrEvent[];
  events: MeetingOrEvent[];
};

const emptyBoard: BoardPayload = { given: [], received: [], meetings: [], events: [] };

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<BoardPayload>(emptyBoard);
  const [summarySelection, setSummarySelection] = useState<SummarySelection>({
    taskIds: [],
    meetingIds: [],
    eventIds: [],
  });

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadBoardFromSupabase()
      .then((remote) => {
        if (cancelled) return;
        if (remote) {
          setBoard(remote);
          saveBoard(remote);
        } else {
          setBoard(loadBoardLocal());
        }
      })
      .catch(() => {
        if (!cancelled) setBoard(loadBoardLocal());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const updateBoard = useCallback(
    (fn: (prev: ReturnType<typeof loadBoardLocal>) => ReturnType<typeof loadBoardLocal>) => {
      setBoard((prev) => {
        const next = fn(prev);
        saveBoard(next);
        return next;
      });
    },
    []
  );

  const updateMeetingOrEvent = useCallback(
    (type: "meeting" | "event", id: string, updates: Partial<MeetingOrEvent>) => {
      const key = type === "meeting" ? "meetings" : "events";
      updateBoard((prev) => ({
        ...prev,
        [key]: prev[key].map((item) => (item.id === id ? { ...item, ...updates } : item)),
      }));
    },
    [updateBoard]
  );

  const addGivenTask = useCallback(
    (task: Omit<BoardTask, "id" | "createdAt">) => {
      const newTask: BoardTask = {
        ...task,
        id: generateUUID(),
        createdAt: Date.now(),
      };
      updateBoard((prev) => ({ ...prev, given: [newTask, ...prev.given] }));
    },
    [updateBoard]
  );

  const addReceivedTask = useCallback(
    (task: Omit<BoardTask, "id" | "createdAt">) => {
      const newTask: BoardTask = {
        ...task,
        id: generateUUID(),
        createdAt: Date.now(),
      };
      updateBoard((prev) => ({ ...prev, received: [newTask, ...prev.received] }));
    },
    [updateBoard]
  );

  const updateGivenTask = useCallback(
    (id: string, updates: Partial<BoardTask>) => {
      updateBoard((prev) => ({
        ...prev,
        given: prev.given.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }));
    },
    [updateBoard]
  );

  const updateReceivedTask = useCallback(
    (id: string, updates: Partial<BoardTask>) => {
      updateBoard((prev) => ({
        ...prev,
        received: prev.received.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }));
    },
    [updateBoard]
  );

  const removeGivenTask = useCallback(
    (id: string) => {
      updateBoard((prev) => ({ ...prev, given: prev.given.filter((t) => t.id !== id) }));
    },
    [updateBoard]
  );

  const removeReceivedTask = useCallback(
    (id: string) => {
      updateBoard((prev) => ({ ...prev, received: prev.received.filter((t) => t.id !== id) }));
    },
    [updateBoard]
  );

  const setTaskDone = useCallback(
    (kind: "given" | "received", id: string, done: boolean) => {
      if (kind === "given") {
        updateGivenTask(id, {
          done,
          ...(done ? { doneNotifiedAt: Date.now() } : { doneNotifiedAt: undefined }),
        });
      } else {
        updateReceivedTask(id, {
          done,
          ...(done ? { doneNotifiedAt: Date.now() } : { doneNotifiedAt: undefined }),
        });
      }
    },
    [updateGivenTask, updateReceivedTask]
  );

  const notifySenderTaskDone = useCallback((_taskId: string) => {
    // Placeholder: in production would send real-time notification to task sender
  }, []);

  const archiveGivenTask = useCallback(
    (id: string) => {
      updateGivenTask(id, { archived: true, archivedAt: Date.now() });
    },
    [updateGivenTask]
  );

  const archiveReceivedTask = useCallback(
    (id: string) => {
      updateReceivedTask(id, { archived: true, archivedAt: Date.now() });
    },
    [updateReceivedTask]
  );

  const unarchiveGivenTask = useCallback(
    (id: string) => {
      updateGivenTask(id, { archived: false, archivedAt: undefined });
    },
    [updateGivenTask]
  );

  const unarchiveReceivedTask = useCallback(
    (id: string) => {
      updateReceivedTask(id, { archived: false, archivedAt: undefined });
    },
    [updateReceivedTask]
  );

  const archiveMeeting = useCallback(
    (id: string) => {
      updateMeetingOrEvent("meeting", id, { archived: true, archivedAt: Date.now() });
    },
    [updateMeetingOrEvent]
  );

  const archiveEvent = useCallback(
    (id: string) => {
      updateMeetingOrEvent("event", id, { archived: true, archivedAt: Date.now() });
    },
    [updateMeetingOrEvent]
  );

  const unarchiveMeeting = useCallback(
    (id: string) => {
      updateMeetingOrEvent("meeting", id, { archived: false, archivedAt: undefined });
    },
    [updateMeetingOrEvent]
  );

  const unarchiveEvent = useCallback(
    (id: string) => {
      updateMeetingOrEvent("event", id, { archived: false, archivedAt: undefined });
    },
    [updateMeetingOrEvent]
  );

  const pingAssignees = useCallback((kind: "given" | "received", taskId: string, taskTitle: string) => {
    const list = kind === "given" ? board.given : board.received;
    const task = list.find((t) => t.id === taskId);
    if (!task) return;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("Ollin reminder", { body: taskTitle || "Task reminder" });
    }
    // In production: send push to task.assigneeUserId and observerIds (resolve to user IDs)
  }, [board.given, board.received]);

  const addMeeting = useCallback(
    (m: Omit<MeetingOrEvent, "id" | "createdAt">) => {
      const item: MeetingOrEvent = {
        ...m,
        id: generateUUID(),
        createdAt: Date.now(),
      };
      updateBoard((prev) => ({ ...prev, meetings: [item, ...prev.meetings] }));
    },
    [updateBoard]
  );

  const addEvent = useCallback(
    (e: Omit<MeetingOrEvent, "id" | "createdAt">) => {
      const item: MeetingOrEvent = {
        ...e,
        id: generateUUID(),
        createdAt: Date.now(),
      };
      updateBoard((prev) => ({ ...prev, events: [item, ...prev.events] }));
    },
    [updateBoard]
  );

  const removeMeeting = useCallback(
    (id: string) => {
      updateBoard((prev) => ({ ...prev, meetings: prev.meetings.filter((m) => m.id !== id) }));
    },
    [updateBoard]
  );

  const removeEvent = useCallback(
    (id: string) => {
      updateBoard((prev) => ({ ...prev, events: prev.events.filter((e) => e.id !== id) }));
    },
    [updateBoard]
  );

  const setGuestRSVP = useCallback(
    (type: "meeting" | "event", itemId: string, guestEmail: string, rsvp: RSVPStatus) => {
      const key = type === "meeting" ? "meetings" : "events";
      updateBoard((prev) => ({
        ...prev,
        [key]: prev[key].map((item) =>
          item.id === itemId
            ? {
                ...item,
                guests: item.guests.map((g) =>
                  g.email === guestEmail ? { ...g, rsvp } : g
                ),
              }
            : item
        ),
      }));
    },
    [updateBoard]
  );

  const toggleGuestListVisibility = useCallback(
    (type: "meeting" | "event", itemId: string) => {
      const key = type === "meeting" ? "meetings" : "events";
      updateBoard((prev) => ({
        ...prev,
        [key]: prev[key].map((item) =>
          item.id === itemId ? { ...item, showFullGuestList: !item.showFullGuestList } : item
        ),
      }));
    },
    [updateBoard]
  );

  return (
    <BoardContext.Provider
      value={{
        loading,
        given: board.given,
        received: board.received,
        meetings: board.meetings,
        events: board.events,
        addGivenTask,
        addReceivedTask,
        updateGivenTask,
        updateReceivedTask,
        removeGivenTask,
        removeReceivedTask,
        setTaskDone,
        addMeeting,
        addEvent,
        removeMeeting,
        removeEvent,
        updateMeetingOrEvent,
        setGuestRSVP,
        toggleGuestListVisibility,
        summarySelection,
        setSummarySelection,
        notifySenderTaskDone,
        archiveGivenTask,
        archiveReceivedTask,
        unarchiveGivenTask,
        unarchiveReceivedTask,
        archiveMeeting,
        archiveEvent,
        unarchiveMeeting,
        unarchiveEvent,
        pingAssignees,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used within BoardProvider");
  return ctx;
}
