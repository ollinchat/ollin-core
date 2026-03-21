/** Geolocation + optional Google reverse geocode for time-clock entry/exit labels. */

/** Great-circle distance in meters (WGS84). */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatCoordsShort(lat: number, lng: number): string {
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

export async function reverseGeocodeArea(lat: number, lng: number): Promise<string> {
  const key = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim();
  if (key) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(key)}`
      );
      const data = (await res.json()) as {
        results?: Array<{ formatted_address?: string; address_components?: Array<{ long_name: string; types: string[] }> }>;
      };
      const first = data.results?.[0];
      const comp = first?.address_components;
      if (comp?.length) {
        const neighborhood =
          comp.find((c) => c.types.includes("neighborhood"))?.long_name ||
          comp.find((c) => c.types.includes("sublocality"))?.long_name;
        const locality = comp.find((c) => c.types.includes("locality"))?.long_name;
        const admin = comp.find((c) => c.types.includes("administrative_area_level_1"))?.long_name;
        const country = comp.find((c) => c.types.includes("country"))?.long_name;
        const parts = [neighborhood, locality, admin, country].filter(Boolean);
        if (parts.length) return parts.join(", ");
      }
      if (first?.formatted_address) return first.formatted_address;
    } catch {
      /* fall through */
    }
  }
  return formatCoordsShort(lat, lng);
}

export function getCurrentAreaLabel(): Promise<string> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve("");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = await reverseGeocodeArea(latitude, longitude);
        resolve(label);
      },
      () => resolve(""),
      { timeout: 12000, maximumAge: 30000 }
    );
  });
}
