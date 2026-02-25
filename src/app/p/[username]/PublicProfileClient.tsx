"use client";

import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useProfile } from "@/contexts/ProfileContext";
import { slugFromUsername } from "@/lib/profile-types";
import { t } from "@/lib/translations";
import { FullProfileView } from "./FullProfileView";

export function PublicProfileClient({ username }: { username: string }) {
  const { getProfileByUsername, hasHydrated } = useProfile();
  const slug = slugFromUsername(username);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="auto">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  const profile = getProfileByUsername(slug);
  if (!profile || !profile.username) {
    return <NotFound />;
  }

  return <FullProfileView profile={profile} />;
}

function NotFound() {
  const { locale } = useLocale();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="auto">
      <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow-soft-md px-8 py-6 text-center max-w-sm space-y-4">
        <p className="text-gray-600 text-lg">{t(locale, "card.notFound")}</p>
        <Link
          href="/profile/edit"
          className="inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-accent-emerald to-accent text-white shadow-soft hover:shadow-glow-subtle transition-shadow"
        >
          {t(locale, "card.createProfile")}
        </Link>
      </div>
    </div>
  );
}
