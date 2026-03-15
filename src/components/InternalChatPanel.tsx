"use client";

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useLocale } from "@/contexts/LocaleContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { useBoard } from "@/contexts/BoardContext";
import { useBilling } from "@/contexts/BillingContext";
import { GmailPanel } from "@/components/dashboard/GmailPanel";
import { WhatsAppPanel } from "@/components/dashboard/WhatsAppPanel";
import { MessageSquare, Send, Trash2, Search, Camera, Plus, MapPin, FileText, ImagePlus, Forward, ListTodo, ScanLine, BarChart3, Mic, ChevronLeft, Phone, Video, ClipboardList, CalendarDays, Users, Brain, Ban, UserPlus, Shield, CheckCheck, Pencil, X } from "lucide-react";
import { PollCreator } from "@/components/board/PollCreator";
import { MeetingEventFormModal } from "@/components/board/MeetingEventFormModal";
import {
  OllinLogoIcon,
  GmailIcon,
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  LinkedInIcon,
  AppleMessagesIcon,
  TikTokIcon,
  XTwitterIcon,
  MessengerIcon,
  SlackIcon,
} from "@/components/dashboard/ChannelBrandIcons";
import type { InternalMessageRecord } from "@/lib/chat-engine";
import { formatOllinIdForDisplay } from "@/lib/user-id";

const TEAL = "#008080";

/** Channel tab id: fixed (ollin_chat, ollin_calls, gmail) + addable/pinned (whatsapp, telegram, etc.). */
export type ChannelId =
  | "ollin_chat"
  | "ollin_calls"
  | "gmail"
  | "whatsapp"
  | "telegram"
  | "instagram"
  | "linkedin"
  | "imessage"
  | "messenger"
  | "slack"
  | "tiktok"
  | "twitter";

/** Fixed tab order: Ollin Chat, Ollin Calls (static, no close, not draggable). */
const FIXED_TABS: { id: ChannelId; label: string; connected: boolean }[] = [
  { id: "ollin_chat", label: "Ollin Chat", connected: true },
  { id: "ollin_calls", label: "Ollin Calls", connected: true },
];

/** Channels that can be added via + and shown as dynamic tabs (with close + drag). */
const ADDABLE_CHANNELS: { id: ChannelId; labelEn: string; labelHe: string; icon: React.ReactNode }[] = [
  { id: "gmail", labelEn: "Gmail", labelHe: "Gmail", icon: <GmailIcon /> },
  { id: "whatsapp", labelEn: "WhatsApp", labelHe: "וואטסאפ", icon: <WhatsAppIcon /> },
  { id: "telegram", labelEn: "Telegram", labelHe: "טלגרם", icon: <TelegramIcon /> },
  { id: "instagram", labelEn: "Instagram", labelHe: "אינסטגרם", icon: <InstagramIcon /> },
  { id: "linkedin", labelEn: "LinkedIn", labelHe: "לינקדאין", icon: <LinkedInIcon /> },
  { id: "imessage", labelEn: "Apple Messages", labelHe: "iMessage", icon: <AppleMessagesIcon /> },
  { id: "messenger", labelEn: "Messenger", labelHe: "Messenger", icon: <MessengerIcon /> },
  { id: "slack", labelEn: "Slack", labelHe: "Slack", icon: <SlackIcon /> },
  { id: "tiktok", labelEn: "TikTok", labelHe: "TikTok", icon: <TikTokIcon /> },
  { id: "twitter", labelEn: "X / Twitter", labelHe: "X / Twitter", icon: <XTwitterIcon /> },
];

function getChannelTabIcon(id: ChannelId): React.ReactNode {
  switch (id) {
    case "ollin_chat":
      return <OllinLogoIcon />;
    case "ollin_calls":
      return <Phone className="w-5 h-5 shrink-0" strokeWidth={2} />;
    case "gmail":
      return <GmailIcon />;
    case "whatsapp":
      return <WhatsAppIcon />;
    case "telegram":
      return <TelegramIcon />;
    case "instagram":
      return <InstagramIcon />;
    case "linkedin":
      return <LinkedInIcon />;
    case "imessage":
      return <AppleMessagesIcon />;
    case "messenger":
      return <MessengerIcon />;
    case "slack":
      return <SlackIcon />;
    case "tiktok":
      return <TikTokIcon />;
    case "twitter":
      return <XTwitterIcon />;
    default:
      return null;
  }
}

function getChannelLabel(id: ChannelId): string {
  if (id === "ollin_chat") return "Ollin Chat";
  if (id === "ollin_calls") return "Ollin Calls";
  if (id === "gmail") return "Gmail";
  if (id === "whatsapp") return "WhatsApp";
  if (id === "telegram") return "Telegram";
  if (id === "instagram") return "Instagram";
  if (id === "linkedin") return "LinkedIn";
  if (id === "imessage") return "Apple Messages";
  if (id === "messenger") return "Messenger";
  if (id === "slack") return "Slack";
  if (id === "tiktok") return "TikTok";
  if (id === "twitter") return "X / Twitter";
  return id;
}

type InternalChatPanelProps = {
  locale: "en" | "he";
  compact?: boolean;
  onSelectedContactChange?: (id: string | null) => void;
  preselectedContactId?: string | null;
  threadOnly?: boolean;
};

/** Pro Messaging Suite: filters, search, media bar, message context menu (Convert to Task), typing indicator. */
export function InternalChatPanel({ locale, compact, onSelectedContactChange, preselectedContactId, threadOnly }: InternalChatPanelProps) {
  const { contacts, addContactWithId, updateContact } = useContacts();
  const { addReceivedTask, addMeeting, given, received } = useBoard();
  const { getConversation, getConversationsWithMeta, deleteConversation, sendText, sendVoice, sendFile, markConversationAsRead, currentUserId } = useInternalMessages();
  const { createDraft, getShareLink } = useBilling();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(preselectedContactId ?? null);

  React.useEffect(() => {
    if (preselectedContactId !== undefined) setSelectedContactId(preselectedContactId);
  }, [preselectedContactId]);
  const [activeChannel, setActiveChannel] = useState<ChannelId>("ollin_chat");
  const [pinnedChannels, setPinnedChannels] = useState<ChannelId[]>([]);
  const [addChannelMenuOpen, setAddChannelMenuOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const [addMenuPos, setAddMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [input, setInput] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [messageMenu, setMessageMenu] = useState<{ msgId: string; text: string; x: number; y: number; isMe: boolean } | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatSearchVisible, setChatSearchVisible] = useState(false);
  const [tasksPanelOpen, setTasksPanelOpen] = useState(false);
  const [tasksTab, setTasksTab] = useState<"given" | "received">("given");
  const [taskHandshakeModal, setTaskHandshakeModal] = useState<{ contactId: string; contactName: string; text: string } | null>(null);
  const [brainMenuOpen, setBrainMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [eventPopupOpen, setEventPopupOpen] = useState(false);
  const [meetingFormModalOpen, setMeetingFormModalOpen] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [eventMeetingTitle, setEventMeetingTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedPinnedIndex, setDraggedPinnedIndex] = useState<number | null>(null);

  const conversationsWithMeta = getConversationsWithMeta(currentUserId);
  const contactIdsWithChats = conversationsWithMeta.map((c) => c.contactId);
  const metaByContact = new Map(conversationsWithMeta.map((c) => [c.contactId, c]));

  const conversation = selectedContactId ? getConversation(selectedContactId) : [];
  const sortedMessages = [...conversation].sort((a, b) => a.createdAt - b.createdAt);

  useEffect(() => {
    onSelectedContactChange?.(selectedContactId);
  }, [selectedContactId, onSelectedContactChange]);

  useEffect(() => {
    if (selectedContactId) markConversationAsRead(selectedContactId, currentUserId);
  }, [selectedContactId, currentUserId, markConversationAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !selectedContactId) return;
    sendText(selectedContactId, text, currentUserId);
    setInput("");
    setIsTyping(true);
  };

  useEffect(() => {
    if (!isTyping) return;
    const t = setTimeout(() => setIsTyping(false), 1800);
    return () => clearTimeout(t);
  }, [isTyping]);

  const handleLongPressContact = (contactId: string) => {
    setDeleteTargetId(contactId);
  };

  const handleDeleteChat = (contactId: string) => {
    deleteConversation(contactId, currentUserId);
    setDeleteTargetId(null);
    if (selectedContactId === contactId) setSelectedContactId(null);
  };

  const handleConvertToTask = useCallback(
    (text: string) => {
      setMessageMenu(null);
      const contact = selectedContactId ? contacts.find((c) => c.id === selectedContactId) : null;
      if (!contact) return; // Unknown user: cannot send/receive tasks until added to contacts
      const otherPartyName = (contact.name || contact.email || selectedContactId) ?? "—";
      if (contact.allowTasksFrom === false) return; // blocked
      if (contact.allowTasksFrom === undefined) {
        setTaskHandshakeModal({ contactId: contact.id, contactName: otherPartyName, text });
        return;
      }
      addReceivedTask({
        title: text.slice(0, 200),
        otherParty: otherPartyName,
        senderContactId: selectedContactId ?? undefined,
        checklist: [],
        done: false,
      });
    },
    [addReceivedTask, selectedContactId, contacts]
  );

  const handleTaskHandshakeAccept = useCallback(() => {
    if (!taskHandshakeModal) return;
    updateContact(taskHandshakeModal.contactId, { allowTasksFrom: true });
    addReceivedTask({
      title: taskHandshakeModal.text.slice(0, 200),
      otherParty: taskHandshakeModal.contactName,
      senderContactId: taskHandshakeModal.contactId,
      checklist: [],
      done: false,
    });
    setTaskHandshakeModal(null);
  }, [taskHandshakeModal, updateContact, addReceivedTask]);

  const handleTaskHandshakeDecline = useCallback(() => {
    if (!taskHandshakeModal) return;
    updateContact(taskHandshakeModal.contactId, { allowTasksFrom: false });
    setTaskHandshakeModal(null);
  }, [taskHandshakeModal, updateContact]);

  const openFileInput = useCallback((accept: string, capture: "" | "environment" | "user" = "") => {
    setAttachMenuOpen(false);
    const el = fileInputRef.current;
    if (el) {
      el.accept = accept;
      if (capture) el.setAttribute("capture", capture);
      else el.removeAttribute("capture");
      el.click();
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !selectedContactId) return;
      sendFile(selectedContactId, file, currentUserId);
    },
    [selectedContactId, currentUserId, sendFile]
  );

  const handleSendLocation = useCallback(() => {
    if (!selectedContactId) return;
    sendText(selectedContactId, "📍 Current Location", currentUserId);
    setAttachMenuOpen(false);
  }, [selectedContactId, currentUserId, sendText]);

  const handleCreateEventSubmit = useCallback(() => {
    const title = eventMeetingTitle.trim();
    if (!title || !selectedContactId) return;
    sendText(selectedContactId, `📅 Event: ${title}`, currentUserId);
    setEventMeetingTitle("");
    setEventPopupOpen(false);
  }, [eventMeetingTitle, selectedContactId, currentUserId, sendText]);

  const selectedContact = selectedContactId ? contacts.find((c) => c.id === selectedContactId) : null;
  const isUnknownContact = selectedContactId != null && selectedContact == null;
  const receivedFiltered = received.filter((t) => {
    if (!t.senderContactId) return true;
    const c = contacts.find((x) => x.id === t.senderContactId);
    return c?.allowTasksFrom !== false;
  });
  const isHe = locale === "he";

  useLayoutEffect(() => {
    if (!addChannelMenuOpen) return;
    const btn = addButtonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = 280;
    const left = Math.max(8, rect.right + window.scrollX - width);
    const top = rect.bottom + window.scrollY + 8;
    setAddMenuPos({ top, left });
  }, [addChannelMenuOpen]);

  useEffect(() => {
    if (!addChannelMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (addButtonRef.current?.contains(t)) return;
      if (addMenuRef.current?.contains(t)) return;
      setAddChannelMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddChannelMenuOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [addChannelMenuOpen]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f8f9fa] overflow-hidden">
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      {addChannelMenuOpen &&
        addMenuPos &&
        createPortal(
          <div
            ref={addMenuRef}
            className="fixed z-[9999] w-[280px] p-3 rounded-2xl bg-[#f8f9fa] border border-gray-200/90 shadow-xl shadow-gray-200/50"
            style={{ top: addMenuPos.top, left: addMenuPos.left }}
            role="dialog"
            aria-label={isHe ? "הוסף ערוץ" : "Add channel"}
          >
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3 px-0.5">
              {isHe ? "הוסף ערוץ" : "Add channel"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ADDABLE_CHANNELS.map(({ id: addId, labelEn, labelHe, icon: addIcon }) => {
                const isAdded = pinnedChannels.includes(addId);
                return (
                  <button
                    key={addId}
                    type="button"
                    disabled={isAdded}
                    onClick={() => {
                      if (isAdded) return;
                      setPinnedChannels((prev) => (prev.includes(addId) ? prev : [...prev, addId]));
                      setActiveChannel(addId);
                      setAddChannelMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-200 ${
                      isAdded
                        ? "bg-gray-100/80 border-gray-200/60 cursor-not-allowed opacity-70"
                        : "bg-white border-gray-200/80 hover:bg-white hover:border-[#008080]/30 hover:shadow-md hover:scale-[1.03] active:scale-[0.98]"
                    }`}
                    aria-label={isHe ? labelHe : labelEn}
                    aria-disabled={isAdded}
                  >
                    <span className="relative flex items-center justify-center w-10 h-10 shrink-0 [&>svg]:w-10 [&>svg]:h-10 [&>img]:w-10 [&>img]:h-10">
                      {addIcon}
                      {isAdded && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#008080] flex items-center justify-center" aria-hidden>
                          <CheckCheck className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                        </span>
                      )}
                    </span>
                    <span className={`text-[11px] font-medium truncate w-full text-center ${isAdded ? "text-gray-400" : "text-gray-700"}`}>
                      {isHe ? labelHe : labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
            {ADDABLE_CHANNELS.every(({ id }) => pinnedChannels.includes(id)) && (
              <p className="mt-2 pt-2 border-t border-gray-200/80 text-[11px] text-gray-500 text-center">
                {isHe ? "כל הערוצים מתווספים" : "All channels added."}
              </p>
            )}
          </div>,
          document.body,
        )}
      {!threadOnly && (
        <>
          {/* Row 1: Fixed tabs (Ollin Chat, Ollin Calls, Gmail) + pinned channels + Add (+) */}
          <div className="flex-shrink-0 w-full bg-[#f8f9fa] rounded-t-xl">
            <div
              className="flex items-center gap-1 overflow-x-auto overflow-y-hidden py-1.5 px-1.5 min-h-[2.5rem] scrollbar-hide"
              onDragOver={(e) => e.preventDefault()}
            >
              {/* Static tabs: Ollin Chat, Ollin Calls */ }
              {FIXED_TABS.map(({ id, label, connected }) => {
                const icon = getChannelTabIcon(id);
                const isActive = activeChannel === id;
                if (!icon) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveChannel(id)}
                    className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium transition-colors rounded-xl min-w-[4.5rem] ${
                      isActive
                        ? "bg-[#374151] text-white shadow-sm"
                        : "text-gray-600 bg-gray-100/80 hover:bg-gray-200/90 border border-gray-200/50"
                    }`}
                    aria-label={label}
                    aria-selected={isActive}
                  >
                    <span className="flex items-center justify-center w-5 h-5 shrink-0 [&>svg]:w-5 [&>svg]:h-5 [&>img]:w-5 [&>img]:h-5">
                      {icon}
                    </span>
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="truncate max-w-[4rem]">{label}</span>
                      {connected && (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#008080]" title="Connected" aria-hidden />
                      )}
                    </span>
                  </button>
                );
              })}
              {/* Dynamic tabs: pinned channels — draggable with close (X) */ }
              {pinnedChannels.map((id, index) => {
                const label = getChannelLabel(id);
                const icon = getChannelTabIcon(id);
                const isActive = activeChannel === id;
                if (!icon) return null;
                const isWhatsApp = id === "whatsapp";
                const isGmail = id === "gmail";
                const activeColor =
                  isWhatsApp ? "bg-[#e6f8f0] text-[#128c7e]" : isGmail ? "bg-[#fde8e6] text-[#ea4335]" : "bg-[#374151] text-white";
                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => setDraggedPinnedIndex(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedPinnedIndex === null || draggedPinnedIndex === index) return;
                      setPinnedChannels((prev) => {
                        const next = [...prev];
                        const [moved] = next.splice(draggedPinnedIndex, 1);
                        next.splice(index, 0, moved);
                        return next;
                      });
                      setDraggedPinnedIndex(index);
                    }}
                    onDragEnd={() => setDraggedPinnedIndex(null)}
                    className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-xl min-w-[4.5rem] border ${
                      isActive ? activeColor + " shadow-sm border-transparent" : "bg-gray-100/80 text-gray-600 border-gray-200/50"
                    } cursor-grab active:cursor-grabbing`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveChannel(id)}
                      className="flex items-center gap-1.5 min-w-0"
                    >
                      <span className="flex items-center justify-center w-5 h-5 shrink-0 [&>svg]:w-5 [&>svg]:h-5 [&>img]:w-5 [&>img]:h-5">
                        {icon}
                      </span>
                      <span className="truncate max-w-[4rem]">{label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPinnedChannels((prev) => prev.filter((c) => c !== id));
                        if (activeChannel === id) setActiveChannel("ollin_chat");
                      }}
                      className="ml-1 p-0.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/70"
                      aria-label={isHe ? "סגור ערוץ" : "Close channel"}
                    >
                      <X className="w-3 h-3" strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
              {/* Add Channel (+) — opens social/channel grid */}
              <div className="relative flex-shrink-0 ml-0.5">
                <button
                  type="button"
                  ref={addButtonRef}
                  onClick={() => {
                    const btn = addButtonRef.current;
                    if (btn) {
                      const rect = btn.getBoundingClientRect();
                      const width = 280;
                      const left = Math.max(8, rect.right + window.scrollX - width);
                      const top = rect.bottom + window.scrollY + 8;
                      setAddMenuPos({ top, left });
                    }
                    setAddChannelMenuOpen((o) => !o);
                  }}
                  className="flex items-center justify-center w-9 h-8 rounded-xl text-gray-500 bg-gray-100/80 hover:bg-gray-200/90 hover:text-[#008080] border border-gray-200/50 transition-colors"
                  aria-label={isHe ? "הוסף ערוץ" : "Add channel"}
                  aria-expanded={addChannelMenuOpen}
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
          {/* Row 2: Global search — only for Ollin Chat / list view; hide for WhatsApp/Gmail so their UI starts immediately */}
          {!selectedContactId && activeChannel !== "whatsapp" && activeChannel !== "gmail" && (
          <div className="flex-shrink-0 px-2 py-1.5 bg-[#f8f9fa] relative">
            <div className="flex items-center gap-1.5 w-full bg-white border border-gray-200/80 rounded-xl pl-2.5 pr-2 py-1.5 min-h-[32px]">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" strokeWidth={2} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isHe ? "חיפוש שיחות" : "Search chats"}
                className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-400 text-xs outline-none"
              />
            </div>
          </div>
          )}
        </>
      )}

      {!threadOnly && (
        <>
          {/* Full-width: list view or thread view (no sidebar) */}
          {selectedContactId ? (
            /* Thread view: Back + (contact header or unknown [Add to Contacts] | [Block/Report]) + messages + input */
            <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa]">
              {isUnknownContact ? (
                <div className="flex-shrink-0 flex items-center gap-2 px-2 py-1.5 border-b border-gray-200 bg-white">
                  <button type="button" onClick={() => { setSelectedContactId(null); setTasksPanelOpen(false); setChatSearchVisible(false); }} className="p-1.5 rounded-xl text-gray-600 hover:bg-gray-100" aria-label={isHe ? "חזרה" : "Back"}>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <Link href={`/dashboard/messages/contact/${selectedContactId}`} className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 hover:bg-gray-300 transition-colors" aria-label={isHe ? "פרטי איש קשר" : "Contact info"}>
                    ?
                  </Link>
                  <div className="flex-1 min-w-0 flex items-center justify-center gap-2 py-1">
                    <span className="font-mono text-xs text-gray-600 truncate max-w-[120px]">{selectedContactId}</span>
                  </div>
                  {/* Chat header: only Add to Contacts icon for unknown sender */}
                  <button type="button" onClick={() => { addContactWithId(selectedContactId!, { name: selectedContactId!, phone: /^[\d+-\s()]+$/.test(selectedContactId!) ? selectedContactId! : undefined }); }} className="p-2 rounded-xl text-white hover:opacity-90 transition-opacity flex items-center justify-center" style={{ backgroundColor: TEAL }} aria-label={isHe ? "הוסף לאנשי קשר" : "Add to Contacts"}>
                    <UserPlus className="w-5 h-5" strokeWidth={2} />
                  </button>
                </div>
              ) : selectedContact ? (
              <div className="flex-shrink-0 flex items-center gap-2 px-2 py-1.5 border-b border-gray-100/80 bg-white/95">
                <button type="button" onClick={() => { setSelectedContactId(null); setDeleteTargetId(null); setTasksPanelOpen(false); setChatSearchVisible(false); }} className="p-1.5 rounded-xl text-gray-600 hover:bg-gray-100" aria-label={isHe ? "חזרה" : "Back"}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <Link href={`/dashboard/messages/contact/${selectedContact.id}`} className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#008080]/20 flex items-center justify-center text-sm font-semibold text-[#008080]" aria-label={isHe ? "פרטי איש קשר" : "Contact info"}>
                  {(selectedContact.name || selectedContact.email || "?").slice(0, 1).toUpperCase()}
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-[11px]">{selectedContact.name || selectedContact.email}</p>
                  <p className="text-[9px] text-gray-500 font-mono">ID: {formatOllinIdForDisplay(selectedContact.userId ?? selectedContact.id)}</p>
                </div>
                <div className="flex items-center gap-0.5">
                  <button type="button" className="p-2 rounded-xl text-[#008080] hover:bg-[#008080]/10" aria-label={isHe ? "שיחת אודיו" : "Voice call"}><Phone className="w-4 h-4" strokeWidth={2} /></button>
                  <button type="button" className="p-2 rounded-xl text-[#008080] hover:bg-[#008080]/10" aria-label={isHe ? "שיחת וידאו" : "Video call"}><Video className="w-4 h-4" strokeWidth={2} /></button>
                  <button type="button" onClick={() => setChatSearchVisible((v) => !v)} className={`p-2 rounded-xl ${chatSearchVisible ? "bg-[#008080]/10 text-[#008080]" : "text-[#008080] hover:bg-[#008080]/10"}`} aria-label={isHe ? "חיפוש בשיחה" : "Search in chat"}><Search className="w-4 h-4" strokeWidth={2} /></button>
                  <button type="button" onClick={() => setTasksPanelOpen((v) => !v)} className={`p-2 rounded-xl ${tasksPanelOpen ? "bg-[#008080]/10 text-[#008080]" : "text-[#008080] hover:bg-[#008080]/10"}`} aria-label={isHe ? "משימות" : "Tasks"}><ClipboardList className="w-4 h-4" strokeWidth={2} /></button>
                </div>
              </div>
              ) : null}
              {chatSearchVisible && (
                <div className="flex-shrink-0 flex items-center gap-2 px-2 py-1.5 bg-white border-b border-gray-100">
                  <Search className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                  <input type="text" value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} placeholder={isHe ? "חיפוש בהודעות" : "Search in messages"} className="flex-1 min-w-0 py-1.5 text-xs bg-transparent outline-none placeholder-gray-400" />
                </div>
              )}
              {tasksPanelOpen && (
                <div className="flex-shrink-0 border-b border-gray-100 bg-white">
                  <div className="flex gap-0.5 p-1.5">
                    <button type="button" onClick={() => setTasksTab("given")} className={`flex-1 py-2 rounded-xl text-xs font-medium ${tasksTab === "given" ? "bg-[#008080] text-white" : "text-gray-600 hover:bg-gray-100"}`}>{isHe ? "נתתי" : "Given"}</button>
                    <button type="button" onClick={() => setTasksTab("received")} className={`flex-1 py-2 rounded-xl text-xs font-medium ${tasksTab === "received" ? "bg-[#008080] text-white" : "text-gray-600 hover:bg-gray-100"}`}>{isHe ? "קיבלתי" : "Received"}</button>
                  </div>
                  <div className="max-h-32 overflow-y-auto px-2 pb-2">
                    {(tasksTab === "given" ? given : receivedFiltered).filter((t) => !t.archived).slice(0, 20).map((t) => (
                      <div key={t.id} className="py-1.5 px-2 rounded-xl hover:bg-gray-50 text-xs text-gray-800 border-b border-gray-50 last:border-0">{t.title || "—"}</div>
                    ))}
                    {(tasksTab === "given" ? given : receivedFiltered).filter((t) => !t.archived).length === 0 && <p className="py-2 text-xs text-gray-500 text-center">{isHe ? "אין משימות" : "No tasks"}</p>}
                  </div>
                </div>
              )}
                  <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                    {/* Unified onboarding card: single glass card for unknown sender. Vanishes when added to contacts. */}
                    {isUnknownContact && (
                      <div className="flex flex-col items-center py-3 px-2">
                        <div className="w-full max-w-[90%] rounded-2xl overflow-hidden backdrop-blur-xl bg-white/80 border border-[#008080]/10 shadow-[0_8px_32px_rgba(0,128,128,0.08)]">
                          {/* Row 1: Identity — Unknown Sender + [Add to Contacts] + [Safety Tools] link */}
                          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#008080]/10">
                            <span className="text-sm font-semibold text-gray-900">{isHe ? "שולח לא מוכר" : "Unknown Sender"}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => addContactWithId(selectedContactId!, { name: selectedContactId!, phone: /^[\d+-\s()]+$/.test(selectedContactId!) ? selectedContactId! : undefined })}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: TEAL }}
                              >
                                <UserPlus className="w-4 h-4" strokeWidth={2} />
                                {isHe ? "הוסף לאנשי קשר" : "Add to Contacts"}
                              </button>
                              <Link href={`/dashboard/messages/contact/${selectedContactId}`} className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-[#008080]/10 hover:text-[#008080] transition-colors">
                                <Shield className="w-4 h-4" strokeWidth={2} />
                                {isHe ? "כלי בטיחות" : "Safety Tools"}
                              </Link>
                            </div>
                          </div>
                          {/* Row 2: Social proof — Mutual Contacts, Groups in Common */}
                          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[#008080]/10 bg-white/50">
                            <span className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Users className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                              {isHe ? "אנשי קשר משותפים" : "Mutual Contacts"}: <span className="font-semibold text-gray-900 tabular-nums">0</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-gray-600">
                              <MessageSquare className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                              {isHe ? "קבוצות במשותף" : "Groups in Common"}: <span className="font-semibold text-gray-900 tabular-nums">0</span>
                            </span>
                          </div>
                          {/* Row 3: Task logic — Assign tasks to my board? [Allow] [Decline] */}
                          <div className="px-4 py-3 border-b border-[#008080]/10">
                            <p className="text-xs text-gray-600 mb-2">{isHe ? "להקצות משימות ללוח שלי?" : "Assign tasks to my board?"}</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  addContactWithId(selectedContactId!, { name: selectedContactId!, phone: /^[\d+-\s()]+$/.test(selectedContactId!) ? selectedContactId! : undefined });
                                  updateContact(selectedContactId!, { allowTasksFrom: true });
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: TEAL }}
                              >
                                {isHe ? "אפשר" : "Allow"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  addContactWithId(selectedContactId!, { name: selectedContactId! });
                                  updateContact(selectedContactId!, { allowTasksFrom: false });
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-500 bg-gray-200/80 hover:bg-gray-300/80 border border-gray-300/80 transition-colors"
                              >
                                {isHe ? "דחה" : "Decline"}
                              </button>
                            </div>
                          </div>
                          {/* Footer: Red [Block] button */}
                          <button
                            type="button"
                            onClick={() => {
                              addContactWithId(selectedContactId!, { name: selectedContactId! });
                              updateContact(selectedContactId!, { blocked: true });
                              setSelectedContactId(null);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors border-t border-red-100"
                          >
                            <Ban className="w-4 h-4" strokeWidth={2} />
                            {isHe ? "חסום" : "Block"}
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Known contact (isSaved): title = Contact Name; no Add to Contacts, no Safety Tools, no Unknown Sender. Keep Mutual Contacts, Groups, Allow Tasks, Block. */}
                    {selectedContact && !isUnknownContact && sortedMessages.length === 0 && (
                      <div className="flex flex-col items-center py-3 px-2">
                        <div className="w-full max-w-[90%] rounded-2xl overflow-hidden backdrop-blur-xl bg-white/80 border border-[#008080]/10 shadow-[0_8px_32px_rgba(0,128,128,0.08)]">
                          <div className="px-4 py-3 border-b border-[#008080]/10">
                            <h3 className="text-sm font-semibold text-gray-900">{selectedContact.name || selectedContact.email || selectedContactId}</h3>
                          </div>
                          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[#008080]/10 bg-white/50">
                            <span className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Users className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                              {isHe ? "אנשי קשר משותפים" : "Mutual Contacts"}: <span className="font-semibold text-gray-900 tabular-nums">0</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-gray-600">
                              <MessageSquare className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                              {isHe ? "קבוצות במשותף" : "Groups in Common"}: <span className="font-semibold text-gray-900 tabular-nums">0</span>
                            </span>
                          </div>
                          <div className="px-4 py-3 border-b border-[#008080]/10">
                            <p className="text-xs text-gray-600 mb-2">{isHe ? "להקצות משימות ללוח שלי?" : "Assign tasks to my board?"}</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateContact(selectedContactId!, { allowTasksFrom: true })}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: TEAL }}
                              >
                                {isHe ? "אפשר" : "Allow"}
                              </button>
                              <button
                                type="button"
                                onClick={() => updateContact(selectedContactId!, { allowTasksFrom: false })}
                                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-500 bg-gray-200/80 hover:bg-gray-300/80 border border-gray-300/80 transition-colors"
                              >
                                {isHe ? "דחה" : "Decline"}
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { updateContact(selectedContactId!, { blocked: true }); setSelectedContactId(null); }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-red-600 text-[11px] font-medium hover:bg-red-50 transition-colors border-t border-red-100"
                          >
                            <Ban className="w-3.5 h-3.5" strokeWidth={2} />
                            {isHe ? "חסום" : "Block"}
                          </button>
                        </div>
                      </div>
                    )}
                    {(chatSearchQuery.trim() ? sortedMessages.filter((m) => { const text = m.parts.find((p) => p.type === "text")?.content ?? ""; return text.toLowerCase().includes(chatSearchQuery.trim().toLowerCase()); }) : sortedMessages).map((m) => {
                      const isMe = m.senderId === currentUserId;
                      const text = m.parts.find((p) => p.type === "text")?.content ?? "";
                      return (
                        <MessageBubble
                          key={m.id}
                          msg={m}
                          isMe={isMe}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setMessageMenu({ msgId: m.id, text, x: e.clientX, y: e.clientY, isMe });
                          }}
                          onClick={(e) => setMessageMenu({ msgId: m.id, text, x: e.clientX, y: e.clientY, isMe })}
                          onTouchEnd={() => {
                            if (longPressRef.current) clearTimeout(longPressRef.current);
                            longPressRef.current = null;
                          }}
                          onTouchStart={() => {
                            longPressRef.current = setTimeout(() => {
                              if (!isUnknownContact) handleConvertToTask(text);
                            }, 500);
                          }}
                        />
                      );
                    })}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-[#008080] text-[11px] font-medium flex items-center gap-1">
                          <span className="inline-flex gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "0ms" }} />
                            <span className="w-1 h-1 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "200ms" }} />
                            <span className="w-1 h-1 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "400ms" }} />
                          </span>
                          Typing...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  {/* Message input: Teal [+] [Mic] [Brain] + input + [Send]; + menu = Camera, Gallery, Document, Location, Event, Meeting, Poll, Scan */}
                  <div className="flex-shrink-0 p-2 border-t border-gray-100/80 bg-white/95 relative">
                    <div className="flex items-center gap-1 rounded-xl border border-gray-200/80 bg-white pl-1.5 pr-1.5 py-2 min-h-[44px]">
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button type="button" onClick={() => setAttachMenuOpen((o) => !o)} className="p-2 rounded-xl text-[#008080] hover:bg-[#008080]/10 shrink-0" aria-label={isHe ? "פעולות" : "Actions"} aria-expanded={attachMenuOpen}>
                          <Plus className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsRecording((r) => !r)}
                          className={`p-2 rounded-xl shrink-0 ${isRecording ? "bg-[#008080] text-white" : "text-[#008080] hover:bg-[#008080]/10"}`}
                          aria-label={isHe ? "הערת קול" : "Voice note"}
                          aria-pressed={isRecording}
                        >
                          <Mic className="w-5 h-5" strokeWidth={2} />
                        </button>
                        <div className="relative">
                          <button type="button" onClick={() => setBrainMenuOpen((o) => !o)} className="p-2 rounded-xl text-[#008080] hover:bg-[#008080]/10 shrink-0" aria-label={isHe ? "AI" : "AI"}>
                            <Brain className="w-5 h-5" strokeWidth={2} />
                          </button>
                          {brainMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setBrainMenuOpen(false)} aria-hidden />
                              <div className="absolute left-0 bottom-full mb-1 z-50 w-48 py-2 rounded-xl bg-white border border-gray-200 shadow-lg">
                                <p className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase">{isHe ? "מודל AI" : "AI Model"}</p>
                                <button type="button" onClick={() => setBrainMenuOpen(false)} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#008080]/10 rounded-lg">Ollin</button>
                                <button type="button" onClick={() => setBrainMenuOpen(false)} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#008080]/10 rounded-lg">GPT-4</button>
                                <button type="button" onClick={() => setBrainMenuOpen(false)} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#008080]/10 rounded-lg">Claude</button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {isRecording && (
                        <div className="flex items-center gap-2 shrink-0 px-2 py-1 rounded-xl bg-[#008080]/10 text-[#008080]">
                          <span className="inline-flex gap-0.5 items-center">
                            <span className="w-1 h-2 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "0ms" }} />
                            <span className="w-1 h-3 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "150ms" }} />
                            <span className="w-1 h-2.5 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "300ms" }} />
                            <span className="w-1 h-3.5 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "450ms" }} />
                            <span className="w-1 h-2 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "600ms" }} />
                          </span>
                          <span className="text-[11px] font-medium">{isHe ? "מקליט..." : "Recording..."}</span>
                        </div>
                      )}
                      <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder={isHe ? "הודעה..." : "Message..."} className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none" />
                      <button type="button" onClick={handleSend} disabled={!input.trim()} className="p-2.5 bg-[#008080] text-white disabled:opacity-50 rounded-xl shrink-0" aria-label="Send">
                        <Send className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
                    {attachMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setAttachMenuOpen(false)} aria-hidden />
                        <div className="absolute left-2 right-2 bottom-full mb-1 z-50 py-2.5 px-2.5 bg-white border border-gray-200 rounded-xl shadow-lg">
                          <div className="grid grid-cols-2 gap-1.5">
                            <button type="button" onClick={() => openFileInput("image/*", "environment")} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl">
                              <Camera className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />
                              {isHe ? "מצלמה" : "Camera"}
                            </button>
                            <button type="button" onClick={() => openFileInput("image/*")} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl">
                              <ImagePlus className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />
                              {isHe ? "גלריה" : "Gallery"}
                            </button>
                            <button type="button" onClick={() => openFileInput("application/pdf,.doc,.docx,image/*,*/*")} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl">
                              <FileText className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />
                              {isHe ? "מסמך" : "Document"}
                            </button>
                            <button type="button" onClick={handleSendLocation} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl">
                              <MapPin className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />
                              {isHe ? "מיקום" : "Location"}
                            </button>
                            <button type="button" onClick={() => { setEventPopupOpen(true); setAttachMenuOpen(false); }} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl">
                              <CalendarDays className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />
                              {isHe ? "צור אירוע" : "Create Event"}
                            </button>
                            <button type="button" onClick={() => { setMeetingFormModalOpen(true); setAttachMenuOpen(false); }} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl">
                              <Users className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />
                              {isHe ? "צור פגישה" : "Create Meeting"}
                            </button>
                            <button type="button" onClick={() => { setPollModalOpen(true); setAttachMenuOpen(false); }} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl">
                              <BarChart3 className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />
                              {isHe ? "צור סקר" : "Create Poll"}
                            </button>
                            <button type="button" onClick={() => setAttachMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl">
                              <ScanLine className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />
                              {isHe ? "סריקה (AI)" : "Scan (AI)"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                    {eventPopupOpen && (
                      <>
                        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setEventPopupOpen(false)} aria-hidden />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-gray-200 p-4" onClick={(e) => e.stopPropagation()}>
                            <p className="text-sm font-semibold text-gray-900 mb-3">{isHe ? "צור אירוע" : "Create Event"}</p>
                            <input type="text" value={eventMeetingTitle} onChange={(e) => setEventMeetingTitle(e.target.value)} placeholder={isHe ? "שם האירוע" : "Event title"} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3 outline-none focus:ring-2 focus:ring-[#008080]/30" />
                            <div className="flex gap-2">
                              <button type="button" onClick={() => { setEventPopupOpen(false); setEventMeetingTitle(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">{isHe ? "ביטול" : "Cancel"}</button>
                              <button type="button" onClick={handleCreateEventSubmit} className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: TEAL }}>{isHe ? "צור" : "Create"}</button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    {meetingFormModalOpen && (
                      <MeetingEventFormModal
                        type="meeting"
                        contacts={contacts}
                        onClose={() => setMeetingFormModalOpen(false)}
                        onSubmit={(item) => {
                          addMeeting({ ...item, creatorId: currentUserId });
                          setMeetingFormModalOpen(false);
                        }}
                      />
                    )}
                    {pollModalOpen && (
                      <>
                        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setPollModalOpen(false)} aria-hidden />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-[#008080]/20" onClick={(e) => e.stopPropagation()}>
                            <div className="p-4 border-b border-[#008080]/10 flex items-center justify-between">
                              <h2 className="text-lg font-semibold text-gray-900">{isHe ? "צור סקר" : "Create a Poll"}</h2>
                              <button type="button" onClick={() => setPollModalOpen(false)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label={isHe ? "סגור" : "Close"}>×</button>
                            </div>
                            <div className="p-4">
                              <PollCreator
                                locale={locale}
                                contacts={contacts}
                                compact
                                onSendToContacts={(data, contactIds) => {
                                  const text = `Poll: ${data.question}\n${data.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
                                  contactIds.forEach((id) => sendText(id, text, currentUserId));
                                  setPollModalOpen(false);
                                }}
                                onSubmit={() => setPollModalOpen(false)}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {messageMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMessageMenu(null)} aria-hidden />
                      <div
                        className="fixed z-50 min-w-[160px] py-0.5 bg-white border border-gray-200 rounded-xl shadow-lg"
                        style={{ left: Math.min(messageMenu.x, typeof window !== "undefined" ? window.innerWidth - 180 : messageMenu.x), top: messageMenu.y }}
                      >
                        {messageMenu.isMe && (
                          <button type="button" className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl" onClick={() => setMessageMenu(null)}>
                            <Pencil className="w-3.5 h-3.5 text-[#008080]" strokeWidth={2} />
                            {isHe ? "ערוך" : "Edit"}
                          </button>
                        )}
                        <button type="button" onClick={() => { setMessageMenu(null); !isUnknownContact && handleConvertToTask(messageMenu.text); }} className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] rounded-xl ${isUnknownContact ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080]"}`} title={isUnknownContact ? (isHe ? "הוסף לאנשי קשר קודם" : "Add to contacts first") : undefined}>
                          <ListTodo className={`w-3.5 h-3.5 ${isUnknownContact ? "text-gray-400" : "text-[#008080]"}`} strokeWidth={2} />
                          {isUnknownContact ? (isHe ? "המר למשימה (הוסף קודם)" : "Convert to Task (add first)") : (isHe ? "המר למשימה" : "Convert to Task")}
                        </button>
                        {!isUnknownContact && selectedContactId && (
                          <button
                            type="button"
                            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl"
                            onClick={() => {
                              setMessageMenu(null);
                              const contact = contacts.find((c) => c.id === selectedContactId);
                              if (contact) {
                                const doc = createDraft({
                                  id: contact.id,
                                  name: contact.name || contact.email || selectedContactId,
                                  email: contact.email,
                                  phone: contact.phone,
                                });
                                if (doc) {
                                  sendText(selectedContactId, `Invoice: ${getShareLink(doc.id)}`, currentUserId);
                                }
                              }
                            }}
                          >
                            <FileText className="w-3.5 h-3.5" strokeWidth={2} />
                            {isHe ? "שלח חשבונית" : "Send Invoice"}
                          </button>
                        )}
                        <button type="button" className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] text-gray-700 hover:bg-gray-100 rounded-xl" onClick={() => setMessageMenu(null)}>
                          <Forward className="w-3.5 h-3.5" strokeWidth={2} />
                          {isHe ? "העבר" : "Forward"}
                        </button>
                        <button type="button" className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] text-red-600 hover:bg-red-50 rounded-xl" onClick={() => setMessageMenu(null)}>
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                          {isHe ? "מחק" : "Delete"}
                        </button>
                      </div>
                    </>
                  )}
                  {taskHandshakeModal && (
                    <>
                      <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setTaskHandshakeModal(null)} aria-hidden />
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-gray-200 p-4" onClick={(e) => e.stopPropagation()}>
                          <p className="text-sm font-medium text-gray-900 mb-2">{isHe ? "האם לאפשר למשתמש זה לשלוח אליך משימות?" : "Do you agree to receive tasks from this user?"}</p>
                          <p className="text-xs text-gray-500 mb-4">{taskHandshakeModal.contactName}</p>
                          <div className="flex gap-2">
                            <button type="button" onClick={handleTaskHandshakeDecline} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
                              {isHe ? "לא" : "No"}
                            </button>
                            <button type="button" onClick={handleTaskHandshakeAccept} className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium hover:bg-[#006666]" style={{ backgroundColor: TEAL }}>
                              {isHe ? "כן" : "Yes"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
            </div>
          ) : activeChannel === "whatsapp" ? (
            /* WhatsApp tab: full-screen, no padding — panel owns its own mobile frame */
            <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden p-0">
              <WhatsAppPanel />
            </div>
          ) : activeChannel === "ollin_calls" ? (
            /* Ollin Calls tab: Recent Calls (Voice & Video) */
            <div className="flex-1 overflow-y-auto px-2 py-3 bg-[#f8f9fa]">
              <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-2 mb-2">{isHe ? "שיחות אחרונות" : "Recent Calls"}</h2>
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/80 border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-[#008080]/20 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-[#008080]" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{isHe ? "שיחת קול" : "Voice call"}</p>
                    <p className="text-[11px] text-gray-500">{isHe ? "אין שיחות לאחרונה" : "No recent calls"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/80 border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-[#008080]/20 flex items-center justify-center">
                    <Video className="w-5 h-5 text-[#008080]" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{isHe ? "שיחת וידאו" : "Video call"}</p>
                    <p className="text-[11px] text-gray-500">{isHe ? "אין שיחות לאחרונה" : "No recent calls"}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeChannel === "gmail" ? (
            /* Gmail tab: full Gmail clone (dark), no wrapper styling */
            <div className="flex-1 min-h-0 flex flex-col min-w-0">
              <GmailPanel />
            </div>
          ) : (
            /* List view: full-width conversation list (no sidebar) */
            <ul className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 bg-[#f8f9fa]">
              {conversationsWithMeta.length === 0 && (
                <li className="px-2 py-1.5 text-[11px] text-gray-500 rounded-xl">{isHe ? "אין שיחות. הוסף אנשי קשר וכתוב הודעה." : "No chats. Add contacts and send a message."}</li>
              )}
              {conversationsWithMeta
                .filter(({ contactId }) => {
                  const contact = contacts.find((c) => c.id === contactId);
                  if (contact?.blocked) return false;
                  if (!searchQuery.trim()) return true;
                  const name = (contact?.name || contact?.email || contactId).toLowerCase();
                  return name.includes(searchQuery.trim().toLowerCase());
                })
                .map(({ contactId, lastMessage, lastTime }) => {
                  const contact = contacts.find((c) => c.id === contactId);
                  const name = contact?.name || contact?.email || contactId;
                  return (
                    <li key={contactId}>
                      <button
                        type="button"
                        onClick={() => { setSelectedContactId(contactId); setDeleteTargetId(null); }}
                        onContextMenu={(e) => { e.preventDefault(); handleLongPressContact(contactId); }}
                        onTouchStart={() => { longPressRef.current = setTimeout(() => handleLongPressContact(contactId), 500); }}
                        onTouchEnd={() => { if (longPressRef.current) clearTimeout(longPressRef.current); longPressRef.current = null; }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-gray-800 hover:bg-white/80 bg-white/60 border border-gray-100"
                      >
                        <div className="w-9 h-9 flex-shrink-0 rounded-full bg-[#008080]/20 flex items-center justify-center text-sm font-semibold text-[#008080]">
                          {(name || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{name}</p>
                          <p className="text-xs truncate text-gray-500">{lastMessage || "—"}</p>
                        </div>
                        <span className="text-[10px] flex-shrink-0 text-gray-400">{formatTime(lastTime)}</span>
                      </button>
                      {deleteTargetId === contactId && (
                        <div className="flex items-center gap-1.5 px-2 py-1 mt-0.5 bg-red-50 rounded-lg">
                          <span className="text-[10px] text-red-700 flex-1">{isHe ? "מחיקת שיחה" : "Delete chat"}</span>
                          <button type="button" onClick={() => handleDeleteChat(contactId)} className="p-1 text-red-600 hover:bg-red-100 rounded-md" aria-label="Delete"><Trash2 className="w-3 h-3" /></button>
                          <button type="button" onClick={() => setDeleteTargetId(null)} className="text-[10px] text-gray-600 hover:underline">{isHe ? "ביטול" : "Cancel"}</button>
                        </div>
                      )}
                    </li>
                  );
                })}
              {conversationsWithMeta.length > 0 && contacts.some((c) => !contactIdsWithChats.includes(c.id) && !c.blocked) && (
                <li className="pt-2 mt-2 border-t border-gray-200">
                  <p className="text-[10px] text-gray-500 px-2 mb-1">{isHe ? "אנשי קשר ללא שיחה" : "Contacts (no chat yet)"}</p>
                  {contacts.filter((c) => !c.blocked && !contactIdsWithChats.includes(c.id)).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedContactId(c.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/80 rounded-xl"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">{(c.name || c.email || c.id).slice(0, 1).toUpperCase()}</div>
                      <span className="text-sm truncate text-gray-700">{c.name || c.email || c.id}</span>
                    </button>
                  ))}
                </li>
              )}
            </ul>
          )}
        </>
      )}

      {threadOnly && selectedContact && (
        <>
          <div className="flex-shrink-0 flex items-center gap-2 px-2 py-1.5 border-b border-gray-100/80 bg-white/95">
            <Link href={`/dashboard/messages/contact/${selectedContact.id}`} className="flex-shrink-0 w-9 h-9 rounded-full bg-[#008080]/20 flex items-center justify-center text-sm font-semibold text-[#008080]" aria-label={isHe ? "פרטי איש קשר" : "Contact info"}>
              {(selectedContact.name || selectedContact.email || "?").slice(0, 1).toUpperCase()}
            </Link>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate text-[11px]">{selectedContact.name || selectedContact.email}</p>
              <p className="text-[9px] text-gray-500">{isHe ? "שיחה דו-כיוונית" : "Two-way chat"}</p>
            </div>
            <div className="flex items-center gap-0.5">
              <button type="button" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label={isHe ? "שיחת אודיו" : "Voice call"}><Phone className="w-4 h-4" strokeWidth={2} /></button>
              <button type="button" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label={isHe ? "שיחת וידאו" : "Video call"}><Video className="w-4 h-4" strokeWidth={2} /></button>
              <button type="button" onClick={() => setChatSearchVisible((v) => !v)} className={`p-2 rounded-xl ${chatSearchVisible ? "bg-[#008080]/10 text-[#008080]" : "text-gray-500 hover:bg-gray-100"}`} aria-label={isHe ? "חיפוש בשיחה" : "Search in chat"}><Search className="w-4 h-4" strokeWidth={2} /></button>
              <button type="button" onClick={() => setTasksPanelOpen((v) => !v)} className={`p-2 rounded-xl ${tasksPanelOpen ? "bg-[#008080]/10 text-[#008080]" : "text-gray-500 hover:bg-gray-100"}`} aria-label={isHe ? "משימות" : "Tasks"}><ClipboardList className="w-4 h-4" strokeWidth={2} /></button>
            </div>
          </div>
          {chatSearchVisible && (
            <div className="flex-shrink-0 flex items-center gap-2 px-2 py-1.5 bg-white border-b border-gray-100">
              <Search className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
              <input type="text" value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} placeholder={isHe ? "חיפוש בהודעות" : "Search in messages"} className="flex-1 min-w-0 py-1.5 text-xs bg-transparent outline-none placeholder-gray-400" />
            </div>
          )}
          {tasksPanelOpen && (
            <div className="flex-shrink-0 border-b border-gray-100 bg-white">
              <div className="flex gap-0.5 p-1.5">
                <button type="button" onClick={() => setTasksTab("given")} className={`flex-1 py-2 rounded-xl text-xs font-medium ${tasksTab === "given" ? "bg-[#008080] text-white" : "text-gray-600 hover:bg-gray-100"}`}>{isHe ? "נתתי" : "Given"}</button>
                <button type="button" onClick={() => setTasksTab("received")} className={`flex-1 py-2 rounded-xl text-xs font-medium ${tasksTab === "received" ? "bg-[#008080] text-white" : "text-gray-600 hover:bg-gray-100"}`}>{isHe ? "קיבלתי" : "Received"}</button>
              </div>
              <div className="max-h-32 overflow-y-auto px-2 pb-2">
                {(tasksTab === "given" ? given : receivedFiltered).filter((t) => !t.archived).slice(0, 20).map((t) => (
                  <div key={t.id} className="py-1.5 px-2 rounded-xl hover:bg-gray-50 text-xs text-gray-800 border-b border-gray-50 last:border-0">{t.title || "—"}</div>
                ))}
                {(tasksTab === "given" ? given : receivedFiltered).filter((t) => !t.archived).length === 0 && <p className="py-2 text-xs text-gray-500 text-center">{isHe ? "אין משימות" : "No tasks"}</p>}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {(chatSearchQuery.trim() ? sortedMessages.filter((m) => { const text = m.parts.find((p) => p.type === "text")?.content ?? ""; return text.toLowerCase().includes(chatSearchQuery.trim().toLowerCase()); }) : sortedMessages).map((m) => {
              const isMe = m.senderId === currentUserId;
              const text = m.parts.find((p) => p.type === "text")?.content ?? "";
              return (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  isMe={isMe}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMessageMenu({ msgId: m.id, text, x: e.clientX, y: e.clientY, isMe });
                  }}
                  onClick={(e) => setMessageMenu({ msgId: m.id, text, x: e.clientX, y: e.clientY, isMe })}
                  onTouchEnd={() => { if (longPressRef.current) clearTimeout(longPressRef.current); longPressRef.current = null; }}
                  onTouchStart={() => {
                    longPressRef.current = setTimeout(() => { if (!isUnknownContact) handleConvertToTask(text); }, 500);
                  }}
                />
              );
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-[#008080] text-[11px] font-medium flex items-center gap-1">
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "200ms" }} />
                    <span className="w-1 h-1 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "400ms" }} />
                  </span>
                  Typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex-shrink-0 p-2 border-t border-gray-100/80 bg-white/95 relative">
            <div className="flex items-center gap-1 rounded-xl border border-gray-200/80 bg-white pl-1.5 pr-1.5 py-2 min-h-[44px]">
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => setAttachMenuOpen((o) => !o)} className="p-2 rounded-xl text-[#008080] hover:bg-[#008080]/10" aria-expanded={attachMenuOpen}><Plus className="w-5 h-5" strokeWidth={2.5} /></button>
                <button type="button" onClick={() => setIsRecording((r) => !r)} className={`p-2 rounded-xl shrink-0 ${isRecording ? "bg-[#008080] text-white" : "text-[#008080] hover:bg-[#008080]/10"}`} aria-label={isHe ? "הערת קול" : "Voice note"} aria-pressed={isRecording}><Mic className="w-5 h-5" strokeWidth={2} /></button>
                <div className="relative">
                  <button type="button" onClick={() => setBrainMenuOpen((o) => !o)} className="p-2 rounded-xl text-[#008080] hover:bg-[#008080]/10"><Brain className="w-5 h-5" strokeWidth={2} /></button>
                  {brainMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setBrainMenuOpen(false)} aria-hidden />
                      <div className="absolute left-0 bottom-full mb-1 z-50 w-48 py-2 rounded-xl bg-white border border-gray-200 shadow-lg">
                        <p className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase">{isHe ? "מודל AI" : "AI Model"}</p>
                        <button type="button" onClick={() => setBrainMenuOpen(false)} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#008080]/10 rounded-xl">Ollin</button>
                        <button type="button" onClick={() => setBrainMenuOpen(false)} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#008080]/10 rounded-xl">GPT-4</button>
                        <button type="button" onClick={() => setBrainMenuOpen(false)} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#008080]/10 rounded-xl">Claude</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {isRecording && (
                <div className="flex items-center gap-2 shrink-0 px-2 py-1 rounded-xl bg-[#008080]/10 text-[#008080]">
                  <span className="inline-flex gap-0.5 items-center">
                    <span className="w-1 h-2 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-3 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-2.5 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "300ms" }} />
                    <span className="w-1 h-3.5 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "450ms" }} />
                    <span className="w-1 h-2 rounded-full bg-[#008080] animate-pulse" style={{ animationDelay: "600ms" }} />
                  </span>
                  <span className="text-[11px] font-medium">{isHe ? "מקליט..." : "Recording..."}</span>
                </div>
              )}
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder={isHe ? "הודעה..." : "Message..."} className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none" />
              <button type="button" onClick={handleSend} disabled={!input.trim()} className="p-2.5 bg-[#008080] text-white disabled:opacity-50 rounded-xl shrink-0" aria-label="Send"><Send className="w-4 h-4" strokeWidth={2} /></button>
            </div>
            {attachMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAttachMenuOpen(false)} aria-hidden />
                <div className="absolute left-2 right-2 bottom-full mb-1 z-50 py-2.5 px-2.5 bg-white border border-gray-200 rounded-xl shadow-lg">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => openFileInput("image/*", "environment")} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl"><Camera className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />{isHe ? "מצלמה" : "Camera"}</button>
                    <button type="button" onClick={() => openFileInput("image/*")} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl"><ImagePlus className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />{isHe ? "גלריה" : "Gallery"}</button>
                    <button type="button" onClick={() => openFileInput("application/pdf,.doc,.docx,image/*,*/*")} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl"><FileText className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />{isHe ? "מסמך" : "Document"}</button>
                    <button type="button" onClick={handleSendLocation} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl"><MapPin className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />{isHe ? "מיקום" : "Location"}</button>
                    <button type="button" onClick={() => { setEventPopupOpen(true); setAttachMenuOpen(false); }} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl"><CalendarDays className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />{isHe ? "צור אירוע" : "Create Event"}</button>
                    <button type="button" onClick={() => { setMeetingFormModalOpen(true); setAttachMenuOpen(false); }} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl"><Users className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />{isHe ? "צור פגישה" : "Create Meeting"}</button>
                    <button type="button" onClick={() => { setPollModalOpen(true); setAttachMenuOpen(false); }} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl"><BarChart3 className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />{isHe ? "צור סקר" : "Create Poll"}</button>
                    <button type="button" onClick={() => setAttachMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl"><ScanLine className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />{isHe ? "סריקה (AI)" : "Scan (AI)"}</button>
                  </div>
                </div>
              </>
            )}
            {eventPopupOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setEventPopupOpen(false)} aria-hidden />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-gray-200 p-4" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm font-semibold text-gray-900 mb-3">{isHe ? "צור אירוע" : "Create Event"}</p>
                    <input type="text" value={eventMeetingTitle} onChange={(e) => setEventMeetingTitle(e.target.value)} placeholder={isHe ? "שם האירוע" : "Event title"} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3 outline-none focus:ring-2 focus:ring-[#008080]/30" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEventPopupOpen(false); setEventMeetingTitle(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">{isHe ? "ביטול" : "Cancel"}</button>
                      <button type="button" onClick={handleCreateEventSubmit} className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: TEAL }}>{isHe ? "צור" : "Create"}</button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {meetingFormModalOpen && (
              <MeetingEventFormModal
                type="meeting"
                contacts={contacts}
                onClose={() => setMeetingFormModalOpen(false)}
                onSubmit={(item) => {
                  addMeeting({ ...item, creatorId: currentUserId });
                  setMeetingFormModalOpen(false);
                }}
              />
            )}
            {pollModalOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setPollModalOpen(false)} aria-hidden />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-[#008080]/20" onClick={(e) => e.stopPropagation()}>
                    <div className="p-4 border-b border-[#008080]/10 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">{isHe ? "צור סקר" : "Create a Poll"}</h2>
                      <button type="button" onClick={() => setPollModalOpen(false)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label={isHe ? "סגור" : "Close"}>×</button>
                    </div>
                    <div className="p-4">
                      <PollCreator
                        locale={locale}
                        contacts={contacts}
                        compact
                        onSendToContacts={(data, contactIds) => {
                          const text = `Poll: ${data.question}\n${data.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
                          contactIds.forEach((id) => sendText(id, text, currentUserId));
                          setPollModalOpen(false);
                        }}
                        onSubmit={() => setPollModalOpen(false)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {threadOnly && !selectedContact && (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-xs p-3">
          {isHe ? "בחר שיחה מרשימה" : "Select a chat from the list"}
        </div>
      )}

    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({
  msg,
  isMe,
  onContextMenu,
  onClick,
  onTouchStart,
  onTouchEnd,
}: {
  msg: InternalMessageRecord;
  isMe: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}) {
  const text = msg.parts.find((p) => p.type === "text")?.content;
  if (!text) return null;
  const timeStr = formatMessageTime(msg.createdAt);
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        role="button"
        tabIndex={0}
        className={`max-w-[85%] px-2.5 py-1.5 text-xs rounded-xl select-text cursor-pointer active:opacity-90 ${isMe ? "bg-[#008080] text-white" : "bg-white border border-gray-200 text-gray-900"}`}
        onContextMenu={onContextMenu}
        onClick={onClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="pr-1">{text}</div>
        <div className={`flex items-center gap-1 justify-end mt-0.5 ${isMe ? "text-white/80" : "text-gray-400"}`}>
          <span className="text-[10px]">{timeStr}</span>
          {isMe && <CheckCheck className="w-3 h-3 shrink-0" strokeWidth={2} />}
        </div>
      </div>
    </div>
  );
}

export default InternalChatPanel;
