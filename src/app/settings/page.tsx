"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { useProfile } from "@/contexts/ProfileContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Bell,
  Globe,
  HelpCircle,
  FileText,
  Lock,
  LogOut,
  Hash,
  Mail,
} from "lucide-react";

const ONBOARDED_KEY = "ollin_onboarded";
const EMAIL_SUMMARY_KEY = "ollin_email_summary";

export type EmailSummarySchedule = "weekly" | "monthly" | "disabled";

function loadEmailSummary(): EmailSummarySchedule {
  if (typeof window === "undefined") return "disabled";
  try {
    const v = localStorage.getItem(EMAIL_SUMMARY_KEY);
    if (v === "weekly" || v === "monthly" || v === "disabled") return v;
  } catch (_) {}
  return "disabled";
}

function saveEmailSummary(value: EmailSummarySchedule) {
  try {
    localStorage.setItem(EMAIL_SUMMARY_KEY, value);
  } catch (_) {}
}

const SETTINGS_ITEMS: {
  href?: string;
  labelKey: { en: string; he: string };
  icon: typeof User;
}[] = [
  { href: "/profile/edit", labelKey: { en: "Edit Profile", he: "ערוך פרופיל" }, icon: User },
  { href: "#notifications", labelKey: { en: "Notifications", he: "התראות" }, icon: Bell },
  { href: "/privacy", labelKey: { en: "Privacy", he: "פרטיות" }, icon: Lock },
  { href: "#language", labelKey: { en: "Language", he: "שפה" }, icon: Globe },
  { href: "#help", labelKey: { en: "Help", he: "עזרה" }, icon: HelpCircle },
  { href: "/terms", labelKey: { en: "Terms", he: "תנאים" }, icon: FileText },
];

export default function SettingsPage() {
  const { locale, setLocale } = useLocale();
  const { profile } = useProfile();
  const router = useRouter();
  const isRtl = locale === "he";
  const [emailSummary, setEmailSummary] = useState<EmailSummarySchedule>("disabled");

  useEffect(() => {
    setEmailSummary(loadEmailSummary());
  }, []);

  const handleEmailSummaryChange = (value: EmailSummarySchedule) => {
    setEmailSummary(value);
    saveEmailSummary(value);
  };

  const t = (key: { en: string; he: string }) => (locale === "he" ? key.he : key.en);

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(ONBOARDED_KEY);
    } catch (_) {}
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white/95">
        <Link
          href="/dashboard"
          className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 flex items-center gap-1"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{locale === "he" ? "חזרה" : "Back"}</span>
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900">
          {locale === "he" ? "הגדרות" : "Settings"}
        </h1>
      </header>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full">
        {profile.userId && (
          <div className="rounded-2xl bg-[#008080]/10 border border-[#008080]/20 p-4 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#008080]/20 flex items-center justify-center">
              <Hash className="w-5 h-5 text-[#008080]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#006666] uppercase tracking-wider">{locale === "he" ? "מזהה Ollin" : "Ollin ID"}</p>
              <p className="text-lg font-mono font-semibold text-gray-900 tracking-widest">{profile.userId}</p>
            </div>
          </div>
        )}
        <ul className="rounded-2xl bg-white shadow-soft border border-gray-100 overflow-hidden divide-y divide-gray-100">
          {SETTINGS_ITEMS.map((item) => {
            if (item.href === "#language") {
              return (
                <li key="#language" className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <span className="flex items-center gap-3 text-gray-900">
                    <item.icon className="w-5 h-5 text-[#008080]" />
                    <span className="text-sm font-medium">{t(item.labelKey)}</span>
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLocale("en")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${locale === "en" ? "bg-[#008080] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocale("he")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${locale === "he" ? "bg-[#008080] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      HE
                    </button>
                  </div>
                </li>
              );
            }
            const isInternal = item.href?.startsWith("/");
            return (
              <li key={item.href ?? item.labelKey.en}>
                {isInternal ? (
                  <Link
                    href={item.href!}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex items-center gap-3 text-gray-900">
                      <item.icon className="w-5 h-5 text-[#008080]" />
                      <span className="text-sm font-medium">{t(item.labelKey)}</span>
                    </span>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 shrink-0 ${isRtl ? "rotate-180" : ""}`}
                    />
                  </Link>
                ) : (
                  <span className="flex items-center justify-between gap-3 px-4 py-3.5 text-gray-900 hover:bg-gray-50 transition-colors cursor-default">
                    <span className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-[#008080]" />
                      <span className="text-sm font-medium">{t(item.labelKey)}</span>
                    </span>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 shrink-0 ${isRtl ? "rotate-180" : ""}`}
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Email Summary automation */}
        <div className="mt-6 rounded-sm bg-white shadow-soft border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <Mail className="w-5 h-5 text-[#008080]" />
            <span className="text-sm font-medium text-gray-900">
              {locale === "he" ? "סיכום בדוא״ל" : "Email Summary"}
            </span>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-xs text-gray-500 mb-3">
              {locale === "he"
                ? "בחר מתי לשלוח סיכום אוטומטי לדוא״ל (להפעלה עתידית עם שרת)."
                : "Choose when to send an automated executive summary by email (for future backend/cron)."}
            </p>
            {(
              [
                { value: "disabled" as const, label: { en: "Disabled", he: "כבוי" } },
                { value: "weekly" as const, label: { en: "Weekly (Thu)", he: "שבועי (ה׳)" } },
                { value: "monthly" as const, label: { en: "Monthly", he: "חודשי" } },
              ] as const
            ).map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-3 py-2 px-3 rounded-sm border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="email-summary"
                  checked={emailSummary === value}
                  onChange={() => handleEmailSummaryChange(value)}
                  className="border-gray-300 text-[#008080] accent-[#008080]"
                />
                <span className="text-sm text-gray-900">{t(label)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {locale === "he" ? "התנתק" : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}
