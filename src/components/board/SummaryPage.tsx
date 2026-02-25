"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { useBoard } from "@/contexts/BoardContext";
import { t } from "@/lib/translations";
import { Button } from "@/components/ui/Button";
import { ChevronLeft } from "lucide-react";
import type { BoardTask } from "@/lib/board-types";

type SummaryTab = "given" | "received" | "events" | "meetings";

type SummaryPageProps = {
  onBack: () => void;
  onGenerate: () => void;
};

export function SummaryPage({ onBack, onGenerate }: SummaryPageProps) {
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<SummaryTab>("given");
  const {
    given,
    received,
    meetings,
    events,
    summarySelection,
    setSummarySelection,
    setTaskDone,
    updateGivenTask,
    updateReceivedTask,
  } = useBoard();

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

  const allTaskIds = [...given, ...received].map((t) => t.id);
  const allMeetingIds = meetings.map((m) => m.id);
  const allEventIds = events.map((e) => e.id);

  const selectAll = () => {
    setSummarySelection({ taskIds: allTaskIds, meetingIds: allMeetingIds, eventIds: allEventIds });
  };

  const allTasksGiven = given.map((task) => ({ type: "given" as const, task }));
  const allTasksReceived = received.map((task) => ({ type: "received" as const, task }));

  const tabs: { id: SummaryTab; label: string }[] = [
    { id: "given", label: t(locale, "board.tasksGiven") },
    { id: "received", label: t(locale, "board.tasksReceived") },
    { id: "events", label: t(locale, "board.events") },
    { id: "meetings", label: t(locale, "board.meetings") },
  ];

  return (
    <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-soft-md border-0 overflow-hidden flex flex-col min-h-0">
      <div className="flex-shrink-0 flex items-center gap-2 p-3 border-b border-gray-100">
        <button type="button" onClick={onBack} className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 flex items-center gap-1" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h2 className="text-base font-semibold text-gray-900 flex-1">{t(locale, "board.selectItems")}</h2>
      </div>
      <div className="flex-shrink-0 flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors uppercase tracking-wide ${
              activeTab === id ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button type="button" onClick={selectAll} className="text-xs font-medium text-teal-600 hover:underline">
            {t(locale, "board.selectAll")}
          </button>
        </div>
        {activeTab === "given" && (
          <div className="grid grid-cols-2 gap-2">
            {allTasksGiven.map(({ type, task }) => (
              <div key={task.id} className="rounded-xl bg-gray-50 p-2.5 flex items-center gap-2 border border-gray-100">
                <input type="checkbox" checked={summarySelection.taskIds.includes(task.id)} onChange={() => toggleTask(task.id)} className="rounded border-gray-300 text-accent accent-accent w-3.5 h-3.5 shrink-0" />
                <input type="checkbox" checked={task.done} onChange={() => setTaskDone(type, task.id, !task.done)} title="Done" className="rounded border-gray-300 text-accent w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">{task.title || "Untitled"}</p>
                  <input type="text" placeholder="Assign" defaultValue={task.otherParty} onBlur={(e) => updateGivenTask(task.id, { otherParty: e.target.value.trim() || "—" })} className="mt-0.5 w-full rounded-lg border-0 bg-white px-2 py-1 text-[10px] text-gray-600 placeholder:text-gray-400" />
                </div>
              </div>
            ))}
            {given.length === 0 && <p className="text-xs text-gray-400 col-span-2 py-4 text-center">No given tasks</p>}
          </div>
        )}
        {activeTab === "received" && (
          <div className="grid grid-cols-2 gap-2">
            {allTasksReceived.map(({ type, task }) => (
              <div key={task.id} className="rounded-xl bg-gray-50 p-2.5 flex items-center gap-2 border border-gray-100">
                <input type="checkbox" checked={summarySelection.taskIds.includes(task.id)} onChange={() => toggleTask(task.id)} className="rounded border-gray-300 text-accent accent-accent w-3.5 h-3.5 shrink-0" />
                <input type="checkbox" checked={task.done} onChange={() => setTaskDone(type, task.id, !task.done)} title="Done" className="rounded border-gray-300 text-accent w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">{task.title || "Untitled"}</p>
                  <input type="text" placeholder="From" defaultValue={task.otherParty} onBlur={(e) => updateReceivedTask(task.id, { otherParty: e.target.value.trim() || "—" })} className="mt-0.5 w-full rounded-lg border-0 bg-white px-2 py-1 text-[10px] text-gray-600 placeholder:text-gray-400" />
                </div>
              </div>
            ))}
            {received.length === 0 && <p className="text-xs text-gray-400 col-span-2 py-4 text-center">No received tasks</p>}
          </div>
        )}
        {activeTab === "events" && (
          <div className="grid grid-cols-2 gap-2">
            {events.map((m) => (
              <div key={m.id} className="rounded-xl bg-gray-50 p-2.5 flex items-center gap-2 border border-gray-100">
                <input type="checkbox" checked={summarySelection.eventIds.includes(m.id)} onChange={() => toggleEvent(m.id)} className="rounded border-gray-300 text-accent accent-accent w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">{m.title}</p>
                  <p className="text-[10px] text-gray-500">{new Date(m.startAt).toLocaleString(locale === "he" ? "he-IL" : "en-US", { dateStyle: "short", timeStyle: "short" })}</p>
                </div>
              </div>
            ))}
            {events.length === 0 && <p className="text-xs text-gray-400 col-span-2 py-4 text-center">No events</p>}
          </div>
        )}
        {activeTab === "meetings" && (
          <div className="grid grid-cols-2 gap-2">
            {meetings.map((m) => (
              <div key={m.id} className="rounded-xl bg-gray-50 p-2.5 flex items-center gap-2 border border-gray-100">
                <input type="checkbox" checked={summarySelection.meetingIds.includes(m.id)} onChange={() => toggleMeeting(m.id)} className="rounded border-gray-300 text-accent accent-accent w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">{m.title}</p>
                  <p className="text-[10px] text-gray-500">{new Date(m.startAt).toLocaleString(locale === "he" ? "he-IL" : "en-US", { dateStyle: "short", timeStyle: "short" })}</p>
                </div>
              </div>
            ))}
            {meetings.length === 0 && <p className="text-xs text-gray-400 col-span-2 py-4 text-center">No meetings</p>}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 p-3 border-t border-gray-100 flex gap-2">
        <Button variant="secondary" fullWidth onClick={onBack} className="rounded-xl text-sm py-2.5">
          {t(locale, "profile.cancel")}
        </Button>
        <Button fullWidth onClick={onGenerate} disabled={total === 0} className="rounded-xl bg-gradient-to-r from-accent-emerald to-accent text-white text-sm py-2.5">
          {t(locale, "board.sendSummary")} ({total})
        </Button>
      </div>
    </div>
  );
}
