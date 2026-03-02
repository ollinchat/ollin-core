"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useContacts } from "@/contexts/ContactsContext";
import {
  ChevronLeft,
  Phone,
  Mail,
  MessageCircle,
  User,
  Image,
  Link2,
  FileText,
  Star,
  Briefcase,
  UserPlus,
  ClipboardList,
} from "lucide-react";
import type { Contact } from "@/contexts/ContactsContext";

const TEAL = "#008080";
const CARD_SHADOW = "0 4px 12px rgba(0,0,0,0.05)";
const BORDER_RADIUS_CARD = 20;

type ContactInfoPageProps = {
  contactId: string;
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] },
};

/** Ollin Business Card: premium digital identity, light theme only, no legacy list UI. */
export function ContactInfoPage({ contactId }: ContactInfoPageProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const { contacts, updateContact } = useContacts();
  const contact = contacts.find((c) => c.id === contactId);
  const isHe = locale === "he";
  const isNewContact = contact && !contact.phone && !contact.email;

  if (!contact) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <p className="text-gray-500 text-sm">{isHe ? "איש קשר לא נמצא" : "Contact not found"}</p>
        <Link href="/dashboard" className="mt-4 text-[#008080] text-sm font-medium hover:underline">
          {isHe ? "חזרה" : "Back"}
        </Link>
      </div>
    );
  }

  const name = contact.name || contact.email || contactId;
  const initial = (name || "?").slice(0, 1).toUpperCase();
  const roleLabel = contact.role || (isHe ? "איש קשר" : "Contact");
  const roleTitle = roleLabel.includes("@") ? roleLabel : `${roleLabel} @ Ollin`;
  const bio = contact.bio || (isHe ? "אין ביו" : "No bio");
  const allowTasksFrom = contact.allowTasksFrom ?? false;

  const sharedMediaCount = 0;
  const sharedLinksCount = 0;
  const sharedDocsCount = 0;

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-white"
      initial="initial"
      animate="animate"
      variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
    >
      {/* Header: pure white / light gray, back + title */}
      <header
        className="flex-shrink-0 flex items-center gap-2 px-3 py-3 bg-white border-b border-gray-100"
        style={{ backgroundColor: "#fafafa" }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center gap-1.5 transition-colors"
          aria-label={isHe ? "חזרה" : "Back"}
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          <span className="text-sm font-medium">{isHe ? "חזרה" : "Back"}</span>
        </button>
        <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">
          {isHe ? "כרטיס אולין" : "Ollin Card"}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar + Name — light background, avatar with turquoise border */}
        <motion.section
          className="flex flex-col items-center pt-6 pb-4 px-4 bg-white"
          variants={fadeIn}
          initial="initial"
          animate="animate"
          transition={fadeIn.transition}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold text-[#008080] flex-shrink-0 overflow-hidden bg-gray-100"
            style={{ border: "2px solid rgba(0,128,128,0.35)", boxShadow: "0 2px 8px rgba(0,128,128,0.08)" }}
          >
            {contact.avatar ? (
              <img src={contact.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <p className="mt-3 font-semibold text-gray-900 text-lg">{name}</p>
          {contact.email && (
            <p className="text-sm text-gray-500 mt-0.5">{contact.email}</p>
          )}
          {isNewContact && (
            <Link
              href={`/dashboard/messages?contact=${contactId}`}
              className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#008080] text-white text-sm font-medium hover:bg-[#006666] transition-colors shadow-[0_2px_8px_rgba(0,128,128,0.25)]"
            >
              <UserPlus className="w-4 h-4" strokeWidth={2} />
              {isHe ? "הוסף לאנשי קשר / עדכן פרטים" : "Add to Contacts / Update details"}
            </Link>
          )}
        </motion.section>

        {/* Business Card — 20px radius, soft shadow, Role + Quick actions + Bio */}
        <motion.section
          className="px-4 pb-4"
          variants={fadeIn}
          initial="initial"
          animate="animate"
          transition={{ ...fadeIn.transition, delay: 0.05 }}
        >
          <div
            className="rounded-2xl bg-white p-5 w-full"
            style={{
              borderRadius: BORDER_RADIUS_CARD,
              boxShadow: CARD_SHADOW,
              border: "1px solid rgba(0,0,0,0.04)",
            }}
          >
            {/* Role/Title — high visibility (e.g. Founder @ Ollin) */}
            <p className="text-[#008080] font-semibold text-base mb-4">
              {roleTitle}
            </p>

            {/* Quick actions: Call, Email, WhatsApp — turquoise icons */}
            <div className="flex items-center gap-4 mb-4">
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#008080]/10 text-[#008080] hover:bg-[#008080]/20 transition-colors"
                  aria-label={isHe ? "התקשר" : "Call"}
                >
                  <Phone className="w-5 h-5" strokeWidth={2} />
                </a>
              ) : null}
              {contact.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#008080]/10 text-[#008080] hover:bg-[#008080]/20 transition-colors"
                  aria-label={isHe ? "אימייל" : "Email"}
                >
                  <Mail className="w-5 h-5" strokeWidth={2} />
                </a>
              ) : null}
              <a
                href={`https://wa.me/${(contact.phone || "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#008080]/10 text-[#008080] hover:bg-[#008080]/20 transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" strokeWidth={2} />
              </a>
            </div>

            {/* Bio — 1–2 lines, muted */}
            <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
              {bio}
            </p>
          </div>
        </motion.section>

        {/* Primary action buttons — full-width, pixel-perfect turquoise */}
        <motion.section
          className="px-4 pb-5"
          variants={fadeIn}
          initial="initial"
          animate="animate"
          transition={{ ...fadeIn.transition, delay: 0.08 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href={contact.userId ? `/p/${encodeURIComponent(contact.userId)}` : "/profile"}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 border-[#008080]/25 bg-white text-[#008080] font-medium text-sm hover:bg-[#008080]/10 hover:border-[#008080]/40 transition-all shadow-sm"
            >
              <User className="w-4 h-4" strokeWidth={2} />
              {isHe ? "פרופיל מלא" : "Full Profile"}
            </Link>
            <Link
              href="/dashboard?open=board"
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#008080] text-white font-medium text-sm hover:bg-[#006666] transition-colors shadow-[0_2px_8px_rgba(0,128,128,0.28)]"
            >
              <ClipboardList className="w-4 h-4" strokeWidth={2} />
              {isHe ? "לוח משותף / משימות" : "Shared Board / Tasks"}
            </Link>
          </div>
        </motion.section>

        {/* Shared assets — clean grid with turquoise accents */}
        <motion.section
          className="px-4 pb-5"
          variants={fadeIn}
          initial="initial"
          animate="animate"
          transition={{ ...fadeIn.transition, delay: 0.1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            {isHe ? "תוכן משותף" : "Shared with you"}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <SharedAssetTile
              icon={Image}
              label={isHe ? "מדיה" : "Media"}
              count={sharedMediaCount}
            />
            <SharedAssetTile
              icon={Link2}
              label={isHe ? "קישורים" : "Links"}
              count={sharedLinksCount}
            />
            <SharedAssetTile
              icon={FileText}
              label={isHe ? "מסמכים" : "Docs"}
              count={sharedDocsCount}
            />
          </div>
        </motion.section>

        {/* Starred + Permissions — card style, no thin separators */}
        <motion.section
          className="px-4 pb-6"
          variants={fadeIn}
          initial="initial"
          animate="animate"
          transition={{ ...fadeIn.transition, delay: 0.12 }}
        >
          <div
            className="rounded-2xl bg-white overflow-hidden"
            style={{ boxShadow: CARD_SHADOW, border: "1px solid rgba(0,0,0,0.04)" }}
          >
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/80 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#008080]/10 flex items-center justify-center text-[#008080] shrink-0">
                <Star className="w-5 h-5" strokeWidth={2} />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-900">
                {isHe ? "הודעות מסומנות" : "Starred Messages"}
              </span>
              <span className="text-xs text-gray-500">0</span>
            </button>
            <label className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/80 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-[#008080]/10 flex items-center justify-center text-[#008080] shrink-0">
                <ClipboardList className="w-5 h-5" strokeWidth={2} />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-900">
                {isHe ? "הרשאה לשלוח משימות" : "Permission to send tasks"}
              </span>
              <input
                type="checkbox"
                checked={allowTasksFrom}
                onChange={(e) => updateContact(contactId, { allowTasksFrom: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-[#008080] focus:ring-[#008080] shrink-0"
              />
            </label>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}

function SharedAssetTile({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof Image;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl bg-gray-50/80 hover:bg-[#008080]/5 transition-colors border border-transparent hover:border-[#008080]/15"
    >
      <div className="w-12 h-12 rounded-xl bg-[#008080]/10 flex items-center justify-center text-[#008080]">
        <Icon className="w-6 h-6" strokeWidth={2} />
      </div>
      <span className="text-xs font-medium text-gray-700">{label}</span>
      {count > 0 && (
        <span className="text-[10px] text-gray-500 font-medium">{count}</span>
      )}
    </button>
  );
}
