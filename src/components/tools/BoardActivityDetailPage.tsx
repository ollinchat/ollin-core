"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Download, Printer, Mail } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useTimeClock } from "@/contexts/TimeClockContext";
import {
  type BoardLocation,
  DEFAULT_BOARDS,
  migrateBoard,
  buildLiveWorkerChips,
  BOARDS_STORAGE_KEY,
} from "@/lib/attendance-boards";
import {
  type TeamShiftRow,
  mergeTeamShiftRows,
  parseYmdStart,
  parseYmdEnd,
  defaultMonthYm,
  defaultRangeYmd,
  monthStringToRange,
  teamShiftRowsToCsv,
  teamShiftRowsToPrintHtml,
  buildTeamReportShareText,
} from "@/lib/team-attendance-logs";
import {
  TeamBoardDateControls,
  effectiveRangeFromControls,
  type TeamBoardDateMode,
} from "@/components/tools/TeamBoardDateControls";

const OLLIN_TURQUOISE = "#008080";

function formatClock(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

function formatShiftWallClock(ts: number, useHe: boolean): string {
  return new Date(ts).toLocaleTimeString(useHe ? "he-IL" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: !useHe,
  });
}

type Props = { boardId: string };

export function BoardActivityDetailPage({ boardId }: Props) {
  const { locale } = useLocale();
  const isHe = locale === "he";
  const { entries } = useTimeClock();
  const searchParams = useSearchParams();
  const workerParam = searchParams.get("worker");
  const workerFilter = workerParam ? decodeURIComponent(workerParam.trim()) : "";

  const [boardLocations, setBoardLocations] = useState<BoardLocation[]>(() => DEFAULT_BOARDS);
  const [monthYm, setMonthYm] = useState(defaultMonthYm);
  const [dateMode, setDateMode] = useState<TeamBoardDateMode>("month");
  const [customStart, setCustomStart] = useState(() => defaultRangeYmd().start);
  const [customEnd, setCustomEnd] = useState(() => defaultRangeYmd().end);
  const [livePos, setLivePos] = useState<{ lat: number; lng: number } | null>(null);
  const [urlHydrated, setUrlHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOARDS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>[];
      if (Array.isArray(parsed)) setBoardLocations(parsed.map((b) => migrateBoard(b)));
    } catch (_) {}
  }, [boardId]);

  useEffect(() => {
    if (urlHydrated) return;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const month = searchParams.get("month");
    if (from && to) {
      setDateMode("custom");
      setCustomStart(from);
      setCustomEnd(to);
      setMonthYm(from.slice(0, 7));
    } else if (month && /^\d{4}-\d{2}$/.test(month)) {
      setDateMode("month");
      setMonthYm(month);
      const r = monthStringToRange(month);
      setCustomStart(r.start);
      setCustomEnd(r.end);
    }
    setUrlHydrated(true);
  }, [urlHydrated, searchParams]);

  const board = useMemo(() => boardLocations.find((b) => b.boardId === boardId), [boardLocations, boardId]);

  const latest = entries[0];
  const isClockedIn = latest?.type === "in";
  const activeInEntry = isClockedIn ? latest : undefined;

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

  const selfLabel = isHe ? "את/ה" : "You";
  const { start: rangeStartStr, end: rangeEndStr } = effectiveRangeFromControls(
    dateMode,
    monthYm,
    customStart,
    customEnd
  );
  const rangeStart = parseYmdStart(rangeStartStr);
  const rangeEnd = parseYmdEnd(rangeEndStr);

  const allRowsInRange = useMemo(
    () => mergeTeamShiftRows(entries, boardLocations, rangeStart, rangeEnd, selfLabel),
    [entries, boardLocations, rangeStart, rangeEnd, selfLabel]
  );

  const historyRows = useMemo(() => {
    let rows = allRowsInRange.filter((r) => r.boardId === boardId);
    if (workerFilter) rows = rows.filter((r) => r.workerName === workerFilter);
    return rows.sort((a, b) => b.entryTime - a.entryTime);
  }, [allRowsInRange, boardId, workerFilter]);

  const chips = useMemo(() => {
    if (!board) return [];
    const list = buildLiveWorkerChips(board, activeInEntry, livePos, isHe);
    if (!workerFilter) return list;
    return list.filter((c) => c.label === workerFilter);
  }, [board, activeInEntry, livePos, isHe, workerFilter]);

  const statusLine = useMemo(() => {
    if (!board) return { label: "", value: "" };
    if (workerFilter) {
      const c = chips.find((ch) => ch.label === workerFilter);
      const on = Boolean(c?.onSite);
      return {
        label: workerFilter,
        value: on ? (isHe ? "עובד עכשיו" : "Working now") : isHe ? "לא מחובר" : "Offline",
        on,
      };
    }
    const any = chips.some((x) => x.onSite);
    return {
      label: isHe ? "סטטוס לוח" : "Board status",
      value: any ? (isHe ? "יש פעילים" : "Someone on site") : isHe ? "אין פעילים" : "None on site",
      on: any,
    };
  }, [board, workerFilter, chips, isHe]);

  const reportTitle = useMemo(() => {
    const bname = board?.name || boardId;
    if (workerFilter) return isHe ? `דוח: ${workerFilter} · ${bname}` : `Report: ${workerFilter} · ${bname}`;
    return isHe ? `דוח לוח: ${bname}` : `Board report: ${bname}`;
  }, [board, boardId, workerFilter, isHe]);

  const downloadCsv = () => {
    const csv = teamShiftRowsToCsv(historyRows, isHe);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ollin-board-${boardId}${workerFilter ? `-${workerFilter.replace(/\s+/g, "_")}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    const html = teamShiftRowsToPrintHtml(reportTitle, historyRows, isHe);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const shareEmail = () => {
    const sub = encodeURIComponent(reportTitle);
    const body = encodeURIComponent(buildTeamReportShareText(reportTitle, historyRows, isHe));
    window.location.href = `mailto:?subject=${sub}&body=${body}`;
  };

  const btnPrimary =
    "inline-flex flex-1 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-95";
  const loc = isHe ? "he-IL" : "en-US";

  if (!board) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold text-slate-800 mb-2">{isHe ? "לוח לא נמצא" : "Board not found"}</p>
        <Link
          href="/dashboard/attendance/team"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: OLLIN_TURQUOISE }}
        >
          {isHe ? "חזרה לצוות" : "Back to team"}
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
            <h1 className="text-sm font-bold text-slate-900 truncate">{board.name}</h1>
            {workerFilter ? (
              <p className="text-[11px] text-slate-500 truncate">{workerFilter}</p>
            ) : (
              <p className="text-[11px] text-slate-500 truncate">{isHe ? "פעילות לוח" : "Board activity"}</p>
            )}
          </div>
          <div className="w-10 shrink-0" aria-hidden />
        </div>

        <div className="mx-auto max-w-3xl px-3 pb-3 space-y-3">
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
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={shareEmail} className={btnPrimary} style={{ backgroundColor: OLLIN_TURQUOISE }}>
              <Mail className="w-3.5 h-3.5 shrink-0" />
              {isHe ? "אימייל" : "Email"}
            </button>
            <button type="button" onClick={downloadCsv} className={btnPrimary} style={{ backgroundColor: OLLIN_TURQUOISE }}>
              <Download className="w-3.5 h-3.5 shrink-0" />
              CSV
            </button>
            <button type="button" onClick={printPdf} className={btnPrimary} style={{ backgroundColor: OLLIN_TURQUOISE }}>
              <Printer className="w-3.5 h-3.5 shrink-0" />
              {isHe ? "הדפסה / PDF" : "Print / PDF"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <span className="text-sm font-semibold text-slate-800 truncate">{statusLine.label}</span>
          <span
            className={`shrink-0 text-xs font-bold uppercase tracking-wide ${statusLine.on ? "" : "text-slate-400"}`}
            style={statusLine.on ? { color: OLLIN_TURQUOISE } : undefined}
          >
            {statusLine.value}
          </span>
        </div>

        <section className="space-y-2">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            {isHe ? "כניסות ויציאות" : "Entries & exits"}
          </h2>
          {historyRows.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              {isHe ? "אין רישומים בטווח" : "No records in this range"}
            </div>
          ) : (
            <ul className="space-y-2">
              {historyRows.map((row: TeamShiftRow) => (
                <li key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{row.workerName}</p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(row.entryTime).toLocaleDateString(loc, { dateStyle: "medium" })}
                      </p>
                    </div>
                    <p className="text-xs font-mono font-semibold tabular-nums shrink-0" style={{ color: OLLIN_TURQUOISE }}>
                      {formatClock(row.exitTime - row.entryTime)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">{isHe ? "כניסה" : "Entry"}</span>{" "}
                      <span className="font-semibold tabular-nums text-slate-900">
                        {formatShiftWallClock(row.entryTime, isHe)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">{isHe ? "יציאה" : "Exit"}</span>{" "}
                      <span className="font-semibold tabular-nums text-slate-900">
                        {formatShiftWallClock(row.exitTime, isHe)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] leading-snug text-slate-600">
                    <span className="font-semibold text-slate-500">{isHe ? "מיקום כניסה: " : "Entry loc: "}</span>
                    {row.entryLoc}
                  </p>
                  <p className="text-[11px] leading-snug text-slate-600">
                    <span className="font-semibold text-slate-500">{isHe ? "מיקום יציאה: " : "Exit loc: "}</span>
                    {row.exitLoc}
                  </p>
                  {row.note ? <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">{row.note}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
