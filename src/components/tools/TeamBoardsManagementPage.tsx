"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useTimeClock } from "@/contexts/TimeClockContext";
import { useContacts } from "@/contexts/ContactsContext";
import { t } from "@/lib/translations";
import { generateUUID } from "@/lib/uuid";
import type { TimeClockEntry } from "@/lib/timeclock-types";
import {
  type BoardLocation,
  DEFAULT_BOARDS,
  migrateBoard,
  buildLiveWorkerChips,
  RADIUS_OPTIONS,
  boardContactInitials,
  LIVE_DEMO_WORKERS,
  BOARDS_STORAGE_KEY,
} from "@/lib/attendance-boards";
import {
  MapPin,
  ChevronLeft,
  ChevronDown,
  User,
  Plus,
  Trash2,
  X,
  Map,
} from "lucide-react";

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

export type TeamShiftRow = {
  id: string;
  workerName: string;
  boardId?: string;
  boardName?: string;
  entryTime: number;
  exitTime: number;
  entryLoc: string;
  exitLoc: string;
  note: string;
  isDemo?: boolean;
};

function buildSelfShiftRows(
  entries: TimeClockEntry[],
  boards: BoardLocation[],
  monthFilter: string,
  selfLabel: string
): TeamShiftRow[] {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const rows: TeamShiftRow[] = [];
  let pending: TimeClockEntry | null = null;
  for (const e of sorted) {
    if (e.type === "in") {
      pending = e;
    } else if (e.type === "out" && pending) {
      const y = new Date(pending.timestamp).getFullYear();
      const m = String(new Date(pending.timestamp).getMonth() + 1).padStart(2, "0");
      if (`${y}-${m}` === monthFilter) {
        const bid = pending.boardId;
        rows.push({
          id: `${pending.id}-${e.id}`,
          workerName: selfLabel,
          boardId: bid,
          boardName: bid ? boards.find((x) => x.boardId === bid)?.name : undefined,
          entryTime: pending.timestamp,
          exitTime: e.timestamp,
          entryLoc: pending.address || pending.label || "—",
          exitLoc: e.address || e.label || "—",
          note: (e.note || pending.note || "").trim(),
        });
      }
      pending = null;
    }
  }
  return rows;
}

function mockTeamRowsForMonth(monthFilter: string, boards: BoardLocation[]): TeamShiftRow[] {
  const parts = monthFilter.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!y || !m) return [];
  return [
    {
      id: "demo-shift-1",
      workerName: "Dana K.",
      boardId: "board1",
      boardName: boards.find((b) => b.boardId === "board1")?.name ?? "Main Warehouse",
      entryTime: new Date(y, m - 1, 8, 8, 30).getTime(),
      exitTime: new Date(y, m - 1, 8, 17, 45).getTime(),
      entryLoc: "Tel Aviv (demo)",
      exitLoc: "Tel Aviv (demo)",
      note: "Receiving & dispatch",
      isDemo: true,
    },
    {
      id: "demo-shift-2",
      workerName: "Noa S.",
      boardId: "board2",
      boardName: boards.find((b) => b.boardId === "board2")?.name ?? "Board 2",
      entryTime: new Date(y, m - 1, 9, 9, 0).getTime(),
      exitTime: new Date(y, m - 1, 9, 15, 30).getTime(),
      entryLoc: "Ramat Gan (demo)",
      exitLoc: "Ramat Gan (demo)",
      note: "",
      isDemo: true,
    },
  ];
}

export function TeamBoardsManagementPage() {
  const { locale } = useLocale();
  const isHe = locale === "he";
  const { contacts } = useContacts();
  const { entries } = useTimeClock();

  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [boardLocations, setBoardLocations] = useState<BoardLocation[]>(() => {
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
  const [expandedBoardIds, setExpandedBoardIds] = useState<Set<string>>(() => new Set());
  const [contactSearch, setContactSearch] = useState<Record<string, string>>({});
  const [contactNameHint, setContactNameHint] = useState<{ boardId: string; name: string } | null>(null);
  const [pendingRemoveContact, setPendingRemoveContact] = useState<{
    boardId: string;
    contactId: string;
    name: string;
  } | null>(null);
  const [mapViewOpen, setMapViewOpen] = useState(false);
  const [shiftDetail, setShiftDetail] = useState<TeamShiftRow | null>(null);
  const [boardFocus, setBoardFocus] = useState<BoardLocation | null>(null);
  const [placesScriptReady, setPlacesScriptReady] = useState(false);
  const addressInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const autocompleteAttached = useRef<Set<string>>(new Set());
  const contactHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const saveBoardLocations = useCallback((next: BoardLocation[]) => {
    setBoardLocations(next);
    try {
      localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
  }, []);

  const addNewBoard = () => {
    const id = generateUUID();
    const next: BoardLocation[] = [
      ...boardLocations,
      {
        boardId: id,
        name: isHe ? `לוח ${boardLocations.length + 1}` : `Board ${boardLocations.length + 1}`,
        address: "",
        radiusMeters: 500,
        restrictLocation: false,
        assignedUserIds: [],
      },
    ];
    saveBoardLocations(next);
    setExpandedBoardIds(new Set([id]));
  };

  const toggleBoardExpanded = (boardId: string) => {
    setExpandedBoardIds((prev) => {
      const next = new Set(prev);
      if (next.has(boardId)) next.delete(boardId);
      else next.add(boardId);
      return next;
    });
  };

  const deleteBoard = (boardId: string) => {
    if (boardLocations.length <= 1) return;
    const next = boardLocations.filter((b) => b.boardId !== boardId);
    saveBoardLocations(next);
    setExpandedBoardIds((prev) => {
      const s = new Set(prev);
      s.delete(boardId);
      return s;
    });
    autocompleteAttached.current.delete(boardId);
    delete addressInputRefs.current[boardId];
  };

  const updateBoardLocation = (boardId: string, field: keyof BoardLocation, value: string | number | boolean | string[]) => {
    setBoardLocations((prev) => {
      const next = prev.map((b) => (b.boardId === boardId ? { ...b, [field]: value } : b));
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

  const removeContactFromBoard = (boardId: string, contactId: string) => {
    setBoardLocations((prev) => {
      const next = prev.map((b) =>
        b.boardId === boardId ? { ...b, assignedUserIds: b.assignedUserIds.filter((id) => id !== contactId) } : b
      );
      saveBoardLocations(next);
      return next;
    });
  };

  const handleContactAvatarClick = (boardId: string, c: { id: string; name: string; email: string }) => {
    toggleBoardContact(boardId, c.id);
    const label = (c.name || c.email || "").trim() || (isHe ? "ללא שם" : "Unnamed");
    setContactNameHint({ boardId, name: label });
    if (contactHintTimerRef.current) clearTimeout(contactHintTimerRef.current);
    contactHintTimerRef.current = setTimeout(() => {
      setContactNameHint((h) => (h?.boardId === boardId ? null : h));
      contactHintTimerRef.current = null;
    }, 2600);
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

  const anyBoardExpanded = expandedBoardIds.size > 0;

  useEffect(() => {
    const key = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim();
    if (!key || !anyBoardExpanded) return;
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
  }, [anyBoardExpanded]);

  useEffect(() => {
    if (!placesScriptReady || !anyBoardExpanded || typeof window === "undefined") return;
    const g = (
      window as unknown as {
        google?: {
          maps?: {
            places?: {
              Autocomplete?: new (
                el: HTMLInputElement,
                opts: { types?: string[] }
              ) => { addListener: (ev: string, cb: () => void) => void; getPlace: () => { formatted_address?: string } };
            };
          };
        };
      }
    ).google;
    const Autocomplete = g?.maps?.places?.Autocomplete;
    if (!Autocomplete) return;
    boardLocations.forEach((b) => {
      if (!expandedBoardIds.has(b.boardId)) return;
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
  }, [placesScriptReady, anyBoardExpanded, boardLocations, expandedBoardIds]);

  const selfLabel = isHe ? "את/ה" : "You";
  const teamShiftRows = useMemo(() => {
    const selfRows = buildSelfShiftRows(entries, boardLocations, monthFilter, selfLabel);
    const mocks = mockTeamRowsForMonth(monthFilter, boardLocations);
    return [...mocks, ...selfRows].sort((a, b) => b.entryTime - a.entryTime);
  }, [entries, boardLocations, monthFilter, selfLabel]);

  const shiftsForBoardFocus = useMemo(() => {
    if (!boardFocus) return [];
    return teamShiftRows.filter((r) => r.boardId === boardFocus.boardId);
  }, [teamShiftRows, boardFocus]);

  const btnPrimary =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#008080]/30 bg-white px-3 py-2 text-xs font-semibold text-[#008080] hover:bg-teal-50/80 transition-colors";
  const btnTurquoiseFill =
    "inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-95";

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
        <div className="mx-auto flex max-w-3xl items-stretch gap-2 px-3 pb-3">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="shrink-0 w-[9.75rem] rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
            aria-label={isHe ? "חודש / שנה" : "Month / Year"}
          />
          <button
            type="button"
            onClick={addNewBoard}
            className="ml-auto shrink-0 h-9 w-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50"
            style={{ color: OLLIN_TURQUOISE }}
            title={isHe ? "לוח חדש" : "Add board"}
            aria-label={isHe ? "הוסף לוח" : "Add board"}
          >
            <Plus className="w-5 h-5" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-8 pb-24">
        {/* A. Live Status */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              {isHe ? "סטטוס עובדים בזמן אמת" : "Live Status"}
            </h2>
            <button type="button" onClick={() => setMapViewOpen(true)} className={btnPrimary}>
              <Map className="w-3.5 h-3.5" strokeWidth={2} />
              {isHe ? "מפה" : "Map"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {boardLocations.map((b) => {
              const chips = buildLiveWorkerChips(b, activeInEntry, livePos, isHe);
              const anyOnSite = chips.some((c) => c.onSite);
              return (
                <button
                  key={b.boardId}
                  type="button"
                  onClick={() => setBoardFocus(b)}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-[#008080]/40 transition-colors w-full"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{b.name || b.boardId}</p>
                    <span
                      className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        anyOnSite ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.85)]" : "bg-slate-400"
                      }`}
                    />
                  </div>
                  {chips.length === 0 ? (
                    <p className="mt-2 text-[11px] text-slate-500">
                      {isHe ? "אין עובדים פעילים" : "No active workers"}
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {chips.map((c) => (
                        <div
                          key={c.key}
                          className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5"
                        >
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold shrink-0 ${
                              c.onSite
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {c.avatar ? (
                              <img src={c.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              c.initials
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-slate-800 truncate max-w-[5.5rem]">{c.label}</p>
                            <p className="text-[10px] tabular-nums text-slate-500">
                              {c.distanceM >= 1000 ? `${(c.distanceM / 1000).toFixed(1)} km` : `${c.distanceM}m`}{" "}
                              {isHe ? "מרחק" : "away"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-[10px] font-medium text-[#008080]">{isHe ? "הקש לפרטי לוח" : "Tap for board activity"}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* B. Board management */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            {isHe ? "ניהול לוחות" : "Board management"}
          </h2>
          <div className="space-y-3">
            {boardLocations.map((b) => {
              const open = expandedBoardIds.has(b.boardId);
              const search = (contactSearch[b.boardId] ?? "").toLowerCase();
              const filteredContacts = search.trim()
                ? contacts.filter(
                    (c) =>
                      (c.name || "").toLowerCase().includes(search) ||
                      (c.email || "").toLowerCase().includes(search)
                  )
                : contacts;
              return (
                <div key={b.boardId} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleBoardExpanded(b.boardId)}
                    className="w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-slate-50/80"
                  >
                    <ChevronDown className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{b.name || (isHe ? "לוח" : "Board")}</p>
                      <p className="text-xs text-slate-500 truncate">{b.address || (isHe ? "ללא כתובת" : "No address")}</p>
                    </div>
                  </button>
                  {open && (
                    <div className="px-3 pb-4 pt-0 space-y-3 border-t border-slate-100">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                          {isHe ? "שם הלוח" : "Board name"}
                        </label>
                        <input
                          type="text"
                          value={b.name}
                          onChange={(e) => updateBoardLocation(b.boardId, "name", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                          {isHe ? "כתובת" : "Address"}
                        </label>
                        <input
                          ref={(el) => {
                            addressInputRefs.current[b.boardId] = el;
                          }}
                          type="text"
                          value={b.address}
                          onChange={(e) => updateBoardLocation(b.boardId, "address", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          value={b.radiusMeters}
                          onChange={(e) =>
                            updateBoardLocation(b.boardId, "radiusMeters", Number(e.target.value) as 100 | 250 | 500 | 1000)
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                        >
                          {RADIUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={b.restrictLocation}
                            onChange={(e) => updateBoardLocation(b.boardId, "restrictLocation", e.target.checked)}
                            className="rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                          />
                          {t(locale, "tools.restrictLocation")}
                        </label>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1">
                          <User className="w-3.5 h-3.5" />
                          {t(locale, "tools.assignContacts")}
                        </label>
                        <input
                          type="search"
                          value={contactSearch[b.boardId] ?? ""}
                          onChange={(e) => setContactSearch((prev) => ({ ...prev, [b.boardId]: e.target.value }))}
                          placeholder={isHe ? "חיפוש…" : "Filter…"}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-2"
                        />
                        <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 min-h-[3rem]">
                          {filteredContacts.map((c) => {
                            const selected = b.assignedUserIds.includes(c.id);
                            const hasAccount = Boolean(c.userId);
                            const display = (c.name || c.email || "?").trim();
                            return (
                              <div key={c.id} className="relative flex flex-col items-center gap-1">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => handleContactAvatarClick(b.boardId, c)}
                                    className={`relative h-10 w-10 rounded-full overflow-hidden border-2 shrink-0 ${
                                      selected ? "border-[#008080] ring-2 ring-[#008080]/20" : "border-slate-200"
                                    }`}
                                  >
                                    {c.avatar ? (
                                      <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="flex h-full w-full items-center justify-center bg-slate-200 text-[11px] font-bold">
                                        {boardContactInitials(c.name, c.email)}
                                      </span>
                                    )}
                                  </button>
                                  {selected && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingRemoveContact({ boardId: b.boardId, contactId: c.id, name: display });
                                      }}
                                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 shadow-sm"
                                    >
                                      <X className="w-3 h-3" strokeWidth={2.5} />
                                    </button>
                                  )}
                                </div>
                                {selected && (
                                  <div className="flex flex-wrap justify-center gap-1 max-w-[5.5rem]">
                                    <button
                                      type="button"
                                      onClick={() => sendWhatsAppBoardInvite(c)}
                                      className="text-[9px] font-semibold text-[#008080] rounded-lg px-0.5"
                                    >
                                      WA
                                    </button>
                                    {!hasAccount && (
                                      <button
                                        type="button"
                                        onClick={() => sendWhatsAppSignup(c)}
                                        className="text-[9px] font-semibold text-[#008080] rounded-lg px-0.5"
                                      >
                                        +{isHe ? "הזמנה" : "join"}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {pendingRemoveContact?.boardId === b.boardId && (
                          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/90 p-3 space-y-2">
                            <p className="text-xs font-semibold text-rose-900">
                              {isHe
                                ? `להסיר את ${pendingRemoveContact.name} מהלוח?`
                                : `Remove ${pendingRemoveContact.name} from this board?`}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setPendingRemoveContact(null)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                              >
                                {isHe ? "ביטול" : "Cancel"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const p = pendingRemoveContact;
                                  if (p) removeContactFromBoard(p.boardId, p.contactId);
                                  setPendingRemoveContact(null);
                                }}
                                className="rounded-lg border border-rose-300 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                {isHe ? "הסר" : "Remove"}
                              </button>
                            </div>
                          </div>
                        )}
                        {contactNameHint?.boardId === b.boardId && (
                          <p className="mt-2 text-xs font-medium text-slate-800 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                            {contactNameHint.name}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => deleteBoard(b.boardId)}
                          disabled={boardLocations.length <= 1}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {isHe ? "מחק לוח" : "Delete board"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* C. Global team logs */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            {isHe ? "יומן צוות גלובלי" : "Global team logs"}
          </h2>
          <p className="text-[11px] text-slate-500">
            {isHe
              ? "כולל רישומים מהמכשיר + שורות הדגמה. הקש על משמרת לפרטים."
              : "Includes this device’s shifts + demo rows. Tap a shift for details."}
          </p>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            {teamShiftRows.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">{isHe ? "אין רישומים בחודש זה" : "No shifts this month"}</p>
            ) : (
              teamShiftRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setShiftDetail(row)}
                  className="w-full text-left px-3 py-3 hover:bg-slate-50/90 transition-colors flex flex-wrap items-center gap-2 justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{row.workerName}</p>
                    <p className="text-xs text-slate-500">
                      {row.boardName ?? (isHe ? "ללא לוח" : "No board")} ·{" "}
                      {new Date(row.entryTime).toLocaleDateString(isHe ? "he-IL" : "en-US", { dateStyle: "short" })}
                    </p>
                  </div>
                  <div className="text-xs tabular-nums text-slate-600 shrink-0">
                    {formatShiftWallClock(row.entryTime, isHe)} – {formatShiftWallClock(row.exitTime, isHe)}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Map overlay */}
      {mapViewOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setMapViewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200">
              <Map className="w-4 h-4" style={{ color: OLLIN_TURQUOISE }} />
              <h3 className="flex-1 text-sm font-semibold">{isHe ? "מפת לוחות" : "Boards map"}</h3>
              <button
                type="button"
                onClick={() => setMapViewOpen(false)}
                className="p-2 rounded-lg border border-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3">
              <div className="relative h-72 rounded-lg border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200/90 overflow-hidden">
                <p className="absolute top-2 left-2 z-10 text-[10px] rounded-lg bg-white/95 px-2 py-1 border border-slate-200">
                  {isHe ? "תצוגה לדוגמה" : "Mock preview"}
                </p>
                {boardLocations.map((b, i) => (
                  <div
                    key={b.boardId}
                    className="absolute flex flex-col items-center -translate-x-1/2"
                    style={{ left: `${10 + (i % 3) * 30}%`, top: `${18 + Math.floor(i / 3) * 32}%` }}
                  >
                    <MapPin className="w-7 h-7 text-[#008080]" strokeWidth={2} />
                    <span className="mt-0.5 max-w-[4.5rem] truncate rounded-lg bg-white px-1.5 py-0.5 text-[9px] font-semibold border border-slate-200">
                      {b.name}
                    </span>
                  </div>
                ))}
                {LIVE_DEMO_WORKERS.map((w, idx) => (
                  <div
                    key={`mw-${w.name}-${idx}`}
                    className="absolute flex h-8 w-8 items-center justify-center rounded-full border-2 border-rose-300 bg-rose-50 text-[9px] font-bold text-rose-800 animate-pulse -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${22 + (idx * 19) % 55}%`, top: `${58 + (idx % 3) * 8}%` }}
                  >
                    {boardContactInitials(w.name, "")}
                  </div>
                ))}
                {isClockedIn && (
                  <div
                    className="absolute flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#008080] bg-white text-[10px] font-bold text-[#008080] -translate-x-1/2 -translate-y-1/2"
                    style={{ left: "72%", top: "42%" }}
                  >
                    {isHe ? "א" : "ME"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift detail */}
      {shiftDetail && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShiftDetail(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-slate-200 bg-white shadow-xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">{shiftDetail.workerName}</h3>
              <button type="button" onClick={() => setShiftDetail(null)} className="p-2 rounded-lg border border-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {shiftDetail.boardName ?? "—"} ·{" "}
              {new Date(shiftDetail.entryTime).toLocaleDateString(isHe ? "he-IL" : "en-US", { dateStyle: "full" })}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <span className="text-slate-500">{isHe ? "כניסה" : "Entry"}</span>
                <span className="font-semibold tabular-nums">{formatShiftWallClock(shiftDetail.entryTime, isHe)}</span>
              </div>
              <div className="flex justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <span className="text-slate-500">{isHe ? "יציאה" : "Exit"}</span>
                <span className="font-semibold tabular-nums">{formatShiftWallClock(shiftDetail.exitTime, isHe)}</span>
              </div>
              <p className="font-mono text-sm font-semibold tabular-nums rounded-lg border border-slate-100 px-3 py-2">
                {isHe ? "משך: " : "Duration: "}
                {formatClock(shiftDetail.exitTime - shiftDetail.entryTime)}
              </p>
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500">{isHe ? "מיקום כניסה" : "Entry location"}</p>
                <p className="text-sm text-slate-800 break-words">{shiftDetail.entryLoc}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500">{isHe ? "מיקום יציאה" : "Exit location"}</p>
                <p className="text-sm text-slate-800 break-words">{shiftDetail.exitLoc}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">{isHe ? "הערות" : "Notes"}</p>
                <p className="text-sm text-slate-700">{shiftDetail.note || "—"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShiftDetail(null)}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: OLLIN_TURQUOISE }}
            >
              {isHe ? "סגור" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* Board activity (shifts on board) */}
      {boardFocus && (
        <div
          className="fixed inset-0 z-[205] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setBoardFocus(null)}
        >
          <div
            className="w-full max-w-sm max-h-[min(85vh,560px)] flex flex-col rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-200 shrink-0">
              <MapPin className="w-4 h-4 text-[#008080]" />
              <h3 className="flex-1 text-sm font-bold truncate">{boardFocus.name}</h3>
              <button type="button" onClick={() => setBoardFocus(null)} className="p-2 rounded-lg border border-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2">
              <p className="text-[11px] text-slate-500">
                {isHe ? "משמרות בלוח זה (חודש נבחר)" : "Shifts on this board (selected month)"}
              </p>
              {shiftsForBoardFocus.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">{isHe ? "אין משמרות" : "No shifts"}</p>
              ) : (
                shiftsForBoardFocus.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setBoardFocus(null);
                      setShiftDetail(row);
                    }}
                    className="w-full text-left rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:border-[#008080]/40"
                  >
                    <p className="text-sm font-semibold">{row.workerName}</p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {formatShiftWallClock(row.entryTime, isHe)} – {formatShiftWallClock(row.exitTime, isHe)}
                    </p>
                  </button>
                ))
              )}
            </div>
            <div className="p-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setBoardFocus(null)}
                className={`w-full ${btnTurquoiseFill}`}
                style={{ backgroundColor: OLLIN_TURQUOISE }}
              >
                {isHe ? "סגור" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
