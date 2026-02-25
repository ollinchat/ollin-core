"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale } from "@/contexts/LocaleContext";
import { useProfile } from "@/contexts/ProfileContext";
import { t } from "@/lib/translations";
import { ChevronLeft, User, Building2, Globe } from "lucide-react";

export default function FullProfilePage() {
  const { locale } = useLocale();
  const { profile } = useProfile();
  const projects = profile?.projects ?? [];
  const pressMedia = profile?.pressMedia ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 glass border-0 shadow-soft px-4 py-3 flex items-center gap-2">
        <Link
          href="/dashboard"
          className="p-2 rounded-2xl text-gray-600 hover:bg-white/80 hover:shadow-soft flex items-center gap-1"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 flex-1">
          {t(locale, "profile.edit.title")}
        </h1>
      </header>
      <main className="max-w-xl mx-auto px-4 py-6 pb-24 space-y-8">
        <section className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-2xl border-2 border-gray-100 bg-gray-50 overflow-hidden flex-shrink-0">
            {profile?.profileImage ? (
              <img src={profile.profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-accent text-2xl font-bold">
                {profile?.name?.slice(0, 1)?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <h2 className="mt-3 text-xl font-bold text-gray-900">{profile?.name || "—"}</h2>
          {profile?.professionalTitle && (
            <p className="text-accent font-medium">{profile.professionalTitle}</p>
          )}
        </section>

        {profile?.bio && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Bio
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed rounded-2xl bg-white/80 p-4 shadow-soft">
              {profile.bio}
            </p>
          </section>
        )}

        {projects.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {t(locale, "profile.projects")}
            </h3>
            <div className="space-y-3">
              {projects.map((proj) => (
                <div key={proj.id} className="rounded-2xl bg-white/80 shadow-soft p-4">
                  <p className="font-medium text-gray-900">{proj.title}</p>
                  {proj.date && <p className="text-xs text-gray-500">{proj.date}</p>}
                  {proj.description && (
                    <p className="text-sm text-gray-600 mt-2">{proj.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {pressMedia.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {t(locale, "profile.pressMedia")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {pressMedia.map((link) => (
                <a
                  key={link.id}
                  href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl bg-white/80 shadow-soft px-4 py-2 text-sm text-accent hover:bg-accent-muted/30"
                >
                  {link.label || link.url}
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="flex justify-center pt-4">
          <Link
            href="/profile/edit"
            className="rounded-2xl px-6 py-3 text-sm font-medium bg-gradient-to-r from-accent-emerald to-accent text-white shadow-soft"
          >
            Edit profile
          </Link>
        </div>
      </main>
    </div>
  );
}
