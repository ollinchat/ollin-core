import type { TimeClockEntry } from "@/lib/timeclock-types";
import type { BoardLocation } from "@/lib/attendance-boards";

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

/** Local start of day from yyyy-mm-dd */
export function parseYmdStart(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export function parseYmdEnd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

export function defaultRangeYmd(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

/** Current month as YYYY-MM */
export function defaultMonthYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** First and last calendar day of month YYYY-MM */
export function monthStringToRange(ym: string): { start: string; end: string } {
  const [y, mo] = ym.split("-").map(Number);
  if (!y || !mo || mo < 1 || mo > 12) return defaultRangeYmd();
  const start = `${y}-${String(mo).padStart(2, "0")}-01`;
  const last = new Date(y, mo, 0).getDate();
  const end = `${y}-${String(mo).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

export function buildSelfShiftRowsInRange(
  entries: TimeClockEntry[],
  boards: BoardLocation[],
  rangeStart: number,
  rangeEnd: number,
  selfLabel: string
): TeamShiftRow[] {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const rows: TeamShiftRow[] = [];
  let pending: TimeClockEntry | null = null;
  for (const e of sorted) {
    if (e.type === "in") {
      pending = e;
    } else if (e.type === "out" && pending) {
      const t = pending.timestamp;
      if (t >= rangeStart && t <= rangeEnd) {
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
    } else if (e.type === "out") {
      pending = null;
    }
  }
  return rows;
}

/** Demo shifts — dates anchored to the month of rangeStart */
export function mockTeamRowsInRange(rangeStart: number, rangeEnd: number, boards: BoardLocation[]): TeamShiftRow[] {
  const d = new Date(rangeStart);
  const y = d.getFullYear();
  const m = d.getMonth();
  const candidates: TeamShiftRow[] = [
    {
      id: "demo-shift-1",
      workerName: "Dana K.",
      boardId: "board1",
      boardName: boards.find((b) => b.boardId === "board1")?.name ?? "Main Warehouse",
      entryTime: new Date(y, m, 8, 8, 30).getTime(),
      exitTime: new Date(y, m, 8, 17, 45).getTime(),
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
      entryTime: new Date(y, m, 9, 9, 0).getTime(),
      exitTime: new Date(y, m, 9, 15, 30).getTime(),
      entryLoc: "Ramat Gan (demo)",
      exitLoc: "Ramat Gan (demo)",
      note: "",
      isDemo: true,
    },
    {
      id: "demo-shift-3",
      workerName: "Eli R.",
      boardId: "board1",
      boardName: boards.find((b) => b.boardId === "board1")?.name ?? "Main Warehouse",
      entryTime: new Date(y, m, 12, 7, 0).getTime(),
      exitTime: new Date(y, m, 12, 19, 15).getTime(),
      entryLoc: "Holon (demo)",
      exitLoc: "Holon (demo)",
      note: "Inventory",
      isDemo: true,
    },
  ];
  return candidates.filter((r) => r.entryTime >= rangeStart && r.entryTime <= rangeEnd);
}

export function mergeTeamShiftRows(
  entries: TimeClockEntry[],
  boards: BoardLocation[],
  rangeStart: number,
  rangeEnd: number,
  selfLabel: string
): TeamShiftRow[] {
  const selfRows = buildSelfShiftRowsInRange(entries, boards, rangeStart, rangeEnd, selfLabel);
  const mocks = mockTeamRowsInRange(rangeStart, rangeEnd, boards);
  return [...mocks, ...selfRows].sort((a, b) => b.entryTime - a.entryTime);
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

export function teamShiftRowsToCsv(rows: TeamShiftRow[], isHe: boolean): string {
  const headers = isHe
    ? ["עובד", "לוח", "תאריך", "כניסה", "יציאה", "משך", "מיקום כניסה", "מיקום יציאה", "הערה"]
    : ["Worker", "Board", "Date", "Entry", "Exit", "Duration", "Entry location", "Exit location", "Note"];
  const loc = isHe ? "he-IL" : "en-US";
  const lines = [headers.join(",")];
  for (const r of rows) {
    const dateStr = new Date(r.entryTime).toLocaleDateString(loc);
    const entryStr = new Date(r.entryTime).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
    const exitStr = new Date(r.exitTime).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
    const dur = formatDuration(r.exitTime - r.entryTime);
    const cells = [
      `"${(r.workerName || "").replace(/"/g, '""')}"`,
      `"${(r.boardName || "").replace(/"/g, '""')}"`,
      dateStr,
      entryStr,
      exitStr,
      dur,
      `"${(r.entryLoc || "").replace(/"/g, '""')}"`,
      `"${(r.exitLoc || "").replace(/"/g, '""')}"`,
      `"${(r.note || "").replace(/"/g, '""')}"`,
    ];
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

export function teamShiftRowsToPrintHtml(title: string, rows: TeamShiftRow[], isHe: boolean): string {
  const loc = isHe ? "he-IL" : "en-US";
  const th = isHe ? ["עובד", "לוח", "תאריך", "כניסה", "יציאה", "משך", "כניסה מיקום", "יציאה מיקום", "הערה"] : ["Worker", "Board", "Date", "Entry", "Exit", "Duration", "Entry loc", "Exit loc", "Note"];
  const trs = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.workerName)}</td><td>${escapeHtml(r.boardName ?? "—")}</td><td>${new Date(r.entryTime).toLocaleDateString(loc)}</td><td>${new Date(r.entryTime).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}</td><td>${new Date(r.exitTime).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}</td><td>${formatDuration(r.exitTime - r.entryTime)}</td><td>${escapeHtml(r.entryLoc)}</td><td>${escapeHtml(r.exitLoc)}</td><td>${escapeHtml(r.note)}</td></tr>`
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,sans-serif;padding:24px;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px;}th{background:#008080;color:#fff;}</style></head><body><h1>${escapeHtml(title)}</h1><p>${new Date().toLocaleString(loc)}</p><table><thead><tr>${th.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTeamReportShareText(title: string, rows: TeamShiftRow[], isHe: boolean): string {
  const loc = isHe ? "he-IL" : "en-US";
  const lines: string[] = [title, ""];
  for (const r of rows.slice(0, 40)) {
    const d = new Date(r.entryTime).toLocaleDateString(loc);
    const e = new Date(r.entryTime).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
    const x = new Date(r.exitTime).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
    const dur = formatDuration(r.exitTime - r.entryTime);
    lines.push(
      isHe
        ? `${r.workerName} | ${r.boardName ?? ""} | ${d} | ${e}–${x} | ${dur}`
        : `${r.workerName} | ${r.boardName ?? ""} | ${d} | ${e}–${x} | ${dur}`
    );
  }
  if (rows.length > 40) lines.push(isHe ? `… +${rows.length - 40} נוספים` : `… +${rows.length - 40} more`);
  return lines.join("\n");
}
