"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { t } from "@/lib/translations";
import type { Profile, ProjectPosition, ProfileBlock } from "@/lib/profile-types";
import { slugFromUsername } from "@/lib/profile-types";
import {
  Phone,
  Mail,
  Globe,
  Linkedin,
  Instagram,
  Share2,
  Link2,
  QrCode,
  ChevronLeft,
  FileDown,
  Briefcase,
  Award,
  ExternalLink,
  ChevronRight,
  ChevronLeft as ChevronLeftIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";

const ACCENT = "#06B6D4";

// --- CV / PDF: premium look matching luxury profile (glassmorphism-inspired, high-end typography) ---
function escapeHtml(s: string): string {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildCvHtml(profile: Profile): string {
  const lines: string[] = [];
  lines.push("<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>CV – " + escapeHtml(profile.name || "Profile") + "</title>");
  lines.push("<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"><link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>");
  lines.push("<link href=\"https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600&display=swap\" rel=\"stylesheet\">");
  lines.push("<style>");
  lines.push("body{font-family:'Inter',system-ui,sans-serif;font-size:11pt;line-height:1.6;color:#1f2937;max-width:720px;margin:0 auto;padding:2.5rem;background:linear-gradient(180deg,#fafafa 0%,#f4f4f5 100%);}");
  lines.push("h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:2.25rem;letter-spacing:-0.02em;margin:0 0 0.35rem 0;color:#111827;}");
  lines.push(".subtitle{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:1.25rem;color:" + ACCENT + ";letter-spacing:0.02em;margin-bottom:1.75rem;}");
  lines.push(".card{background:rgba(255,255,255,0.85);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.7);border-radius:24px;padding:1.75rem;margin-bottom:1.25rem;box-shadow:0 4px 24px rgba(0,0,0,0.06);}");
  lines.push("section{margin-bottom:1.5rem;}");
  lines.push("h2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.12em;color:" + ACCENT + ";margin:0 0 0.85rem 0;}");
  lines.push("p{margin:0.3rem 0;}");
  lines.push("a{color:" + ACCENT + ";text-decoration:none;font-weight:500;} a:hover{text-decoration:underline;}");
  lines.push("ul{margin:0.25rem 0;padding-left:1.35rem;}");
  lines.push(".avatar{border-radius:24px;object-fit:cover;border:2px solid rgba(6,182,212,0.2);box-shadow:0 8px 32px rgba(0,0,0,0.08);}");
  lines.push(".footer{font-size:0.7rem;color:#9ca3af;margin-top:2.5rem;padding-top:1rem;border-top:1px solid rgba(0,0,0,0.06);}");
  lines.push("</style></head><body>");
  lines.push("<div class=\"card\" style=\"text-align:center;padding:2.5rem;\">");
  lines.push("<h1>" + escapeHtml(profile.name || "") + "</h1>");
  lines.push("<p class=\"subtitle\">" + escapeHtml(profile.professionalTitle || "") + "</p>");
  if (profile.profileImage) lines.push("<img src=\"" + escapeHtml(profile.profileImage) + "\" alt=\"\" class=\"avatar\" width=\"128\" height=\"128\" />");
  lines.push("</div>");
  if (profile.bio) {
    lines.push("<div class=\"card\"><section><h2>About</h2><p>" + escapeHtml(profile.bio) + "</p></section></div>");
  }
  lines.push("<div class=\"card\"><section><h2>Contact</h2>");
  if (profile.email) lines.push("<p>" + escapeHtml(profile.email) + "</p>");
  if (profile.phone) lines.push("<p>" + escapeHtml(profile.phone) + "</p>");
  if (profile.website) {
    const href = profile.website.startsWith("http") ? profile.website : "https://" + profile.website;
    const label = profile.website.replace(/^https?:\/\//, "");
    lines.push("<p><a href=\"" + escapeHtml(href) + "\">" + escapeHtml(label) + "</a></p>");
  }
  lines.push("</section></div>");
  if (profile.projects && profile.projects.length > 0) {
    lines.push("<div class=\"card\"><section><h2>Experience & Projects</h2>");
    profile.projects.forEach((p) => {
      lines.push("<div style=\"margin-bottom:1.35rem;\"><h3 style=\"font-family:'Cormorant Garamond',serif;font-weight:600;color:" + ACCENT + ";font-size:1rem;margin:0 0 0.25rem 0;\">" + escapeHtml(p.title) + "</h3>");
      if (p.date) lines.push("<p style=\"color:#6b7280;font-size:0.8rem;margin:0;\">" + escapeHtml(p.date) + "</p>");
      if (p.description) lines.push("<p style=\"color:#374151;font-size:0.95rem;margin:0.5rem 0 0 0;line-height:1.5;\">" + escapeHtml(p.description) + "</p>");
      lines.push("</div>");
    });
    lines.push("</section></div>");
  }
  if (profile.pressMedia && profile.pressMedia.length > 0) {
    lines.push("<div class=\"card\"><section><h2>Featured In</h2><ul>");
    profile.pressMedia.forEach((m) => {
      const url = m.url.startsWith("http") ? m.url : "https://" + m.url;
      lines.push("<li><a href=\"" + escapeHtml(url) + "\">" + escapeHtml(m.label || m.url) + "</a></li>");
    });
    lines.push("</ul></section></div>");
  }
  lines.push("<p class=\"footer\">Generated from OllinChat · " + new Date().toLocaleDateString() + "</p></body></html>");
  return lines.join("");
}

function downloadCvPdf(profile: Profile): void {
  const html = buildCvHtml(profile);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 500);
}

// --- Modular block renderer (mini-site) ---
function ProfileBlockView({ block }: { block: ProfileBlock }) {
  const cardClass = "rounded-3xl p-8 sm:p-10 mb-10 overflow-hidden";
  const cardStyle = {
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.6)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
  };
  if (block.type === "banner" && block.config.banner) {
    const { headline, subline, imageUrl } = block.config.banner;
    return (
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className={`${cardClass} relative`} style={cardStyle}>
        {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
        <div className="relative z-10 text-center py-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{headline}</h2>
          {subline && <p className="mt-2 text-[#008080] font-medium">{subline}</p>}
        </div>
      </motion.section>
    );
  }
  if (block.type === "portfolio" && block.config.portfolio?.items?.length) {
    return (
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className={cardClass} style={cardStyle}>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-5">Portfolio</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {block.config.portfolio.items.map((item) => (
            <div key={item.id} className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
              {item.image && <img src={item.image} alt="" className="w-full aspect-square object-cover" />}
              {item.description && <p className="p-3 text-sm text-gray-700">{item.description}</p>}
            </div>
          ))}
        </div>
      </motion.section>
    );
  }
  if (block.type === "experience" && block.config.experience?.items?.length) {
    return (
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className={cardClass} style={cardStyle}>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-5">Experience</h2>
        <ul className="space-y-4">
          {block.config.experience.items.map((exp) => (
            <li key={exp.id}>
              <p className="font-semibold text-gray-900">{exp.title}</p>
              <p className="text-sm text-[#008080]">{exp.company} · {exp.period}</p>
              {exp.description && <p className="text-gray-600 mt-1 text-sm">{exp.description}</p>}
            </li>
          ))}
        </ul>
      </motion.section>
    );
  }
  if (block.type === "gallery" && block.config.gallery?.imageUrls?.length) {
    return (
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className={cardClass} style={cardStyle}>
        {block.config.gallery.title && <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-5">{block.config.gallery.title}</h2>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {block.config.gallery.imageUrls.map((url, i) => (
            <img key={i} src={url} alt="" className="rounded-2xl w-full aspect-square object-cover border border-gray-100" />
          ))}
        </div>
      </motion.section>
    );
  }
  return null;
}

// --- Project card with image carousel ---
function ProjectCard({
  proj,
  currentIndex,
  onPrev,
  onNext,
}: {
  proj: ProjectPosition;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const images = proj.images?.length ? proj.images : [];
  const hasGallery = images.length > 0;
  const idx = hasGallery ? Math.min(currentIndex, images.length - 1) : 0;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-xl"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.7)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
      }}
    >
      {hasGallery && (
        <div className="relative aspect-video bg-gray-100">
          <AnimatePresence mode="wait">
            <motion.img
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={images[idx]}
              alt=""
              className="w-full h-full object-cover"
            />
          </AnimatePresence>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">{proj.title}</h3>
        {proj.date && <p className="text-sm text-[#008080] font-medium mt-1">{proj.date}</p>}
        {proj.description && <p className="text-gray-600 mt-3 leading-relaxed">{proj.description}</p>}
      </div>
    </div>
  );
}

/** Premium full profile – large typography, glassmorphism, project cards, CV download. */
export function FullProfileView({ profile }: { profile: Profile }) {
  const { dir, locale } = useLocale();
  const { currentUser } = useInternalMessages();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState<Record<string, number>>({});

  const isOwnProfile = Boolean(currentUser && profile.userId === currentUser.id);
  const displayName = isOwnProfile ? currentUser!.name : (profile.name || "—");
  const displayOllinId = isOwnProfile ? currentUser!.id : profile.userId;

  const slug = slugFromUsername(profile.username);
  const profileUrl =
    typeof window !== "undefined" ? `${window.location.origin}/p/${encodeURIComponent(slug || "profile")}` : "";
  const cardUrl =
    typeof window !== "undefined" ? `${window.location.origin}/card/${encodeURIComponent(slug || "card")}` : "";

  const handleCopyLink = useCallback(async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  }, [profileUrl]);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share && profileUrl) {
      try {
        await navigator.share({
          title: profile.name || "Profile",
          text: profile.professionalTitle || "",
          url: profileUrl,
        });
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  }, [profileUrl, profile.name, profile.professionalTitle, handleCopyLink]);

  const socialLinks = [
    { href: profile.linkedin, icon: Linkedin, label: "LinkedIn" },
    { href: profile.instagram, icon: Instagram, label: "Instagram" },
    { href: profile.behance, label: "Behance" },
  ].filter((s) => s.href?.trim()) as { href: string; icon?: typeof Linkedin; label: string }[];

  const setProjectIndex = useCallback((id: string, delta: number) => {
    setCarouselIndex((prev) => {
      const proj = profile.projects?.find((p) => p.id === id);
      const images = proj?.images?.length ?? 0;
      if (images === 0) return prev;
      const current = prev[id] ?? 0;
      const next = (current + delta + images) % images;
      return { ...prev, [id]: next };
    });
  }, [profile.projects]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white" dir={dir}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#008080] mb-10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Hero – luxury glassmorphism, large typography */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden p-10 sm:p-12 mb-12"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.8) inset, 0 12px 40px rgba(13,148,136,0.1)",
          }}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-10">
            <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-2xl overflow-hidden border-2 border-white shadow-2xl flex-shrink-0 ring-4 ring-[#008080]/20">
              {profile.profileImage ? (
                <img src={profile.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#008080]/15 flex items-center justify-center text-[#008080] text-5xl font-bold font-serif">
                  {displayName?.slice(0, 1)?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
                {displayName}
              </h1>
              {profile.professionalTitle && (
                <p className="mt-4 text-xl sm:text-2xl md:text-3xl font-semibold text-[#008080] tracking-wide" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>{profile.professionalTitle}</p>
              )}
              {displayOllinId && (
                <p className="mt-3 text-base font-mono font-semibold text-gray-600 tracking-widest">Ollin ID: {displayOllinId}</p>
              )}
              {socialLinks.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3 justify-center sm:justify-start">
                  {socialLinks.map(({ href, icon: Icon, label }) => (
                    <a
                      key={href + label}
                      href={href.startsWith("http") ? href : `https://${href}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-xl bg-[#008080]/10 flex items-center justify-center text-[#008080] hover:bg-[#008080]/20 transition-colors"
                      aria-label={label}
                    >
                      {Icon ? <Icon className="w-6 h-6" /> : <span className="text-sm font-bold">B</span>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.header>

        {/* Download CV / LinkedIn */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap gap-4 mb-10"
        >
          <button
            type="button"
            onClick={() => downloadCvPdf(profile)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#008080] text-white px-6 py-3.5 font-semibold shadow-lg shadow-[#008080]/25 hover:shadow-[#008080]/30 transition-shadow"
          >
            <FileDown className="w-5 h-5" />
            Download CV / PDF
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-white border border-gray-200 text-gray-700 px-6 py-3.5 font-medium shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Briefcase className="w-5 h-5 text-gray-500" />
            Import from LinkedIn
            <span className="text-xs text-gray-400">(Coming soon)</span>
          </button>
        </motion.section>

        {/* Modular blocks (mini-site): Portfolio, Experience, Banner, Gallery */}
        {profile.blocks && profile.blocks.filter((b) => b.visible).sort((a, b) => a.order - b.order).map((block) => (
          <ProfileBlockView key={block.id} block={block} />
        ))}

        {/* About – glass card */}
        {profile.bio && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl p-8 sm:p-10 mb-10"
            style={{
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.6)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
            }}
          >
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-5">About</h2>
            <p className="text-lg sm:text-xl text-gray-700 leading-relaxed">{profile.bio}</p>
          </motion.section>
        )}

        {/* Contact – glass card */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 p-8 mb-8 shadow-lg shadow-slate-200/40"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
        >
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.12em] mb-4">Contact</h2>
          <div className="flex flex-wrap gap-4">
            {profile.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-5 py-3 text-gray-800 hover:bg-[#008080]/10 hover:text-[#006666] font-medium"
              >
                <Phone className="w-5 h-5 text-[#008080]" />
                {profile.phone}
              </a>
            )}
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-5 py-3 text-gray-800 hover:bg-[#008080]/10 hover:text-[#006666] font-medium"
              >
                <Mail className="w-5 h-5 text-[#008080]" />
                {profile.email}
              </a>
            )}
            {profile.website && (
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-5 py-3 text-gray-800 hover:bg-[#008080]/10 hover:text-[#006666] font-medium"
              >
                <Globe className="w-5 h-5 text-[#008080]" />
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </motion.section>

        {/* Experience & Projects – cards with carousel */}
        {profile.projects && profile.projects.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="mb-10"
          >
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#008080]" />
              Experience & Projects
            </h2>
            <div className="space-y-8">
              {profile.projects.map((proj) => (
                <ProjectCard
                  key={proj.id}
                  proj={proj}
                  currentIndex={carouselIndex[proj.id] ?? 0}
                  onPrev={() => setProjectIndex(proj.id, -1)}
                  onNext={() => setProjectIndex(proj.id, 1)}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* Featured In */}
        {profile.pressMedia && profile.pressMedia.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 p-8 mb-8 shadow-lg shadow-slate-200/40"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
          >
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#008080]" />
              Featured In
            </h2>
            <div className="flex flex-wrap gap-3">
              {profile.pressMedia.map((link) => (
                <a
                  key={link.id}
                  href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-gray-800 hover:bg-[#008080]/10 hover:text-[#006666] font-medium border border-gray-100"
                >
                  {link.label || link.url}
                  <ExternalLink className="w-4 h-4" />
                </a>
              ))}
            </div>
          </motion.section>
        )}

        {/* Actions + Business card link */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 p-8 shadow-lg shadow-slate-200/40"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
        >
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={handleShare}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-[#008080]/10 text-[#006666] font-medium hover:bg-[#008080]/20 transition-colors"
            >
              <Share2 className="w-6 h-6" />
              {t(locale, "card.shareCard")}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-[#008080]/10 text-[#006666] font-medium hover:bg-[#008080]/20 transition-colors"
            >
              <Link2 className="w-6 h-6" />
              {copied ? (locale === "he" ? "הועתק!" : "Copied!") : t(locale, "card.copyLink")}
            </button>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-[#008080]/10 text-[#006666] font-medium hover:bg-[#008080]/20 transition-colors"
            >
              <QrCode className="w-6 h-6" />
              QR
            </button>
          </div>
          <p className="text-center mt-4">
            <Link
              href={cardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[#008080] hover:underline"
            >
              {locale === "he" ? "צפה בכרטיס ביקור" : "View business card"}
            </Link>
          </p>
        </motion.section>
      </div>

      {qrOpen && profileUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setQrOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-[280px]" onClick={(e) => e.stopPropagation()}>
            {profile.name && <p className="text-center font-semibold text-gray-900 mb-3">{profile.name}</p>}
            <div className="flex justify-center bg-white p-2 rounded-lg">
              <QRCodeSVG value={profileUrl} size={200} level="M" includeMargin />
            </div>
            <p className="text-xs text-gray-500 text-center mt-3 break-all">{profileUrl}</p>
            <button
              type="button"
              onClick={() => setQrOpen(false)}
              className="w-full mt-4 py-2.5 rounded-2xl bg-[#008080] text-white font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
