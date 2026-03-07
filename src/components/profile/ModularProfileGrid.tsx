"use client";

import React from "react";
import type { Profile, ProfileBlock, ProfileBlockType } from "@/lib/profile-types";
import { Briefcase, Image, ShoppingBag, Link2, Star, List, HelpCircle, FileText, Clock, Settings } from "lucide-react";

const TEAL = "#008080";

const BLOCK_LABELS: Record<string, { en: string; he: string; icon: typeof Briefcase }> = {
  cv: { en: "Professional CV", he: "קורות חיים", icon: Briefcase },
  portfolio: { en: "Portfolio", he: "תיק עבודות", icon: Image },
  productService: { en: "Products & Services", he: "מוצרים ושירותים", icon: ShoppingBag },
  socialBio: { en: "Social & Bio", he: "קישורים ואודות", icon: Link2 },
  reviewsRatings: { en: "Reviews & Ratings", he: "ביקורות ודירוגים", icon: Star },
  experience: { en: "Experience", he: "ניסיון", icon: Briefcase },
  banner: { en: "Banner", he: "באנר", icon: Image },
  articles: { en: "Articles", he: "מאמרים", icon: List },
  gallery: { en: "Gallery", he: "גלריה", icon: Image },
  testimonials: { en: "Testimonials", he: "ממליצים", icon: Star },
  faq: { en: "FAQ", he: "שאלות נפוצות", icon: HelpCircle },
  lead_form: { en: "Lead Form", he: "טופס לידים", icon: FileText },
  countdown: { en: "Countdown", he: "ספירה לאחור", icon: Clock },
};

function BlockCard({ block, locale, editMode, onRemove, onOpenSettings }: { block: ProfileBlock; locale: "en" | "he"; editMode?: boolean; onRemove?: (id: string) => void; onOpenSettings?: (block: ProfileBlock) => void }) {
  const isHe = locale === "he";
  const meta = BLOCK_LABELS[block.type] ?? { en: block.type, he: block.type, icon: List };

  const content = () => {
    if (block.type === "cv" && block.config.cv) {
      const { experience, education, skills } = block.config.cv;
      return (
        <ul className="list-none space-y-2 text-sm border-l-2 border-[#008080] pl-3">
          {experience?.map((e) => (
            <li key={e.id}>
              <span className="font-semibold text-[#008080]">{e.title}</span> @ {e.company} · {e.period}
            </li>
          ))}
          {education?.map((e) => (
            <li key={e.id}>
              <span className="font-semibold text-[#008080]">{e.degree}</span> — {e.school} · {e.period}
            </li>
          ))}
          {skills?.length ? <li className="flex flex-wrap gap-1 mt-1">{skills.map((s, i) => <span key={i} className="px-1.5 py-0.5 bg-[#008080]/10 text-[#008080] text-xs">{s}</span>)}</li> : null}
        </ul>
      );
    }
    if (block.type === "portfolio" && block.config.portfolio?.items?.length) {
      return (
        <div className="grid grid-cols-2 gap-2">
          {block.config.portfolio.items.slice(0, 4).map((p) => (
            <div key={p.id} className="aspect-square bg-gray-100 overflow-hidden border border-[#008080]/20">
              <img src={p.image} alt="" className="w-full h-full object-cover" />
              {p.description && <p className="text-xs p-1 truncate">{p.description}</p>}
            </div>
          ))}
        </div>
      );
    }
    if (block.type === "productService" && block.config.productService?.items?.length) {
      return (
        <div className="space-y-2">
          {block.config.productService.items.map((p) => (
            <div key={p.id} className="p-2 border border-[#008080]/30 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{p.title}</p>
                <p className="text-[#008080] font-semibold">{p.price}</p>
              </div>
              {p.ctaLabel && <a href={p.ctaUrl || "#"} className="text-xs px-2 py-1 bg-[#008080] text-white">{p.ctaLabel}</a>}
            </div>
          ))}
        </div>
      );
    }
    if (block.type === "socialBio" && block.config.socialBio) {
      const { intro, links } = block.config.socialBio;
      return (
        <div>
          {intro && <p className="text-sm text-gray-600 mb-2">{intro}</p>}
          <div className="flex flex-wrap gap-2">
            {links?.map((l) => (
              <a key={l.id} href={l.url.startsWith("http") ? l.url : `https://${l.url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[#008080] border border-[#008080]/50 px-2 py-1">{l.label}</a>
            ))}
          </div>
        </div>
      );
    }
    if (block.type === "reviewsRatings" && block.config.reviewsRatings?.items?.length) {
      return (
        <div className="space-y-2">
          {block.config.reviewsRatings.items.map((r) => (
            <div key={r.id} className="p-2 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{r.authorName}</span>
                <span className="text-amber-500 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{r.text}</p>
            </div>
          ))}
        </div>
      );
    }
    return <p className="text-gray-500 text-sm">{isHe ? "תוכן ריק" : "Empty block"}</p>;
  };

  const Icon = meta.icon;
  return (
    <div className="bg-white border border-[#008080]/30 overflow-hidden" style={{ borderRadius: 0 }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#008080]/20 bg-[#008080]/5">
        <span className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
          <Icon className="w-4 h-4 text-[#008080]" />
          {isHe ? meta.he : meta.en}
        </span>
        <div className="flex items-center gap-2">
          {editMode && onOpenSettings && (
            <button type="button" onClick={() => onOpenSettings(block)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#008080]" aria-label="Block settings">
              <Settings className="w-4 h-4" />
            </button>
          )}
          {editMode && onRemove && (
            <button type="button" onClick={() => onRemove(block.id)} className="text-red-500 text-xs hover:underline">Remove</button>
          )}
        </div>
      </div>
      <div className="p-3">{content()}</div>
    </div>
  );
}

export function ModularProfileGrid({ profile, locale, editMode, onRemoveBlock, onOpenBlockSettings }: { profile: Profile; locale: "en" | "he"; editMode?: boolean; onRemoveBlock?: (id: string) => void; onOpenBlockSettings?: (block: ProfileBlock) => void }) {
  const blocks = (profile.blocks ?? []).filter((b) => b.visible).sort((a, b) => a.order - b.order);
  if (blocks.length === 0 && !editMode) return null;
  return (
    <div className="grid gap-4">
      {blocks.map((block) => (
        <BlockCard key={block.id} block={block} locale={locale} editMode={editMode} onRemove={onRemoveBlock} onOpenSettings={onOpenBlockSettings} />
      ))}
    </div>
  );
}

export const PROFILE_TEMPLATES: { id: string; labelEn: string; labelHe: string; blocks: Omit<ProfileBlock, "id">[] }[] = [
  {
    id: "professional-cv",
    labelEn: "Professional CV",
    labelHe: "קורות חיים",
    blocks: [
      { type: "cv", order: 0, visible: true, config: { cv: { experience: [], education: [], skills: [] } } },
      { type: "socialBio", order: 1, visible: true, config: { socialBio: { intro: "", links: [] } } },
    ],
  },
  {
    id: "artist-portfolio",
    labelEn: "Artist Portfolio",
    labelHe: "תיק אמן",
    blocks: [
      { type: "banner", order: 0, visible: true, config: { banner: { headline: "", subline: "" } } },
      { type: "portfolio", order: 1, visible: true, config: { portfolio: { items: [] } } },
      { type: "socialBio", order: 2, visible: true, config: { socialBio: { intro: "", links: [] } } },
    ],
  },
  {
    id: "service-business",
    labelEn: "Service Business",
    labelHe: "עסק שירותים",
    blocks: [
      { type: "productService", order: 0, visible: true, config: { productService: { items: [] } } },
      { type: "reviewsRatings", order: 1, visible: true, config: { reviewsRatings: { items: [] } } },
      { type: "socialBio", order: 2, visible: true, config: { socialBio: { intro: "", links: [] } } },
    ],
  },
];

export const ADDABLE_BLOCK_TYPES: ProfileBlockType[] = ["cv", "portfolio", "productService", "socialBio", "reviewsRatings", "testimonials", "faq", "lead_form", "countdown"];
