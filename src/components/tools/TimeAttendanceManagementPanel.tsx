"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useTimeClock } from "@/contexts/TimeClockContext";
import { t } from "@/lib/translations";
import { getCurrentAreaLabel } from "@/lib/timeclock-geo";
import {
  MapPin,
  ChevronLeft,
  Share2,
  FileDown,
  Pencil,
  Check,
  Loader2,
  Users,
} from "lucide-react";
import type { TimeClockEntry } from "@/lib/timeclock-types";

export type TimeAttendanceManagementPanelProps = {
  onClose: () => void;
  defaultScrollToSummary?: boolean;
  layout?: "embedded" | "fullscreen";
};

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

function formatHoursMinutes(ms: number): string {
  const totalMins = Math.floor(ms / (1000 * 60));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const CURRENCIES = [
  { id: "ILS", symbol: "₪" },
  { id: "USD", symbol: "$" },
  { id: "EUR", symbol: "€" },
] as const;

const TEAM_BOARDS_HREF = "/dashboard/attendance/team";

export function TimeAttendanceManagementPanel({
  onClose,
  defaultScrollToSummary,
  layout = "embedded",
}: TimeAttendanceManagementPanelProps) {
  const { locale } = useLocale();
  const { entries, clockIn, clockOut, updateEntryNote } = useTimeClock();
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [currency, setCurrency] = useState<"ILS" | "USD" | "EUR">("ILS");
  const summaryBlockRef = useRef<HTMLDivElement>(null);
  const [timerBusy, setTimerBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clockOutSummary, setClockOutSummary] = useState<{
    totalMs: number;
    startAddress: string;
    endAddress: string;
    outEntryId: string | null;
    entryTime: number;
    exitTime: number;
  } | null>(null);
  const [clockOutPopupNotes, setClockOutPopupNotes] = useState("");

  const latest = entries[0];
  const isClockedIn = latest?.type === "in";
  const clockInTime = isClockedIn ? latest.timestamp : 0;
  const isHe = locale === "he";

  useEffect(() => {
    if (!isClockedIn || !clockInTime) return;
    const tick = () => setElapsed(Date.now() - clockInTime);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isClockedIn, clockInTime]);

  const handleMainTimerClick = async () => {
    if (timerBusy) return;
    if (!isClockedIn) {
      setTimerBusy(true);
      try {
        const area = (await getCurrentAreaLabel()).trim();
        await clockIn(undefined, area || undefined);
      } finally {
        setTimerBusy(false);
      }
      return;
    }
    setTimerBusy(true);
    try {
      const inEntry = entries.find((e) => e.type === "in");
      if (!inEntry) return;
      const totalMs = Date.now() - inEntry.timestamp;
      const startAddress = inEntry.address || inEntry.label || (isHe ? "לא ידוע" : "Unknown");
      const exitArea = (await getCurrentAreaLabel()).trim();
      await clockOut(undefined, exitArea || undefined);
      setClockOutSummary({
        totalMs,
        startAddress,
        endAddress: exitArea || "—",
        outEntryId: null,
        entryTime: inEntry.timestamp,
        exitTime: Date.now(),
      });
      setClockOutPopupNotes("");
    } finally {
      setTimerBusy(false);
    }
  };

  useEffect(() => {
    setClockOutSummary((prev) => {
      if (!prev) return null;
      const outEntry = entries[0];
      if (outEntry?.type !== "out") return prev;
      const endAddr = outEntry.address || outEntry.label || prev.endAddress;
      if (prev.outEntryId === outEntry.id && prev.exitTime === outEntry.timestamp) return prev;
      return {
        ...prev,
        endAddress: endAddr || prev.endAddress,
        outEntryId: outEntry.id,
        exitTime: outEntry.timestamp,
      };
    });
  }, [entries]);

  useEffect(() => {
    if (!defaultScrollToSummary || !summaryBlockRef.current) return;
    const t = setTimeout(() => {
      summaryBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(t);
  }, [defaultScrollToSummary]);

  const handleExportCsv = () => {
    const lines = ["Date,Type,Note,Location,Time"];
    entries.forEach((e) => {
      const d = new Date(e.timestamp).toLocaleString(locale === "he" ? "he-IL" : "en-US");
      const loc = e.label ?? (e.lat != null ? `${e.lat},${e.lng}` : "");
      lines.push(`${d},${e.type},${e.note ?? ""},${loc}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timeclock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const rows = entries
      .map(
        (e) =>
          `<tr><td>${new Date(e.timestamp).toLocaleString(locale === "he" ? "he-IL" : "en-US")}</td><td>${e.type}</td><td>${e.note ?? ""}</td><td>${e.label ?? (e.lat != null ? `${e.lat}, ${e.lng}` : "")}</td></tr>`
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Time Clock Log</title><style>body{font-family:system-ui,sans-serif;padding:24px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;} th{background:#008080;color:#fff;}</style></head><body><h1>Time Clock Log</h1><p>Exported ${new Date().toLocaleString()}</p><table><thead><tr><th>Date</th><th>Type</th><th>Note</th><th>Location</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 250);
  };

  const startEditNote = (entry: TimeClockEntry) => {
    setEditingNoteId(entry.id);
    setEditingNoteValue(entry.note ?? "");
  };

  const saveEditNote = () => {
    if (editingNoteId) {
      updateEntryNote(editingNoteId, editingNoteValue.trim());
      setEditingNoteId(null);
      setEditingNoteValue("");
    }
  };

  const filteredByMonth = entries.filter((e) => {
    const y = new Date(e.timestamp).getFullYear();
    const m = String(new Date(e.timestamp).getMonth() + 1).padStart(2, "0");
    return `${y}-${m}` === monthFilter;
  });
  const byDay = filteredByMonth.reduce<Record<string, TimeClockEntry[]>>((acc, e) => {
    const day = new Date(e.timestamp).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { dateStyle: "short" });
    if (!acc[day]) acc[day] = [];
    acc[day].push(e);
    return acc;
  }, {});
  const dayRows = Object.entries(byDay)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .slice(0, 15);

  const totalPeriodMs = dayRows.reduce((sum, [, dayEntries]) => {
    const sorted = [...dayEntries].sort((a, b) => a.timestamp - b.timestamp);
    const inE = sorted.find((e) => e.type === "in");
    const outE = sorted.find((e) => e.type === "out");
    if (inE && outE) return sum + (outE.timestamp - inE.timestamp);
    return sum;
  }, 0);
  const totalPeriodHours = totalPeriodMs / (1000 * 60 * 60);
  const rateNum = parseFloat(hourlyRate.replace(/,/g, ".")) || 0;
  const totalPay = totalPeriodHours * rateNum;

  const clockOutSummaryModal =
    clockOutSummary &&
    (() => {
      const shiftHours = clockOutSummary.totalMs / (1000 * 60 * 60);
      const rateNumSummary = parseFloat(hourlyRate.replace(/,/g, ".")) || 0;
      const shiftPay = rateNumSummary > 0 ? shiftHours * rateNumSummary : null;
      const currencySymbol = CURRENCIES.find((c) => c.id === currency)?.symbol ?? "";
      return (
        <div
          className={
            layout === "fullscreen"
              ? "fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              : "absolute inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
          }
          onClick={() => setClockOutSummary(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white shadow-xl border border-slate-200 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900">{t(locale, "tools.clockOutSummary")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {isHe ? "שעת כניסה" : "Entry time"}
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">
                  {formatShiftWallClock(clockOutSummary.entryTime, isHe)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {isHe ? "שעת יציאה" : "Exit time"}
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">
                  {formatShiftWallClock(clockOutSummary.exitTime, isHe)}
                </span>
              </div>
              <p className="text-lg font-mono font-semibold tabular-nums text-slate-900 rounded-lg border border-slate-100 bg-white px-3 py-2">
                {isHe ? "סה״כ: " : "Total: "}
                {formatClock(clockOutSummary.totalMs)}
              </p>
              {rateNumSummary > 0 && shiftPay != null && (
                <p className="text-slate-700 text-sm">
                  {t(locale, "tools.totalPay")}: {currencySymbol}
                  {shiftPay.toFixed(2)}
                </p>
              )}
              <div className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <MapPin className="w-4 h-4 text-[#008080] shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t(locale, "tools.entryLocation")}</p>
                  <p className="text-slate-800 font-medium break-words">{clockOutSummary.startAddress || "—"}</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t(locale, "tools.exitLocation")}</p>
                  <p className="text-slate-800 font-medium break-words">{clockOutSummary.endAddress || "—"}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  {isHe ? "על מה עבדת?" : "What did you work on?"}
                </label>
                <textarea
                  value={clockOutPopupNotes}
                  onChange={(e) => setClockOutPopupNotes(e.target.value)}
                  placeholder={isHe ? "הוסף הערות למשמרת…" : "Add notes for this shift…"}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const outId =
                  clockOutSummary.outEntryId ??
                  (entries[0]?.type === "out" ? entries[0].id : null);
                if (outId) updateEntryNote(outId, clockOutPopupNotes.trim());
                setClockOutSummary(null);
              }}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-95"
              style={{ backgroundColor: OLLIN_TURQUOISE }}
            >
              {isHe ? "אשר ושמור" : "Confirm"}
            </button>
          </div>
        </div>
      );
    })();

  const mainCard = (
    <div
      className={`relative flex flex-col bg-white overflow-hidden min-h-0 ${
        layout === "fullscreen"
          ? "h-full md:max-h-[min(92vh,820px)] md:rounded-lg md:border md:border-slate-200 md:shadow-xl"
          : "h-full max-h-[90vh] rounded-lg border border-slate-200 shadow-lg"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex-shrink-0 z-20 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2 px-3 py-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 id="time-attendance-panel-title" className="flex-1 text-center text-sm font-semibold text-slate-900 truncate px-1 min-w-0">
            {t(locale, "dashboard.gpsClock")}
          </h2>
          <Link
            href={TEAM_BOARDS_HREF}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] sm:text-xs font-bold text-slate-800 hover:bg-slate-50 max-w-[40%] min-w-0"
            style={{ borderColor: `${OLLIN_TURQUOISE}55`, color: OLLIN_TURQUOISE }}
          >
            <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{isHe ? "ניהול צוות ולוחות" : "Team & Boards"}</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-5 space-y-5">
        <button
          type="button"
          onClick={() => void handleMainTimerClick()}
          disabled={timerBusy}
          className={`w-full rounded-lg border-2 min-h-[196px] flex flex-col items-center justify-center gap-3 px-5 py-8 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008080] focus-visible:ring-offset-2 disabled:opacity-70 ${
            isClockedIn
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
          }`}
        >
          {timerBusy ? (
            <Loader2 className="w-12 h-12 animate-spin text-slate-400" aria-hidden />
          ) : (
            <>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] tabular-nums">
                {isClockedIn ? (isHe ? "זמן שחלף" : "Elapsed") : isHe ? "מושבת" : "Stopped"}
              </p>
              <motion.span
                key={isClockedIn ? "on" : "off"}
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                className={`text-4xl sm:text-5xl font-mono font-semibold tabular-nums tracking-widest sm:tracking-[0.15em] ${
                  isClockedIn ? "text-rose-900" : "text-slate-800"
                }`}
              >
                {isClockedIn ? formatClock(elapsed) : "00:00:00"}
              </motion.span>
              {isClockedIn && (
                <p className="text-xs text-slate-600 tabular-nums">
                  {isHe ? "מאז" : "Since"}{" "}
                  {new Date(clockInTime).toLocaleTimeString(isHe ? "he-IL" : "en-US", { timeStyle: "short" })}
                </p>
              )}
              {!isClockedIn && (
                <p className="text-sm font-medium text-slate-500">
                  {isHe ? "לחץ להתחלת שעון" : "Tap to start"}
                </p>
              )}
            </>
          )}
        </button>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t(locale, "tools.lastEntries")}
            </h3>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 shrink-0"
              aria-label={isHe ? "חודש / שנה" : "Month / Year"}
            />
          </div>
          {dayRows.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center rounded-lg bg-gray-50 border border-gray-100">
              {isHe ? "אין רישומים" : "No entries yet"}
            </p>
          ) : (
            <div className="space-y-4">
              {dayRows.map(([day, dayEntries]) => {
                const sorted = [...dayEntries].sort((a, b) => a.timestamp - b.timestamp);
                const inEntry = sorted.find((e) => e.type === "in");
                const outEntry = sorted.find((e) => e.type === "out");
                const inTime = inEntry ? new Date(inEntry.timestamp).toLocaleTimeString(locale === "he" ? "he-IL" : "en-US", { timeStyle: "short" }) : "—";
                const outTime = outEntry ? new Date(outEntry.timestamp).toLocaleTimeString(locale === "he" ? "he-IL" : "en-US", { timeStyle: "short" }) : "—";
                const totalMs = inEntry && outEntry ? outEntry.timestamp - inEntry.timestamp : 0;
                const totalHoursDisplay = totalMs > 0 ? formatHoursMinutes(totalMs) : "—";
                const note = (inEntry?.note || outEntry?.note || "").trim() || null;
                const noteEntry = outEntry ?? inEntry ?? null;
                return (
                  <div key={day} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-semibold text-gray-900 tabular-nums">{day}</span>
                      <span className="text-sm font-medium text-gray-600 tabular-nums">{totalHoursDisplay}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div>
                        <span className="text-gray-500 block text-xs">{locale === "he" ? "כניסה" : "Check-in"}</span>
                        <span className="font-medium tabular-nums text-[#008080]">{inTime}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">{locale === "he" ? "יציאה" : "Check-out"}</span>
                        <span className="text-gray-700 tabular-nums">{outTime}</span>
                      </div>
                    </div>
                    {(note || noteEntry) && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {editingNoteId === noteEntry?.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingNoteValue}
                              onChange={(ev) => setEditingNoteValue(ev.target.value)}
                              onKeyDown={(ev) => ev.key === "Enter" && saveEditNote()}
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={saveEditNote}
                              className="p-2 rounded-lg text-white shrink-0"
                              style={{ backgroundColor: OLLIN_TURQUOISE }}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <p className="text-sm text-gray-600 flex-1 min-w-0">{note || "—"}</p>
                            {noteEntry && (
                              <button
                                type="button"
                                onClick={() => startEditNote(noteEntry)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 shrink-0"
                                aria-label="Edit note"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div ref={summaryBlockRef} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t(locale, "tools.totalHours")} / {t(locale, "tools.totalPay")}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="tabular-nums text-lg font-semibold text-gray-900">{formatHoursMinutes(totalPeriodMs)}</div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">{t(locale, "tools.hourlyRate")}</label>
              <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "ILS" | "USD" | "EUR")}
                  className="rounded-l-lg border-0 border-r border-gray-200 px-2 py-2 text-sm font-medium text-gray-700 bg-gray-100"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.symbol}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="0"
                  className="w-20 px-3 py-2 text-sm text-gray-900"
                />
              </div>
            </div>
            <div className="tabular-nums text-lg font-semibold text-[#008080]">
              = {rateNum > 0 ? `${CURRENCIES.find((c) => c.id === currency)?.symbol ?? ""}${totalPay.toFixed(2)}` : "—"}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Share2 className="w-4 h-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>
      {clockOutSummaryModal}
    </div>
  );

  if (layout === "fullscreen") {
    return (
      <>
        <div className="fixed inset-0 z-[219] bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
        <div
          className="fixed inset-0 z-[220] flex flex-col md:items-center md:justify-center md:p-4 pointer-events-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="time-attendance-panel-title"
        >
          <div className="pointer-events-auto w-full h-full flex flex-col md:max-w-lg md:max-h-[min(92vh,820px)] md:w-full md:flex-initial md:my-auto">
            {mainCard}
          </div>
        </div>
      </>
    );
  }

  return <>{mainCard}</>;
}
