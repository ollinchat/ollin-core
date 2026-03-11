"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { ChevronLeft, Star, Phone, Mail, Globe, Search, SlidersHorizontal } from "lucide-react";

const CARD_ASPECT = 3.5 / 2;
const VISIBLE_DURATION_MIN = 15;
const VISIBLE_DURATION_MAX = 240;
const RADIUS_OPTIONS = [5, 20, 50, 100] as const;

type NearbyPerson = {
  id: string;
  name: string;
  professionalTitle?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  distanceMeters: number;
};

const MOCK_PEOPLE: NearbyPerson[] = [
  { id: "1", name: "Alice Chen", professionalTitle: "Product Designer", company: "TechFlow", distanceMeters: 3, email: "alice@techflow.io" },
  { id: "2", name: "Ben Rivera", professionalTitle: "Sales Lead", company: "Horizon Labs", distanceMeters: 8, phone: "+1 555 0102" },
  { id: "3", name: "Cara Blake", professionalTitle: "Strategy Director", company: "Nexus Inc", distanceMeters: 15, website: "nexus.io" },
  { id: "4", name: "David Morgan", professionalTitle: "Engineering Manager", company: "Summit Co", distanceMeters: 45, email: "david@summit.co" },
];

function formatVisibleDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

function formatVisibleDurationShort(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  return `${hours}h`;
}

function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return "0m left";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h > 0) return `${h}h ${mins}m left`;
  return `${m}m left`;
}

function formatDigitalCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

type Tab = "all" | "starred";
type StarredSort = "newest" | "oldest" | "az";

export default function NearbyPage() {
  const { locale } = useLocale();
  const [tab, setTab] = useState<Tab>("all");
  const [distanceMeters, setDistanceMeters] = useState<number>(20);
  const [visibleMinutes, setVisibleMinutes] = useState(60);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [starredAt, setStarredAt] = useState<Map<string, number>>(new Map());
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [visibilityEndTime, setVisibilityEndTime] = useState(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(60 * 60);
  const [starredSearch, setStarredSearch] = useState("");
  const [starredSort, setStarredSort] = useState<StarredSort>("newest");
  const [starredFilterOpen, setStarredFilterOpen] = useState(false);
  const [showSliderTooltip, setShowSliderTooltip] = useState(false);

  const startVisibility = useCallback((minutes: number) => {
    const total = minutes * 60;
    setTotalDurationSeconds(total);
    setVisibilityEndTime(Date.now() + total * 1000);
    setRemainingSeconds(total);
  }, []);

  const stopVisibility = useCallback(() => {
    setVisibilityEndTime(0);
    setRemainingSeconds(0);
  }, []);

  useEffect(() => {
    if (visibilityEndTime <= 0) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((visibilityEndTime - Date.now()) / 1000));
      setRemainingSeconds(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [visibilityEndTime]);

  const allFiltered = MOCK_PEOPLE.filter((p) => p.distanceMeters <= distanceMeters);
  const starredBase = MOCK_PEOPLE.filter((p) => starredIds.has(p.id));
  const starredSearchLower = starredSearch.trim().toLowerCase();
  const starredFiltered = starredSearchLower
    ? starredBase.filter(
        (p) =>
          p.name.toLowerCase().includes(starredSearchLower) ||
          (p.company?.toLowerCase().includes(starredSearchLower) ?? false) ||
          (p.professionalTitle?.toLowerCase().includes(starredSearchLower) ?? false)
      )
    : starredBase;
  const starredSorted = [...starredFiltered].sort((a, b) => {
    if (starredSort === "az") return a.name.localeCompare(b.name);
    const ta = starredAt.get(a.id) ?? 0;
    const tb = starredAt.get(b.id) ?? 0;
    return starredSort === "newest" ? tb - ta : ta - tb;
  });
  const list = tab === "all" ? allFiltered : starredSorted;

  const handleStar = (personId: string, add: boolean) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (add) {
        next.add(personId);
        setStarredAt((at) => new Map(at).set(personId, Date.now()));
      } else {
        next.delete(personId);
        setStarredAt((at) => {
          const m = new Map(at);
          m.delete(personId);
          return m;
        });
      }
      return next;
    });
  };

  const isRunning = remainingSeconds > 0 && visibilityEndTime > 0;
  const timeBarPercent = isRunning
    ? (remainingSeconds / totalDurationSeconds) * 100
    : ((visibleMinutes - VISIBLE_DURATION_MIN) / (VISIBLE_DURATION_MAX - VISIBLE_DURATION_MIN)) * 100;

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
      <header className="flex-shrink-0 flex items-center h-14 px-4 border-b border-gray-200">
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-10 h-10 rounded-none text-gray-600 hover:bg-gray-100"
          aria-label={locale === "he" ? "חזרה" : "Back"}
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="flex-1 text-center text-base font-semibold text-gray-900">
          {locale === "he" ? "כרטיסי קרבת מקום" : "Nearby Cards"}
        </h1>
        <div className="w-10" />
      </header>

      {/* Modern visibility: time bar + status + Stop Sharing */}
      <section className="flex-shrink-0 px-4 py-5 border-b border-gray-200 bg-white">
        {isRunning ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
              <p className="text-sm font-medium text-gray-900 tabular-nums" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                {locale === "he" ? "זמן נותר:" : "Time remaining:"} {formatDigitalCountdown(remainingSeconds)}
              </p>
              <p className="text-sm font-medium text-gray-600" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
                {locale === "he" ? "הגדרה:" : "Setting:"} {formatVisibleDuration(Math.round(totalDurationSeconds / 60))}
              </p>
            </div>
            <div className="relative w-full rounded-none overflow-visible py-3 visibility-bar-live">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gray-200 rounded-none" aria-hidden />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-[#008080] rounded-none transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.max(0, Math.min(100, timeBarPercent))}%` }}
              />
              <span
                className={`absolute top-1/2 w-5 h-5 rounded-none bg-white border-2 border-[#008080] shadow-sm -translate-y-1/2 ${remainingSeconds > 0 && remainingSeconds < 300 ? "visibility-dot-pulse" : ""}`}
                style={{ left: `${Math.max(0, Math.min(100, timeBarPercent))}%`, transform: "translate(-50%, -50%)" }}
              />
            </div>
            <button
              type="button"
              onClick={stopVisibility}
              className="w-full mt-3 py-2.5 rounded-none bg-white border-2 border-red-400 text-red-600 text-sm font-semibold hover:bg-red-50 hover:border-red-500 transition-colors"
              style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
            >
              {locale === "he" ? "הפסק שיתוף" : "Stop Sharing"}
            </button>
          </>
        ) : visibilityEndTime > 0 && remainingSeconds === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-500" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
              {locale === "he" ? "הנראות פגה" : "Visibility Expired"}
            </p>
            <button
              type="button"
              onClick={() => startVisibility(visibleMinutes)}
              className="w-full py-2.5 rounded-none bg-[#008080] text-white text-sm font-semibold hover:bg-[#006666] transition-colors"
            >
              {locale === "he" ? "הפעל שוב" : "Re-activate"}
            </button>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2" style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}>
              {locale === "he" ? "נראה עבור" : "Visible for"} {formatVisibleDuration(visibleMinutes)}
            </p>
            <div className="relative w-full flex items-center rounded-none min-h-[44px] py-2">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gray-200 rounded-none" aria-hidden />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-[#008080] rounded-none pointer-events-none transition-[width] duration-150"
                style={{ width: `${timeBarPercent}%` }}
              />
              {showSliderTooltip && (
                <span
                  className="absolute z-10 px-2 py-1 rounded-none bg-gray-900 text-white text-xs font-medium whitespace-nowrap -translate-x-1/2 pointer-events-none"
                  style={{
                    left: `${timeBarPercent}%`,
                    bottom: "100%",
                    marginBottom: 8,
                    fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
                  }}
                >
                  {formatVisibleDurationShort(visibleMinutes)}
                </span>
              )}
              <span
                className="absolute top-1/2 w-5 h-5 rounded-none bg-white border-2 border-[#008080] shadow-sm -translate-y-1/2 pointer-events-none"
                style={{ left: `${timeBarPercent}%`, transform: "translate(-50%, -50%)" }}
              />
              <input
                type="range"
                min={VISIBLE_DURATION_MIN}
                max={VISIBLE_DURATION_MAX}
                step={15}
                value={visibleMinutes}
                onChange={(e) => setVisibleMinutes(Number(e.target.value))}
                onPointerDown={() => setShowSliderTooltip(true)}
                onPointerUp={() => setShowSliderTooltip(false)}
                onPointerLeave={() => setShowSliderTooltip(false)}
                onPointerCancel={() => setShowSliderTooltip(false)}
                className="absolute inset-0 w-full h-full min-h-[44px] opacity-0 cursor-pointer touch-manipulation"
                style={{ touchAction: "none" }}
                aria-label={locale === "he" ? "קביעת משך נראות" : "Set visibility duration"}
              />
            </div>
            <button
              type="button"
              onClick={() => startVisibility(visibleMinutes)}
              className="w-full mt-4 py-2.5 rounded-none bg-[#008080] text-white text-sm font-semibold hover:bg-[#006666] transition-colors"
            >
              {locale === "he" ? "הפעל" : "Activate"}
            </button>
          </>
        )}
      </section>

      <main className="flex-1 overflow-y-auto">
        {/* Dual tabs: All Discovered | Starred/Favorites */}
        <section className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`flex-1 py-3 text-sm font-semibold rounded-none border-b-2 transition-colors ${
              tab === "all" ? "border-[#008080] text-[#008080] bg-white" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {locale === "he" ? "כולם שהתגלו" : "All Discovered"}
          </button>
          <button
            type="button"
            onClick={() => setTab("starred")}
            className={`flex-1 py-3 text-sm font-semibold rounded-none border-b-2 transition-colors ${
              tab === "starred" ? "border-[#008080] text-[#008080] bg-white" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {locale === "he" ? "מועדפים" : "Starred"}
          </button>
        </section>

        {/* Starred: search bar + filter */}
        {tab === "starred" && (
          <section className="px-4 py-3 border-b border-gray-200 space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  value={starredSearch}
                  onChange={(e) => setStarredSearch(e.target.value)}
                  placeholder={locale === "he" ? "חיפוש לפי שם, חברה, תפקיד..." : "Search by name, company, title..."}
                  className="w-full pl-9 pr-3 py-2 rounded-none border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#008080]"
                />
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStarredFilterOpen((o) => !o)}
                  className="p-2 rounded-none border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  aria-label="Sort"
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </button>
                {starredFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setStarredFilterOpen(false)} aria-hidden />
                    <div className="absolute right-0 top-full mt-1 py-1 rounded-none border border-gray-200 bg-white shadow-lg z-20 min-w-[180px]">
                      <button
                        type="button"
                        onClick={() => { setStarredSort("newest"); setStarredFilterOpen(false); }}
                        className={`w-full px-4 py-2 text-left text-sm ${starredSort === "newest" ? "bg-[#008080]/10 text-[#008080] font-medium" : "text-gray-700"}`}
                      >
                        {locale === "he" ? "תאריך (חדש לישן)" : "Date Added (Newest)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStarredSort("oldest"); setStarredFilterOpen(false); }}
                        className={`w-full px-4 py-2 text-left text-sm ${starredSort === "oldest" ? "bg-[#008080]/10 text-[#008080] font-medium" : "text-gray-700"}`}
                      >
                        {locale === "he" ? "תאריך (ישן לחדש)" : "Date Added (Oldest)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStarredSort("az"); setStarredFilterOpen(false); }}
                        className={`w-full px-4 py-2 text-left text-sm ${starredSort === "az" ? "bg-[#008080]/10 text-[#008080] font-medium" : "text-gray-700"}`}
                      >
                        {locale === "he" ? "א׳–ת׳" : "Alphabetical (A–Z)"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Distance filter — only for All Discovered (single bar for distance) */}
        {tab === "all" && (
          <section className="px-4 py-4 border-b border-gray-200">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Distance</p>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDistanceMeters(r)}
                  className={`flex-1 py-2 rounded-none text-xs font-semibold border transition-colors ${
                    distanceMeters === r ? "bg-[#008080] text-white border-[#008080]" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {r === 100 ? "100m" : `${r}m`}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Full-frame cards — All or Starred */}
        <section className="px-4 py-6">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3">
            {tab === "all" ? (locale === "he" ? "אנשים שהתגלו" : "Discovered") : (locale === "he" ? "אנשי קשר מועדפים" : "Favorites")}
          </p>
          <div className="flex flex-col items-center gap-6">
            {list.map((person) => {
              const isStarred = starredIds.has(person.id);
              return (
                <article
                  key={person.id}
                  className="relative w-full max-w-[360px] bg-white border border-gray-200 rounded-none overflow-hidden flex flex-col text-gray-900 shadow-[0_4px_20px_rgba(15,23,42,0.08)]"
                  style={{ aspectRatio: String(CARD_ASPECT) }}
                >
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                    <span className="text-[11px] font-semibold text-gray-500 bg-white/95 border border-gray-200 px-2 py-0.5">
                      {person.distanceMeters}m
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStar(person.id, !isStarred)}
                      className="p-1.5 rounded-none text-gray-400 hover:text-[#008080] transition-colors bg-white/95 border border-gray-200"
                      aria-label={isStarred ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star className="w-5 h-5" fill={isStarred ? "#008080" : "none"} stroke={isStarred ? "#008080" : "currentColor"} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-5 pt-12">
                    <div className="flex flex-1 min-h-0 gap-3">
                      <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-none border border-gray-200 bg-gray-50 flex items-center justify-center text-xl font-semibold text-gray-600">
                        {person.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate">{person.name}</h2>
                        {person.professionalTitle && <p className="text-sm font-medium text-gray-600 truncate mt-1">{person.professionalTitle}</p>}
                        {person.company && <p className="text-xs text-gray-500 truncate mt-0.5">{person.company}</p>}
                        <div className="mt-2 space-y-0.5 text-xs text-gray-700">
                          {person.phone && (
                            <a href={`tel:${person.phone}`} className="flex items-center gap-1.5 truncate">
                              <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                              <span className="truncate">{person.phone}</span>
                            </a>
                          )}
                          {person.email && (
                            <a href={`mailto:${person.email}`} className="flex items-center gap-1.5 truncate">
                              <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                              <span className="truncate">{person.email}</span>
                            </a>
                          )}
                          {person.website && (
                            <a
                              href={person.website.startsWith("http") ? person.website : `https://${person.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 truncate"
                            >
                              <Globe className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                              <span className="truncate">{person.website.replace(/^https?:\/\//, "")}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {list.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">
              {tab === "all" ? "No one in range. Increase distance above." : (locale === "he" ? "עדיין אין מועדפים. לחץ על הכוכב בכרטיס כדי לשמור." : "No starred contacts yet. Tap the star on a card to save.")}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
