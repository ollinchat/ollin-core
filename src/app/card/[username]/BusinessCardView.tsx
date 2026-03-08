"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import type { Profile } from "@/lib/profile-types";
import { slugFromUsername } from "@/lib/profile-types";
import {
  Phone,
  Mail,
  Globe,
  Linkedin,
  Instagram,
  Share2,
  Image as ImageIcon,
  FileDown,
  QrCode,
  Link2,
  ChevronDown,
  ChevronLeft,
  Radio,
  Pencil,
  X,
  Trash2,
  MessageCircle,
  Facebook,
  Youtube,
  Plus,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

// Standard business card aspect ratio (3.5" x 2")
const CARD_ASPECT = 3.5 / 2;

/** WhatsApp icon (simple) */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/** Platform config: key maps to Profile field, label, placeholder, inputLabel, Icon, brandColor for picker grid */
type PlatformKey = keyof Pick<
  Profile,
  | "whatsapp" | "telegram" | "viber" | "messenger" | "signal" | "discord" | "skype" | "wechat" | "slack" | "line"
  | "linkedin" | "instagram" | "tiktok" | "facebook" | "x" | "youtube" | "threads" | "pinterest" | "github" | "website"
>;
type PlatformConfig = {
  key: PlatformKey;
  label: string;
  placeholder: string;
  inputLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
  brandColor: string;
};

const CHAT_PLATFORMS: PlatformConfig[] = [
  { key: "whatsapp", label: "WhatsApp", placeholder: "+972...", inputLabel: "Enter WhatsApp number", Icon: WhatsAppIcon, brandColor: "#25D366" },
  { key: "telegram", label: "Telegram", placeholder: "@username", inputLabel: "Enter Telegram username", Icon: MessageCircle, brandColor: "#0088CC" },
  { key: "messenger", label: "Messenger", placeholder: "Profile link/name", inputLabel: "Enter Messenger profile link or name", Icon: MessageCircle, brandColor: "#00B2FF" },
  { key: "viber", label: "Viber", placeholder: "Phone number", inputLabel: "Enter Viber phone number", Icon: MessageCircle, brandColor: "#7360F2" },
  { key: "signal", label: "Signal", placeholder: "Phone number", inputLabel: "Enter Signal phone number", Icon: MessageCircle, brandColor: "#3A76F0" },
  { key: "discord", label: "Discord", placeholder: "Username", inputLabel: "Enter Discord username", Icon: MessageCircle, brandColor: "#5865F2" },
  { key: "skype", label: "Skype", placeholder: "Live:id", inputLabel: "Enter Skype Live ID", Icon: MessageCircle, brandColor: "#00AFF0" },
  { key: "wechat", label: "WeChat", placeholder: "ID", inputLabel: "Enter WeChat ID", Icon: MessageCircle, brandColor: "#09BB07" },
  { key: "slack", label: "Slack", placeholder: "Member ID", inputLabel: "Enter Slack member ID", Icon: MessageCircle, brandColor: "#4A154B" },
  { key: "line", label: "Line", placeholder: "ID", inputLabel: "Enter Line ID", Icon: MessageCircle, brandColor: "#00B900" },
];

const SOCIAL_PLATFORMS: PlatformConfig[] = [
  { key: "linkedin", label: "LinkedIn", placeholder: "profile-url", inputLabel: "Enter LinkedIn profile URL or username", Icon: Linkedin, brandColor: "#0A66C2" },
  { key: "instagram", label: "Instagram", placeholder: "@username", inputLabel: "Enter Instagram username", Icon: Instagram, brandColor: "#E4405F" },
  { key: "tiktok", label: "TikTok", placeholder: "@username", inputLabel: "Enter TikTok username", Icon: MessageCircle, brandColor: "#000000" },
  { key: "x", label: "X (Twitter)", placeholder: "@username", inputLabel: "Enter X (Twitter) username", Icon: MessageCircle, brandColor: "#000000" },
  { key: "facebook", label: "Facebook", placeholder: "profile-url", inputLabel: "Enter Facebook profile URL", Icon: Facebook, brandColor: "#1877F2" },
  { key: "youtube", label: "YouTube", placeholder: "@channel", inputLabel: "Enter YouTube channel URL or handle", Icon: Youtube, brandColor: "#FF0000" },
  { key: "threads", label: "Threads", placeholder: "@username", inputLabel: "Enter Threads username", Icon: MessageCircle, brandColor: "#000000" },
  { key: "pinterest", label: "Pinterest", placeholder: "@username", inputLabel: "Enter Pinterest username", Icon: MessageCircle, brandColor: "#BD081C" },
  { key: "github", label: "GitHub", placeholder: "@username", inputLabel: "Enter GitHub username", Icon: MessageCircle, brandColor: "#24292F" },
  { key: "website", label: "Personal Website", placeholder: "https://...", inputLabel: "Enter personal website URL", Icon: Globe, brandColor: "#008080" },
];

/** Build full URL from platform key and value (username or URL). Used for card links. */
function buildPlatformUrl(key: PlatformKey, value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const clean = v.replace(/^@/, "");
  switch (key) {
    case "whatsapp": return `https://wa.me/${v.replace(/\D/g, "")}`;
    case "telegram": return `https://t.me/${clean}`;
    case "instagram": return `https://instagram.com/${clean}`;
    case "linkedin": return v.includes(".") ? (v.startsWith("linkedin.com") ? `https://${v}` : v) : `https://linkedin.com/in/${clean}`;
    case "tiktok": return `https://tiktok.com/@${clean}`;
    case "x": return `https://x.com/${clean}`;
    case "facebook": return v.includes(".") ? (v.startsWith("facebook.com") ? `https://${v}` : v) : `https://facebook.com/${clean}`;
    case "youtube": return v.includes(".") || v.startsWith("@") ? (v.startsWith("http") ? v : `https://youtube.com/${v}`) : `https://youtube.com/@${clean}`;
    case "threads": return `https://threads.net/@${clean}`;
    case "pinterest": return `https://pinterest.com/${clean}`;
    case "github": return `https://github.com/${clean}`;
    case "website": return v.startsWith("http") ? v : `https://${v}`;
    default: return v;
  }
}

type UpdateProfile = (partial: Partial<Profile>) => void;

export function BusinessCardView({ profile, updateProfile }: { profile: Profile; updateProfile: UpdateProfile }) {
  const { dir, locale } = useLocale();
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [nearbyStatus, setNearbyStatus] = useState<"idle" | "requesting" | "searching" | "found" | "none" | "denied">("idle");
  const [nearbyPeople, setNearbyPeople] = useState<{ id: string; name: string }[]>([]);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [addedChatChannels, setAddedChatChannels] = useState<PlatformKey[]>([]);
  const [addedSocialLinks, setAddedSocialLinks] = useState<PlatformKey[]>([]);
  const [chatPickerOpen, setChatPickerOpen] = useState(false);
  const [socialPickerOpen, setSocialPickerOpen] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showProfilePic, setShowProfilePic] = useState(true);
  const [showCompanyLogo, setShowCompanyLogo] = useState(true);
  const [showQrOnCard, setShowQrOnCard] = useState(true);
  const cardRef = useRef<HTMLElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const slug = slugFromUsername(profile.username);
  const cardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/card/${encodeURIComponent(slug || "card")}`
      : "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) setShareMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (editDrawerOpen) {
      setChatPickerOpen(false);
      setSocialPickerOpen(false);
    }
  }, [editDrawerOpen]);

  const nearbySearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!nearbyOpen) {
      setNearbyStatus("idle");
      setNearbyPeople([]);
      if (nearbySearchTimeoutRef.current) {
        clearTimeout(nearbySearchTimeoutRef.current);
        nearbySearchTimeoutRef.current = null;
      }
      return;
    }
    setNearbyStatus("requesting");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNearbyStatus("none");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setNearbyStatus("searching");
        nearbySearchTimeoutRef.current = setTimeout(() => {
          nearbySearchTimeoutRef.current = null;
          setNearbyPeople([
            { id: "1", name: locale === "he" ? "אדם בקרבת מקום 1" : "Person nearby 1" },
            { id: "2", name: locale === "he" ? "אדם בקרבת מקום 2" : "Person nearby 2" },
          ]);
          setNearbyStatus("found");
        }, 2500);
      },
      () => setNearbyStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
    return () => {
      if (nearbySearchTimeoutRef.current) {
        clearTimeout(nearbySearchTimeoutRef.current);
        nearbySearchTimeoutRef.current = null;
      }
    };
  }, [nearbyOpen, locale]);

  const handleShareAsImage = useCallback(async () => {
    if (!cardRef.current) return;
    setSharingImage(true);
    setShareMenuOpen(false);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      if (typeof navigator !== "undefined" && navigator.share) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `ollin-card-${slug || "card"}.png`, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: profile.name || "Business Card" });
          return;
        }
      }
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ollin-card-${slug || "card"}.png`;
      a.click();
    } catch (_) {}
    setSharingImage(false);
  }, [slug, profile.name]);

  const handleDownloadAsPdf = useCallback(() => {
    setShareMenuOpen(false);
    window.print();
  }, []);

  const handleGenerateQrCode = useCallback(() => {
    setShareMenuOpen(false);
    setQrModalOpen(true);
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (!cardUrl) return;
    setShareMenuOpen(false);
    try {
      await navigator.clipboard.writeText(cardUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (_) {}
  }, [cardUrl]);

  const handleDownloadAsImage = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloadingImage(true);
    setShareMenuOpen(false);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ollin-card-${slug || "card"}.png`;
      a.click();
    } catch (_) {}
    setDownloadingImage(false);
  }, [slug]);

  const handleShareStandard = useCallback(async () => {
    if (!cardUrl) return;
    setShareMenuOpen(false);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: profile.name ? `${profile.name} - Business Card` : "Business Card",
          text: profile.name ? `${profile.name}${profile.professionalTitle ? ` · ${profile.professionalTitle}` : ""}` : "",
          url: cardUrl,
        });
      } else {
        await navigator.clipboard.writeText(cardUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch (_) {}
  }, [cardUrl, profile.name, profile.professionalTitle]);

  const handleProfileImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => updateProfile({ profileImage: reader.result as string });
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [updateProfile]
  );
  const handleCompanyLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => updateProfile({ companyLogo: reader.result as string });
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [updateProfile]
  );

  const socialLinks: { href: string; icon: typeof Linkedin; label: string }[] = [
    profile.linkedin?.trim() && { href: buildPlatformUrl("linkedin", profile.linkedin), icon: Linkedin, label: "LinkedIn" },
    profile.instagram?.trim() && { href: buildPlatformUrl("instagram", profile.instagram), icon: Instagram, label: "Instagram" },
    profile.whatsapp?.trim() && { href: buildPlatformUrl("whatsapp", profile.whatsapp), icon: WhatsAppIcon as typeof Linkedin, label: "WhatsApp" },
  ].filter(Boolean) as { href: string; icon: typeof Linkedin; label: string }[];

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        .business-card-print-wrapper,
        .business-card-print-wrapper * { visibility: visible; }
        .business-card-print-wrapper { position: fixed; left: 0; top: 0; width: 100%; height: 100%; display: flex !important; align-items: center; justify-content: center; background: #fff; padding: 0; }
        .business-card-print-hide { visibility: hidden !important; }
        .business-card-print-card { width: 3.5in !important; height: 2in !important; max-width: none !important; max-height: none !important; box-shadow: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <div
      className="business-card-print-wrapper fixed inset-0 flex flex-col items-center justify-start p-3 sm:p-4 gap-4 bg-gray-100 overflow-y-auto"
      style={{ minHeight: "100vh" }}
      dir={dir}
    >
      {/* Back to Chatbot: only when Business Card slide is active (no modal open) */}
      {!qrModalOpen && !nearbyOpen && !editDrawerOpen && (
        <Link
          href="/dashboard"
          className="business-card-print-hide absolute top-6 left-6 z-50 w-11 h-11 rounded-full bg-white/80 backdrop-blur-md border border-white/60 shadow-lg text-gray-700 hover:bg-white/90 hover:text-gray-900 flex items-center justify-center"
          aria-label={locale === "he" ? "חזרה" : "Back"}
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
      )}

      {/* Control row: single horizontal row, even spacing, same width as card area */}
      <div className="business-card-print-hide w-full max-w-md flex flex-row items-center justify-between gap-6 py-2.5 px-4 rounded-xl bg-white/90 border border-gray-200 shadow-sm">
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{locale === "he" ? "לוגו?" : "Include Logo?"}</span>
          <button
            type="button"
            role="switch"
            aria-checked={showCompanyLogo}
            onClick={() => setShowCompanyLogo((v) => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${showCompanyLogo ? "bg-[#008080]" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showCompanyLogo ? "left-5" : "left-0.5"}`} />
          </button>
        </label>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{locale === "he" ? "תמונה?" : "Show Picture?"}</span>
          <button
            type="button"
            role="switch"
            aria-checked={showProfilePic}
            onClick={() => setShowProfilePic((v) => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${showProfilePic ? "bg-[#008080]" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showProfilePic ? "left-5" : "left-0.5"}`} />
          </button>
        </label>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{locale === "he" ? "QR?" : "Show QR?"}</span>
          <button
            type="button"
            role="switch"
            aria-checked={showQrOnCard}
            onClick={() => setShowQrOnCard((v) => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${showQrOnCard ? "bg-[#008080]" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showQrOnCard ? "left-5" : "left-0.5"}`} />
          </button>
        </label>
      </div>

      {/* Card: standard business card proportions, printable, subtle shadow */}
      <article
        ref={cardRef}
        className="business-card-print-card bg-white border border-gray-200 overflow-hidden flex-shrink-0 rounded-lg flex flex-col text-gray-900 print:shadow-none print:border-gray-300 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
        style={{
          width: "min(100%, 360px)",
          aspectRatio: String(CARD_ASPECT),
          maxHeight: "calc(100vh - 280px)",
        }}
      >
        <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-5 relative">
          {/* Company logo: top-right corner */}
          {showCompanyLogo && profile.companyLogo?.trim() && (
            <div className="absolute top-3 right-3 w-9 h-9 rounded overflow-hidden flex-shrink-0 opacity-90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.companyLogo} alt="" className="w-full h-full object-contain" />
            </div>
          )}

          <div className="flex flex-1 min-h-0 gap-3">
            {/* Profile picture: main focus (left) */}
            {showProfilePic && (
              <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                {profile.profileImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={profile.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-semibold">
                    {profile.name?.slice(0, 1)?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col justify-center pr-10">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate">{profile.name || "—"}</h1>
              {profile.professionalTitle && <p className="text-sm font-medium text-gray-600 truncate mt-1">{profile.professionalTitle}</p>}
              <div className="mt-2 space-y-0.5 text-xs text-gray-700">
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate">{profile.phone}</span>
                  </a>
                )}
                {profile.email && (
                  <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </a>
                )}
                {profile.website?.trim() && (
                  <a
                    href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 truncate"
                  >
                    <Globe className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate">{profile.website.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Social: small monochrome icons, bottom (leave room for QR when shown) */}
          {socialLinks.length > 0 && (
            <div className={`flex gap-1.5 mt-auto pt-3 border-t border-gray-100 ${showQrOnCard ? "pr-16" : ""}`}>
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  key={href}
                  href={href.startsWith("http") ? href : `https://${href}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 rounded flex items-center justify-center text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                  aria-label={label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          )}

          {/* QR on card: bottom-right, toggleable */}
          {showQrOnCard && cardUrl && (
            <div className="absolute bottom-3 right-3 flex items-center justify-center w-14 h-14 rounded-md bg-white border border-gray-200 p-1 shadow-sm">
              <QRCodeSVG value={cardUrl} size={48} level="M" includeMargin={false} />
            </div>
          )}
        </div>
      </article>

      {/* Actions: Share Card (dropdown) + Share to Nearby */}
      <div className="business-card-print-hide w-full max-w-md flex flex-col gap-3">
        <div className="relative" ref={shareMenuRef}>
          <button
            type="button"
            onClick={() => setShareMenuOpen((o) => !o)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#008080] text-white text-sm font-semibold hover:bg-[#006666] transition-colors shadow-md"
          >
            <Share2 className="w-5 h-5" />
            {locale === "he" ? "שתף כרטיס" : "Share Card"}
            <ChevronDown className={`w-4 h-4 opacity-90 transition-transform ${shareMenuOpen ? "rotate-180" : ""}`} />
          </button>
          {shareMenuOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 py-1.5 rounded-xl border border-gray-200 bg-white shadow-lg z-50">
              <button type="button" onClick={handleShareStandard} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50">
                <Share2 className="w-4 h-4 text-gray-600 shrink-0" />
                {locale === "he" ? "שתף (רגיל)" : "Share (Standard)"}
              </button>
              <button type="button" onClick={handleGenerateQrCode} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50">
                <QrCode className="w-4 h-4 text-gray-600 shrink-0" />
                {locale === "he" ? "שתף QR" : "Share QR"}
              </button>
              <button
                type="button"
                onClick={handleShareAsImage}
                disabled={sharingImage}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-60"
              >
                <ImageIcon className="w-4 h-4 text-gray-600 shrink-0" />
                {locale === "he" ? "שתף כתמונה (PNG/JPG)" : "Share as Image (PNG/JPG)"}
              </button>
              <button type="button" onClick={handleDownloadAsPdf} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50">
                <FileDown className="w-4 h-4 text-gray-600 shrink-0" />
                {locale === "he" ? "הורד PDF" : "Download as PDF"}
              </button>
              <button type="button" onClick={handleCopyLink} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50">
                <Link2 className="w-4 h-4 text-gray-600 shrink-0" />
                {linkCopied ? (locale === "he" ? "הועתק!" : "Copied!") : (locale === "he" ? "העתק קישור" : "Copy Link")}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setNearbyOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-300 bg-transparent text-gray-700 text-sm font-medium hover:bg-gray-100 hover:border-gray-400 transition-colors"
        >
          <Radio className="w-5 h-5 text-gray-600" />
          {locale === "he" ? "שיתוף בקרבת מקום" : "Share to Nearby"}
        </button>
        <button
          type="button"
          onClick={() => setEditDrawerOpen(true)}
          className="business-card-print-hide w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-transparent text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <Pencil className="w-4 h-4 text-gray-500" />
          {locale === "he" ? "ערוך פרטי כרטיס" : "Edit Card Details"}
        </button>
      </div>

      {/* QR Code: standard modal with Close only */}
      {qrModalOpen && cardUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setQrModalOpen(false)} role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-[320px] text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{locale === "he" ? "קוד QR" : "QR Code"}</h3>
            <p className="text-sm text-gray-600 mb-4">{locale === "he" ? "סרוק לגישה לכרטיס הדיגיטלי" : "Scan for instant access to digital card"}</p>
            <div className="flex justify-center bg-white p-4 rounded-xl border border-gray-200">
              <QRCodeSVG value={cardUrl} size={240} level="H" includeMargin />
            </div>
            <p className="text-xs text-gray-500 mt-3 break-all">{cardUrl}</p>
            <button type="button" onClick={() => setQrModalOpen(false)} className="w-full mt-4 py-2.5 rounded-xl bg-[#008080] text-white font-medium hover:bg-[#006666]">
              {locale === "he" ? "סגור" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* Share to Nearby: standard modal with radar UI and Close only */}
      {nearbyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setNearbyOpen(false)} role="dialog" aria-modal="true" aria-label={locale === "he" ? "שיתוף בקרבת מקום" : "Share to Nearby"}>
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-[340px] w-full text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{locale === "he" ? "שיתוף בקרבת מקום" : "Share to Nearby"}</h3>

            {(nearbyStatus === "requesting" || nearbyStatus === "searching") && (
              <div className="py-8 flex flex-col items-center gap-4">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <span className="nearby-radar-ring absolute inset-0 rounded-full bg-[#008080]/25" style={{ animationDelay: "0s" }} />
                  <span className="nearby-radar-ring absolute inset-0 rounded-full bg-[#008080]/20" style={{ animationDelay: "0.4s" }} />
                  <span className="nearby-radar-ring absolute inset-0 rounded-full bg-[#008080]/15" style={{ animationDelay: "0.8s" }} />
                  <span className="relative z-10 w-11 h-11 rounded-full bg-[#008080] flex items-center justify-center shadow-md">
                    <Radio className="w-6 h-6 text-white" />
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {nearbyStatus === "requesting"
                    ? (locale === "he" ? "מבקש גישה למיקום..." : "Requesting location...")
                    : (locale === "he" ? "מחפש אנשים בקרבת מקום..." : "Searching for nearby people...")}
                </p>
              </div>
            )}

            {nearbyStatus === "found" && nearbyPeople.length > 0 && (
              <div className="py-2">
                <p className="text-sm font-medium text-gray-700 mb-3">{locale === "he" ? "אנשים שנמצאו בקרבת מקום" : "People found nearby"}</p>
                <ul className="space-y-2 text-left">
                  {nearbyPeople.map((person) => (
                    <li key={person.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50">
                      <span className="w-10 h-10 rounded-full bg-[#008080]/20 flex items-center justify-center text-[#008080] font-semibold text-sm">
                        {person.name.slice(0, 1)}
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-900 truncate">{person.name}</span>
                      <button type="button" className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#008080] text-white text-xs font-medium hover:bg-[#006666]">
                        {locale === "he" ? "שתף" : "Share"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(nearbyStatus === "none" || nearbyStatus === "denied") && (
              <div className="py-4">
                <p className="text-sm text-gray-600 mb-4">
                  {nearbyStatus === "denied"
                    ? (locale === "he" ? "גישה למיקום נדחתה. השתמש בקוד QR כדי לשתף." : "Location access denied. Use a QR code to share instead.")
                    : (locale === "he" ? "לא נמצאו אנשים בקרבת מקום כרגע." : "No one nearby right now.")}
                </p>
                <button
                  type="button"
                  onClick={() => { setNearbyOpen(false); setQrModalOpen(true); }}
                  className="w-full py-3 rounded-xl bg-[#008080] text-white text-sm font-semibold hover:bg-[#006666] transition-colors"
                >
                  {locale === "he" ? "הצג קוד QR" : "Show QR code"}
                </button>
              </div>
            )}

            {nearbyStatus === "found" && nearbyPeople.length === 0 && (
              <div className="py-4">
                <p className="text-sm text-gray-600 mb-4">{locale === "he" ? "לא נמצאו אנשים בקרבת מקום כרגע." : "No one nearby right now."}</p>
                <button type="button" onClick={() => { setNearbyOpen(false); setQrModalOpen(true); }} className="w-full py-3 rounded-xl bg-[#008080] text-white text-sm font-semibold hover:bg-[#006666]">
                  {locale === "he" ? "הצג קוד QR" : "Show QR code"}
                </button>
              </div>
            )}

            <button type="button" onClick={() => setNearbyOpen(false)} className="w-full mt-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
              {locale === "he" ? "סגור" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* Edit Card Details: bottom sheet (mobile) / side panel (desktop) */}
      {editDrawerOpen && (
        <>
          <div className="business-card-print-hide fixed inset-0 z-40 bg-black/40" onClick={() => setEditDrawerOpen(false)} aria-hidden />
          <div
            className="fixed z-50 bg-white border border-gray-200 shadow-xl overflow-hidden flex flex-col business-card-print-hide bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl md:bottom-0 md:left-auto md:right-0 md:top-0 md:max-h-none md:rounded-none md:w-full md:max-w-md"
            role="dialog"
            aria-modal="true"
            aria-label={locale === "he" ? "ערוך פרטי כרטיס" : "Edit Card Details"}
          >
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">{locale === "he" ? "ערוך כרטיס" : "Edit Card Details"}</h2>
              <button type="button" onClick={() => setEditDrawerOpen(false)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700" aria-label={locale === "he" ? "סגור" : "Close"}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {/* Identity */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Identity</h3>
                <div className="space-y-2.5">
                  <input type="text" value={profile.name ?? ""} onChange={(e) => updateProfile({ name: e.target.value })} placeholder="Name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400" />
                  <input type="text" value={profile.professionalTitle ?? ""} onChange={(e) => updateProfile({ professionalTitle: e.target.value })} placeholder="Job Title" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400" />
                  <input type="text" value={profile.company ?? ""} onChange={(e) => updateProfile({ company: e.target.value })} placeholder="Company" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400" />
                  <input type="text" value={profile.website ?? ""} onChange={(e) => updateProfile({ website: e.target.value })} placeholder="Website" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400" />
                </div>
              </section>
              {/* Images */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Images</h3>
                <div className="flex flex-wrap gap-3">
                  <input ref={profileImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} />
                  <button type="button" onClick={() => profileImageInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                    {locale === "he" ? "תמונת פרופיל" : "Profile Picture"}
                  </button>
                  <input ref={companyLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleCompanyLogoUpload} />
                  <button type="button" onClick={() => companyLogoInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                    {locale === "he" ? "לוגו חברה" : "Company Logo"}
                  </button>
                </div>
              </section>
              {/* Chat Channels: dynamic rows + Add button + dropdown */}
              <section className="relative">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Chat Channels</h3>
                <div className="space-y-2.5">
                  {CHAT_PLATFORMS.filter((p) => (profile[p.key] as string | undefined)?.trim() || addedChatChannels.includes(p.key)).map((p) => (
                    <div key={p.key} className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200" style={{ color: p.brandColor }}>
                          <p.Icon className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <label className="text-xs font-medium text-gray-500">{p.inputLabel}</label>
                          <input
                            type="text"
                            value={(profile[p.key] as string | undefined) ?? ""}
                            onChange={(e) => updateProfile({ [p.key]: e.target.value } as Partial<Profile>)}
                            placeholder={p.placeholder}
                            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white"
                          />
                        </div>
                        <button type="button" onClick={() => { updateProfile({ [p.key]: "" } as Partial<Profile>); setAddedChatChannels((prev) => prev.filter((k) => k !== p.key)); }} className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-600" aria-label={locale === "he" ? "הסר" : "Remove"}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 relative">
                  <button type="button" onClick={() => { setSocialPickerOpen(false); setChatPickerOpen((o) => !o); }} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-[#008080]/40 hover:text-[#008080] transition-colors">
                    <Plus className="w-4 h-4" />
                    {locale === "he" ? "הוסף ערוץ צ'אט" : "Add Chat Channel"}
                  </button>
                  {chatPickerOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 py-3 px-2 rounded-xl border border-gray-200 bg-white shadow-lg z-50 grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto">
                      {CHAT_PLATFORMS.filter((p) => !(profile[p.key] as string | undefined)?.trim() && !addedChatChannels.includes(p.key)).map((p) => (
                        <button key={p.key} type="button" onClick={() => { setAddedChatChannels((prev) => [...prev, p.key]); setChatPickerOpen(false); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors">
                          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${p.brandColor}20`, color: p.brandColor }}>
                            <p.Icon className="w-5 h-5" />
                          </span>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">{p.label}</span>
                        </button>
                      ))}
                      {CHAT_PLATFORMS.every((p) => (profile[p.key] as string | undefined)?.trim() || addedChatChannels.includes(p.key)) && (
                        <p className="col-span-3 px-3 py-2 text-xs text-gray-500">{locale === "he" ? "כל הערוצים נוספו" : "All channels added"}</p>
                      )}
                    </div>
                  )}
                </div>
              </section>
              {/* Social Media: dynamic rows + Add button + dropdown */}
              <section className="relative">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Social Media</h3>
                <div className="space-y-2.5">
                  {SOCIAL_PLATFORMS.filter((p) => (profile[p.key] as string | undefined)?.trim() || addedSocialLinks.includes(p.key)).map((p) => (
                    <div key={p.key} className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200" style={{ color: p.brandColor }}>
                          <p.Icon className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <label className="text-xs font-medium text-gray-500">{p.inputLabel}</label>
                          <input
                            type="text"
                            value={(profile[p.key] as string | undefined) ?? ""}
                            onChange={(e) => updateProfile({ [p.key]: e.target.value } as Partial<Profile>)}
                            placeholder={p.placeholder}
                            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white"
                          />
                        </div>
                        <button type="button" onClick={() => { updateProfile({ [p.key]: "" } as Partial<Profile>); setAddedSocialLinks((prev) => prev.filter((k) => k !== p.key)); }} className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-600" aria-label={locale === "he" ? "הסר" : "Remove"}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 relative">
                  <button type="button" onClick={() => { setChatPickerOpen(false); setSocialPickerOpen((o) => !o); }} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-[#008080]/40 hover:text-[#008080] transition-colors">
                    <Plus className="w-4 h-4" />
                    {locale === "he" ? "הוסף רשת חברתית" : "Add Social / Profile"}
                  </button>
                  {socialPickerOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 py-3 px-2 rounded-xl border border-gray-200 bg-white shadow-lg z-50 grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto">
                      {SOCIAL_PLATFORMS.filter((p) => !(profile[p.key] as string | undefined)?.trim() && !addedSocialLinks.includes(p.key)).map((p) => (
                        <button key={p.key} type="button" onClick={() => { setAddedSocialLinks((prev) => [...prev, p.key]); setSocialPickerOpen(false); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors">
                          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${p.brandColor}20`, color: p.brandColor }}>
                            <p.Icon className="w-5 h-5" />
                          </span>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">{p.label}</span>
                        </button>
                      ))}
                      {SOCIAL_PLATFORMS.every((p) => (profile[p.key] as string | undefined)?.trim() || addedSocialLinks.includes(p.key)) && (
                        <p className="col-span-3 px-3 py-2 text-xs text-gray-500">{locale === "he" ? "כל הרשתות נוספו" : "All platforms added"}</p>
                      )}
                    </div>
                  )}
                </div>
              </section>
              {/* Contact Info */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Contact Info</h3>
                <div className="space-y-2.5">
                  <input type="tel" value={profile.phone ?? ""} onChange={(e) => updateProfile({ phone: e.target.value })} placeholder="Phone" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400" />
                  <input type="email" value={profile.email ?? ""} onChange={(e) => updateProfile({ email: e.target.value })} placeholder="Email" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400" />
                </div>
              </section>
            </div>
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100">
              <button type="button" onClick={() => setEditDrawerOpen(false)} className="w-full py-3 rounded-xl bg-[#008080] text-white text-sm font-semibold hover:bg-[#006666] transition-colors">
                {locale === "he" ? "סיום" : "Done"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
