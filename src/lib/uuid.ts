/**
 * Generate a unique ID. Uses crypto.randomUUID() when available (HTTPS/secure context).
 * Safe fallback for mobile/non-HTTPS where crypto.randomUUID is missing.
 */
export function generateUUID(): string {
  if (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
