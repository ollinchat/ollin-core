"use client";

import { useLocale } from "@/contexts/LocaleContext";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function TermsPage() {
  const { locale } = useLocale();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white/95">
        <Link href="/settings" className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{locale === "he" ? "חזרה" : "Back"}</span>
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900">
          {locale === "he" ? "תנאים והגבלות" : "Terms & Conditions"}
        </h1>
      </header>
      <div className="flex-1 p-4 max-w-lg mx-auto w-full">
        <p className="text-sm text-gray-600">
          {locale === "he"
            ? "תנאי השימוש יופיעו כאן. גרסה מלאה תתווסף בעדכון הבא."
            : "Terms and conditions will appear here. Full version to be added in a future update."}
        </p>
      </div>
    </div>
  );
}
