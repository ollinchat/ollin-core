"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useTimeClock } from "@/contexts/TimeClockContext";
import { useContacts } from "@/contexts/ContactsContext";
import { t } from "@/lib/translations";
import {
  MapPin,
  ChevronLeft,
  Settings,
  Share2,
  FileDown,
  Pencil,
  Check,
  User,
  LogIn,
  LogOut,
} from "lucide-react";
import type { TimeClockEntry } from "@/lib/timeclock-types";

export type TimeAttendanceManagementPanelProps = {
  onClose: () => void;
  defaultScrollToSummary?: boolean;
  /** embedded = inside GPS modal card; fullscreen = internal slide with backdrop */
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

const RADIUS_OPTIONS = [
  { value: 100, label: "100m" },
  { value: 250, label: "250m" },
  { value: 500, label: "500m" },
  { value: 1000, label: "1km" },
] as const;

type BoardLocation = {
  boardId: string;
  name: string;
  address: string;
  radiusMeters: 100 | 250 | 500 | 1000;
  restrictLocation: boolean;
  assignedUserIds: string[];
};

function migrateBoard(b: Record<string, unknown>): BoardLocation {
  const radius = [100, 250, 500, 1000].includes(Number(b.radiusMeters)) ? (b.radiusMeters as 100 | 250 | 500 | 1000) : 500;
  const assignedUserId = b.assignedUserId as string | undefined;
  return {
    boardId: String(b.boardId),
    name: String(b.name ?? ""),
    address: String(b.address ?? ""),
    radiusMeters: radius,
    restrictLocation: Boolean(b.restrictLocation),
    assignedUserIds: Array.isArray(b.assignedUserIds) ? b.assignedUserIds : (assignedUserId ? [assignedUserId] : []),
  };
}

const DEFAULT_BOARDS: BoardLocation[] = [
  { boardId: "board1", name: "Main Warehouse", address: "", radiusMeters: 500, restrictLocation: false, assignedUserIds: [] },
  { boardId: "board2", name: "Board 2", address: "", radiusMeters: 500, restrictLocation: false, assignedUserIds: [] },
];

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

export function TimeAttendanceManagementPanel({
  onClose,
  defaultScrollToSummary,
  layout = "embedded",
}: TimeAttendanceManagementPanelProps) {
  const { locale } = useLocale();
  const { contacts } = useContacts();
  const { entries, clockIn, clockOut, updateEntryNote } = useTimeClock();
  const [adminOpen, setAdminOpen] = useState(false);
  const [boardFilter, setBoardFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [boardLocations, setBoardLocations] = useState<BoardLocation[]>(() => {
    if (typeof window === "undefined") return DEFAULT_BOARDS;
    try {
      const raw = localStorage.getItem("ollin_gps_board_locations");
      if (!raw) return DEFAULT_BOARDS;
      const parsed = JSON.parse(raw) as Record<string, unknown>[];
      return Array.isArray(parsed) ? parsed.map((b) => migrateBoard(b)) : DEFAULT_BOARDS;
    } catch {
      return DEFAULT_BOARDS;
    }
  });
  const [hourlyRate, setHourlyRate] = useState("");
  const [currency, setCurrency] = useState<"ILS" | "USD" | "EUR">("ILS");
  const [contactSearch, setContactSearch] = useState<Record<string, string>>({});
  const summaryBlockRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [clockOutSummary, setClockOutSummary] = useState<{
    totalMs: number;
    startAddress: string;
    endAddress: string;
    note: string;
    outEntryId: string | null;
  } | null>(null);
  const [clockOutPopupNotes, setClockOutPopupNotes] = useState("");
  const [placesScriptReady, setPlacesScriptReady] = useState(false);
  const addressInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const autocompleteAttached = useRef<Set<string>>(new Set());

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

  const handlePanelClockToggle = async () => {
    const noteVal = note.trim() || undefined;
    if (isClockedIn) {
      const inEntry = entries.find((e) => e.type === "in");
      const startAddress = inEntry?.address || inEntry?.label || "—";
      const totalMs = inEntry ? Date.now() - inEntry.timestamp : 0;
      await clockOut(noteVal);
      setNote("");
      setClockOutSummary({
        totalMs,
        startAddress,
        endAddress: "—",
        note: noteVal ?? "",
        outEntryId: null,
      });
      setClockOutPopupNotes(noteVal ?? "");
    } else {
      await clockIn(noteVal);
      setNote("");
    }
  };

  useEffect(() => {
    if (!clockOutSummary || (clockOutSummary.endAddress !== "—" && clockOutSummary.outEntryId != null)) return;
    const outEntry = entries[0];
    if (outEntry?.type === "out") {
      const endAddr = outEntry.address || outEntry.label || "—";
      setClockOutSummary((prev) => (prev ? { ...prev, endAddress: endAddr, outEntryId: outEntry.id } : null));
    }
  }, [clockOutSummary, entries]);

  useEffect(() => {
    if (!defaultScrollToSummary || !summaryBlockRef.current) return;
    const t = setTimeout(() => {
      summaryBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(t);
  }, [defaultScrollToSummary]);

  const saveBoardLocations = (next: BoardLocation[]) => {
    setBoardLocations(next);
    try {
      localStorage.setItem("ollin_gps_board_locations", JSON.stringify(next));
    } catch (_) {}
  };

  const updateBoardLocation = (boardId: string, field: keyof BoardLocation, value: string | number | boolean | string[]) => {
    setBoardLocations((prev) => {
      const next = prev.map((b) =>
        b.boardId === boardId ? { ...b, [field]: value } : b
      );
      saveBoardLocations(next);
      return next;
    });
  };

  const toggleBoardContact = (boardId: string, contactId: string) => {
    setBoardLocations((prev) => {
      const next = prev.map((b) => {
        if (b.boardId !== boardId) return b;
        const ids = b.assignedUserIds.includes(contactId)
          ? b.assignedUserIds.filter((id) => id !== contactId)
          : [...b.assignedUserIds, contactId];
        return { ...b, assignedUserIds: ids };
      });
      saveBoardLocations(next);
      return next;
    });
  };

  const baseUrl =
    (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const signupLink = baseUrl ? `${baseUrl}/onboarding` : "/onboarding";
  const boardInviteLink = baseUrl ? `${baseUrl}/dashboard` : "/dashboard";
  const sendWhatsAppSignup = (contact: { phone?: string }) => {
    const msg = encodeURIComponent(`Join our team on Ollin: ${signupLink}`);
    const num = (contact.phone ?? "").replace(/\D/g, "");
    if (num) window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  };
  const sendWhatsAppBoardInvite = (contact: { phone?: string }) => {
    const msg = encodeURIComponent(`Hi! I sent you a new board on Ollin. Join here: ${boardInviteLink}`);
    const num = (contact.phone ?? "").replace(/\D/g, "");
    if (num) window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  };

  // Load Google Places script for address autocomplete (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY from .env.local)
  useEffect(() => {
    const key = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim();
    if (!key || !adminOpen) return;
    if ((window as unknown as { __ollinPlacesLoaded?: boolean }).__ollinPlacesLoaded) {
      setPlacesScriptReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = () => {
      (window as unknown as { __ollinPlacesLoaded?: boolean }).__ollinPlacesLoaded = true;
      setPlacesScriptReady(true);
    };
    document.head.appendChild(script);
    return () => {};
  }, [adminOpen]);

  // Attach Places Autocomplete to address inputs
  useEffect(() => {
    if (!placesScriptReady || !adminOpen || typeof window === "undefined") return;
    const g = (window as unknown as { google?: { maps?: { places?: { Autocomplete?: new (el: HTMLInputElement, opts: { types?: string[] }) => { addListener: (ev: string, cb: () => void) => void; getPlace: () => { formatted_address?: string } } } } } }).google;
    const Autocomplete = g?.maps?.places?.Autocomplete;
    if (!Autocomplete) return;
    boardLocations.forEach((b) => {
      const el = addressInputRefs.current[b.boardId];
      if (!el || autocompleteAttached.current.has(b.boardId)) return;
      try {
        const autocomplete = new Autocomplete(el, { types: ["address"] });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const addr = place?.formatted_address ?? "";
          if (addr) updateBoardLocation(b.boardId, "address", addr);
        });
        autocompleteAttached.current.add(b.boardId);
      } catch (_) {}
    });
  }, [placesScriptReady, adminOpen, boardLocations]);

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
              <p className="tabular-nums font-medium text-slate-900">{formatClock(clockOutSummary.totalMs)}</p>
              <p className="text-slate-700">
                {t(locale, "tools.totalHours")}: {formatHoursMinutes(clockOutSummary.totalMs)}
                {rateNumSummary > 0 && shiftPay != null && (
                  <>
                    {" "}
                    × {t(locale, "tools.hourlyRate")} = {t(locale, "tools.totalPay")}: {currencySymbol}
                    {shiftPay.toFixed(2)}
                  </>
                )}
              </p>
              <div>
                <span className="text-xs font-medium text-slate-500 block">{t(locale, "tools.entryLocation")}</span>
                <p className="text-slate-900 font-medium">{clockOutSummary.startAddress || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">{t(locale, "tools.exitLocation")}</span>
                <p className="text-slate-900 font-medium">{clockOutSummary.endAddress || "—"}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Notes</label>
                <textarea
                  value={clockOutPopupNotes}
                  onChange={(e) => setClockOutPopupNotes(e.target.value)}
                  placeholder="Add notes for this shift…"
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
              {locale === "he" ? "אשר ושמור" : "Confirm & Save"}
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
      style={
        layout === "embedded" && isClockedIn
          ? { boxShadow: "0 0 0 2px rgba(239,68,68,0.2), 0 12px 40px rgba(0,0,0,0.08)" }
          : undefined
      }
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 id="time-attendance-panel-title" className="flex-1 text-center text-base font-semibold text-slate-900">
          {t(locale, "dashboard.gpsClock")}
        </h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-5 space-y-5">
          {isClockedIn && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900">
              {locale === "he"
                ? "משמרת פעילה — עצירה מאריח מעקב הזמן בשקופית או ״יציאה״ למטה."
                : "Shift in progress — stop from the Time Tracker tile on the slide, or Clock out below."}
            </div>
          )}

          {/* Live session + optional note + clock in/out (restored full controls) */}
          <div className="rounded-lg bg-white border border-slate-200 p-5 flex flex-col items-center justify-center min-h-[120px]">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
              {isClockedIn ? (locale === "he" ? "זמן שחלף" : "Elapsed") : locale === "he" ? "מוכן" : "Ready"}
            </p>
            <motion.span
              key={isClockedIn ? "on" : "off"}
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              className="text-3xl font-mono font-semibold tabular-nums text-slate-900"
            >
              {isClockedIn ? formatClock(elapsed) : "00:00:00"}
            </motion.span>
            {isClockedIn && (
              <p className="text-xs text-slate-500 mt-2 tabular-nums">
                {locale === "he" ? "מאז" : "Since"}{" "}
                {new Date(clockInTime).toLocaleTimeString(locale === "he" ? "he-IL" : "en-US", { timeStyle: "short" })}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider block mb-2">
              {locale === "he" ? "הערה (אופציונלי)" : "Note (optional)"}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isClockedIn
                  ? locale === "he"
                    ? "הערה ליציאה…"
                    : "Add a note for clock-out…"
                  : locale === "he"
                    ? "הערה לכניסה…"
                    : "Add a note for clock-in…"
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <motion.button
            type="button"
            onClick={() => void handlePanelClockToggle()}
            className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors ${
              isClockedIn ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
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

          {/* Month / Year + Board in one row (flex-row) */}
          <div className="flex flex-row flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Month / Year</label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Board</label>
              <select
                value={boardFilter}
                onChange={(e) => setBoardFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
              >
                <option value="">All boards</option>
                {boardLocations.map((b) => (
                  <option key={b.boardId} value={b.boardId}>{b.name || b.boardId}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Admin — single "Assign location to board" block */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
            <button
              type="button"
              onClick={() => setAdminOpen((o) => !o)}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4" />
              {t(locale, "tools.adminBoards")}
            </button>
            {adminOpen && (
              <div className="px-5 pb-5 pt-1 space-y-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800">Assign location to board</h3>
                <p className="text-xs text-gray-500">Set an address and radius for each board. Clock entries can be associated with a board when within range.</p>
                {boardLocations.map((b) => {
                  const search = (contactSearch[b.boardId] ?? "").toLowerCase();
                  const filteredContacts = search.trim()
                    ? contacts.filter((c) => (c.name || "").toLowerCase().includes(search) || (c.email || "").toLowerCase().includes(search))
                    : contacts;
                  return (
                  <div key={b.boardId} className="space-y-3 rounded-lg bg-white p-4 border border-gray-100 shadow-sm">
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
                      <label className="text-xs font-medium text-gray-500 block mb-1">Address (with Google Places)</label>
                      <input
                        ref={(el) => { addressInputRefs.current[b.boardId] = el; }}
                        type="text"
                        value={b.address}
                        onChange={(e) => updateBoardLocation(b.boardId, "address", e.target.value)}
                        placeholder="Start typing address…"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <select
                          value={b.radiusMeters}
                          onChange={(e) => updateBoardLocation(b.boardId, "radiusMeters", Number(e.target.value) as 100 | 250 | 500 | 1000)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                        >
                          {RADIUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={b.restrictLocation}
                          onChange={(e) => updateBoardLocation(b.boardId, "restrictLocation", e.target.checked)}
                          className="rounded border-gray-300 text-[#0d9488] focus:ring-[#0d9488]"
                        />
                        <span className="text-xs font-medium text-gray-700">{t(locale, "tools.restrictLocation")}</span>
                      </label>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                        <User className="w-3.5 h-3.5" />
                        {t(locale, "tools.assignContacts")}
                      </label>
                      <input
                        type="search"
                        value={contactSearch[b.boardId] ?? ""}
                        onChange={(e) => setContactSearch((prev) => ({ ...prev, [b.boardId]: e.target.value }))}
                        placeholder="Search users…"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 mb-2"
                      />
                      <div className="space-y-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-2 bg-gray-50">
                        {filteredContacts.map((c) => {
                          const selected = b.assignedUserIds.includes(c.id);
                          const hasAccount = Boolean(c.userId);
                          return (
                            <div key={c.id} className="flex items-center justify-between gap-2 flex-wrap">
                              <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleBoardContact(b.boardId, c.id)}
                                  className="rounded border-gray-300 text-[#0d9488] focus:ring-[#0d9488]"
                                />
                                <span className="text-sm text-gray-900 truncate">{c.name || c.email}</span>
                              </label>
                              {selected && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => sendWhatsAppBoardInvite(c)}
                                    className="text-xs font-medium text-green-600 hover:text-green-700 whitespace-nowrap"
                                  >
                                    {t(locale, "tools.inviteBoardWhatsApp")}
                                  </button>
                                  {!hasAccount && (
                                    <span className="text-gray-300">|</span>
                                  )}
                                  {!hasAccount && (
                                    <button
                                      type="button"
                                      onClick={() => sendWhatsAppSignup(c)}
                                      className="text-xs font-medium text-green-600 hover:text-green-700 whitespace-nowrap"
                                    >
                                      {t(locale, "tools.sendSignupWhatsApp")}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unified daily shift cards: one card per day with check-in, check-out, and note in one block */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {t(locale, "tools.lastEntries")}
            </h3>
            {dayRows.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center rounded-lg bg-gray-50 border border-gray-100">
                No entries yet
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
                    <div
                      key={day}
                      className="rounded-lg border border-gray-200 bg-white p-4 shadow-soft overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-semibold text-gray-900 tabular-nums">{day}</span>
                        <span className="text-sm font-medium text-gray-600 tabular-nums">
                          {totalHoursDisplay}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-500 block text-xs">{locale === "he" ? "כניסה" : "Check-in"}</span>
                          <span className="text-accent font-medium tabular-nums">{inTime}</span>
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
                              <button type="button" onClick={saveEditNote} className="p-2 rounded-lg bg-accent text-white shrink-0">
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

          {/* Bottom summary: Total Hours + Hourly Rate + Currency = Total Pay */}
          <div ref={summaryBlockRef} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t(locale, "tools.totalHours")} / {t(locale, "tools.totalPay")}</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="tabular-nums text-lg font-semibold text-gray-900">
                {formatHoursMinutes(totalPeriodMs)}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">{t(locale, "tools.hourlyRate")}</label>
                <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as "ILS" | "USD" | "EUR")}
                    className="rounded-l-lg border-0 border-r border-gray-200 px-2 py-2 text-sm font-medium text-gray-700 bg-gray-100"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.symbol}</option>
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
              <div className="tabular-nums text-lg font-semibold text-[#0d9488]">
                = {rateNum > 0 ? `${CURRENCIES.find((c) => c.id === currency)?.symbol ?? ""}${totalPay.toFixed(2)}` : "—"}
              </div>
            </div>
          </div>

          {/* Export */}
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
