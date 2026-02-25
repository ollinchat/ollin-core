"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type {
  BoardTask,
  MeetingOrEvent,
  RSVPStatus,
  SummarySelection,
} from "@/lib/board-types";
import { loadBoardFromSupabase, saveBoardToSupabase } from "@/lib/supabase-sync";

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
  given: BoardTask[];
  received: BoardTask[];
  meetings: MeetingOrEvent[];
  events: MeetingOrEvent[];
  addGivenTask: (task: Omit<BoardTask, "id" | "createdAt">) => void;
  addReceivedTask: (task: Omit<BoardTask, "id" | "createdAt">) => void;
  updateGivenTask: (id: string, updates: Partial<BoardTask>) => void;
  updateReceivedTask: (id: string, updates: Partial<BoardTask>) => void;
  setTaskDone: (kind: "given" | "received", id: string, done: boolean) => void;
  addMeeting: (m: Omit<MeetingOrEvent, "id" | "createdAt">) => void;
  addEvent: (e: Omit<MeetingOrEvent, "id" | "createdAt">) => void;
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
  notifySenderTaskDone: (taskId: string) => void; // placeholder: "real-time notification to sender"
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
  const [board, setBoard] = useState<BoardPayload>(emptyBoard);
  const [summarySelection, setSummarySelection] = useState<SummarySelection>({
    taskIds: [],
    meetingIds: [],
    eventIds: [],
  });

  React.useEffect(() => {
    loadBoardFromSupabase().then((remote) => {
      if (remote) {
        setBoard(remote);
        saveBoard(remote);
      } else {
        setBoard(loadBoardLocal());
      }
    });
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

  const addGivenTask = useCallback(
    (task: Omit<BoardTask, "id" | "createdAt">) => {
      const newTask: BoardTask = {
        ...task,
        id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
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

  const addMeeting = useCallback(
    (m: Omit<MeetingOrEvent, "id" | "createdAt">) => {
      const item: MeetingOrEvent = {
        ...m,
        id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      updateBoard((prev) => ({ ...prev, events: [item, ...prev.events] }));
    },
    [updateBoard]
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
        given: board.given,
        received: board.received,
        meetings: board.meetings,
        events: board.events,
        addGivenTask,
        addReceivedTask,
        updateGivenTask,
        updateReceivedTask,
        setTaskDone,
        addMeeting,
        addEvent,
        updateMeetingOrEvent,
        setGuestRSVP,
        toggleGuestListVisibility,
        summarySelection,
        setSummarySelection,
        notifySenderTaskDone,
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
