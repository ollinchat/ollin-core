"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Search,
  Clock,
  Flag,
} from "lucide-react";
import { formatOllinIdForDisplay, formatStandardMobile } from "@/lib/user-id";

const TEAL = "#008080";
const RADIUS = 20;
const GLASS = "backdrop-blur-xl bg-white/80";
const SHADOW_PREMIUM = "0 8px 32px rgba(0,128,128,0.08), 0 2px 8px rgba(0,0,0,0.04)";
const GLOW = "0 0 24px rgba(0,128,128,0.12)";

type ContactInfoPageProps = { contactId: string };

type MuteOption = "off" | "8h" | "1w" | "always";
type DisappearingOption = "off" | "24h" | "7d" | "90d";

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
    <div className="p-4 space-y-4 font-sans">
      <div className="rounded-[20px] overflow-hidden flex" style={{ boxShadow: SHADOW_PREMIUM }}>
        <button type="button" onClick={onBlock} className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
          <Ban className="w-5 h-5" strokeWidth={2} />
          {isHe ? "חסום" : "Block"}
        </button>
        <button type="button" onClick={onAdd} className="flex-1 flex items-center justify-center gap-2 py-4 text-white text-sm font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: TEAL }}>
          <UserPlus className="w-5 h-5" strokeWidth={2} />
          {isHe ? "הוסף לאנשי קשר" : "Add to Contacts"}
        </button>
      </div>
      <div className={`rounded-[20px] overflow-hidden ${GLASS} border border-[#008080]/10`} style={{ boxShadow: SHADOW_PREMIUM }}>
        <div className="px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080]">
              <Check className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold text-gray-900">{isHe ? "הרשאה למשימות" : "Task Permission"}</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">{isHe ? "לאפשר למשתמש זה לשלוח משימות?" : "Allow this user to send tasks?"}</p>
          <div className="flex gap-3 justify-center">
            <button type="button" onClick={onDenyTasks} className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
              {isHe ? "לא" : "No"}
            </button>
            <button type="button" onClick={onAllowTasks} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: TEAL, boxShadow: "0 4px 14px rgba(0,128,128,0.35)" }}>
              {isHe ? "כן" : "Yes"}
            </button>
          </div>
        </div>
      </div>
      <div className="text-center py-2">
        <p className="font-mono text-base font-bold text-gray-800">{mobileDisplay}</p>
        <p className="text-xs font-mono text-gray-500 mt-0.5">ID: {internalId}</p>
      </div>
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] overflow-hidden ${GLASS} border border-[#008080]/10 ${className}`} style={{ boxShadow: SHADOW_PREMIUM }}>
      {children}
    </div>
  );
}

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

function MediaLinksDocsView({ onClose, isHe }: { onClose: () => void; isHe: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-white font-sans">
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3 border-b border-gray-100">
        <button type="button" onClick={onClose} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100">
          <X className="w-5 h-5" strokeWidth={2} />
        </button>
        <h2 className="text-base font-semibold text-gray-900">{isHe ? "מדיה, קישורים ומסמכים" : "Media, Links and Docs"}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-gray-500 text-center py-8">{isHe ? "תגיות וקטגוריות — בקרוב." : "Tags and categories — coming soon."}</p>
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
  const [muteOption, setMuteOption] = useState<MuteOption>("off");
  const [disappearingOption, setDisappearingOption] = useState<DisappearingOption>("off");
  const [mutePopoverOpen, setMutePopoverOpen] = useState(false);
  const [disappearingPopoverOpen, setDisappearingPopoverOpen] = useState(false);
  const [mediaViewOpen, setMediaViewOpen] = useState(false);
  const mutePopoverRef = useRef<HTMLDivElement>(null);
  const disappearingPopoverRef = useRef<HTMLDivElement>(null);

  useOutsideClick(mutePopoverRef, () => setMutePopoverOpen(false));
  useOutsideClick(disappearingPopoverRef, () => setDisappearingPopoverOpen(false));

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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 font-sans">
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
  const statusText = (contact as { status?: string })?.status || "Available 🟢 | Focused on Project X";
  const sharedAssetsCount = 142;

  const muteLabel = muteOption === "off" ? (isHe ? "כבוי" : "Off") : muteOption === "8h" ? "8 Hours" : muteOption === "1w" ? "1 Week" : "Always";
  const disappearingLabel =
    disappearingOption === "off" ? (isHe ? "כבוי" : "Off") : disappearingOption === "24h" ? "24 Hours" : disappearingOption === "7d" ? "7 Days" : "90 Days";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/80 font-sans">
      <header className="flex-shrink-0 flex items-center gap-2 px-3 py-3 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <button type="button" onClick={() => router.back()} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center gap-1.5" aria-label={isHe ? "חזרה" : "Back"}>
          <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          <span className="text-sm font-medium">{isHe ? "חזרה" : "Back"}</span>
        </button>
        <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">{isUnknown ? (isHe ? "מספר לא מוכר" : "Unknown") : name}</h1>
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
          <div className="p-5 space-y-0">
            {/* 1. IDENTITY — Premium Glass: Mobile (Bold Large), ID (muted), Status/Bio */}
            <GlassCard>
              <div className="p-6 flex flex-col items-center border-b border-gray-200/80">
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center text-3xl font-semibold overflow-hidden border-[3px] border-[#008080] flex-shrink-0 bg-white/90"
                  style={{ boxShadow: "0 4px 24px rgba(0,128,128,0.2)" }}
                >
                  {contact.avatar ? <img src={contact.avatar} alt="" className="w-full h-full object-cover" /> : initial}
                </div>
                <p className="mt-5 font-mono text-xl font-bold text-gray-900 tracking-tight">{mobileDisplay}</p>
                <p className="text-xs font-mono text-gray-500 mt-1">ID: {internalId}</p>
                <p className="text-sm text-gray-600 mt-2 text-center max-w-[280px]">{statusText}</p>
              </div>
            </GlassCard>

            <div className="h-px bg-gray-200/80" />

            {/* 2. ACTION ROW — The "Ollin 6": Turquoise, glassmorphism/glow, clean labels */}
            <GlassCard>
              <div className="flex flex-row items-center justify-between gap-1 px-4 py-5 border-b border-gray-200/80">
                <a href={contact.phone ? `tel:${contact.phone}` : "#"} className="flex flex-col items-center gap-2 flex-1 min-w-0 text-[#008080]" aria-label="Audio">
                  <div className="w-12 h-12 rounded-2xl bg-[#008080]/10 backdrop-blur-sm flex items-center justify-center shrink-0 border border-[#008080]/20" style={{ boxShadow: GLOW }}>
                    <Phone className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-700">Audio</span>
                </a>
                <button type="button" className="flex flex-col items-center gap-2 flex-1 min-w-0 text-[#008080]" aria-label="Video + Screen Share">
                  <div className="w-12 h-12 rounded-2xl bg-[#008080]/10 backdrop-blur-sm flex items-center justify-center relative shrink-0 border border-[#008080]/20" style={{ boxShadow: GLOW }}>
                    <Video className="w-5 h-5" strokeWidth={2} />
                    <Monitor className="w-3 h-3 absolute -bottom-0.5 -right-0.5 text-[#008080]" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-700">Video</span>
                </button>
                <button type="button" className="flex flex-col items-center gap-2 flex-1 min-w-0 text-[#008080]" aria-label="Pay">
                  <div className="w-12 h-12 rounded-2xl bg-[#008080]/10 backdrop-blur-sm flex items-center justify-center shrink-0 border border-[#008080]/20" style={{ boxShadow: GLOW }}>
                    <DollarSign className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-700">Pay</span>
                </button>
                <button type="button" className="flex flex-col items-center gap-2 flex-1 min-w-0 text-[#008080]" aria-label="Share">
                  <div className="w-12 h-12 rounded-2xl bg-[#008080]/10 backdrop-blur-sm flex items-center justify-center shrink-0 border border-[#008080]/20" style={{ boxShadow: GLOW }}>
                    <Share2 className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-700">Share</span>
                </button>
                <Link href={`/dashboard/messages?contact=${contactId}`} className="flex flex-col items-center gap-2 flex-1 min-w-0 text-[#008080]" aria-label="Message">
                  <div className="w-12 h-12 rounded-2xl bg-[#008080]/10 backdrop-blur-sm flex items-center justify-center shrink-0 border border-[#008080]/20" style={{ boxShadow: GLOW }}>
                    <MessageCircle className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-700">Message</span>
                </Link>
                <button type="button" className="flex flex-col items-center gap-2 flex-1 min-w-0 text-[#008080]" aria-label="Search">
                  <div className="w-12 h-12 rounded-2xl bg-[#008080]/10 backdrop-blur-sm flex items-center justify-center shrink-0 border border-[#008080]/20" style={{ boxShadow: GLOW }}>
                    <Search className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-700">Search</span>
                </button>
              </div>
            </GlassCard>

            <div className="h-px bg-gray-200/80" />

            {/* 3. FUNCTIONAL LIST — Task Permission (TOP), Mute (sub-menu), Disappearing (sub-menu), Encryption */}
            <GlassCard>
              <div className="divide-y divide-gray-200/80">
                {/* A. Task Permission — TOP PRIORITY, Checkmark, "Receive tasks from this user" [Toggle] */}
                <label className="w-full flex items-center justify-between gap-3 px-4 py-4 cursor-pointer border-b border-gray-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080] shrink-0">
                      <Check className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{isHe ? "קבל משימות ממשתמש זה" : "Receive tasks from this user"}</span>
                  </div>
                  <input type="checkbox" checked={allowTasksFrom} onChange={(e) => updateContact(contactId, { allowTasksFrom: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 rounded-full bg-gray-200 transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 peer-checked:bg-[#008080]/30" />
                </label>

                {/* B. Mute Notifications — opens sub-menu: 8 Hours | 1 Week | Always */}
                <div className="relative border-b border-gray-200/80" ref={mutePopoverRef}>
                  <button
                    type="button"
                    onClick={() => setMutePopoverOpen((o) => !o)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-4 hover:bg-white/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${muteOption !== "off" ? "bg-[#008080]/15 text-[#008080]" : "bg-gray-100 text-gray-500"}`}>
                        {muteOption !== "off" ? <BellOff className="w-5 h-5" strokeWidth={2} /> : <Bell className="w-5 h-5" strokeWidth={2} />}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{isHe ? "השתקת התראות" : "Mute Notifications"}</span>
                    </div>
                    <span className="text-sm text-gray-500">{muteLabel}</span>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${mutePopoverOpen ? "rotate-90" : ""}`} strokeWidth={2} />
                  </button>
                  <AnimatePresence>
                    {mutePopoverOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute left-4 right-4 top-full z-20 mt-1 rounded-xl bg-white border border-gray-200 shadow-lg py-2 overflow-hidden"
                      >
                        {(["8h", "1w", "always"] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setMuteOption(opt);
                              setMutePopoverOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-[#008080]/10 transition-colors"
                          >
                            {opt === "8h" ? "8 Hours" : opt === "1w" ? "1 Week" : "Always"}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setMuteOption("off");
                            setMutePopoverOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-gray-600 hover:bg-gray-50 border-t border-gray-100"
                        >
                          {isHe ? "כבוי" : "Off"}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* C. Disappearing Messages — status e.g. "24 Hours", options: 24 Hours | 7 Days | 90 Days | Off */}
                <div className="relative border-b border-gray-200/80" ref={disappearingPopoverRef}>
                  <button
                    type="button"
                    onClick={() => setDisappearingPopoverOpen((o) => !o)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-4 hover:bg-white/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080] shrink-0">
                        <Clock className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{isHe ? "הודעות נעלמות" : "Disappearing Messages"}</span>
                    </div>
                    <span className="text-sm text-gray-500">{disappearingLabel}</span>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${disappearingPopoverOpen ? "rotate-90" : ""}`} strokeWidth={2} />
                  </button>
                  <AnimatePresence>
                    {disappearingPopoverOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute left-4 right-4 top-full z-20 mt-1 rounded-xl bg-white border border-gray-200 shadow-lg py-2 overflow-hidden"
                      >
                        {(["24h", "7d", "90d"] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setDisappearingOption(opt);
                              setDisappearingPopoverOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-[#008080]/10 transition-colors"
                          >
                            {opt === "24h" ? "24 Hours" : opt === "7d" ? "7 Days" : "90 Days"}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setDisappearingOption("off");
                            setDisappearingPopoverOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-gray-600 hover:bg-gray-50 border-t border-gray-100"
                        >
                          {isHe ? "כבוי" : "Off"}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* D. Encryption — Lock, professional row */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200/80">
                  <div className="w-10 h-10 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080] shrink-0">
                    <Lock className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <p className="flex-1 text-sm text-gray-600">Messages/calls are end-to-end encrypted.</p>
                </div>

                {/* Shared Assets — Media, Links and Docs + count */}
                <button
                  type="button"
                  onClick={() => setMediaViewOpen(true)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-4 hover:bg-white/50 transition-colors text-left border-b border-gray-200/80"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080] shrink-0">
                      <Image className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{isHe ? "מדיה, קישורים ומסמכים" : "Media, Links and Docs"}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-500 tabular-nums">{sharedAssetsCount}</span>
                  <ChevronRight className="w-5 h-5 text-[#008080]/60" strokeWidth={2} />
                </button>

                {/* Shared Workspace — View Full Profile, Shared Board */}
                <Link href={contact.userId ? `/p/${encodeURIComponent(contact.userId)}` : "/profile"} className="flex items-center gap-3 px-4 py-4 hover:bg-white/50 transition-colors border-b border-gray-200/80">
                  <div className="w-12 h-12 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080] shrink-0">
                    <User className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <span className="flex-1 text-base font-semibold text-gray-900">View Full Profile</span>
                  <ChevronRight className="w-5 h-5 text-[#008080]/60" strokeWidth={2} />
                </Link>
                <Link href="/dashboard?open=board" className="flex items-center gap-3 px-4 py-4 hover:bg-white/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-[#008080]/15 flex items-center justify-center text-[#008080] shrink-0">
                    <ClipboardList className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <span className="flex-1 text-base font-semibold text-gray-900">{isHe ? "לוח משותף" : "Shared Board"}</span>
                  <ChevronRight className="w-5 h-5 text-[#008080]/60" strokeWidth={2} />
                </Link>
              </div>
            </GlassCard>

            <div className="h-px bg-gray-200/80" />

            {/* 5. DANGER ZONE — Block [Name], Report [Name], red, separated */}
            <GlassCard>
              <div className="divide-y divide-gray-200/80">
                <button
                  type="button"
                  onClick={() => {
                    updateContact(contactId, { blocked: true });
                    router.push("/dashboard/messages");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-4 text-red-600 text-sm font-semibold hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  <Ban className="w-5 h-5" strokeWidth={2} />
                  {isHe ? "חסום" : "Block"} {name}
                </button>
                <button type="button" className="w-full flex items-center justify-center gap-2 py-4 text-red-600 text-sm font-medium hover:bg-red-50 hover:text-red-700 transition-colors">
                  <Flag className="w-5 h-5" strokeWidth={2} />
                  {isHe ? "דווח" : "Report"} {name}
                </button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      <AnimatePresence>
        {mediaViewOpen && <MediaLinksDocsView key="media-docs" onClose={() => setMediaViewOpen(false)} isHe={isHe} />}
      </AnimatePresence>
    </div>
  );
}
