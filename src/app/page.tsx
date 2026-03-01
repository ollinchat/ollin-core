"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Short delay before auto-redirect so Dashboard loads quickly (bypass splash). */
const HATCHING_AUTO_REDIRECT_MS = 1500;

/**
 * Ollin Core - The Hatching Page (simple, no premium effects).
 * Skip button + short auto-redirect so Phase 2 / Explore are reachable immediately.
 */
export default function HatchingPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/dashboard"), HATCHING_AUTO_REDIRECT_MS);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main className="min-h-screen bg-background text-gray-900 flex flex-col items-center justify-center p-6" dir="rtl">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div className="relative inline-block">
          <div className="border border-gray-200 rounded-lg p-8 bg-white shadow-sm">
            <h1 className="text-4xl font-bold tracking-tighter text-[#008080] mb-2">OLLIN</h1>
            <p className="text-gray-500 font-mono text-sm uppercase">Status: Hatching in progress</p>
            <p className="text-gray-400 text-xs mt-2">Redirecting to Dashboard in 1.5s…</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.replace("/dashboard")}
          className="px-6 py-3 rounded-xl bg-[#008080] text-white font-semibold text-sm hover:bg-[#006666] transition-colors"
        >
          Skip → Dashboard
        </button>

        <section className="grid gap-4 text-right">
          <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
            <h3 className="text-[#008080] font-bold mb-1">מצב קונספירציה (Beta)</h3>
            <p className="text-sm text-gray-600">ניתוח הזדמנויות א-סימטריות בשוק פעיל.</p>
          </div>
          <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
            <h3 className="text-[#008080] font-bold mb-1">Contextual Threading</h3>
            <p className="text-sm text-gray-600">מנגנון ריפליי פעיל לניהול שיחות מסתעפות.</p>
          </div>
        </section>

        <footer className="pt-8 text-gray-400 text-xs font-mono uppercase">
          System ready // Initializing Mars Logistics
        </footer>
      </div>
    </main>
  );
}
