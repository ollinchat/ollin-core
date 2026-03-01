"use client";

import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useProfile } from "@/contexts/ProfileContext";
import { slugFromUsername } from "@/lib/profile-types";
import { CreditCard, User, Settings } from "lucide-react";
import { DashboardPanels } from "@/app/dashboard/DashboardPanels";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default function DashboardPage() {
  const { locale } = useLocale();
  const { profile } = useProfile();
  const cardSlug = profile?.username ? slugFromUsername(profile.username) : "card";

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <header className="flex-shrink-0 px-4 py-3 border-b border-border bg-white shadow-sm flex items-center justify-between gap-2 z-10">
        <Link href="/dashboard" className="flex items-center min-w-0 shrink p-1" aria-label="Ollin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain" />
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/p/${encodeURIComponent(cardSlug)}`}
            className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[#008080] transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            <User className="w-4 h-4" />
            {locale === "he" ? "פרופיל" : "Profile"}
          </Link>
          <Link
            href={`/card/${encodeURIComponent(cardSlug)}`}
            className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[#008080] transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            <CreditCard className="w-4 h-4" />
            {locale === "he" ? "כרטיס" : "Card"}
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[#008080] transition-all"
          >
            <Settings className="w-4 h-4" />
            {locale === "he" ? "הגדרות" : "Settings"}
          </Link>
          <LocaleSwitcher />
        </div>
      </header>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DashboardPanels />
      </div>
    </div>
  );
}
