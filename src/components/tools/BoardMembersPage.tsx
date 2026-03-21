"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronLeft } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useTimeClock } from "@/contexts/TimeClockContext";
import { useContacts } from "@/contexts/ContactsContext";
import {
  type BoardLocation,
  DEFAULT_BOARDS,
  migrateBoard,
  buildLiveWorkerChips,
  boardContactInitials,
  contactPresenceOnBoard,
  BOARDS_STORAGE_KEY,
} from "@/lib/attendance-boards";

const OLLIN_TURQUOISE = "#008080";

type Props = { boardId: string };

export function BoardMembersPage({ boardId }: Props) {
  const { locale } = useLocale();
  const isHe = locale === "he";
  const { contacts } = useContacts();
  const { entries } = useTimeClock();
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? null;

  const [boardLocations, setBoardLocations] = useState<BoardLocation[]>(() => DEFAULT_BOARDS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOARDS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>[];
      if (Array.isArray(parsed)) setBoardLocations(parsed.map((b) => migrateBoard(b)));
    } catch (_) {}
  }, [boardId]);

  const board = useMemo(() => boardLocations.find((b) => b.boardId === boardId), [boardLocations, boardId]);

  const latest = entries[0];
  const isClockedIn = latest?.type === "in";
  const activeInEntry = isClockedIn ? latest : undefined;
  const [livePos, setLivePos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLivePos(null);
      return;
    }
    if (!isClockedIn) {
      setLivePos(null);
      return;
    }
    const fallback = { lat: 32.0853, lng: 34.7818 };
    const id = navigator.geolocation.watchPosition(
      (pos) => setLivePos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLivePos(fallback),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [isClockedIn]);

  const chips = useMemo(() => {
    if (!board) return [];
    return buildLiveWorkerChips(board, activeInEntry, livePos, isHe);
  }, [board, activeInEntry, livePos, isHe]);

  const assigned = useMemo(() => {
    if (!board) return [];
    return contacts.filter((c) => board.assignedUserIds.includes(c.id));
  }, [board, contacts]);

  const contactLabel = (c: { name: string; email: string }) =>
    (c.name || c.email || "").trim() || (isHe ? "ללא שם" : "Unnamed");

  if (!board) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold text-slate-800 mb-2">{isHe ? "לוח לא נמצא" : "Board not found"}</p>
        <Link
          href="/dashboard/attendance/team"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: OLLIN_TURQUOISE }}
        >
          {isHe ? "חזרה" : "Back"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5">
          <Link
            href="/dashboard/attendance/team"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            aria-label={isHe ? "חזרה" : "Back"}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-sm font-bold text-slate-900 truncate">{board.name || boardId}</h1>
            <p className="text-[11px] text-slate-500 truncate">{isHe ? "חברי לוח" : "Board members"}</p>
          </div>
          <div className="w-10 shrink-0" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-3">
        {assigned.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {isHe ? "אין אנשים משובצים ללוח זה." : "No people assigned to this board."}
          </div>
        ) : (
          <ul className="space-y-2">
            {assigned.map((c) => {
              const { state } = contactPresenceOnBoard(c, chips, isHe, sessionEmail);
              const online = state === "online";
              const href = `/dashboard/attendance/team/board/${encodeURIComponent(boardId)}/member/${encodeURIComponent(c.id)}`;
              return (
                <li key={c.id}>
                  <Link
                    href={href}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-[#008080]/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
                        {c.avatar ? (
                          <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          boardContactInitials(c.name, c.email)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{contactLabel(c)}</p>
                        <p className="text-[11px] text-slate-500 truncate">{c.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: online ? OLLIN_TURQUOISE : "#94a3b8" }}
                      />
                      <span
                        className={`text-xs font-bold uppercase tracking-wide ${online ? "" : "text-slate-400"}`}
                        style={online ? { color: OLLIN_TURQUOISE } : undefined}
                      >
                        {online ? (isHe ? "מחובר" : "Online") : isHe ? "לא מחובר" : "Offline"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
