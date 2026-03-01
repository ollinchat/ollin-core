/**
 * Proximity engine: user location and distance calculation for Explore feed.
 * Uses navigator.geolocation and Haversine formula for exact distance badges.
 */

/** Haversine distance in meters between two WGS84 points. */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export type UserCoords = { lat: number; lng: number } | null;

/** Haifa center — fallback when GPS is unavailable so we always have realistic distances for testing. */
export const HAIFA_CENTER = { lat: 32.794044, lng: 34.989571 };

/** Request user position; on failure returns Haifa center so distance badges always work. */
export function getCurrentPosition(): Promise<UserCoords> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(HAIFA_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(HAIFA_CENTER),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}
