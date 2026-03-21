"use client";

import { useMemo } from "react";
import { defaultMonthYm, monthStringToRange, parseYmdStart, parseYmdEnd } from "@/lib/team-attendance-logs";

export type TeamBoardDateMode = "month" | "custom";

type Props = {
  isHe: boolean;
  /** YYYY-MM */
  monthYm: string;
  onMonthYmChange: (ym: string) => void;
  mode: TeamBoardDateMode;
  onModeChange: (mode: TeamBoardDateMode) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
};

export function TeamBoardDateControls({
  isHe,
  monthYm,
  onMonthYmChange,
  mode,
  onModeChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: Props) {
  const monthOptions = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    const now = new Date();
    const loc = isHe ? "he-IL" : "en-US";
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const value = `${y}-${String(m).padStart(2, "0")}`;
      const label = d.toLocaleDateString(loc, { month: "long", year: "numeric" });
      out.push({ value, label });
    }
    return out;
  }, [isHe]);

  const selectClass =
    "w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008080]/25";
  const dateClass =
    "w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008080]/25";
  const btnCustom =
    "shrink-0 rounded-lg border border-[#008080]/35 bg-white px-3 py-2 text-xs font-semibold text-[#008080] hover:bg-teal-50/90 transition-colors";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem] flex-1">
          <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {isHe ? "חודש / שנה" : "Month / year"}
          </label>
          <select
            value={monthYm}
            disabled={mode === "custom"}
            onChange={(e) => {
              const v = e.target.value;
              onMonthYmChange(v);
              const r = monthStringToRange(v);
              onCustomStartChange(r.start);
              onCustomEndChange(r.end);
            }}
            className={selectClass + (mode === "custom" ? " opacity-50" : "")}
            aria-label={isHe ? "חודש ושנה" : "Month and year"}
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            if (mode === "month") {
              const r = monthStringToRange(monthYm);
              onCustomStartChange(r.start);
              onCustomEndChange(r.end);
              onModeChange("custom");
            } else {
              onModeChange("month");
              const r = monthStringToRange(monthYm || defaultMonthYm());
              onCustomStartChange(r.start);
              onCustomEndChange(r.end);
            }
          }}
          className={btnCustom}
        >
          {mode === "custom" ? (isHe ? "חודש נבחר" : "Month view") : isHe ? "טווח מותאם" : "Custom range"}
        </button>
      </div>
      {mode === "custom" ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {isHe ? "תאריך התחלה וסיום" : "Start & end dates"}
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[9rem] flex-1">
              <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">{isHe ? "התחלה" : "Start"}</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => onCustomStartChange(e.target.value)}
                className={dateClass}
              />
            </div>
            <div className="min-w-[9rem] flex-1">
              <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">{isHe ? "סיום" : "End"}</label>
              <input type="date" value={customEnd} onChange={(e) => onCustomEndChange(e.target.value)} className={dateClass} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Effective yyyy-mm-dd range from UI mode (swaps if inverted). */
export function effectiveRangeFromControls(
  mode: TeamBoardDateMode,
  monthYm: string,
  customStart: string,
  customEnd: string
): { start: string; end: string } {
  let startStr: string;
  let endStr: string;
  if (mode === "month") {
    const r = monthStringToRange(monthYm);
    startStr = r.start;
    endStr = r.end;
  } else {
    startStr = customStart;
    endStr = customEnd;
  }
  let rs = parseYmdStart(startStr);
  let re = parseYmdEnd(endStr);
  if (rs && re && rs > re) {
    const t = startStr;
    startStr = endStr;
    endStr = t;
    rs = parseYmdStart(startStr);
    re = parseYmdEnd(endStr);
  }
  return { start: startStr, end: endStr };
}
