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
