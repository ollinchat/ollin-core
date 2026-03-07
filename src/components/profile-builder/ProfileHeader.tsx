"use client";

import { useRef } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import type { ProfileBuilderHeader as HeaderType } from "@/lib/profile-builder-types";
import { ActionCenter } from "@/components/profile/ActionCenter";

const TEAL = "#008080";

type Props = {
  header: HeaderType;
  editMode?: boolean;
  onCoverUpload?: (file: File) => void;
  onAvatarUpload?: (file: File) => void;
  /** Use Smart Action Center (primary button + social grid). If false, show legacy quick contact. */
  useActionCenter?: boolean;
};

export function ProfileHeader({ header, editMode, onCoverUpload, onAvatarUpload, useActionCenter = true }: Props) {
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const fullName = header.fullName ?? "";
  const title = header.title ?? "";
  const bio = header.bio ?? "";
  const coverImage = header.coverImage;
  const profileImage = header.profileImage;

  return (
    <header className="relative w-full">
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
        {fullName ? <h1 className="mt-4 text-xl font-bold text-gray-900">{fullName}</h1> : null}
        {title ? <p className="text-teal-600 font-medium text-sm mt-0.5">{title}</p> : null}
        {bio ? <p className="text-gray-600 text-sm mt-2 max-w-md">{bio}</p> : null}

        {useActionCenter ? (
          <div className="mt-4">
            <ActionCenter header={header} />
          </div>
        ) : (
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
        )}
      </div>
    </header>
  );
}
