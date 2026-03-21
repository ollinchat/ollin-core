import type { TimeClockEntry } from "@/lib/timeclock-types";
import { haversineMeters } from "@/lib/timeclock-geo";

export type BoardLocation = {
  boardId: string;
  name: string;
  address: string;
  radiusMeters: 100 | 250 | 500 | 1000;
  restrictLocation: boolean;
  assignedUserIds: string[];
};

export function migrateBoard(b: Record<string, unknown>): BoardLocation {
  const radius = [100, 250, 500, 1000].includes(Number(b.radiusMeters)) ? (b.radiusMeters as 100 | 250 | 500 | 1000) : 500;
  const assignedUserId = b.assignedUserId as string | undefined;
  return {
    boardId: String(b.boardId),
    name: String(b.name ?? ""),
    address: String(b.address ?? ""),
    radiusMeters: radius,
    restrictLocation: Boolean(b.restrictLocation),
    assignedUserIds: Array.isArray(b.assignedUserIds) ? b.assignedUserIds : assignedUserId ? [assignedUserId] : [],
  };
}

export const DEFAULT_BOARDS: BoardLocation[] = [
  { boardId: "board1", name: "Main Warehouse", address: "", radiusMeters: 500, restrictLocation: false, assignedUserIds: [] },
  { boardId: "board2", name: "Board 2", address: "", radiusMeters: 500, restrictLocation: false, assignedUserIds: [] },
];

export const BOARD_CENTER_PRESETS: Record<string, { lat: number; lng: number }> = {
  board1: { lat: 32.0853, lng: 34.7818 },
  board2: { lat: 32.0935, lng: 34.7755 },
};

export function stableBoardCenter(boardId: string): { lat: number; lng: number } {
  if (BOARD_CENTER_PRESETS[boardId]) return BOARD_CENTER_PRESETS[boardId];
  let h = 0;
  for (let i = 0; i < boardId.length; i++) h = (h * 31 + boardId.charCodeAt(i)) | 0;
  const dLat = (h % 180) / 10000;
  const dLng = ((h >> 8) % 180) / 10000;
  return { lat: 32.0853 + dLat, lng: 34.7818 + dLng };
}

export const LIVE_DEMO_WORKERS: { boardId: string; name: string; distanceM: number; onSite: boolean }[] = [
  { boardId: "board1", name: "Dana K.", distanceM: 18, onSite: true },
  { boardId: "board1", name: "Eli R.", distanceM: 480, onSite: false },
  { boardId: "board2", name: "Noa S.", distanceM: 14, onSite: true },
];

export const RADIUS_OPTIONS = [
  { value: 100, label: "100m" },
  { value: 250, label: "250m" },
  { value: 500, label: "500m" },
  { value: 1000, label: "1km" },
] as const;

export function boardContactInitials(name: string, email: string): string {
  const s = (name || email || "?").trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase() || "?";
}

export type LiveWorkerChip = {
  key: string;
  label: string;
  initials: string;
  avatar?: string;
  distanceM: number;
  onSite: boolean;
};

export function buildLiveWorkerChips(
  b: BoardLocation,
  activeIn: TimeClockEntry | undefined,
  livePos: { lat: number; lng: number } | null,
  isHe: boolean
): LiveWorkerChip[] {
  const center = stableBoardCenter(b.boardId);
  const list: LiveWorkerChip[] = [];
  for (const w of LIVE_DEMO_WORKERS) {
    if (w.boardId !== b.boardId) continue;
    list.push({
      key: `demo-${w.name}`,
      label: w.name,
      initials: boardContactInitials(w.name, ""),
      distanceM: w.distanceM,
      onSite: w.onSite,
    });
  }
  if (activeIn?.boardId === b.boardId && livePos) {
    const d = haversineMeters(livePos.lat, livePos.lng, center.lat, center.lng);
    const dm = Math.round(d);
    list.unshift({
      key: "session-you",
      label: isHe ? "את/ה" : "You",
      initials: isHe ? "א" : "ME",
      distanceM: dm,
      onSite: dm <= b.radiusMeters,
    });
  }
  return list;
}

/**
 * Map an assigned contact to a live chip (by display name, or "You"/את/ה when session email matches).
 * If no chip exists for this person, they are treated as offline (not in the live simulation).
 */
export function contactPresenceOnBoard(
  contact: { name: string; email: string },
  chips: LiveWorkerChip[],
  isHe: boolean,
  sessionEmail?: string | null
): { state: "online" | "offline" } {
  const label = (contact.name || contact.email || "").trim();
  const selfLabel = isHe ? "את/ה" : "You";
  const emailMatch =
    sessionEmail &&
    contact.email &&
    contact.email.trim().toLowerCase() === sessionEmail.trim().toLowerCase();
  const chip =
    chips.find((ch) => ch.label === label) ?? (emailMatch ? chips.find((ch) => ch.label === selfLabel) : undefined);
  if (!chip) return { state: "offline" };
  return { state: chip.onSite ? "online" : "offline" };
}

export const BOARDS_STORAGE_KEY = "ollin_gps_board_locations";
