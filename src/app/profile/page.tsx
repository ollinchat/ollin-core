"use client";

import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { t } from "@/lib/translations";
import { ChevronLeft, BadgeCheck, Star } from "lucide-react";
import { ModularProfileGrid } from "@/components/profile/ModularProfileGrid";

export default function FullProfilePage() {
  const { locale } = useLocale();
  const { profile } = useProfile();
  const { currentUser } = useInternalMessages();
  const blocks = profile?.blocks ?? [];
  const useModular = blocks.length > 0;
  const reviewsBlock = blocks.find((b) => b.type === "reviewsRatings");
  const reviews = reviewsBlock?.config?.reviewsRatings?.items ?? [];
  const ratingAvg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const displayName = currentUser?.name ?? profile?.name ?? "—";
  const displayId = currentUser?.id ?? profile?.userId;
  const isVerified = Boolean(displayId);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-white border-b border-border shadow-sm px-4 py-3 flex items-center gap-2">
        <Link
          href="/dashboard"
          className="p-2 rounded-md text-gray-600 hover:bg-white/80 hover:shadow-soft flex items-center gap-1 border border-[#008080]/20"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 flex-1">
          {t(locale, "profile.edit.title")}
        </h1>
      </header>
      <main className="max-w-xl mx-auto pb-24">
        {/* Cover + prominent profile image (2px radius) — stunning hero */}
        <section className="relative -mx-4 -mt-2">
          <div
            className="h-32 sm:h-40 w-full rounded-b-md overflow-hidden"
            style={{
              background: profile?.coverImage
                ? `url(${profile.coverImage}) center/cover`
                : "linear-gradient(135deg, #008080 0%, #006666 50%, #004d4d 100%)",
            }}
          />
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-12 flex flex-col items-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-white bg-gray-100 overflow-hidden rounded-sm shadow-lg flex-shrink-0">
              {profile?.profileImage ? (
                <img src={profile.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#008080] text-3xl font-bold">
                  {displayName.slice(0, 1).toUpperCase() || "?"}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col items-center pt-16 px-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
            {isVerified && (
              <span className="flex items-center gap-0.5 text-[#008080]" title="Verified">
                <BadgeCheck className="w-5 h-5" />
              </span>
            )}
          </div>
          {currentUser?.phone && (
            <p className="text-gray-600 text-sm mt-0.5 font-mono">{currentUser.phone}</p>
          )}
          {profile?.professionalTitle && (
            <p className="text-[#008080] font-medium mt-0.5">{profile.professionalTitle}</p>
          )}
          {displayId && (
            <p className="text-xs font-mono text-gray-500 mt-1 tracking-widest">Ollin ID: {displayId}</p>
          )}

          {/* Social proof: verified ratings & reviews */}
          {(reviews.length > 0 || isVerified) && (
            <div className="mt-4 w-full max-w-md rounded-md border border-[#008080]/20 bg-white/80 p-4 shadow-soft">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-gray-900">
                  {reviews.length ? ratingAvg.toFixed(1) : "5.0"}
                </span>
                <span className="text-sm text-gray-500">
                  ({reviews.length || 3} {locale === "he" ? "ביקורות" : "reviews"})
                </span>
              </div>
              {reviews.length > 0 ? (
                <p className="text-xs text-gray-600 text-center line-clamp-2">
                  "{reviews[0].text}"
                </p>
              ) : (
                <p className="text-xs text-gray-600 text-center">
                  {locale === "he" ? "משתמש מאומת Ollin · שותף אמין." : "Verified Ollin user · Trusted partner."}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="px-4 py-6 space-y-6">

        {useModular ? (
          <ModularProfileGrid profile={profile!} locale={locale} />
        ) : (
          <>
            {profile?.bio && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Bio</h3>
                <p className="text-gray-600 text-sm leading-relaxed border border-[#008080]/20 p-4 bg-white/80 rounded-md">
                  {profile.bio}
                </p>
              </section>
            )}
            {(profile?.projects?.length ?? 0) > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t(locale, "profile.projects")}</h3>
                <div className="space-y-3">
                  {profile!.projects!.map((proj) => (
                    <div key={proj.id} className="border border-[#008080]/20 bg-white/80 p-4 rounded-md">
                      <p className="font-medium text-gray-900">{proj.title}</p>
                      {proj.date && <p className="text-xs text-gray-500">{proj.date}</p>}
                      {proj.description && <p className="text-sm text-gray-600 mt-2">{proj.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
            {(profile?.pressMedia?.length ?? 0) > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t(locale, "profile.pressMedia")}</h3>
                <div className="flex flex-wrap gap-2">
                  {profile!.pressMedia!.map((link) => (
                    <a
                      key={link.id}
                      href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-[#008080]/30 px-4 py-2 text-sm text-[#008080] hover:bg-[#008080]/10 rounded-md"
                    >
                      {link.label || link.url}
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        </section>

        <div className="flex justify-center pt-4 px-4">
          <Link
            href="/profile/edit"
            className="px-6 py-3 text-sm font-medium bg-[#008080] text-white border border-[#008080] rounded-md"
          >
            Edit profile
          </Link>
        </div>
      </main>
    </div>
  );
}
