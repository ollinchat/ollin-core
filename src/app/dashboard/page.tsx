"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useProfile } from "@/contexts/ProfileContext";
import { slugFromUsername } from "@/lib/profile-types";
import { User, Settings, LogOut, ChevronDown, CreditCard, FileText } from "lucide-react";
import { DashboardPanels, BOARD_PANEL_INDEX } from "@/app/dashboard/DashboardPanels";
import { UserAvatar } from "@/components/ui/UserAvatar";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex flex-col h-[100dvh] overflow-hidden bg-background" />}>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const { locale, setLocale } = useLocale();
  const { profile } = useProfile();
  const searchParams = useSearchParams();
  const cardSlug = profile?.username ? slugFromUsername(profile.username) : "card";
  const paymentsTabRaw = searchParams.get("paymentsTab");
  const paymentsTabFromUrl = (paymentsTabRaw === "finance" ? "invoices" : paymentsTabRaw) as "overview" | "payments" | "invoices" | null;
  const [panelIndex, setPanelIndex] = useState(2);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchParams.get("open") === "board") setPanelIndex(BOARD_PANEL_INDEX);
    else if (searchParams.get("panel") !== null) {
      const n = parseInt(searchParams.get("panel") ?? "", 10);
      if (!isNaN(n) && n >= 0 && n <= 4) setPanelIndex(n);
    } else if (paymentsTabFromUrl) setPanelIndex(0);
  }, [searchParams, paymentsTabFromUrl]);
  const setPanelIndexSafe = useCallback((value: number | ((prev: number) => number)) => {
    setPanelIndex((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      return Math.max(0, Math.min(4, next));
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <header className="flex-shrink-0 px-4 py-3 border-b border-border bg-white shadow-sm flex items-center justify-between gap-2 z-10">
        <Link href="/dashboard" className="flex items-center min-w-0 shrink p-1" aria-label="Ollin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain" />
        </Link>
        <div className="flex items-center gap-4 flex-shrink-0">
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
          <div
            role="group"
            aria-label={locale === "he" ? "שפה" : "Language"}
            className="inline-flex items-stretch rounded-full border border-gray-200 bg-gray-100 p-0.5 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`min-w-[2.25rem] py-1.5 px-3 rounded-full text-sm font-medium transition-colors ${
                locale === "en" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-800"
              }`}
              aria-pressed={locale === "en"}
              aria-label="English"
            >
              EN
            </button>
            <span className="w-px self-stretch bg-gray-200 my-1" aria-hidden />
            <button
              type="button"
              onClick={() => setLocale("he")}
              className={`min-w-[2.25rem] py-1.5 px-3 rounded-full text-sm font-medium transition-colors ${
                locale === "he" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-800"
              }`}
              aria-pressed={locale === "he"}
              aria-label="עברית"
            >
              עב
            </button>
          </div>
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-1 rounded-full p-0.5 ring-2 ring-transparent hover:ring-gray-200 focus:ring-2 focus:ring-[#008080]/30 focus:outline-none transition-shadow"
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-label={locale === "he" ? "פרופיל ותפריט" : "Profile and menu"}
            >
              <UserAvatar
                name={profile?.name ?? undefined}
                email={profile?.email}
                imageUrl={profile?.profileImage}
                size="md"
                className="w-9 h-9 rounded-full"
              />
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-50">
                <Link
                  href={`/p/${encodeURIComponent(cardSlug)}`}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User className="w-4 h-4 text-gray-500 shrink-0" />
                  {locale === "he" ? "הגדרות פרופיל" : "Profile Settings"}
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4 text-gray-500 shrink-0" />
                  {locale === "he" ? "העדפות חשבון / הגדרות כלליות" : "Account Preferences"}
                </Link>
                <Link
                  href="/dashboard/summary"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                  {locale === "he" ? "סיכום פעילות" : "Summarize Activity"}
                </Link>
                <div className="my-1 border-t border-gray-100" />
                <Link
                  href="/api/auth/signout"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {locale === "he" ? "התנתק" : "Logout"}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
      <div id="dashboard-container" className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DashboardPanels
          panelIndex={panelIndex}
          setPanelIndex={setPanelIndexSafe}
          boardTab={searchParams.get("tab")}
          initialPaymentsTab={paymentsTabFromUrl ?? undefined}
        />
      </div>
    </div>
  );
}
