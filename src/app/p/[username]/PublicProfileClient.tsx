"use client";

import Link from "next/link";
import { useProfile } from "@/contexts/ProfileContext";
import type { ProfileBuilderHeader } from "@/lib/profile-builder-types";
import type { Profile, ProfileBlock } from "@/lib/profile-types";
import { slugFromUsername } from "@/lib/profile-types";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import { Star, Briefcase, GraduationCap, MessageCircle, Link2, Image as ImageIcon, FileText, ShoppingBag, Newspaper } from "lucide-react";
import { ActionCenter } from "@/components/profile/ActionCenter";
import { TestimonialsBlock } from "@/components/profile/blocks/TestimonialsBlock";
import { FAQBlock } from "@/components/profile/blocks/FAQBlock";
import { LeadFormBlock } from "@/components/profile/blocks/LeadFormBlock";
import { CountdownBlock } from "@/components/profile/blocks/CountdownBlock";

const TEAL = "#008080";

function profileToHeader(profile: Profile): ProfileBuilderHeader {
  const socialLinks: ProfileBuilderHeader["socialLinks"] = {};
  if (profile.linkedin?.trim()) socialLinks.linkedin = profile.linkedin.startsWith("http") ? profile.linkedin : profile.linkedin;
  if (profile.instagram?.trim()) socialLinks.instagram = profile.instagram.startsWith("http") ? profile.instagram : profile.instagram;
  if (profile.behance?.trim()) socialLinks.behance = profile.behance.startsWith("http") ? profile.behance : profile.behance;
  return {
    coverImage: profile.coverImage ?? "",
    profileImage: profile.profileImage ?? "",
    fullName: profile.name ?? "",
    title: profile.professionalTitle ?? "",
    bio: profile.bio ?? "",
    primary_action_type: profile.primary_action_type,
    whatsapp: profile.whatsapp?.trim() || undefined,
    mobile: profile.phone?.trim() || undefined,
    email: profile.email?.trim() || undefined,
    socialLinks: Object.keys(socialLinks).length ? socialLinks : undefined,
  };
}

function BlockEmptyCard({ blockTypeLabel, editHref }: { blockTypeLabel: string; editHref: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
      <p className="text-sm text-gray-500 mb-4">No content in this section yet.</p>
      <Link
        href={editHref}
        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
      >
        Click to add content
      </Link>
    </div>
  );
}

function PublicBlockCard({ block, profileUsername, profileUserId }: { block: ProfileBlock; profileUsername?: string; profileUserId?: string }) {
  const cardClass = "rounded-xl border border-gray-200 bg-white p-6 shadow-sm";
  const editHref = "/profile/edit";

  if (block.type === "reviewsRatings") {
    const items = block.config.reviewsRatings?.items;
    if (!items?.length) return <BlockEmptyCard blockTypeLabel="Reviews" editHref={editHref} />;
    return (
      <section className={cardClass}>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-teal-600" /> Reviews
        </h2>
        <ul className="space-y-4">
          {items.map((r) => (
            <li key={r.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">{r.authorName}</span>
                <span className="flex text-amber-500" aria-label={`${r.rating} stars`}>{Array.from({ length: 5 }).map((_, i) => (i < r.rating ? "★" : "☆"))}</span>
              </div>
              <p className="text-gray-600 text-sm">{r.text}</p>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (block.type === "cv") {
    const cv = block.config.cv;
    const hasExp = (cv?.experience?.length ?? 0) > 0;
    const hasEd = (cv?.education?.length ?? 0) > 0;
    const hasSkills = (cv?.skills?.length ?? 0) > 0;
    if (!hasExp && !hasEd && !hasSkills) return <BlockEmptyCard blockTypeLabel="CV" editHref={editHref} />;
    return (
      <section className={cardClass}>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-teal-600" /> Experience &amp; CV
        </h2>
        {hasExp && (
          <ul className="space-y-3 mb-6">
            {cv!.experience!.map((e) => (
              <li key={e.id}>
                <p className="font-semibold text-gray-900">{e.title}</p>
                <p className="text-sm text-teal-600">{e.company} · {e.period}</p>
                {e.description && <p className="text-gray-600 text-sm mt-1">{e.description}</p>}
              </li>
            ))}
          </ul>
        )}
        {hasEd && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5" /> Education
            </h3>
            <ul className="space-y-2">
              {cv!.education!.map((ed) => (
                <li key={ed.id}>
                  <p className="font-medium text-gray-900">{ed.school}</p>
                  <p className="text-sm text-gray-600">{ed.degree} · {ed.period}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasSkills && (
          <div className="flex flex-wrap gap-2">
            {cv!.skills!.map((s, i) => (
              <span key={i} className="rounded-lg bg-teal-50 px-3 py-1 text-sm text-teal-700">{s}</span>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (block.type === "socialBio") {
    const intro = block.config.socialBio?.intro;
    const links = block.config.socialBio?.links;
    const hasLinks = (links?.length ?? 0) > 0;
    if (!intro?.trim() && !hasLinks) return <BlockEmptyCard blockTypeLabel="Connect" editHref={editHref} />;
    return (
      <section className={cardClass}>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-teal-600" /> Connect
        </h2>
        {intro?.trim() && <p className="text-gray-700 mb-4">{intro}</p>}
        {hasLinks && (
          <div className="flex flex-wrap gap-3">
            {links!.map((l) => (
              <a key={l.id} href={l.url.startsWith("http") ? l.url : "https://" + l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Link2 className="w-4 h-4" /> {l.label}
              </a>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (block.type === "banner" && block.config.banner) {
    const { headline, subline, imageUrl } = block.config.banner;
    if (!headline?.trim()) return <BlockEmptyCard blockTypeLabel="Banner" editHref={editHref} />;
    return (
      <section className={`${cardClass} relative overflow-hidden`}>
        {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
        <div className="relative z-10 text-center py-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{headline}</h2>
          {subline && <p className="mt-2 text-teal-600 font-medium text-sm">{subline}</p>}
        </div>
      </section>
    );
  }

  if (block.type === "portfolio" && block.config.portfolio?.items?.length) {
    const items = block.config.portfolio.items;
    return (
      <section className={cardClass}>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-teal-600" /> Portfolio
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
              {item.image && <img src={item.image} alt="" className="w-full aspect-square object-cover" />}
              {item.description && <p className="p-3 text-sm text-gray-700">{item.description}</p>}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "experience" && block.config.experience?.items?.length) {
    const items = block.config.experience.items;
    return (
      <section className={cardClass}>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-teal-600" /> Experience
        </h2>
        <ul className="space-y-4">
          {items.map((exp) => (
            <li key={exp.id}>
              <p className="font-semibold text-gray-900">{exp.title}</p>
              <p className="text-sm text-teal-600">{exp.company} · {exp.period}</p>
              {exp.description && <p className="text-gray-600 mt-1 text-sm">{exp.description}</p>}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (block.type === "gallery" && block.config.gallery?.imageUrls?.length) {
    const { title, imageUrls } = block.config.gallery;
    return (
      <section className={cardClass}>
        {title && <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-teal-600" /> {title}</h2>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {imageUrls.map((url, i) => (
            <img key={i} src={url} alt="" className="rounded-xl w-full aspect-square object-cover border border-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "productService" && block.config.productService?.items?.length) {
    const items = block.config.productService.items;
    return (
      <section className={cardClass}>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-teal-600" /> Products &amp; Services
        </h2>
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="border-b border-gray-100 pb-4 last:border-0">
              <p className="font-semibold text-gray-900">{item.title}</p>
              {item.price && <p className="text-sm text-teal-600">{item.price}</p>}
              {item.description && <p className="text-gray-600 text-sm mt-1">{item.description}</p>}
              {item.ctaUrl && <a href={item.ctaUrl.startsWith("http") ? item.ctaUrl : "https://" + item.ctaUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-sm font-medium text-teal-600 hover:underline">{item.ctaLabel || "Learn more"}</a>}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (block.type === "articles" && block.config.articles?.items?.length) {
    const { title, items } = block.config.articles;
    return (
      <section className={cardClass}>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-teal-600" /> {title || "Articles"}
        </h2>
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id}>
              <a href={a.url.startsWith("http") ? a.url : "https://" + a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-teal-600 hover:underline">
                <FileText className="w-4 h-4" /> {a.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (block.type === "testimonials") {
    const items = block.config.testimonials?.items ?? [];
    return <TestimonialsBlock items={items} />;
  }

  if (block.type === "faq") {
    const faqs = block.config.faq?.faqs ?? [];
    return <FAQBlock faqs={faqs} />;
  }

  if (block.type === "lead_form") {
    return <LeadFormBlock block={block} profileUsername={profileUsername} profileUserId={profileUserId} />;
  }

  if (block.type === "countdown") {
    const target_date = block.config.countdown?.target_date;
    const label = block.config.countdown?.label;
    if (target_date) {
      return <CountdownBlock targetDate={target_date} label={label} />;
    }
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Set a target date in block settings.</p>
      </section>
    );
  }

  return <BlockEmptyCard blockTypeLabel={block.type} editHref={editHref} />;
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse" dir="auto">
      <div className="w-full h-48 sm:h-56 bg-gray-200" />
      <div className="px-4 -mt-16 flex flex-col items-center">
        <div className="w-28 h-28 rounded-full bg-gray-300" />
        <div className="h-6 w-40 bg-gray-300 rounded mt-4" />
        <div className="h-4 w-24 bg-gray-200 rounded mt-2" />
        <div className="h-4 w-64 bg-gray-200 rounded mt-3" />
        <div className="h-10 w-32 bg-gray-200 rounded-xl mt-4" />
      </div>
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-200" />
        ))}
      </main>
    </div>
  );
}

function NotFound() {
  const { locale } = useLocale();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="auto">
      <div className="rounded-2xl bg-white shadow-lg border border-gray-200 px-8 py-6 text-center max-w-sm space-y-4">
        <p className="text-gray-600">{t(locale, "card.notFound")}</p>
        <Link href="/profile/edit" className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium bg-teal-600 text-white hover:bg-teal-700">
          {t(locale, "card.createProfile")}
        </Link>
      </div>
    </div>
  );
}

export function PublicProfileClient({ username }: { username: string }) {
  const { getProfileByUsername, hasHydrated } = useProfile();
  const slug = slugFromUsername(username);
  const profile = getProfileByUsername(slug);

  if (!hasHydrated) {
    return <ProfileSkeleton />;
  }

  if (!profile || !profile.username) {
    return <NotFound />;
  }

  const header = profileToHeader(profile);
  const blocks = (profile.blocks ?? []).filter((b) => b.visible !== false).sort((a, b) => a.order - b.order);

  const fullName = profile.name ?? "";
  const title = profile.professionalTitle ?? "";
  const bio = profile.bio ?? "";
  const coverImage = profile.coverImage ?? "";
  const profileImage = profile.profileImage ?? "";

  return (
    <div className="min-h-screen bg-gray-50" dir="auto">
      <header className="relative w-full">
        <div className="relative w-full h-48 sm:h-56 bg-gradient-to-br from-teal-700 to-teal-900 overflow-hidden">
          {coverImage ? <img src={coverImage} alt="" className="w-full h-full object-cover" /> : null}
        </div>
        <div className="px-4 -mt-16 relative z-10 flex flex-col items-center text-center pb-4">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center">
            {profileImage ? <img src={profileImage} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-gray-400">{fullName.slice(0, 1).toUpperCase() || "?"}</span>}
          </div>
          {fullName ? <h1 className="mt-4 text-xl font-bold text-gray-900">{fullName}</h1> : null}
          {title ? <p className="text-teal-600 font-medium text-sm mt-0.5">{title}</p> : null}
          {bio ? <p className="text-gray-600 text-sm mt-2 max-w-md">{bio}</p> : null}
          <div className="mt-4 w-full flex flex-col items-center">
            <ActionCenter header={header} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {blocks.map((block) => (
          <div key={block.id} className="mb-6">
            <PublicBlockCard
              block={block}
              profileUsername={profile.username}
              profileUserId={profile.userId}
            />
          </div>
        ))}
      </main>
    </div>
  );
}
