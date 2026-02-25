/**
 * Nearby places search using OpenStreetMap Overpass API (no API key).
 * Used when the user asks e.g. "Who sells tires nearby?" or "Restaurants near me".
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

/** Default center (Tel Aviv) if geolocation not available. */
const DEFAULT_LAT = 32.0853;
const DEFAULT_LON = 34.7818;
const RADIUS_M = 8000;

/** Detect if the message is asking for nearby places / local search. */
export function isNearbySearchIntent(text: string): boolean {
  const lower = text.trim().toLowerCase();
  const heNearby = /(מי מוכר|איפה יש|מכר|ליד|באזור|סביב|קרוב)/;
  const enNearby = /(who sells|where can i find|nearby|near me|around here|local|places that sell|stores that|shops that)/i;
  return heNearby.test(text) || enNearby.test(lower) || /\b(nearby|near me)\b/i.test(lower);
}

/** Extract search query from message (e.g. "tires", "restaurants"). */
export function extractSearchQuery(text: string): string {
  const lower = text.trim().toLowerCase();
  let query = lower
    .replace(/(who sells|where can i find|that sell|nearby|near me|around here|local|places that sell|stores that|shops that)\s*/gi, "")
    .replace(/(מי מוכר|איפה יש|מכר|ליד|באזור|סביב|קרוב)\s*/g, "")
    .replace(/\?|\.|!$/g, "")
    .trim();
  if (!query || query.length < 2) query = "shop";
  return query;
}

export interface PlaceResult {
  name: string;
  type?: string;
  lat: number;
  lon: number;
}

/** Fetch nearby places from Overpass (OSM). */
export async function fetchNearbyPlaces(
  query: string,
  lat: number = DEFAULT_LAT,
  lon: number = DEFAULT_LON
): Promise<PlaceResult[]> {
  const sanitized = query.replace(/[^\w\s-]/g, "").trim() || "shop";
  const overpassQuery = `
    [out:json][timeout:8];
    (
      node["shop"](around:${RADIUS_M},${lat},${lon});
      node["amenity"](around:${RADIUS_M},${lat},${lon});
    );
    out body 12;
  `;
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(overpassQuery),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const elements = (json.elements || []) as { id: number; lat: number; lon: number; tags?: Record<string, string> }[];
    const byName = new Map<string, PlaceResult>();
    const queryLower = sanitized.toLowerCase();
    for (const el of elements) {
      const name = el.tags?.name || el.tags?.brand || "Unnamed place";
      const type = el.tags?.shop || el.tags?.amenity || "";
      const matches = !queryLower || queryLower === "shop" || name.toLowerCase().includes(queryLower) || type.toLowerCase().includes(queryLower);
      if (matches && name !== "Unnamed place" || !queryLower) {
        byName.set(name + el.lat, { name, type, lat: el.lat, lon: el.lon });
      }
    }
    return Array.from(byName.values()).slice(0, 10);
  } catch {
    return [];
  }
}

/** Format places as a reply string in the given language. */
export function formatPlacesReply(places: PlaceResult[], isHebrew: boolean): string {
  if (places.length === 0) {
    return isHebrew
      ? "לא מצאתי עסקים קרובים במערכת. נסה לפתוח Google Maps או Waze לחיפוש מדויק יותר."
      : "I didn’t find nearby businesses in the system. Try Google Maps or Waze for a more precise search.";
  }
  const header = isHebrew ? "עסקים באזור:\n" : "Nearby places:\n";
  const list = places.map((p, i) => `${i + 1}. ${p.name}${p.type ? ` (${p.type})` : ""}`).join("\n");
  const mapsHint = isHebrew
    ? "\nלמיקום: חפש ב-Google Maps."
    : "\nFor directions, search on Google Maps.";
  return header + list + mapsHint;
}
