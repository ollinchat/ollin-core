"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useProfile } from "@/contexts/ProfileContext";
import { slugFromUsername } from "@/lib/profile-types";
import { CreditCard, User, Settings } from "lucide-react";
import { DashboardPanels, BOARD_PANEL_INDEX } from "@/app/dashboard/DashboardPanels";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { UserAvatar } from "@/components/ui/UserAvatar";

export default function DashboardPage() {
  const { locale } = useLocale();
  const { profile } = useProfile();
  const cardSlug = profile?.username ? slugFromUsername(profile.username) : "card";
  const [panelIndex, setPanelIndex] = useState(2);
  const setPanelIndexSafe = useCallback((value: number | ((prev: number) => number)) => {
    setPanelIndex((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      return Math.max(0, Math.min(4, next));
    });
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <header className="flex-shrink-0 px-4 py-3 border-b border-border bg-white shadow-sm flex items-center justify-between gap-2 z-10">
        <Link href="/dashboard" className="flex items-center min-w-0 shrink p-1" aria-label="Ollin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain" />
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setPanelIndexSafe(BOARD_PANEL_INDEX)}
            className="rounded-full p-0.5 text-gray-600 hover:bg-[#008080]/10 hover:text-[#008080] transition-all ring-2 ring-transparent hover:ring-[#008080]/30"
            aria-label={locale === "he" ? "לוח משימות" : "Task view / Board"}
            title={locale === "he" ? "לוח משימות" : "Tasks & Board"}
          >
            <UserAvatar name={profile?.name} email={profile?.email} imageUrl={profile?.profileImage} size="sm" className="w-8 h-8 rounded-full" />
          </button>
          <Link
            href={`/p/${encodeURIComponent(cardSlug)}`}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[#008080] transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            <User className="w-4 h-4" />
            {locale === "he" ? "פרופיל" : "Profile"}
          </Link>
          <Link
            href={`/card/${encodeURIComponent(cardSlug)}`}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[#008080] transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            <CreditCard className="w-4 h-4" />
            {locale === "he" ? "כרטיס" : "Card"}
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[#008080] transition-all"
          >
            <Settings className="w-4 h-4" />
            {locale === "he" ? "הגדרות" : "Settings"}
          </Link>
          <LocaleSwitcher />
        </div>
      </header>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DashboardPanels panelIndex={panelIndex} setPanelIndex={setPanelIndexSafe} />
      </div>
    </div>
  );
}
