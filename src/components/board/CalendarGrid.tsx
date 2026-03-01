"use client";

import React, { useState, useMemo } from "react";
import type { BoardTask, MeetingOrEvent } from "@/lib/board-types";

type ViewMode = "year" | "month" | "week";

type CalendarGridProps = {
  given: BoardTask[];
  received: BoardTask[];
  meetings: MeetingOrEvent[];
  events: MeetingOrEvent[];
  locale: "en" | "he";
};

const WEEKDAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LABELS_HE = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
const MONTH_LABELS_EN = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const MONTH_LABELS_HE = "ינו פבר מרץ אפר מאי יונ יול אוג ספט אוק נוב דצמ".split(" ");

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getWeekStart(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getMonthStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x;
}

function getMonthEnd(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** All calendar items for a given day (key = YYYY-MM-DD) */
function buildDayMap(
  given: BoardTask[],
  received: BoardTask[],
  meetings: MeetingOrEvent[],
  events: MeetingOrEvent[]
): Map<string, { tasks: BoardTask[]; meetings: MeetingOrEvent[]; events: MeetingOrEvent[] }> {
  const map = new Map<string, { tasks: BoardTask[]; meetings: MeetingOrEvent[]; events: MeetingOrEvent[] }>();

  function key(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function ensure(key: string) {
    if (!map.has(key)) map.set(key, { tasks: [], meetings: [], events: [] });
    return map.get(key)!;
  }

  [...given, ...received].forEach((t) => {
    if (t.dueDate) ensure(key(t.dueDate)).tasks.push(t);
  });
  meetings.forEach((m) => ensure(key(m.startAt)).meetings.push(m));
  events.forEach((e) => ensure(key(e.startAt)).events.push(e));

  return map;
}

export function CalendarGrid({ given, received, meetings, events, locale }: CalendarGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());

  const dayMap = useMemo(
    () => buildDayMap(given, received, meetings, events),
    [given, received, meetings, events]
  );

  const weekDays = locale === "he" ? WEEKDAY_LABELS_HE : WEEKDAY_LABELS_EN;
  const monthLabels = locale === "he" ? MONTH_LABELS_HE : MONTH_LABELS_EN;

  // Month view: 7 cols, 5–6 rows
  const monthGrid = useMemo(() => {
    const start = getMonthStart(cursor);
    const end = getMonthEnd(cursor);
    const weekStart = getWeekStart(start);
    const cells: Date[] = [];
    let d = new Date(weekStart);
    const totalDays = 42; // 6 weeks
    for (let i = 0; i < totalDays; i++) {
      cells.push(new Date(d));
      d = addDays(d, 1);
    }
    return { start, end, weekStart, cells };
  }, [cursor]);

  // Week view: 7 days starting from week start
  const weekGrid = useMemo(() => {
    const weekStart = getWeekStart(cursor);
    const cells: Date[] = [];
    for (let i = 0; i < 7; i++) cells.push(addDays(weekStart, i));
    return { weekStart, cells };
  }, [cursor]);

  // Year view: 12 months
  const year = cursor.getFullYear();

  function dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function DayCell({ d, isCurrentMonth }: { d: Date; isCurrentMonth?: boolean }) {
    const key = dayKey(d);
    const data = dayMap.get(key);
    const isToday =
      d.getDate() === new Date().getDate() &&
      d.getMonth() === new Date().getMonth() &&
      d.getFullYear() === new Date().getFullYear();
    const count = (data?.tasks.length ?? 0) + (data?.meetings.length ?? 0) + (data?.events.length ?? 0);

    return (
      <div
        className={`min-h-[72px] p-1 border border-gray-200 rounded-sm flex flex-col ${
          isCurrentMonth === false ? "bg-gray-50 text-gray-400" : "bg-white"
        } ${isToday ? "ring-1 ring-[#008080] bg-[#008080]/[0.12]" : ""}`}
      >
        <span className="text-xs font-medium text-gray-600">{d.getDate()}</span>
        <div className="flex-1 overflow-hidden mt-0.5 space-y-0.5">
          {data?.tasks.slice(0, 2).map((t) => (
            <div key={t.id} className="text-[10px] truncate px-1 py-0.5 bg-[#008080]/15 text-[#006666] rounded-sm">
              {t.title}
            </div>
          ))}
          {data?.meetings.slice(0, 2).map((m) => (
            <div key={m.id} className="text-[10px] truncate px-1 py-0.5 bg-blue-100 text-blue-800 rounded-sm">
              {m.title}
            </div>
          ))}
          {data?.events.slice(0, 2).map((e) => (
            <div key={e.id} className="text-[10px] truncate px-1 py-0.5 bg-amber-100 text-amber-800 rounded-sm">
              {e.title}
            </div>
          ))}
          {count > 6 && (
            <span className="text-[10px] text-gray-500">+{count - 6}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sub-header: Year | Month | Week */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        {(["year", "month", "week"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1.5 rounded-sm text-sm font-medium border capitalize ${
              viewMode === mode
                ? "bg-[#008080] text-white border-[#006666]"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {mode === "year" && (locale === "he" ? "שנה" : "Year")}
            {mode === "month" && (locale === "he" ? "חודש" : "Month")}
            {mode === "week" && (locale === "he" ? "שבוע" : "Week")}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => {
              const d = new Date(cursor);
              if (viewMode === "month") d.setMonth(d.getMonth() - 1);
              else if (viewMode === "week") d.setDate(d.getDate() - 7);
              else d.setFullYear(d.getFullYear() - 1);
              setCursor(d);
            }}
            className="p-1.5 rounded-sm border border-gray-200 hover:bg-gray-100 text-gray-600"
            aria-label="Previous"
          >
            ←
          </button>
          <span className="px-2 text-sm font-medium text-gray-700 min-w-[120px] text-center">
            {viewMode === "month" && `${monthLabels[cursor.getMonth()]} ${cursor.getFullYear()}`}
            {viewMode === "week" &&
              `${weekGrid.cells[0].getDate()}/${weekGrid.cells[0].getMonth() + 1} – ${weekGrid.cells[6].getDate()}/${weekGrid.cells[6].getMonth() + 1} ${cursor.getFullYear()}`}
            {viewMode === "year" && cursor.getFullYear()}
          </span>
          <button
            type="button"
            onClick={() => {
              const d = new Date(cursor);
              if (viewMode === "month") d.setMonth(d.getMonth() + 1);
              else if (viewMode === "week") d.setDate(d.getDate() + 7);
              else d.setFullYear(d.getFullYear() + 1);
              setCursor(d);
            }}
            className="p-1.5 rounded-sm border border-gray-200 hover:bg-gray-100 text-gray-600"
            aria-label="Next"
          >
            →
          </button>
        </div>
      </div>

      {viewMode === "month" && (
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-200">
            {weekDays.map((label) => (
              <div
                key={label}
                className="p-2 text-xs font-semibold text-gray-600 uppercase tracking-wide text-center border-r border-gray-200 last:border-r-0"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-white">
            {monthGrid.cells.map((d, i) => (
              <DayCell
                key={i}
                d={d}
                isCurrentMonth={d.getMonth() === cursor.getMonth()}
              />
            ))}
          </div>
        </div>
      )}

      {viewMode === "week" && (
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-200">
            {weekDays.map((label, i) => (
              <div
                key={label}
                className="p-2 text-xs font-semibold text-gray-600 uppercase text-center border-r border-gray-200 last:border-r-0"
              >
                <div>{label}</div>
                <div className="text-gray-500 font-normal">{weekGrid.cells[i].getDate()}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-white">
            {weekGrid.cells.map((d, i) => (
              <DayCell key={i} d={d} isCurrentMonth={true} />
            ))}
          </div>
        </div>
      )}

      {viewMode === "year" && (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => {
            const monthDate = new Date(year, i, 1);
            const monthStart = getMonthStart(monthDate);
            const weekStart = getWeekStart(monthStart);
            const cells: Date[] = [];
            let d = new Date(weekStart);
            for (let j = 0; j < 42; j++) {
              cells.push(new Date(d));
              d = addDays(d, 1);
            }
            return (
              <div key={i} className="border border-gray-200 rounded-sm overflow-hidden bg-white">
                <div className="p-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200 text-center">
                  {monthLabels[i]} {year}
                </div>
                <div className="grid grid-cols-7">
                  {weekDays.map((w) => (
                    <div
                      key={w}
                      className="p-0.5 text-[10px] text-gray-500 text-center border-b border-gray-100"
                    >
                      {w}
                    </div>
                  ))}
                  {cells.slice(0, 35).map((d, j) => {
                    const isCurrentMonth = d.getMonth() === i;
                    const key = dayKey(d);
                    const data = dayMap.get(key);
                    const count = (data?.tasks.length ?? 0) + (data?.meetings.length ?? 0) + (data?.events.length ?? 0);
                    return (
                      <div
                        key={j}
                        className={`p-0.5 text-[10px] border-b border-r border-gray-100 last:border-r-0 ${
                          !isCurrentMonth ? "text-gray-300" : count > 0 ? "bg-[#008080]/10 text-[#006666] font-medium" : ""
                        }`}
                      >
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
