"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import type { Profile } from "@/lib/profile-types";
import { slugFromUsername } from "@/lib/profile-types";
import { Button } from "@/components/ui/Button";
import { Phone, Mail, Globe, Linkedin, Instagram, Share2, Link2, QrCode, ChevronLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function ProfileCard({ profile }: { profile: Profile }) {
  const { dir, locale } = useLocale();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const slug = slugFromUsername(profile.username);
  const cardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${encodeURIComponent(slug || "card")}`
      : "";

  const handleCopyLink = useCallback(async () => {
    if (!cardUrl) return;
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  }, [cardUrl]);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share && cardUrl) {
      try {
        await navigator.share({
          title: profile.name || "Business Card",
          text: profile.professionalTitle || "",
          url: cardUrl,
        });
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  }, [cardUrl, profile.name, profile.professionalTitle, handleCopyLink]);

  const socialLinks: { href: string; icon?: typeof Linkedin; label: string }[] = [
    { href: profile.linkedin, icon: Linkedin, label: "LinkedIn" },
    { href: profile.instagram, icon: Instagram, label: "Instagram" },
    { href: profile.behance, label: "Behance" },
  ].filter((s): s is { href: string; icon?: typeof Linkedin; label: string } => !!s.href?.trim());

  return (
    <div
      className="min-h-screen bg-background py-4 px-4 flex flex-col items-center"
      dir={dir}
    >
      <Link
        href="/dashboard"
        className="self-start flex items-center gap-1 text-sm text-gray-600 hover:text-accent mb-3"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </Link>
      <article
        className="w-full max-w-[400px] rounded-3xl bg-white border border-gray-200 shadow-lg overflow-hidden flex flex-col max-h-[85vh] overflow-y-auto"
        style={{ aspectRatio: "4/5", minHeight: "400px" }}
      >
        <div className="px-6 pt-6 pb-4 flex flex-col items-center">
          {profile.companyLogo && (
            <div className="w-12 h-12 rounded-xl bg-gray-100 p-1 shadow overflow-hidden mb-3">
              <img src={profile.companyLogo} alt="" className="w-full h-full object-contain" />
            </div>
          )}
          <div className="w-24 h-24 rounded-2xl border-2 border-gray-100 bg-gray-100 shadow-soft overflow-hidden flex-shrink-0">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-accent-muted flex items-center justify-center text-accent text-2xl font-bold">
                {profile.name?.slice(0, 1)?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <h1 className="mt-3 text-xl font-bold text-gray-900 text-center">
            {profile.name || "—"}
          </h1>
          {profile.professionalTitle && (
            <p className="text-accent font-medium text-center">{profile.professionalTitle}</p>
          )}
          {/* Social icons - prominent row */}
          {socialLinks.length > 0 && (
            <div className="mt-3 flex gap-2 justify-center">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  key={href}
                  href={href!.startsWith("http") ? href : `https://${href}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center text-accent hover:bg-accent/20 transition-colors"
                  aria-label={label}
                >
                  {Icon ? <Icon className="w-5 h-5" /> : <span className="text-xs font-bold">B</span>}
                </a>
              ))}
            </div>
          )}
          {profile.bio && (
            <p className="mt-3 text-gray-600 text-sm leading-relaxed text-center">
              {profile.bio}
            </p>
          )}

          {/* Contact chips */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {profile.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-muted px-3 py-1.5 text-sm text-gray-800 hover:bg-accent/20 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-accent" />
                {profile.phone}
              </a>
            )}
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-muted px-3 py-1.5 text-sm text-gray-800 hover:bg-accent/20 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-accent" />
                {profile.email}
              </a>
            )}
            {profile.website && (
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-muted px-3 py-1.5 text-sm text-gray-800 hover:bg-accent/20 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-accent" />
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>

          {/* Portfolio preview */}
          {profile.portfolio && profile.portfolio.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 mb-2">Portfolio</p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1">
                {profile.portfolio.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0"
                  >
                    <img
                      src={item.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects / Positions */}
          {profile.projects && profile.projects.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 mb-2">{t(locale, "profile.projects")}</p>
              <div className="space-y-3">
                {profile.projects.map((proj) => (
                  <div key={proj.id} className="rounded-xl bg-gray-50 p-3">
                    <p className="font-medium text-gray-900">{proj.title}</p>
                    {proj.date && <p className="text-xs text-gray-500">{proj.date}</p>}
                    {proj.description && <p className="text-sm text-gray-600 mt-1">{proj.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Press / Media */}
          {profile.pressMedia && profile.pressMedia.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 mb-2">{t(locale, "profile.pressMedia")}</p>
              <div className="flex flex-wrap gap-2">
                {profile.pressMedia.map((link) => (
                  <a
                    key={link.id}
                    href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-accent-muted px-3 py-1.5 text-sm text-gray-800 hover:bg-accent/20 transition-colors"
                  >
                    {link.label || link.url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Save to contacts */}
          <div className="mt-6">
            <Button fullWidth className="bg-accent text-white hover:bg-accent-hover rounded-2xl">
              <Phone className="w-5 h-5" />
              {t(locale, "card.saveToContacts")}
            </Button>
          </div>

          {/* 3 buttons: Share, Copy Link, QR */}
          <div className="mt-auto pt-4 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-accent-muted/50 hover:bg-accent-muted text-accent font-medium text-sm transition-colors"
              >
                <Share2 className="w-5 h-5" />
                {t(locale, "card.shareCard")}
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-accent-muted/50 hover:bg-accent-muted text-accent font-medium text-sm transition-colors"
              >
                <Link2 className="w-5 h-5" />
                {copied ? (locale === "he" ? "הועתק!" : "Copied!") : t(locale, "card.copyLink")}
              </button>
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-accent-muted/50 hover:bg-accent-muted text-accent font-medium text-sm transition-colors"
              >
                <QrCode className="w-5 h-5" />
                QR
              </button>
            </div>
          </div>
          {qrOpen && cardUrl && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setQrOpen(false)}
              role="dialog"
              aria-modal="true"
            >
              <div className="bg-white rounded-2xl p-6 shadow-xl max-w-[280px]" onClick={(e) => e.stopPropagation()}>
                {profile.name && <p className="text-center font-semibold text-gray-900 mb-3">{profile.name}</p>}
                <div className="flex justify-center bg-white p-2 rounded-lg">
                  <QRCodeSVG value={cardUrl} size={200} level="M" includeMargin />
                </div>
                <p className="text-xs text-gray-500 text-center mt-3 break-all">{cardUrl}</p>
                <button
                  type="button"
                  onClick={() => setQrOpen(false)}
                  className="w-full mt-4 py-2.5 rounded-2xl bg-accent text-white font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
