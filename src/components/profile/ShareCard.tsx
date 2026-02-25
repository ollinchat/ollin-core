"use client";

import { useState, useCallback } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import type { Profile } from "@/lib/profile-types";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ShareCardProps {
  profile: Profile;
  url: string;
  className?: string;
}

/**
 * Share Card: copies link and offers share actions.
 * For rich preview in WhatsApp etc., the link points to /p/[username];
 * when backend/OG tags are added, that URL will show Image + Title + Link.
 */
export function ShareCard({ profile, url, className = "" }: ShareCardProps) {
  const { locale } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  }, [url]);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${profile.name || "Card"} – ${url}`
  )}`;

  return (
    <div className={className}>
      <Button
        variant="secondary"
        fullWidth
        onClick={handleCopy}
        className="flex items-center justify-center gap-2"
      >
        <Share2 className="w-5 h-5" />
        {copied ? (locale === "he" ? "הועתק!" : "Copied!") : t(locale, "card.shareCard")}
      </Button>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block text-center text-sm text-accent hover:underline"
      >
        Share via WhatsApp
      </a>
    </div>
  );
}

/**
 * Rich preview representation for meta/social.
 * Use this when generating OG image or when embedding share preview in the app.
 */
export function ShareCardPreview({
  profile,
  url,
  title,
}: {
  profile: Profile;
  url: string;
  title?: string;
}) {
  const displayTitle = title || profile.name || "Digital Business Card";

  return (
    <div className="flex gap-4 p-4 rounded-xl border border-gray-200 bg-white max-w-md w-full">
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
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
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-gray-900 truncate">{displayTitle}</h3>
        {profile.professionalTitle && (
          <p className="text-sm text-accent truncate">{profile.professionalTitle}</p>
        )}
        <p className="text-xs text-gray-500 truncate mt-1">{url}</p>
      </div>
    </div>
  );
}
