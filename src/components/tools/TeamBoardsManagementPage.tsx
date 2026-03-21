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

export function TeamBoardsManagementPage() {
  const { locale } = useLocale();
  const isHe = locale === "he";
  const { contacts } = useContacts();
  const { entries } = useTimeClock();
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? null;

  const [boardLocations] = useState<BoardLocation[]>(() => {
    if (typeof window === "undefined") return DEFAULT_BOARDS;
    try {
      const raw = localStorage.getItem(BOARDS_STORAGE_KEY);
      if (!raw) return DEFAULT_BOARDS;
      const parsed = JSON.parse(raw) as Record<string, unknown>[];
      return Array.isArray(parsed) ? parsed.map((b) => migrateBoard(b)) : DEFAULT_BOARDS;
    } catch {
      return DEFAULT_BOARDS;
    }
  });

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

  const assignedForBoard = (b: BoardLocation) => contacts.filter((c) => b.assignedUserIds.includes(c.id));

  const contactLabel = (c: { name: string; email: string }) =>
    (c.name || c.email || "").trim() || (isHe ? "ללא שם" : "Unnamed");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            aria-label={isHe ? "חזרה" : "Back"}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="flex-1 text-center text-sm font-bold text-slate-900 truncate px-1">
            {isHe ? "ניהול צוות ולוחות" : "Team & Boards"}
          </h1>
          <div className="w-10 shrink-0" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 pb-24">
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            {isHe ? "לוחות" : "Boards"}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {boardLocations.map((b) => {
              const chips = buildLiveWorkerChips(b, activeInEntry, livePos, isHe);
              const assigned = assignedForBoard(b);
              const href = `/dashboard/attendance/team/board/${encodeURIComponent(b.boardId)}`;

              return (
                <Link
                  key={b.boardId}
                  href={href}
                  className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-[#008080]/40"
                >
                  <p className="text-sm font-semibold text-slate-900 truncate">{b.name || b.boardId}</p>

                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {isHe ? "משובצים וסטטוס" : "Assigned & status"}
                    </p>
                    {assigned.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-400">{isHe ? "אין משובצים" : "No assignments"}</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {assigned.map((c) => {
                          const { state } = contactPresenceOnBoard(c, chips, isHe, sessionEmail);
                          const online = state === "online";
                          return (
                            <li
                              key={c.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/90 px-2 py-1.5"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600">
                                  {c.avatar ? (
                                    <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    boardContactInitials(c.name, c.email)
                                  )}
                                </div>
                                <span className="truncate text-[11px] font-semibold text-slate-800">
                                  {contactLabel(c)}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: online ? OLLIN_TURQUOISE : "#94a3b8" }}
                                />
                                <span
                                  className={`text-[10px] font-bold uppercase ${online ? "" : "text-slate-400"}`}
                                  style={online ? { color: OLLIN_TURQUOISE } : undefined}
                                >
                                  {online ? (isHe ? "מחובר" : "Online") : isHe ? "לא מחובר" : "Offline"}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <p className="mt-3 text-[10px] font-semibold text-[#008080]">
                    {isHe ? "חברי לוח ←" : "Board members →"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
