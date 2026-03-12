"use client";

import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { FoldersPageContent } from "@/components/board/FoldersPageContent";
import { ChevronLeft } from "lucide-react";

/**
 * Standalone Folders page. Files button in Chat slide-out links here directly.
 * Does NOT open the Task slide-out.
 */
export default function DashboardFoldersPage() {
  const { locale } = useLocale();

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          aria-label={locale === "he" ? "חזרה ללוח" : "Back to dashboard"}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{locale === "he" ? "חזרה" : "Back"}</span>
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 truncate">
          {locale === "he" ? "תיקיות" : "Folders"}
        </h1>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">
        <FoldersPageContent locale={locale} />
      </main>
    </div>
  );
}
