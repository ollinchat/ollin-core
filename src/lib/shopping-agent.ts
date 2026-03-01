/**
 * Smart Shopping Agent - price comparison service
 * Simulates (or can integrate with) an API: scan product, fetch prices from stores, compare.
 * Returns store offers with price and distance in KM; highlights cheapest nearby.
 */

export interface StoreOffer {
  storeId: string;
  storeName: string;
  price: number;
  currency: string;
  distanceKm: number;
  address?: string;
  isCheapest?: boolean;
}

export interface ProductScanResult {
  productId: string;
  productName: string;
  barcode?: string;
  offers: StoreOffer[];
  scannedAt: number;
}

const MOCK_STORES: { id: string; name: string; lat: number; lng: number }[] = [
  { id: "store1", name: "Super Center", lat: 32.0853, lng: 34.7818 },
  { id: "store2", name: "Fresh Market", lat: 32.092, lng: 34.775 },
  { id: "store3", name: "Mega Deal", lat: 32.078, lng: 34.79 },
  { id: "store4", name: "Local Mart", lat: 32.088, lng: 34.785 },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export async function scanProductAndComparePrices(
  barcodeOrQuery: string,
  userLat?: number,
  userLng?: number
): Promise<ProductScanResult> {
  await new Promise((r) => setTimeout(r, 800));
  const lat = userLat ?? 32.0853;
  const lng = userLng ?? 34.7818;
  const basePrice = 20 + (barcodeOrQuery.length % 30);
  const offers: StoreOffer[] = MOCK_STORES.map((s, i) => ({
    storeId: s.id,
    storeName: s.name,
    price: basePrice + i * 2 - (i === 1 ? 3 : 0),
    currency: "ILS",
    distanceKm: haversineKm(lat, lng, s.lat, s.lng),
    address: `${s.name}, Tel Aviv`,
  }));
  const minPrice = Math.min(...offers.map((o) => o.price));
  const withCheapest = offers.map((o) => ({ ...o, isCheapest: o.price === minPrice }));
  withCheapest.sort((a, b) => a.distanceKm - b.distanceKm);
  return {
    productId: `prod_${barcodeOrQuery.slice(0, 8)}`,
    productName: `Product ${barcodeOrQuery.slice(0, 6) || "Sample"}`,
    barcode: barcodeOrQuery || undefined,
    offers: withCheapest,
    scannedAt: Date.now(),
  };
}
