"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { useBoard } from "@/contexts/BoardContext";
import { t } from "@/lib/translations";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

type SummaryModalProps = {
  onClose: () => void;
};

export function SummaryModal({ onClose }: SummaryModalProps) {
  const { locale } = useLocale();
  const {
    summarySelection,
    setSummarySelection,
    given,
    received,
    meetings,
    events,
  } = useBoard();

  const total =
    summarySelection.taskIds.length +
    summarySelection.meetingIds.length +
    summarySelection.eventIds.length;

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

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const buildSummaryHtml = (): string => {
    const selectedGiven = given.filter((t) => summarySelection.taskIds.includes(t.id));
    const selectedReceived = received.filter((t) => summarySelection.taskIds.includes(t.id));
    const selectedMeetings = meetings.filter((m) => summarySelection.meetingIds.includes(m.id));
    const selectedEvents = events.filter((e) => summarySelection.eventIds.includes(e.id));
    const date = new Date().toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { dateStyle: "long" });
    const taskRow = (t: { title: string; otherParty: string; done: boolean }) =>
      `<tr><td>${escapeHtml(t.title || "—")}</td><td>${escapeHtml(t.otherParty)}</td><td>${t.done ? "✓ Done" : "In progress"}</td></tr>`;
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
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Executive Summary — Progress Report</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,600;0,700&display=swap" rel="stylesheet"><style>
      body{font-family:'DM Sans',system-ui,sans-serif;max-width:720px;margin:0 auto;padding:0 1.5rem;color:#1a1a1a;line-height:1.5;font-size:15px;}
      .exec-header{border-bottom:3px solid #0D9488;padding:1.25rem 0;margin-bottom:1.5rem;}
      h1{color:#0D9488;font-weight:700;font-size:1.5rem;margin:0;}
      .meta{color:#6b7280;font-size:0.8125rem;margin-top:0.25rem;}
      h2{font-size:0.875rem;font-weight:700;margin-top:1.5rem;margin-bottom:0.5rem;color:#374151;padding-left:0.75rem;border-left:4px solid #0D9488;}
      table{width:100%;border-collapse:collapse;font-size:0.875rem;border:1px solid #e5e7eb;}
      th,td{text-align:left;padding:0.625rem 0.75rem;border-bottom:1px solid #e5e7eb;}
      th{font-weight:600;color:#374151;background:#f0fdfa;}
    </style></head><body><div class="exec-header"><h1>Executive Summary</h1><p class="meta">${escapeHtml(date)} — Strategic progress report</p></div>${body || "<p>No items selected.</p>"}</body></html>`;
  };

  const handleGenerateSummary = () => {
    const html = buildSummaryHtml();
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
    setSummarySelection({ taskIds: [], meetingIds: [], eventIds: [] });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-soft-md max-w-md w-full max-h-[85vh] flex flex-col border-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 id="summary-modal-title" className="text-lg font-semibold text-gray-900">
            {t(locale, "board.selectItems")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-gray-600">Select tasks, meetings, and events to include in the summary report.</p>

          {given.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t(locale, "board.tasksGiven")}</h3>
              <ul className="space-y-1">
                {given.map((t) => (
                  <li key={t.id}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={summarySelection.taskIds.includes(t.id)}
                        onChange={() => toggleTask(t.id)}
                        className="rounded border-gray-300 text-accent accent-accent"
                      />
                      <span className="text-sm">{t.title || "Untitled"}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {received.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t(locale, "board.tasksReceived")}</h3>
              <ul className="space-y-1">
                {received.map((t) => (
                  <li key={t.id}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={summarySelection.taskIds.includes(t.id)}
                        onChange={() => toggleTask(t.id)}
                        className="rounded border-gray-300 text-accent accent-accent"
                      />
                      <span className="text-sm">{t.title || "Untitled"}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {meetings.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t(locale, "board.meetings")}</h3>
              <ul className="space-y-1">
                {meetings.map((m) => (
                  <li key={m.id}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={summarySelection.meetingIds.includes(m.id)}
                        onChange={() => toggleMeeting(m.id)}
                        className="rounded border-gray-300 text-accent accent-accent"
                      />
                      <span className="text-sm">{m.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {events.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t(locale, "board.events")}</h3>
              <ul className="space-y-1">
                {events.map((e) => (
                  <li key={e.id}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={summarySelection.eventIds.includes(e.id)}
                        onChange={() => toggleEvent(e.id)}
                        className="rounded border-gray-300 text-accent accent-accent"
                      />
                      <span className="text-sm">{e.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {given.length === 0 && received.length === 0 && meetings.length === 0 && events.length === 0 && (
            <p className="text-sm text-gray-500">No tasks, meetings, or events yet. Add some from the Board.</p>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2">
          <Button variant="ghost" fullWidth onClick={onClose}>
            {t(locale, "profile.cancel")}
          </Button>
          <Button fullWidth onClick={handleGenerateSummary} disabled={total === 0}>
            {t(locale, "board.generateSummary")} {total > 0 && `(${total})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
