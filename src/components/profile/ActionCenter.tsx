"use client";

import Link from "next/link";
import { MessageCircle, Phone, Instagram, Linkedin, Facebook, Twitter, Youtube } from "lucide-react";
import type { ProfileBuilderHeader } from "@/lib/profile-builder-types";

const TEAL = "#008080";

const SOCIAL_ICONS: Record<string, { label: string; Icon: typeof Instagram; baseUrl?: string }> = {
  instagram: { label: "Instagram", Icon: Instagram, baseUrl: "https://instagram.com/" },
  linkedin: { label: "LinkedIn", Icon: Linkedin, baseUrl: "https://linkedin.com/in/" },
  facebook: { label: "Facebook", Icon: Facebook, baseUrl: "https://facebook.com/" },
  twitter: { label: "Twitter", Icon: Twitter, baseUrl: "https://twitter.com/" },
  youtube: { label: "YouTube", Icon: Youtube, baseUrl: "https://youtube.com/" },
  behance: { label: "Behance", Icon: Linkedin },
};

type Props = {
  header: ProfileBuilderHeader;
  /** For Chat action: base path to messaging (e.g. /dashboard/messages). If not set, Chat button is hidden. */
  chatHref?: string;
  /** Pre-filled message for WhatsApp (e.g. "Hi, I found you via Ollin"). */
  whatsappMessage?: string;
};

export function ActionCenter({ header, chatHref = "/dashboard/messages", whatsappMessage = "Hi, I found you through Ollin" }: Props) {
  const primary = header.primary_action_type ?? "WhatsApp";
  const socialEntries = header.socialLinks
    ? (Object.entries(header.socialLinks) as [string, string | undefined][]).filter(([, v]) => v != null && String(v).trim() !== "")
    : [];

  const primaryButton = () => {
    if (primary === "Chat" && chatHref) {
      return (
        <Link
          href={chatHref}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#008080] text-white font-medium text-sm hover:bg-[#006666] transition-colors"
        >
          <MessageCircle className="w-5 h-5" /> Chat
        </Link>
      );
    }
    if (primary === "WhatsApp" && header.whatsapp) {
      const num = header.whatsapp.replace(/\D/g, "");
      const url = `https://wa.me/${num}${whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ""}`;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#25D366] text-white font-medium text-sm hover:bg-[#20BD5A] transition-colors"
        >
          <MessageCircle className="w-5 h-5" /> WhatsApp
        </a>
      );
    }
    if (primary === "Call" && header.mobile) {
      return (
        <a
          href={`tel:${header.mobile.replace(/\s/g, "")}`}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#008080] text-white font-medium text-sm hover:bg-[#006666] transition-colors"
        >
          <Phone className="w-5 h-5" /> Call
        </a>
      );
    }
    if (header.whatsapp) {
      const num = header.whatsapp.replace(/\D/g, "");
      const url = `https://wa.me/${num}${whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ""}`;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#25D366] text-white font-medium text-sm hover:bg-[#20BD5A] transition-colors"
        >
          <MessageCircle className="w-5 h-5" /> WhatsApp
        </a>
      );
    }
    if (header.mobile) {
      return (
        <a
          href={`tel:${header.mobile.replace(/\s/g, "")}`}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#008080] text-white font-medium text-sm hover:bg-[#006666] transition-colors"
        >
          <Phone className="w-5 h-5" /> Call
        </a>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {primaryButton()}
      {socialEntries.length > 0 && (
        <div className="flex flex-row items-center justify-center gap-2 flex-wrap">
          {socialEntries.map(([key, url]) => {
            if (!url?.trim()) return null;
            const meta = SOCIAL_ICONS[key];
            const href = meta?.baseUrl && !url.startsWith("http") ? meta.baseUrl + url.replace(/^@/, "") : url;
            const Icon = meta?.Icon ?? MessageCircle;
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-[#008080]/10 hover:text-[#008080] transition-colors"
                title={meta?.label ?? key}
                aria-label={meta?.label ?? key}
              >
                <Icon className="w-5 h-5" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
