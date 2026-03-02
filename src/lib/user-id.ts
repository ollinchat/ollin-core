/**
 * Unique 7-digit ID for Ollin users. IDs start with 0 (e.g. 0123456).
 */

const USED_IDS_KEY = "ollin_used_user_ids";

function loadUsedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USED_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USED_IDS_KEY, JSON.stringify(ids));
  } catch (_) {}
}

/** Generate a new unique 7-digit ID starting with 0. */
export function generateUniqueUserId(): string {
  const used = loadUsedIds();
  const maxAttempts = 1_000_000;
  for (let i = 0; i < maxAttempts; i++) {
    const n = Math.floor(Math.random() * 1_000_000);
    const id = "0" + n.toString().padStart(6, "0");
    if (!used.includes(id)) {
      used.push(id);
      saveUsedIds(used);
      return id;
    }
  }
  const fallback = "0" + Date.now().toString().slice(-6);
  if (!used.includes(fallback)) {
    used.push(fallback);
    saveUsedIds(used);
    return fallback;
  }
  return "0" + (used.length + 1).toString().padStart(6, "0");
}

/** Check if a string looks like a 7-digit Ollin ID (starts with 0, 7 chars). */
export function isOllinUserId(s: string): boolean {
  return /^0\d{6}$/.test((s || "").trim());
}

/** Format any identifier for display as 7-digit ID (e.g. "ID: 1234567"). Only 7-digit IDs are allowed in UI. */
export function formatOllinIdForDisplay(id: string | undefined | null): string {
  if (!id) return "—";
  const t = id.trim();
  if (/^0\d{6}$/.test(t)) return t;
  if (/^\d{7}$/.test(t)) return t;
  const num = t.split("").reduce((acc, c) => (acc + c.charCodeAt(0)) % 10000000, 0);
  return String(num).padStart(7, "0").slice(-7);
}

/** Format as standard mobile (e.g. +972 5X-XXXXXXX). Replaces UUIDs/fake IDs with readable number. */
export function formatStandardMobile(phone: string | undefined | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 9 && (digits.startsWith("972") || digits.startsWith("0"))) {
    const rest = digits.startsWith("972") ? digits.slice(3) : digits.slice(1);
    if (rest.length >= 9) return `+972 ${rest.slice(0, 2)}-${rest.slice(2, 5)}-${rest.slice(5, 9)}`;
    if (rest.length >= 8) return `+972 ${rest.slice(0, 2)}-${rest.slice(2, 5)}-${rest.slice(5)}`;
  }
  if (digits.length >= 10) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)}-${digits.slice(5, 8)}-${digits.slice(8)}`;
  if (digits.length >= 7) return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
  return phone.trim() || "—";
}
