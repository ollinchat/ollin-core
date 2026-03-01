"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useContacts } from "@/contexts/ContactsContext";
import {
  ChevronLeft,
  Image,
  Star,
  Phone,
  Mail,
  Briefcase,
  CreditCard,
  Link2,
  FileText,
  UserPlus,
  User,
} from "lucide-react";

const TEAL = "#008080";

type ContactInfoPageProps = {
  contactId: string;
};

/** WhatsApp-style Contact Info: Media/Links/Docs, Starred, Full Digital Business Card, Permission to send tasks. */
export function ContactInfoPage({ contactId }: ContactInfoPageProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const { contacts, updateContact } = useContacts();
  const contact = contacts.find((c) => c.id === contactId);
  const isHe = locale === "he";
  /** "New" = minimal details (no email, no phone) — show prominent Add to Contacts / complete profile */
  const isNewContact = contact && !contact.phone && !contact.email;

  if (!contact) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f8f9fa]">
        <p className="text-gray-500 text-sm">{isHe ? "איש קשר לא נמצא" : "Contact not found"}</p>
        <Link href="/dashboard" className="mt-4 text-[#008080] text-sm font-medium">{isHe ? "חזרה" : "Back"}</Link>
      </div>
    );
  }

  const name = contact.name || contact.email || contactId;
  const initial = (name || "?").slice(0, 1).toUpperCase();

  const sharedMediaCount = 0;
  const sharedLinksCount = 0;
  const sharedDocsCount = 0;
  const allowTasksFrom = contact?.allowTasksFrom ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <header className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center gap-1"
          aria-label={isHe ? "חזרה" : "Back"}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{isHe ? "חזרה" : "Back"}</span>
        </button>
        <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">{isHe ? "פרטי איש קשר" : "Contact Info"}</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Profile card */}
        <div className="flex flex-col items-center py-6 px-4 bg-white border-b border-gray-100">
          <div className="w-20 h-20 rounded-full bg-[#008080]/15 flex items-center justify-center text-2xl font-semibold text-[#008080] mb-3">
            {contact.avatar ? (
              <img src={contact.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <p className="font-semibold text-gray-900 text-lg">{name}</p>
          {contact.email ? <p className="text-sm text-gray-500 mt-0.5">{contact.email}</p> : null}
          {isNewContact && (
            <Link href={`/dashboard/messages?contact=${contactId}`} className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#008080] text-white text-sm font-medium hover:bg-[#006666]">
              <UserPlus className="w-4 h-4" strokeWidth={2} />
              {isHe ? "הוסף לאנשי קשר / עדכן פרטים" : "Add to Contacts / Update details"}
            </Link>
          )}
        </div>

        {/* Shared Media / Links / Docs */}
        <div className="mt-2 bg-white border-y border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{isHe ? "תוכן משותף" : "Shared with you"}</p>
          </div>
          <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="w-9 h-9 rounded-xl bg-[#008080]/10 flex items-center justify-center text-[#008080]">
              <Image className="w-4 h-4" strokeWidth={2} />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900">{isHe ? "מדיה" : "Media"}</span>
            {sharedMediaCount > 0 && <span className="text-xs text-gray-500">{sharedMediaCount}</span>}
          </button>
          <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="w-9 h-9 rounded-xl bg-[#008080]/10 flex items-center justify-center text-[#008080]">
              <Link2 className="w-4 h-4" strokeWidth={2} />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900">{isHe ? "קישורים" : "Links"}</span>
            {sharedLinksCount > 0 && <span className="text-xs text-gray-500">{sharedLinksCount}</span>}
          </button>
          <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-[#008080]/10 flex items-center justify-center text-[#008080]">
              <FileText className="w-4 h-4" strokeWidth={2} />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900">{isHe ? "מסמכים" : "Docs"}</span>
            {sharedDocsCount > 0 && <span className="text-xs text-gray-500">{sharedDocsCount}</span>}
          </button>
        </div>

        {/* Starred Messages */}
        <div className="mt-2 bg-white border-y border-gray-100 rounded-xl overflow-hidden">
          <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-[#008080]/10 flex items-center justify-center text-[#008080]">
              <Star className="w-4 h-4" strokeWidth={2} />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900">{isHe ? "הודעות מסומנות" : "Starred Messages"}</span>
            <span className="text-xs text-gray-500">0</span>
          </button>
        </div>

        {/* Permission to send tasks */}
        <div className="mt-4 bg-white border-y border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{isHe ? "הרשאות" : "Permissions"}</p>
          </div>
          <label className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
            <span className="text-sm font-medium text-gray-900">{isHe ? "הרשאה לשלוח משימות" : "Permission to send tasks"}</span>
            <input
              type="checkbox"
              checked={allowTasksFrom}
              onChange={(e) => updateContact(contactId, { allowTasksFrom: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-[#008080] focus:ring-[#008080]"
            />
          </label>
        </div>

        {/* Full Ollin Digital Business Card — Phone, Email, Bio, Role, Ollin ID */}
        <div className="mt-4 bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{isHe ? "כרטיס עסקי דיגיטלי — אולין" : "Ollin Digital Business Card"}</p>
          </div>
          <div className="divide-y divide-gray-50">
            <div className="flex items-center gap-3 px-4 py-3">
              <Phone className="w-4 h-4 text-[#008080] shrink-0" strokeWidth={2} />
              <span className="text-sm text-gray-900">{contact.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Mail className="w-4 h-4 text-[#008080] shrink-0" strokeWidth={2} />
              <span className="text-sm text-gray-900">{contact.email || "—"}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <User className="w-4 h-4 text-[#008080] shrink-0" strokeWidth={2} />
              <span className="text-sm text-gray-900">{contact.bio || (isHe ? "אין ביו" : "No bio")}</span>
            </div>
            {contact.role && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Briefcase className="w-4 h-4 text-[#008080] shrink-0" strokeWidth={2} />
                <span className="text-sm text-gray-900">{contact.role}</span>
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3">
              <CreditCard className="w-4 h-4 text-[#008080] shrink-0" strokeWidth={2} />
              <span className="text-sm text-gray-500">{isHe ? "מזהה אולין" : "Ollin ID"}: {contact.userId || "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
