"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useTimeClock } from "@/contexts/TimeClockContext";
import { useContacts } from "@/contexts/ContactsContext";
import { ChevronLeft } from "lucide-react";
import {
  type BoardLocation,
  DEFAULT_BOARDS,
  migrateBoard,
  buildLiveWorkerChips,
  boardContactInitials,
  BOARDS_STORAGE_KEY,
} from "@/lib/attendance-boards";
import { defaultMonthYm, defaultRangeYmd } from "@/lib/team-attendance-logs";
import { TeamBoardDateControls, type TeamBoardDateMode } from "@/components/tools/TeamBoardDateControls";

const OLLIN_TURQUOISE = "#008080";

function boardActivityHref(
  boardId: string,
  mode: TeamBoardDateMode,
  monthYm: string,
  customStart: string,
  customEnd: string
): string {
  const base = `/dashboard/attendance/team/board/${encodeURIComponent(boardId)}`;
  const q = new URLSearchParams();
  if (mode === "month") q.set("month", monthYm);
  else {
    q.set("from", customStart);
    q.set("to", customEnd);
  }
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

export function TeamBoardsManagementPage() {
  const { locale } = useLocale();
  const isHe = locale === "he";
  const { contacts } = useContacts();
  const { entries } = useTimeClock();

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

  const [monthYm, setMonthYm] = useState(defaultMonthYm);
  const [dateMode, setDateMode] = useState<TeamBoardDateMode>("month");
  const [customStart, setCustomStart] = useState(() => defaultRangeYmd().start);
  const [customEnd, setCustomEnd] = useState(() => defaultRangeYmd().end);

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
        <div className="mx-auto max-w-3xl px-3 pb-3">
          <TeamBoardDateControls
            isHe={isHe}
            monthYm={monthYm}
            onMonthYmChange={setMonthYm}
            mode={dateMode}
            onModeChange={setDateMode}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 pb-24">
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            {isHe ? "לוחות חיים" : "Live boards"}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {boardLocations.map((b) => {
              const chips = buildLiveWorkerChips(b, activeInEntry, livePos, isHe);
              const anyOnSite = chips.some((c) => c.onSite);
              const onSite = chips.filter((c) => c.onSite);
              const assigned = assignedForBoard(b);
              const href = boardActivityHref(b.boardId, dateMode, monthYm, customStart, customEnd);

              return (
                <Link
                  key={b.boardId}
                  href={href}
                  className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-[#008080]/40"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{b.name || b.boardId}</p>
                    <span
                      className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${anyOnSite ? "" : "bg-slate-400"}`}
                      style={
                        anyOnSite
                          ? { backgroundColor: OLLIN_TURQUOISE, boxShadow: "0 0 10px rgba(0,128,128,0.55)" }
                          : undefined
                      }
                      title={
                        anyOnSite ? (isHe ? "פעיל בלוח" : "Active on board") : isHe ? "אין פעילים" : "None active"
                      }
                    />
                  </div>

                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {isHe ? "משובצים" : "Assigned"}
                    </p>
                    {assigned.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-400">{isHe ? "אין משובצים" : "No assignments"}</p>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {assigned.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600">
                              {c.avatar ? (
                                <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                              ) : (
                                boardContactInitials(c.name, c.email)
                              )}
                            </div>
                            <span className="max-w-[6.5rem] truncate text-[11px] font-semibold text-slate-800">
                              {contactLabel(c)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {isHe ? "פעילים עכשיו" : "Active now"}
                    </p>
                    {onSite.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-400">{isHe ? "אין" : "None"}</p>
                    ) : (
                      <ul className="mt-1.5 space-y-1">
                        {onSite.map((c) => (
                          <li key={c.key} className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: OLLIN_TURQUOISE }}
                            />
                            <span className="truncate">{c.label}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <p className="mt-3 text-[10px] font-semibold text-[#008080]">
                    {isHe ? "פתח דוח לוח ←" : "Open board report →"}
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
