"use client";

import { useState, useCallback, useRef } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import type { Profile } from "@/lib/profile-types";
import { slugFromUsername } from "@/lib/profile-types";
import { Phone, Mail, Globe, Linkedin, Instagram, Share2, Link2, QrCode, Image as ImageIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

/** Business card: one-screen fit, Teal/Gold theme, Share as Image. */
export function BusinessCardView({ profile }: { profile: Profile }) {
  const { dir, locale } = useLocale();
  const [copied, setCopied] = useState<"card" | "profile" | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const slug = slugFromUsername(profile.username);
  const cardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/card/${encodeURIComponent(slug || "card")}`
      : "";
  const profileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${encodeURIComponent(slug || profile.username || "profile")}`
      : "";

  const handleCopyCardLink = useCallback(async () => {
    if (!cardUrl) return;
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopied("card");
      setTimeout(() => setCopied(null), 2000);
    } catch (_) {}
  }, [cardUrl]);

  const handleCopyProfileLink = useCallback(async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied("profile");
      setTimeout(() => setCopied(null), 2000);
    } catch (_) {}
  }, [profileUrl]);

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
      handleCopyCardLink();
    }
  }, [cardUrl, profile.name, profile.professionalTitle, handleCopyCardLink]);

  const handleShareAsImage = useCallback(async () => {
    if (!cardRef.current) return;
    setSharingImage(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ollin-card-${slug || "card"}.png`;
      a.click();
      if (navigator.share && navigator.canShare?.({ files: [] })) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `ollin-card-${slug || "card"}.png`, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: profile.name || "Card" });
      }
    } catch (_) {}
    setSharingImage(false);
  }, [slug, profile.name]);

  const socialLinks: { href: string; icon?: typeof Linkedin; label: string }[] = [
    { href: profile.linkedin, icon: Linkedin, label: "LinkedIn" },
    { href: profile.instagram, icon: Instagram, label: "Instagram" },
    { href: profile.behance, label: "Behance" },
  ].filter((s): s is { href: string; icon?: typeof Linkedin; label: string } => !!s.href?.trim());

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-2 sm:p-3 gap-1 sm:gap-2 bg-gradient-to-b from-[#008080]/[0.08] to-amber-50/30 overflow-hidden overscroll-none touch-none w-full max-w-[100vw] box-border" style={{ height: "100vh", maxHeight: "100vh", minHeight: "100vh" }} dir={dir}>
      {/* Card: exactly one mobile screen (100vh), no scroll — perfect for sharing */}
      <article
        ref={cardRef}
        className="bg-white border-2 border-[#008080]/20 shadow-xl overflow-hidden flex flex-col rounded-2xl flex-shrink-0 w-full max-w-[min(400px,calc(100vw-1rem))] max-h-[calc(100vh-1.5rem)] min-h-0"
        style={{ aspectRatio: "4/5" }}
      >
        <div className="flex-1 min-h-0 px-4 pt-4 pb-3 flex flex-col items-center overflow-hidden">
          <div className="w-16 h-16 rounded-xl border-2 border-[#008080]/30 bg-[#008080]/10 overflow-hidden flex-shrink-0">
            {profile.profileImage ? (
              <img src={profile.profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#008080] text-2xl font-bold">
                {profile.name?.slice(0, 1)?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <h1 className="mt-2 text-lg font-bold text-gray-900 text-center truncate w-full px-1">{profile.name || "—"}</h1>
          {profile.professionalTitle && (
            <p className="text-[#008080] font-medium text-center text-sm truncate w-full px-1">{profile.professionalTitle}</p>
          )}
          {socialLinks.length > 0 && (
            <div className="mt-2 flex gap-2 justify-center">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a key={href} href={href.startsWith("http") ? href : `https://${href}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 hover:bg-amber-200" aria-label={label}>
                  {Icon ? <Icon className="w-4 h-4" /> : <span className="text-xs font-bold">B</span>}
                </a>
              ))}
            </div>
          )}
          {profile.bio && <p className="mt-2 text-gray-600 text-xs leading-snug text-center line-clamp-3 px-1">{profile.bio}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
            {profile.phone && (
              <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-1 rounded-full bg-[#008080]/10 px-2.5 py-1 text-xs text-gray-800">
                <Phone className="w-3 h-3 text-[#008080]" />
                {profile.phone}
              </a>
            )}
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-1 rounded-full bg-[#008080]/10 px-2.5 py-1 text-xs text-gray-800 truncate max-w-[180px]">
                <Mail className="w-3 h-3 text-[#008080] shrink-0" />
                <span className="truncate">{profile.email}</span>
              </a>
            )}
            {profile.website && (
              <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-[#008080]/10 px-2.5 py-1 text-xs text-gray-800 truncate max-w-[160px]">
                <Globe className="w-3 h-3 text-[#008080] shrink-0" />
                <span className="truncate">{profile.website.replace(/^https?:\/\//, "")}</span>
              </a>
            )}
          </div>
          <div className="mt-auto pt-3 border-t border-[#008080]/20 w-full flex-shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={handleShareAsImage} disabled={sharingImage} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#008080] text-white text-sm font-medium hover:bg-[#006666] disabled:opacity-70">
                <ImageIcon className="w-4 h-4" />
                {locale === "he" ? "שתף כתמונה" : "Share as Image"}
              </button>
              <button type="button" onClick={handleShare} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600">
                <Share2 className="w-4 h-4" />
                {t(locale, "card.shareCard")}
              </button>
              <button type="button" onClick={handleCopyProfileLink} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#008080]/10 text-[#006666] text-sm font-medium hover:bg-[#008080]/20">
                <Link2 className="w-4 h-4" />
                {copied === "profile" ? (locale === "he" ? "הועתק!" : "Copied!") : (locale === "he" ? "קישור לפרופיל" : "Profile link")}
              </button>
              <button type="button" onClick={() => setQrOpen(true)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100">
                <QrCode className="w-4 h-4" />
                QR
              </button>
            </div>
          </div>
        </div>
      </article>
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
            <button type="button" onClick={() => setQrOpen(false)} className="w-full mt-4 py-2.5 rounded-2xl bg-accent text-white font-medium">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
