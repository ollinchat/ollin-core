"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useTimeClock } from "@/contexts/TimeClockContext";
import { useContacts } from "@/contexts/ContactsContext";
import { t } from "@/lib/translations";
import {
  MapPin,
  LogIn,
  LogOut,
  ChevronLeft,
  Settings,
  Share2,
  FileDown,
  Pencil,
  Check,
  User,
} from "lucide-react";
import type { TimeClockEntry } from "@/lib/timeclock-types";

type Props = { onClose: () => void };

type BoardLocation = { boardId: string; name: string; address: string; radiusMeters: number; assignedUserId?: string };

const DEFAULT_BOARDS: BoardLocation[] = [
  { boardId: "board1", name: "Main Warehouse", address: "", radiusMeters: 500 },
  { boardId: "board2", name: "Board 2", address: "", radiusMeters: 500 },
];

function formatClock(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

export function GPSClockModal({ onClose }: Props) {
  const { locale } = useLocale();
  const { contacts } = useContacts();
  const { entries, clockIn, clockOut, updateEntryNote } = useTimeClock();
  const [adminOpen, setAdminOpen] = useState(false);
  const [boardFilter, setBoardFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [note, setNote] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [boardLocations, setBoardLocations] = useState<BoardLocation[]>(() => {
    if (typeof window === "undefined") return DEFAULT_BOARDS;
    try {
      const raw = localStorage.getItem("ollin_gps_board_locations");
      return raw ? JSON.parse(raw) : DEFAULT_BOARDS;
    } catch {
      return DEFAULT_BOARDS;
    }
  });

  const latest = entries[0];
  const isClockedIn = latest?.type === "in";
  const clockInTime = isClockedIn ? latest.timestamp : 0;

  useEffect(() => {
    if (!isClockedIn || !clockInTime) return;
    const tick = () => setElapsed(Date.now() - clockInTime);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isClockedIn, clockInTime]);

  const handleToggle = () => {
    if (isClockedIn) {
      clockOut(note.trim() || undefined);
      setNote("");
    } else {
      clockIn(note.trim() || undefined);
      setNote("");
    }
  };

  const saveBoardLocations = (next: BoardLocation[]) => {
    setBoardLocations(next);
    try {
      localStorage.setItem("ollin_gps_board_locations", JSON.stringify(next));
    } catch (_) {}
  };

  const updateBoardLocation = (boardId: string, field: "address" | "radiusMeters" | "name" | "assignedUserId", value: string | number) => {
    setBoardLocations((prev) => {
      const next = prev.map((b) =>
        b.boardId === boardId ? { ...b, [field]: value } : b
      );
      saveBoardLocations(next);
      return next;
    });
  };

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
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Time Clock Log</title><style>body{font-family:system-ui,sans-serif;padding:24px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;} th{background:#0d9488;color:#fff;}</style></head><body><h1>Time Clock Log</h1><p>Exported ${new Date().toLocaleString()}</p><table><thead><tr><th>Date</th><th>Type</th><th>Note</th><th>Location</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
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
  const filteredByBoard =
    boardFilter === ""
      ? filteredByMonth
      : filteredByMonth.filter((e) => e.boardId === boardFilter);
  const byDay = filteredByBoard.reduce<Record<string, TimeClockEntry[]>>((acc, e) => {
    const day = new Date(e.timestamp).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { dateStyle: "short" });
    if (!acc[day]) acc[day] = [];
    acc[day].push(e);
    return acc;
  }, {});
  const dayRows = Object.entries(byDay)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .slice(0, 15);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-xl border border-gray-200"
        style={{
          backgroundColor: "#ffffff",
          boxShadow: isClockedIn
            ? "0 0 0 2px rgba(239,68,68,0.35), 0 25px 50px -12px rgba(0,0,0,0.25)"
            : "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-gray-900">
            {t(locale, "dashboard.gpsClock")}
          </h2>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {/* Month + Board filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Month</label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Board</label>
              <select
                value={boardFilter}
                onChange={(e) => setBoardFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
              >
                <option value="">All boards</option>
                {boardLocations.map((b) => (
                  <option key={b.boardId} value={b.boardId}>{b.name || b.boardId}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Elapsed / status card - solid white */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-md p-8 flex flex-col items-center justify-center min-h-[140px]">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {isClockedIn ? "Elapsed" : "Ready"}
            </p>
            <motion.span
              key={isClockedIn ? "on" : "off"}
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              className="text-4xl font-mono font-semibold tabular-nums text-gray-900"
            >
              {isClockedIn ? formatClock(elapsed) : "00:00:00"}
            </motion.span>
            {isClockedIn && (
              <p className="text-xs text-gray-500 mt-3">
                Since {new Date(clockInTime).toLocaleTimeString(locale === "he" ? "he-IL" : "en-US", { timeStyle: "short" })}
              </p>
            )}
          </div>

          {/* Optional note */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isClockedIn ? "Add a note for clock-out…" : "Add a note for clock-in…"}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm"
            />
          </div>

          {/* Single toggle button */}
          <motion.button
            type="button"
            onClick={handleToggle}
            className={`w-full flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-semibold shadow-md transition-shadow ${
              isClockedIn
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-emerald-500 text-white hover:bg-emerald-600"
            }`}
            animate={
              isClockedIn
                ? {
                    boxShadow: [
                      "0 0 20px rgba(239,68,68,0.5), 0 4px 14px rgba(239,68,68,0.4)",
                      "0 0 32px rgba(239,68,68,0.6), 0 4px 20px rgba(239,68,68,0.5)",
                      "0 0 20px rgba(239,68,68,0.5), 0 4px 14px rgba(239,68,68,0.4)",
                    ],
                  }
                : {}
            }
            transition={{ duration: 1.8, repeat: isClockedIn ? Infinity : 0, ease: "easeInOut" }}
          >
            {isClockedIn ? (
              <>
                <LogOut className="w-5 h-5" />
                {t(locale, "tools.clockOut")}
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                {t(locale, "tools.clockIn")}
              </>
            )}
          </motion.button>

          {/* Admin — single expandable block (no duplicate box) */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
            <button
              type="button"
              onClick={() => setAdminOpen((o) => !o)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4" />
              {t(locale, "tools.adminBoards")}
            </button>
            {adminOpen && (
              <div className="px-5 pb-5 pt-1 space-y-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800">Assign location to board</h3>
                <p className="text-xs text-gray-500">Set an address and radius (meters) for each board. Clock entries can be associated with a board when within range.</p>
                {boardLocations.map((b) => (
                  <div key={b.boardId} className="space-y-3 rounded-xl bg-white p-4 border border-gray-100 shadow-sm">
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Board name</label>
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) => updateBoardLocation(b.boardId, "name", e.target.value)}
                        placeholder="e.g. Main Warehouse"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                        <User className="w-3.5 h-3.5" />
                        Assign to user
                      </label>
                      <select
                        value={b.assignedUserId ?? ""}
                        onChange={(e) => updateBoardLocation(b.boardId, "assignedUserId", e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                      >
                        <option value="">— None —</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Address</label>
                      <input
                        type="text"
                        value={b.address}
                        onChange={(e) => updateBoardLocation(b.boardId, "address", e.target.value)}
                        placeholder="Address or place name"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min={100}
                        max={5000}
                        value={b.radiusMeters}
                        onChange={(e) => updateBoardLocation(b.boardId, "radiusMeters", parseInt(e.target.value, 10) || 500)}
                        className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                      />
                      <span className="text-xs text-gray-500">m radius</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Log list with editable notes */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {t(locale, "tools.lastEntries")}
            </h3>
            {dayRows.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center rounded-2xl bg-gray-50 border border-gray-100">
                No entries yet
              </p>
            ) : (
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 font-semibold text-gray-700">{locale === "he" ? "תאריך" : "Date"}</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-700">{locale === "he" ? "כניסה" : "Clock In"}</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-700">{locale === "he" ? "יציאה" : "Clock Out"}</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-700">{locale === "he" ? "סה״כ" : "Total"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRows.map(([day, dayEntries]) => {
                      const sorted = [...dayEntries].sort((a, b) => a.timestamp - b.timestamp);
                      const inEntry = sorted.find((e) => e.type === "in");
                      const outEntry = sorted.find((e) => e.type === "out");
                      const inTime = inEntry ? new Date(inEntry.timestamp).toLocaleTimeString(locale === "he" ? "he-IL" : "en-US", { timeStyle: "short" }) : "—";
                      const outTime = outEntry ? new Date(outEntry.timestamp).toLocaleTimeString(locale === "he" ? "he-IL" : "en-US", { timeStyle: "short" }) : "—";
                      const totalMs = inEntry && outEntry ? outEntry.timestamp - inEntry.timestamp : 0;
                      const totalHours = totalMs > 0 ? (totalMs / (1000 * 60 * 60)).toFixed(1) : "—";
                      return (
                        <tr key={day} className="border-b border-gray-100 last:border-0">
                          <td className="px-3 py-2.5 font-medium text-gray-800 tabular-nums">{day}</td>
                          <td className="px-3 py-2.5 text-emerald-700 tabular-nums">{inTime}</td>
                          <td className="px-3 py-2.5 text-gray-600 tabular-nums">{outTime}</td>
                          <td className="px-3 py-2.5 text-gray-700 tabular-nums font-medium">{totalHours}{totalHours !== "—" ? "h" : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50/50">
                  <details className="group" open>
                    <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer list-none flex items-center gap-1">
                      <span className="inline-block transition-transform group-open:rotate-90">▶</span>
                      <span>{locale === "he" ? "הערות (Note)" : "Note per entry"}</span>
                    </summary>
                    <ul className="space-y-2 mt-2">
                      {dayRows.flatMap(([day, dayEntries]) =>
                        [...dayEntries].sort((a, b) => a.timestamp - b.timestamp).map((e) => (
                          <li key={e.id} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500 w-10 shrink-0">{e.type === "in" ? "In" : "Out"}</span>
                            <span className="text-gray-500 text-xs w-16 shrink-0">{day}</span>
                            {editingNoteId === e.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editingNoteValue}
                                  onChange={(ev) => setEditingNoteValue(ev.target.value)}
                                  onKeyDown={(ev) => ev.key === "Enter" && saveEditNote()}
                                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-gray-900"
                                  autoFocus
                                />
                                <button type="button" onClick={saveEditNote} className="p-1.5 rounded-lg bg-teal-500 text-white">
                                  <Check className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-gray-700 min-w-0 break-words">{e.note || "—"}</span>
                                <button
                                  type="button"
                                  onClick={() => startEditNote(e)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                  aria-label="Edit note"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                  </details>
                </div>
              </div>
            )}
          </div>

          {/* Export */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Share2 className="w-4 h-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
