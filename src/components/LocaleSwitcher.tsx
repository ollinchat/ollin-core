"use client";

import { useLocale } from "@/contexts/LocaleContext";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className="text-sm rounded-2xl bg-white/90 shadow-soft px-3 py-2 text-gray-700 focus:ring-2 focus:ring-accent/30 focus:outline-none border-0"
      aria-label="Language"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {l === "en" ? "English" : "עברית"}
        </option>
      ))}
    </select>
  );
}
