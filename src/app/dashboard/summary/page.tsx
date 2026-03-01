"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useBoard } from "@/contexts/BoardContext";
import { t } from "@/lib/translations";
import { ChevronLeft, FileText } from "lucide-react";
import type { BoardTask, MeetingOrEvent } from "@/lib/board-types";

type DateRangePreset = "today" | "week" | "month" | "custom";

function getRangeBounds(preset: DateRangePreset, customFrom?: Date, customTo?: Date): { from: number; to: number } {
  const now = new Date();
  let from: Date;
  let to: Date;
  if (preset === "custom" && customFrom && customTo) {
    from = new Date(customFrom);
    to = new Date(customTo);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
  } else if (preset === "today") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to = new Date(from);
    to.setHours(23, 59, 59, 999);
  } else if (preset === "week") {
    const day = now.getDay();
    from = new Date(now);
    from.setDate(now.getDate() - day);
    from.setHours(0, 0, 0, 0);
    to = new Date(from);
    to.setDate(from.getDate() + 6);
    to.setHours(23, 59, 59, 999);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  return { from: from.getTime(), to: to.getTime() };
}

function filterByRange<T>(
  items: T[],
  getDate: (item: T) => number,
  from: number,
  to: number
): T[] {
  return items.filter((item) => {
    const ms = getDate(item);
    return ms >= from && ms <= to;
  });
}

type SummaryTab = "tasks" | "meetings" | "events";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildSummaryHtml(
  locale: "en" | "he",
  given: BoardTask[],
  received: BoardTask[],
  meetings: MeetingOrEvent[],
  events: MeetingOrEvent[],
  taskIds: string[],
  meetingIds: string[],
  eventIds: string[]
): string {
  const selectedGiven = given.filter((t) => taskIds.includes(t.id));
  const selectedReceived = received.filter((t) => taskIds.includes(t.id));
  const selectedMeetings = meetings.filter((m) => meetingIds.includes(m.id));
  const selectedEvents = events.filter((e) => eventIds.includes(e.id));
  const date = new Date().toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { dateStyle: "long" });
  const taskRow = (t: { title: string; otherParty: string; done: boolean }) =>
    `<tr><td>${escapeHtml(t.title || "—")}</td><td>${escapeHtml(t.otherParty)}</td><td>${t.done ? "✓" : "—"}</td></tr>`;
  const meetingRow = (m: { title: string; startAt: number }) =>
    `<tr><td>${escapeHtml(m.title)}</td><td>${new Date(m.startAt).toLocaleString(locale === "he" ? "he-IL" : "en-US", { dateStyle: "short", timeStyle: "short" })}</td></tr>`;
  let body = "";
  if (selectedGiven.length > 0) {
    body += `<h2>${escapeHtml(t(locale, "board.tasksGiven"))}</h2><table><thead><tr><th>Task</th><th>Assigned to</th><th>Status</th></tr></thead><tbody>${selectedGiven.map(taskRow).join("")}</tbody></table>`;
  }
  if (selectedReceived.length > 0) {
    body += `<h2>${escapeHtml(t(locale, "board.tasksReceived"))}</h2><table><thead><tr><th>Task</th><th>From</th><th>Status</th></tr></thead><tbody>${selectedReceived.map(taskRow).join("")}</tbody></table>`;
  }
  if (selectedMeetings.length > 0) {
    body += `<h2>${escapeHtml(t(locale, "board.meetings"))}</h2><table><thead><tr><th>Meeting</th><th>When</th></tr></thead><tbody>${selectedMeetings.map(meetingRow).join("")}</tbody></table>`;
  }
  if (selectedEvents.length > 0) {
    body += `<h2>${escapeHtml(t(locale, "board.events"))}</h2><table><thead><tr><th>Event</th><th>When</th></tr></thead><tbody>${selectedEvents.map(meetingRow).join("")}</tbody></table>`;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Summary Report</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:1rem;color:#1a1a1a;} h2{font-size:0.875rem;font-weight:700;margin-top:1.25rem;margin-bottom:0.5rem;color:#374151;border-left:4px solid #008080;padding-left:0.75rem;} table{width:100%;border-collapse:collapse;font-size:0.875rem;} th,td{text-align:left;padding:0.5rem 0.75rem;border-bottom:1px solid #e5e7eb;} th{font-weight:600;color:#374151;background:rgba(0,128,128,0.08);} .meta{color:#6b7280;font-size:0.8125rem;margin-bottom:1rem;}</style></head><body><p class="meta">${escapeHtml(date)}</p>${body || "<p>No items selected.</p>"}</body></html>`;
}

export default function SummaryPage() {
  const { locale } = useLocale();
  const {
    given,
    received,
    meetings,
    events,
    summarySelection,
    setSummarySelection,
  } = useBoard();
  const [activeTab, setActiveTab] = useState<SummaryTab>("tasks");
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from: rangeFrom, to: rangeTo } = useMemo(
    () => getRangeBounds(dateRangePreset, customFrom ? new Date(customFrom) : undefined, customTo ? new Date(customTo) : undefined),
    [dateRangePreset, customFrom, customTo]
  );

  const filteredGiven = useMemo(
    () => filterByRange(given, (t) => t.dueDate ?? t.createdAt, rangeFrom, rangeTo),
    [given, rangeFrom, rangeTo]
  );
  const filteredReceived = useMemo(
    () => filterByRange(received, (t) => t.dueDate ?? t.createdAt, rangeFrom, rangeTo),
    [received, rangeFrom, rangeTo]
  );
  const filteredMeetings = useMemo(
    () => filterByRange(meetings, (m) => m.startAt, rangeFrom, rangeTo),
    [meetings, rangeFrom, rangeTo]
  );
  const filteredEvents = useMemo(
    () => filterByRange(events, (e) => e.startAt, rangeFrom, rangeTo),
    [events, rangeFrom, rangeTo]
  );

  const toggleTask = (id: string) => {
    setSummarySelection((prev) => {
      const set = new Set(prev.taskIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, taskIds: Array.from(set) };
    });
  };
  const toggleMeeting = (id: string) => {
    setSummarySelection((prev) => {
      const set = new Set(prev.meetingIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, meetingIds: Array.from(set) };
    });
  };
  const toggleEvent = (id: string) => {
    setSummarySelection((prev) => {
      const set = new Set(prev.eventIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, eventIds: Array.from(set) };
    });
  };

  const total =
    summarySelection.taskIds.length +
    summarySelection.meetingIds.length +
    summarySelection.eventIds.length;
  const allTaskIds = [...filteredGiven, ...filteredReceived].map((t) => t.id);
  const allMeetingIds = filteredMeetings.map((m) => m.id);
  const allEventIds = filteredEvents.map((e) => e.id);
  const selectAll = () => {
    setSummarySelection({ taskIds: allTaskIds, meetingIds: allMeetingIds, eventIds: allEventIds });
  };

  const handleGenerate = () => {
    const html = buildSummaryHtml(
      locale,
      filteredGiven,
      filteredReceived,
      filteredMeetings,
      filteredEvents,
      summarySelection.taskIds,
      summarySelection.meetingIds,
      summarySelection.eventIds
    );
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  const tabs: { id: SummaryTab; label: string }[] = [
    { id: "tasks", label: t(locale, "board.tasks") },
    { id: "meetings", label: t(locale, "board.meetings") },
    { id: "events", label: t(locale, "board.events") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <Link href="/dashboard" className="p-2 rounded text-gray-600 hover:bg-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{locale === "he" ? "חזרה" : "Back"}</span>
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#008080]" />
          {t(locale, "board.generateSummary")}
        </h1>
      </header>

      <div className="flex-shrink-0 flex gap-1 p-2 border-b border-gray-200 bg-white">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2.5 rounded-sm text-sm font-medium uppercase tracking-wide border ${
              activeTab === id ? "bg-[#008080] text-white border-[#006666]" : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Date range filter */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 bg-white flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500">{locale === "he" ? "טווח תאריכים" : "Date range"}</span>
        {(["today", "week", "month", "custom"] as const).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setDateRangePreset(preset)}
            className={`px-2.5 py-1 rounded-sm text-xs font-medium border ${
              dateRangePreset === preset ? "bg-[#008080] text-white border-[#006666]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {preset === "today" && (locale === "he" ? "היום" : "Today")}
            {preset === "week" && (locale === "he" ? "שבוע" : "Week")}
            {preset === "month" && (locale === "he" ? "חודש" : "Month")}
            {preset === "custom" && (locale === "he" ? "מותאם" : "Custom")}
          </button>
        ))}
        {dateRangePreset === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2 py-1 rounded-sm border border-gray-200 text-xs"
            />
            <span className="text-gray-400">–</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2 py-1 rounded-sm border border-gray-200 text-xs"
            />
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button type="button" onClick={selectAll} className="text-xs font-medium text-[#008080] hover:underline">
            {t(locale, "board.selectAll")}
          </button>
        </div>

        {activeTab === "tasks" && (
          <div className="space-y-2">
            {filteredGiven.length > 0 && (
              <div className="border border-gray-200 bg-white p-2 rounded-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t(locale, "board.tasksGiven")}</p>
                {filteredGiven.map((task) => (
                  <label key={task.id} className="flex items-center gap-2 py-2 px-2 rounded border border-transparent hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={summarySelection.taskIds.includes(task.id)}
                      onChange={() => toggleTask(task.id)}
                      className="rounded border-gray-300 text-[#008080]"
                    />
                    <span className="text-sm font-medium text-gray-900 flex-1 truncate">{task.title || "—"}</span>
                    <span className="text-xs text-gray-500">{task.otherParty}</span>
                  </label>
                ))}
              </div>
            )}
            {filteredReceived.length > 0 && (
              <div className="border border-gray-200 bg-white p-2 rounded-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t(locale, "board.tasksReceived")}</p>
                {filteredReceived.map((task) => (
                  <label key={task.id} className="flex items-center gap-2 py-2 px-2 rounded border border-transparent hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={summarySelection.taskIds.includes(task.id)}
                      onChange={() => toggleTask(task.id)}
                      className="rounded border-gray-300 text-[#008080]"
                    />
                    <span className="text-sm font-medium text-gray-900 flex-1 truncate">{task.title || "—"}</span>
                    <span className="text-xs text-gray-500">{task.otherParty}</span>
                  </label>
                ))}
              </div>
            )}
            {filteredGiven.length === 0 && filteredReceived.length === 0 && (
              <p className="text-sm text-gray-500 py-6 text-center">{locale === "he" ? "אין משימות." : "No tasks."}</p>
            )}
          </div>
        )}

        {activeTab === "meetings" && (
          <div className="space-y-2">
            {filteredMeetings.map((m) => (
              <label key={m.id} className="flex items-center gap-2 py-3 px-3 border border-gray-200 bg-white rounded-sm hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={summarySelection.meetingIds.includes(m.id)}
                  onChange={() => toggleMeeting(m.id)}
                  className="rounded-sm border-gray-300 text-[#008080]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{m.title}</p>
                  <p className="text-xs text-gray-500">{new Date(m.startAt).toLocaleString(locale === "he" ? "he-IL" : "en-US", { dateStyle: "short", timeStyle: "short" })}</p>
                </div>
              </label>
            ))}
            {filteredMeetings.length === 0 && <p className="text-sm text-gray-500 py-6 text-center">{locale === "he" ? "אין פגישות." : "No meetings."}</p>}
          </div>
        )}

        {activeTab === "events" && (
          <div className="space-y-2">
            {filteredEvents.map((e) => (
              <label key={e.id} className="flex items-center gap-2 py-3 px-3 border border-gray-200 bg-white rounded-sm hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={summarySelection.eventIds.includes(e.id)}
                  onChange={() => toggleEvent(e.id)}
                  className="rounded-sm border-gray-300 text-[#008080]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{e.title}</p>
                  <p className="text-xs text-gray-500">{new Date(e.startAt).toLocaleString(locale === "he" ? "he-IL" : "en-US", { dateStyle: "short", timeStyle: "short" })}</p>
                </div>
              </label>
            ))}
            {filteredEvents.length === 0 && <p className="text-sm text-gray-500 py-6 text-center">{locale === "he" ? "אין אירועים." : "No events."}</p>}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={total === 0}
          className="w-full py-3 rounded-sm border border-[#006666] bg-[#008080] text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t(locale, "board.generateSummary")} {total > 0 && `(${total})`}
        </button>
      </div>
    </div>
  );
}
