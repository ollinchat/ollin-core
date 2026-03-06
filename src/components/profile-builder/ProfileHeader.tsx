"use client";

import { useRef } from "react";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import type { ProfileBuilderHeader as HeaderType } from "@/lib/profile-builder-types";

const TEAL = "#008080";

const SOCIAL_ICONS: Record<string, { label: string; baseUrl: string }> = {
  instagram: { label: "Instagram", baseUrl: "https://instagram.com/" },
  linkedin: { label: "LinkedIn", baseUrl: "https://linkedin.com/in/" },
  facebook: { label: "Facebook", baseUrl: "https://facebook.com/" },
  twitter: { label: "Twitter", baseUrl: "https://twitter.com/" },
  youtube: { label: "YouTube", baseUrl: "https://youtube.com/" },
  tiktok: { label: "TikTok", baseUrl: "https://tiktok.com/@" },
};

type Props = {
  header: HeaderType;
  editMode?: boolean;
  onCoverUpload?: (file: File) => void;
  onAvatarUpload?: (file: File) => void;
};

export function ProfileHeader({ header, editMode, onCoverUpload, onAvatarUpload }: Props) {
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const fullName = header.fullName || "Your Name";
  const title = header.title || "";
  const bio = header.bio || "";
  const coverImage = header.coverImage;
  const profileImage = header.profileImage;

  const socialEntries = header.socialLinks ? Object.entries(header.socialLinks).filter(([, v]) => v && String(v).trim()) : [];

  return (
    <header className="relative w-full">
      {/* Cover */}
      <div className="relative w-full h-48 sm:h-56 bg-gradient-to-br from-teal-700 to-teal-900 overflow-hidden">
        {coverImage ? <img src={coverImage} alt="" className="w-full h-full object-cover" /> : null}
        {editMode && onCoverUpload ? (
          <>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onCoverUpload(f); e.target.value = ""; }} />
            <button type="button" onClick={() => coverRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 text-white text-sm font-medium">
              Upload cover image
            </button>
          </>
        ) : null}
      </div>

      {/* Avatar + identity */}
      <div className="px-4 -mt-16 relative z-10 flex flex-col items-center text-center pb-4">
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center">
            {profileImage ? <img src={profileImage} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-gray-400">{fullName.slice(0, 1).toUpperCase() || "?"}</span>}
          </div>
          {editMode && onAvatarUpload ? (
            <>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarUpload(f); e.target.value = ""; }} />
              <button type="button" onClick={() => avatarRef.current?.click()} className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-teal-600 text-white shadow flex items-center justify-center hover:bg-teal-700">
                +
              </button>
            </>
          ) : null}
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">{fullName}</h1>
        {title ? <p className="text-teal-600 font-medium text-sm mt-0.5">{title}</p> : null}
        {bio ? <p className="text-gray-600 text-sm mt-2 max-w-md">{bio}</p> : null}

        {/* Quick contact */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          {header.whatsapp ? (
            <a href={"https://wa.me/" + header.whatsapp.replace(/\D/g, "")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          ) : null}
          {header.mobile ? (
            <a href={"tel:" + header.mobile} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
              <Phone className="w-4 h-4" /> Call
            </a>
          ) : null}
          {header.email ? (
            <a href={"mailto:" + header.email} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
              <Mail className="w-4 h-4" /> Email
            </a>
          ) : null}
        </div>

        {/* Social links */}
        {socialEntries.length > 0 ? (
          <div className="flex items-center justify-center gap-2 mt-3">
            {socialEntries.map(([key, url]) => {
              const meta = SOCIAL_ICONS[key];
              const href = meta && !url.startsWith("http") ? meta.baseUrl + url.replace(/^@/, "") : url;
              return (
                <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-teal-100 hover:text-teal-600" title={meta?.label ?? key}>
                  {key.slice(0, 1).toUpperCase()}
                </a>
              );
            })}
          </div>
        ) : null}
      </div>
    </header>
  );
}
