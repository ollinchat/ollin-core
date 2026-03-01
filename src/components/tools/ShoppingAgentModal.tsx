"use client";

import React, { useState, useCallback } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { ScanLine, MapPin, ChevronDown, X } from "lucide-react";
import { scanProductAndComparePrices, type ProductScanResult, type StoreOffer } from "@/lib/shopping-agent";

type ShoppingAgentModalProps = {
  onClose: () => void;
};

export function ShoppingAgentModal({ onClose }: ShoppingAgentModalProps) {
  const { locale } = useLocale();
  const [scanning, setScanning] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [result, setResult] = useState<ProductScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    const query = manualQuery.trim() || "12345678";
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      let userLat: number | undefined;
      let userLng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
      } catch {
        // use default Tel Aviv
      }
      const data = await scanProductAndComparePrices(query, userLat, userLng);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [manualQuery]);

  const isHe = locale === "he";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-[#008080]" />
            {isHe ? "סוכן קניות" : "Smart Shopping"}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Scanner placeholder */}
          <div className="rounded-3xl border-2 border-dashed border-[#008080]/40 bg-[#008080]/[0.08] aspect-[4/3] flex flex-col items-center justify-center gap-2">
            <div className="w-20 h-20 rounded-full bg-[#008080]/15 flex items-center justify-center">
              <ScanLine className="w-10 h-10 text-[#008080]" />
            </div>
            <p className="text-sm font-medium text-gray-700">{isHe ? "מצלמה / סורק ברקוד" : "Camera / Barcode scanner"}</p>
            <p className="text-xs text-gray-500">{isHe ? "ממשק placeholder — סריקה סימולציה" : "Placeholder interface — simulated scan"}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{isHe ? "קוד ברקוד או חיפוש" : "Barcode or search"}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder={isHe ? "הזן קוד או שם מוצר" : "Enter barcode or product name"}
                className="flex-1 rounded-2xl border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={handleScan}
                disabled={scanning}
                className="px-4 py-2.5 rounded-2xl bg-[#008080] text-white font-medium text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {scanning ? (isHe ? "סורק..." : "Scanning...") : (isHe ? "השווה" : "Compare")}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 rounded-2xl bg-red-50 p-3">{error}</p>
          )}

          {result && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">{result.productName}</h3>
              <p className="text-xs text-gray-500">{isHe ? "מחירים ומרחק — הזול ביותר מסומן" : "Prices & distance — cheapest highlighted"}</p>
              <ul className="space-y-2">
                {result.offers.map((offer) => (
                  <StoreOfferRow key={offer.storeId} offer={offer} locale={locale} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StoreOfferRow({ offer, locale }: { offer: StoreOffer; locale: string }) {
  return (
    <li
      className={`rounded-2xl border p-3 flex items-center justify-between gap-2 ${
        offer.isCheapest ? "border-[#008080] bg-[#008080]/10" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{offer.storeName}</p>
          <p className="text-xs text-gray-500">
            {offer.distanceKm} km {locale === "he" ? "מרחק" : "away"}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-semibold ${offer.isCheapest ? "text-[#008080]" : "text-gray-900"}`}>
          {offer.price} {offer.currency}
        </p>
        {offer.isCheapest && (
          <p className="text-xs font-medium text-[#008080]">{locale === "he" ? "הכי זול באזור" : "Cheapest nearby"}</p>
        )}
      </div>
    </li>
  );
}
