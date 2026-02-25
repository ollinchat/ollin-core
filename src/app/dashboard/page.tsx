"use client";

import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useTimeClock } from "@/contexts/TimeClockContext";
import { t } from "@/lib/translations";
import { slugFromUsername } from "@/lib/profile-types";
import { CreditCard, User, Settings } from "lucide-react";
import { DashboardPanels } from "@/app/dashboard/DashboardPanels";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default function DashboardPage() {
  const { locale } = useLocale();
  const { profile } = useProfile();
  const { entries } = useTimeClock();
  const cardSlug = slugFromUsername(profile?.username) ?? "card";
  const isClockedIn = entries?.[0]?.type === "in";

  return (
    <div
      className={`h-screen flex flex-col bg-background overflow-hidden transition-shadow duration-300 ${
        isClockedIn ? "ring-2 ring-teal-400/50 ring-inset shadow-[inset_0_0_40px_rgba(13,148,136,0.08)]" : ""
      }`}
    >
      <header className="flex-shrink-0 px-4 py-3 glass border-0 shadow-soft flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex items-center min-w-0 shrink p-1" aria-label="Ollin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain" />
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/p/${encodeURIComponent(cardSlug)}`}
            className="inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-white/80 hover:shadow-soft transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            <User className="w-4 h-4" />
            {locale === "he" ? "פרופיל" : "Profile"}
          </Link>
          <Link
            href={`/card/${encodeURIComponent(cardSlug)}`}
            className="inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-white/80 hover:shadow-soft transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            <CreditCard className="w-4 h-4" />
            {locale === "he" ? "כרטיס" : "Card"}
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-white/80 hover:shadow-soft transition-all"
          >
            <Settings className="w-4 h-4" />
            {locale === "he" ? "הגדרות" : "Settings"}
          </Link>
          <LocaleSwitcher />
        </div>
      </header>
      <DashboardPanels />
    </div>
  );
}
