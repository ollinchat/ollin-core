"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useProfile } from "@/contexts/ProfileContext";
import { slugFromUsername } from "@/lib/profile-types";
import { CreditCard, Settings } from "lucide-react";
import { DashboardPanels, BOARD_PANEL_INDEX } from "@/app/dashboard/DashboardPanels";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { DevUserSwitcher } from "@/components/DevUserSwitcher";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex flex-col h-[100dvh] overflow-hidden bg-background" />}>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const { locale } = useLocale();
  const { profile } = useProfile();
  const searchParams = useSearchParams();
  const cardSlug = profile?.username ? slugFromUsername(profile.username) : "card";
  const [panelIndex, setPanelIndex] = useState(2);

  useEffect(() => {
    if (searchParams.get("open") === "board") setPanelIndex(BOARD_PANEL_INDEX);
  }, [searchParams]);
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
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            href={`/card/${encodeURIComponent(cardSlug)}`}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#008080] transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            title={locale === "he" ? "כרטיס עסקי" : "Business Card"}
            aria-label="Business Card"
          >
            <CreditCard className="w-5 h-5" />
          </Link>
          <Link
            href={`/p/${encodeURIComponent(cardSlug)}`}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#008080] transition-colors ring-2 ring-transparent hover:ring-[#008080]/20"
            target="_blank"
            rel="noopener noreferrer"
            title={locale === "he" ? "פרופיל" : "Profile"}
            aria-label="Profile"
          >
            <UserAvatar name={profile?.name ?? undefined} email={profile?.email} imageUrl={profile?.profileImage} size="sm" className="w-8 h-8 rounded-full" />
          </Link>
          <Link
            href="/settings"
            className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#008080] transition-colors"
            title={locale === "he" ? "הגדרות" : "Settings"}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
          <DevUserSwitcher />
          <LocaleSwitcher />
        </div>
      </header>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DashboardPanels panelIndex={panelIndex} setPanelIndex={setPanelIndexSafe} />
      </div>
    </div>
  );
}
