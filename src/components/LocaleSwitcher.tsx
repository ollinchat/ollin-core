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
      className="h-9 rounded-xl border-0 bg-gray-50/50 pl-2.5 pr-8 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-[#008080]/20 focus:outline-none cursor-pointer transition-colors"
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
