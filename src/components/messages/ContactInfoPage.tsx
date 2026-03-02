"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useContacts } from "@/contexts/ContactsContext";
import {
  ChevronLeft,
  Phone,
  User,
  UserPlus,
  ClipboardList,
  Video,
  Ban,
  ChevronRight,
  Share2,
  DollarSign,
  MessageCircle,
  Check,
  Bell,
  BellOff,
  Lock,
  Monitor,
  Image,
  X,
} from "lucide-react";
import { formatOllinIdForDisplay, formatStandardMobile } from "@/lib/user-id";

const TEAL = "#008080";
const RADIUS = 20;
const GLASS = "backdrop-blur-xl bg-white/80";
const SHADOW_PREMIUM = "0 8px 32px rgba(0,128,128,0.08), 0 2px 8px rgba(0,0,0,0.04)";

type ContactInfoPageProps = { contactId: string };

/** Unknown: Banner [Block] | [Add to Contacts]; then Task Permission block with Checkmark — "Allow this user to send tasks? [Yes / No]" */
function UnknownSafetyBlock({
  contactId,
  onAdd,
  onBlock,
  onAllowTasks,
  onDenyTasks,
  isHe,
}: {
  contactId: string;
  onAdd: () => void;
  onBlock: () => void;
  onAllowTasks: () => void;
  onDenyTasks: () => void;
  isHe: boolean;
}) {
  const mobileDisplay = formatStandardMobile(contactId);
  const internalId = formatOllinIdForDisplay(contactId);
  return (
    <div className="p-4 space-y-4">
      {/* Banner only */}
      <div
        className="rounded-[20px] overflow-hidden flex"
        style={{ boxShadow: SHADOW_PREMIUM }}
      >
        <button
          type="button"
          onClick={onBlock}
          className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          <Ban className="w-5 h-5" strokeWidth={2} />
          {isHe ? "חסום" : "Block"}
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="flex-1 flex items-center justify-center gap-2 py-4 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: TEAL }}
        >
          <UserPlus className="w-5 h-5" strokeWidth={2} />
          {isHe ? "הוסף לאנשי קשר" : "Add to Contacts"}
        </button>
      </div>
      {/* Task Permission — mandatory block with Checkmark */}
      <div
        className={`rounded-[20px] overflow-hidden ${GLASS} border border-[#008080]/10`}
        style={{ boxShadow: SHADOW_PREMIUM }}
      >
        <div className="px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080]">
              <Check className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {isHe ? "הרשאה למשימות" : "Task Permission"}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {isHe ? "לאפשר למשתמש זה לשלוח משימות?" : "Allow this user to send tasks?"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={onDenyTasks}
              className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {isHe ? "לא" : "No"}
            </button>
            <button
              type="button"
              onClick={onAllowTasks}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL, boxShadow: "0 4px 14px rgba(0,128,128,0.35)" }}
            >
              {isHe ? "כן" : "Yes"}
            </button>
          </div>
        </div>
      </div>
      {/* Identity: standard mobile + 7-digit ID */}
      <div className="text-center py-2">
        <p className="font-mono text-base font-semibold text-gray-800">{mobileDisplay}</p>
        <p className="text-xs font-mono text-gray-500 mt-0.5">ID: {internalId}</p>
      </div>
    </div>
  );
}

/** Glassmorphism card with 20px radius and premium shadow */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[20px] overflow-hidden ${GLASS} border border-[#008080]/10 ${className}`}
      style={{ boxShadow: SHADOW_PREMIUM }}
    >
      {children}
    </div>
  );
}

/** Single "Media, Links and Docs" row — opens sub-view */
function MediaLinksDocsRow({ onOpen, isHe }: { onOpen: () => void; isHe: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/60 transition-colors rounded-[20px]"
    >
      <div className="w-11 h-11 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080] shrink-0">
        <Image className="w-5 h-5" strokeWidth={2} />
      </div>
      <span className="flex-1 text-sm font-semibold text-gray-900">
        {isHe ? "מדיה, קישורים ומסמכים" : "Media, Links and Docs"}
      </span>
      <ChevronRight className="w-5 h-5 text-[#008080]/60" strokeWidth={2} />
    </button>
  );
}

/** Sub-view modal for Media, Links and Docs (placeholder for tags/categories later) */
function MediaLinksDocsView({ onClose, isHe }: { onClose: () => void; isHe: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-white"
    >
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3 border-b border-gray-100">
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
          <h2 className="text-base font-semibold text-gray-900">
            {isHe ? "מדיה, קישורים ומסמכים" : "Media, Links and Docs"}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-500 text-center py-8">
            {isHe ? "תגיות וקטגוריות — בקרוב." : "Tags and categories — coming soon."}
          </p>
        </div>
    </motion.div>
  );
}

export function ContactInfoPage({ contactId }: ContactInfoPageProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const { contacts, addContactWithId, updateContact } = useContacts();
  const contact = contacts.find((c) => c.id === contactId);
  const isHe = locale === "he";
  const isUnknown = !contact && contactId;
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [mediaViewOpen, setMediaViewOpen] = useState(false);

  const handleAddUnknown = () => {
    addContactWithId(contactId, { name: contactId, phone: /^[\d+-\s()]+$/.test(contactId) ? contactId : undefined });
    router.replace(`/dashboard/messages/contact/${contactId}`);
  };
  const handleBlockUnknown = () => {
    addContactWithId(contactId, { name: contactId });
    updateContact(contactId, { blocked: true });
    router.push("/dashboard/messages");
  };
  const handleAllowTasksUnknown = () => {
    addContactWithId(contactId, { name: contactId, phone: /^[\d+-\s()]+$/.test(contactId) ? contactId : undefined });
    setTimeout(() => updateContact(contactId, { allowTasksFrom: true }), 0);
    router.replace(`/dashboard/messages/contact/${contactId}`);
  };
  const handleDenyTasksUnknown = () => {
    addContactWithId(contactId, { name: contactId });
    setTimeout(() => updateContact(contactId, { allowTasksFrom: false }), 0);
  };

  if (!contact && !isUnknown) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <p className="text-gray-500 text-sm">{isHe ? "איש קשר לא נמצא" : "Contact not found"}</p>
        <Link href="/dashboard" className="mt-4 text-[#008080] text-sm font-medium hover:underline">
          {isHe ? "חזרה" : "Back"}
        </Link>
      </div>
    );
  }

  const name = contact?.name || contact?.email || contactId;
  const initial = (name || "?").slice(0, 1).toUpperCase();
  const mobileDisplay = contact?.phone ? formatStandardMobile(contact.phone) : (contactId ? formatStandardMobile(contactId) : "—");
  const internalId = formatOllinIdForDisplay(contact?.userId ?? contactId);
  const allowTasksFrom = contact?.allowTasksFrom ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/80">
      <header className="flex-shrink-0 flex items-center gap-2 px-3 py-3 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <button type="button" onClick={() => router.back()} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center gap-1.5" aria-label={isHe ? "חזרה" : "Back"}>
          <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          <span className="text-sm font-medium">{isHe ? "חזרה" : "Back"}</span>
        </button>
        <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">
          {isUnknown ? (isHe ? "מספר לא מוכר" : "Unknown") : name}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isUnknown && (
          <UnknownSafetyBlock
            contactId={contactId}
            onAdd={handleAddUnknown}
            onBlock={handleBlockUnknown}
            onAllowTasks={handleAllowTasksUnknown}
            onDenyTasks={handleDenyTasksUnknown}
            isHe={isHe}
          />
        )}

        {contact && (
          <div className="p-4 space-y-4">
            {/* Hero: Avatar + Identity (standard mobile + 7-digit ID) */}
            <GlassCard>
              <div className="p-6 flex flex-col items-center">
                <div
                  className="w-24 h-24 rounded-[24px] flex items-center justify-center text-3xl font-semibold overflow-hidden border-2 border-[#008080]/25 flex-shrink-0 bg-white/90"
                  style={{ boxShadow: "0 4px 20px rgba(0,128,128,0.15)" }}
                >
                  {contact.avatar ? <img src={contact.avatar} alt="" className="w-full h-full object-cover" /> : initial}
                </div>
                <p className="mt-4 font-semibold text-lg text-gray-900">{name}</p>
                <p className="font-mono text-base text-[#008080] font-medium mt-0.5">{mobileDisplay}</p>
                <p className="text-xs font-mono text-gray-500 mt-0.5">ID: {internalId}</p>
              </div>
            </GlassCard>

            {/* Action row: Audio | Video + Screen Share | Pay | Share | Message — glass, turquoise, 20px */}
            <GlassCard>
              <div className="flex items-center justify-between px-3 py-4 gap-1">
                <a href={contact.phone ? `tel:${contact.phone}` : "#"} className="flex flex-col items-center gap-1.5 flex-1 text-[#008080]" aria-label={isHe ? "שיחת אודיו" : "Audio call"}>
                  <div className="w-12 h-12 rounded-[20px] bg-[#008080]/15 flex items-center justify-center">
                    <Phone className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide">{isHe ? "אודיו" : "Audio"}</span>
                </a>
                <div className="w-px h-10 bg-[#008080]/15" />
                <button type="button" className="flex flex-col items-center gap-1.5 flex-1 text-[#008080]" aria-label={isHe ? "וידאו + שיתוף מסך" : "Video + Screen Share"}>
                  <div className="w-12 h-12 rounded-[20px] bg-[#008080]/15 flex items-center justify-center relative">
                    <Video className="w-6 h-6" strokeWidth={2} />
                    <Monitor className="w-3 h-3 absolute bottom-0.5 right-0.5 text-[#008080]" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide">{isHe ? "וידאו" : "Video"}</span>
                </button>
                <div className="w-px h-10 bg-[#008080]/15" />
                <button type="button" className="flex flex-col items-center gap-1.5 flex-1 text-[#008080]" aria-label={isHe ? "תשלום" : "Pay"}>
                  <div className="w-12 h-12 rounded-[20px] bg-[#008080]/15 flex items-center justify-center">
                    <DollarSign className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide">{isHe ? "תשלום" : "Pay"}</span>
                </button>
                <div className="w-px h-10 bg-[#008080]/15" />
                <button type="button" className="flex flex-col items-center gap-1.5 flex-1 text-[#008080]" aria-label={isHe ? "שתף" : "Share"}>
                  <div className="w-12 h-12 rounded-[20px] bg-[#008080]/15 flex items-center justify-center">
                    <Share2 className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide">{isHe ? "שתף" : "Share"}</span>
                </button>
                <div className="w-px h-10 bg-[#008080]/15" />
                <Link href={`/dashboard/messages?contact=${contactId}`} className="flex flex-col items-center gap-1.5 flex-1 text-[#008080]" aria-label={isHe ? "הודעה" : "Message"}>
                  <div className="w-12 h-12 rounded-[20px] bg-[#008080]/15 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide">{isHe ? "הודעה" : "Message"}</span>
                </Link>
              </div>
            </GlassCard>

            {/* 1. Task Permission Toggle (Checkmark — "Accept tasks from this user") */}
            <GlassCard>
              <label className="w-full flex items-center justify-between gap-3 px-4 py-4 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080]">
                    <Check className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{isHe ? "קבל משימות ממשתמש זה" : "Accept tasks from this user"}</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowTasksFrom}
                  onChange={(e) => updateContact(contactId, { allowTasksFrom: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-[#008080] focus:ring-[#008080]"
                />
              </label>
            </GlassCard>

            {/* 2. View Full Profile — large button */}
            <Link href={contact.userId ? `/p/${encodeURIComponent(contact.userId)}` : "/profile"}>
              <GlassCard>
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="w-12 h-12 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080]">
                    <User className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <span className="flex-1 text-base font-semibold text-gray-900">{isHe ? "צפה בפרופיל המלא" : "View Full Profile"}</span>
                  <ChevronRight className="w-5 h-5 text-[#008080]/60" strokeWidth={2} />
                </div>
              </GlassCard>
            </Link>

            {/* 3. View Shared Board/Tasks — large button */}
            <Link href="/dashboard?open=board">
              <GlassCard>
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="w-12 h-12 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080]">
                    <ClipboardList className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <span className="flex-1 text-base font-semibold text-gray-900">{isHe ? "לוח משותף / משימות" : "View Shared Board / Tasks"}</span>
                  <ChevronRight className="w-5 h-5 text-[#008080]/60" strokeWidth={2} />
                </div>
              </GlassCard>
            </Link>

            {/* 4. Notifications / Mute — toggle */}
            <GlassCard>
              <label className="w-full flex items-center justify-between gap-3 px-4 py-4 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                    {muteNotifications ? <BellOff className="w-5 h-5" strokeWidth={2} /> : <Bell className="w-5 h-5" strokeWidth={2} />}
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{isHe ? "התראות / השתקה" : "Notifications / Mute"}</span>
                </div>
                <input type="checkbox" checked={muteNotifications} onChange={(e) => setMuteNotifications(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[#008080] focus:ring-[#008080]" />
              </label>
            </GlassCard>

            {/* 5. Other Settings (Encryption, etc.) */}
            <GlassCard>
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="w-10 h-10 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080]">
                  <Lock className="w-5 h-5" strokeWidth={2} />
                </div>
                <p className="flex-1 text-sm text-gray-600">{isHe ? "הודעות ושיחות מוצפנות מקצה לקצה." : "Messages and calls are end-to-end encrypted."}</p>
              </div>
            </GlassCard>

            {/* 6. Media, Links and Docs — ONE row, opens sub-view */}
            <GlassCard>
              <MediaLinksDocsRow onOpen={() => setMediaViewOpen(true)} isHe={isHe} />
            </GlassCard>

            {/* Block & Report */}
            <div className="rounded-[20px] overflow-hidden" style={{ boxShadow: SHADOW_PREMIUM }}>
              <button
                type="button"
                onClick={() => { updateContact(contactId, { blocked: true }); router.push("/dashboard/messages"); }}
                className="w-full flex items-center justify-center gap-2 py-4 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                <Ban className="w-5 h-5" strokeWidth={2} />
                {isHe ? "חסום" : "Block"}
              </button>
              <button type="button" className="w-full flex items-center justify-center gap-2 py-3 border-t border-red-700/30 bg-red-700/10 text-red-700 text-sm font-medium hover:bg-red-700/20">
                {isHe ? "דווח" : "Report"}
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {mediaViewOpen && (
          <MediaLinksDocsView key="media-docs" onClose={() => setMediaViewOpen(false)} isHe={isHe} />
        )}
      </AnimatePresence>
    </div>
  );
}
