"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useInternalMessages, useChat } from "@/contexts/ChatEngineContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useBoard } from "@/contexts/BoardContext";
import { MessageSquare, Send, Trash2, Search, Camera, Plus, MapPin, FileText, ImagePlus, Forward, ListTodo, CircleCheck, Instagram, Bot, Linkedin, ScanLine, BarChart3, Mic, ChevronLeft, Phone, Video, ClipboardList, CalendarDays, Users, Brain, Ban, UserPlus } from "lucide-react";
import { SOURCE_ICONS, type ChatSourceId } from "@/components/dashboard/SourceBadge";
import type { InternalMessageRecord } from "@/lib/chat-engine";

const TEAL = "#008080";

/** Channel tab id: system + ChatSourceId + extended social/bots */
export type ChannelId = ChatSourceId | "instagram" | "bots" | "linkedin";

/** All channels in display order. Connected (Ollin, WhatsApp, Telegram) show a teal status dot. */
const CHANNELS: { id: ChannelId; label: string; connected: boolean }[] = [
  { id: "ollin", label: "Ollin AI", connected: true },
  { id: "whatsapp", label: "WhatsApp", connected: true },
  { id: "telegram", label: "Telegram", connected: true },
  { id: "signal", label: "Signal", connected: false },
  { id: "viber", label: "Viber", connected: false },
  { id: "discord", label: "Discord", connected: false },
  { id: "slack", label: "Slack", connected: false },
  { id: "instagram", label: "Instagram", connected: false },
  { id: "bots", label: "Bots", connected: false },
  { id: "linkedin", label: "LinkedIn", connected: false },
];

type IconProps = { className?: string; strokeWidth?: number };
function getChannelIcon(id: ChannelId): React.ComponentType<IconProps> | null {
  if (id === "ollin") return CircleCheck as React.ComponentType<IconProps>;
  if (id === "instagram") return Instagram as React.ComponentType<IconProps>;
  if (id === "bots") return Bot as React.ComponentType<IconProps>;
  if (id === "linkedin") return Linkedin as React.ComponentType<IconProps>;
  return SOURCE_ICONS[id] ?? null;
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
  const { profile } = useProfile();
  const { addReceivedTask, given, received } = useBoard();
  const { getConversation, getConversationsWithMeta, deleteConversation, sendText, sendVoice, sendFile, markConversationAsRead } = useInternalMessages();
  const { messages: aiMessages, sendMessage: sendAiMessage } = useChat();
  const currentUserId = profile?.userId ?? "me";
  const [selectedContactId, setSelectedContactId] = useState<string | null>(preselectedContactId ?? null);
  const [aiInput, setAiInput] = useState("");

  React.useEffect(() => {
    if (preselectedContactId !== undefined) setSelectedContactId(preselectedContactId);
  }, [preselectedContactId]);
  const [activeChannel, setActiveChannel] = useState<ChannelId>("ollin");
  const [searchQuery, setSearchQuery] = useState("");
  const [input, setInput] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [messageMenu, setMessageMenu] = useState<{ msgId: string; text: string; x: number; y: number } | null>(null);
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
  const [meetingPopupOpen, setMeetingPopupOpen] = useState(false);
  const [eventMeetingTitle, setEventMeetingTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const otherPartyName = (contact?.name || contact?.email || selectedContactId) ?? "—";
      if (contact) {
        if (contact.allowTasksFrom === false) return; // blocked
        if (contact.allowTasksFrom === undefined) {
          setTaskHandshakeModal({ contactId: contact.id, contactName: otherPartyName, text });
          return;
        }
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

  const handleCreateMeetingSubmit = useCallback(() => {
    const title = eventMeetingTitle.trim();
    if (!title || !selectedContactId) return;
    sendText(selectedContactId, `📅 Meeting: ${title}`, currentUserId);
    setEventMeetingTitle("");
    setMeetingPopupOpen(false);
  }, [eventMeetingTitle, selectedContactId, currentUserId, sendText]);

  const selectedContact = selectedContactId ? contacts.find((c) => c.id === selectedContactId) : null;
  const isUnknownContact = selectedContactId != null && selectedContact == null;
  const receivedFiltered = received.filter((t) => {
    if (!t.senderContactId) return true;
    const c = contacts.find((x) => x.id === t.senderContactId);
    return c?.allowTasksFrom !== false;
  });
  const isHe = locale === "he";

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f8f9fa] overflow-hidden">
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      {!threadOnly && (
        <>
          {/* Row 1: Channel Tabs — full list, connected teal dot, horizontal scroll (scrollbar hidden) */}
          <div className="flex-shrink-0 w-full bg-[#f8f9fa] rounded-t-xl overflow-hidden">
            <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden py-1.5 px-1.5 min-h-[2.5rem] scrollbar-hide">
              {CHANNELS.map(({ id, label, connected }) => {
                const Icon = getChannelIcon(id);
                const isActive = activeChannel === id;
                if (!Icon) return null;
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
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="truncate max-w-[4rem]">{label}</span>
                      {connected && (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#008080]" title="Connected" aria-hidden />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Row 2: Global search — ONLY in list view (not in active chat header) */}
          {!selectedContactId && (
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
                  <div className="flex-1 flex items-center justify-center gap-2 py-2">
                    <button type="button" onClick={() => { addContactWithId(selectedContactId!, { name: selectedContactId! }); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#008080] text-white text-xs font-medium hover:bg-[#006666]">
                      <UserPlus className="w-4 h-4" strokeWidth={2} />
                      {isHe ? "הוסף לאנשי קשר" : "Add to Contacts"}
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        addContactWithId(selectedContactId!, { name: selectedContactId! });
                        updateContact(selectedContactId!, { blocked: true });
                        setSelectedContactId(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50"
                    >
                      <Ban className="w-4 h-4" strokeWidth={2} />
                      {isHe ? "חסום / דווח" : "Block / Report"}
                    </button>
                  </div>
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
                  <p className="text-[9px] text-gray-500">{isHe ? "שיחה דו-כיוונית" : "Two-way chat"}</p>
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
                    {(chatSearchQuery.trim() ? sortedMessages.filter((m) => { const text = m.parts.find((p) => p.type === "text")?.content ?? ""; return text.toLowerCase().includes(chatSearchQuery.trim().toLowerCase()); }) : sortedMessages).map((m) => (
                      <MessageBubble
                        key={m.id}
                        msg={m}
                        isMe={m.senderId === currentUserId}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          const text = m.parts.find((p) => p.type === "text")?.content ?? "";
                          setMessageMenu({ msgId: m.id, text, x: e.clientX, y: e.clientY });
                        }}
                        onTouchEnd={() => {
                          if (longPressRef.current) clearTimeout(longPressRef.current);
                          longPressRef.current = null;
                        }}
                        onTouchStart={() => {
                          const text = m.parts.find((p) => p.type === "text")?.content ?? "";
                          longPressRef.current = setTimeout(
                            () => setMessageMenu({ msgId: m.id, text, x: 120, y: 200 }),
                            500
                          );
                        }}
                      />
                    ))}
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
                            <button type="button" onClick={() => { setMeetingPopupOpen(true); setAttachMenuOpen(false); }} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl">
                              <Users className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />
                              {isHe ? "צור פגישה" : "Create Meeting"}
                            </button>
                            <button type="button" onClick={() => setAttachMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl">
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
                    {meetingPopupOpen && (
                      <>
                        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMeetingPopupOpen(false)} aria-hidden />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-gray-200 p-4" onClick={(e) => e.stopPropagation()}>
                            <p className="text-sm font-semibold text-gray-900 mb-3">{isHe ? "צור פגישה" : "Create Meeting"}</p>
                            <input type="text" value={eventMeetingTitle} onChange={(e) => setEventMeetingTitle(e.target.value)} placeholder={isHe ? "שם הפגישה" : "Meeting title"} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3 outline-none focus:ring-2 focus:ring-[#008080]/30" />
                            <div className="flex gap-2">
                              <button type="button" onClick={() => { setMeetingPopupOpen(false); setEventMeetingTitle(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">{isHe ? "ביטול" : "Cancel"}</button>
                              <button type="button" onClick={handleCreateMeetingSubmit} className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: TEAL }}>{isHe ? "צור" : "Create"}</button>
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
                        <button type="button" onClick={() => handleConvertToTask(messageMenu.text)} className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl">
                          <ListTodo className="w-3.5 h-3.5 text-[#008080]" strokeWidth={2} />
                          {isHe ? "המר למשימה" : "Convert to Task"}
                        </button>
                        <button type="button" className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] text-gray-700 hover:bg-gray-100 rounded-xl" onClick={() => setMessageMenu(null)}>
                          <Forward className="w-3.5 h-3.5" />
                          {isHe ? "העבר" : "Forward"}
                        </button>
                        <button type="button" className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] text-red-600 hover:bg-red-50 rounded-xl" onClick={() => setMessageMenu(null)}>
                          <Trash2 className="w-3.5 h-3.5" />
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
          ) : activeChannel === "ollin" && !selectedContactId ? (
            /* Ollin AI channel: persisted AI chat (localStorage + [TASK] to board) */
            <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa]">
              <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
                {aiMessages.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-6">{isHe ? "שלח הודעה לאולין — משימות יישמרו ללוח." : "Send a message to Ollin — tasks are saved to your board."}</p>
                )}
                {aiMessages.map((m) =>
                  "role" in m ? (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-[#008080] text-white" : "bg-white border border-gray-200 text-gray-800"}`}>
                        {typeof m.content === "string" ? m.content : ""}
                      </div>
                    </div>
                  ) : "type" in m && m.type === "taskAdded" ? (
                    <div key={m.id} className="flex justify-center">
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 text-xs font-medium">
                        <ListTodo className="w-4 h-4 shrink-0" strokeWidth={2} />
                        {isHe ? "נוסף ללוח" : "Added to Board"}: <span className="font-semibold truncate max-w-[140px]">{m.taskTitle}</span>
                      </div>
                    </div>
                  ) : null
                )}
              </div>
              <div className="flex-shrink-0 p-2 border-t border-gray-100 bg-white/95">
                <div className="flex gap-1.5 rounded-xl border border-gray-200 bg-white pl-2 pr-1.5 py-2">
                  <input type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const t = aiInput.trim(); if (t) { setAiInput(""); sendAiMessage(t); } } }} placeholder={isHe ? "הודעה לאולין..." : "Message Ollin..."} className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none" />
                  <button type="button" onClick={() => { const t = aiInput.trim(); if (t) { setAiInput(""); sendAiMessage(t); } }} className="p-2.5 bg-[#008080] text-white rounded-xl shrink-0" aria-label="Send">
                    <Send className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
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
            {(chatSearchQuery.trim() ? sortedMessages.filter((m) => { const text = m.parts.find((p) => p.type === "text")?.content ?? ""; return text.toLowerCase().includes(chatSearchQuery.trim().toLowerCase()); }) : sortedMessages).map((m) => (
              <MessageBubble
                key={m.id}
                msg={m}
                isMe={m.senderId === currentUserId}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const text = m.parts.find((p) => p.type === "text")?.content ?? "";
                  setMessageMenu({ msgId: m.id, text, x: e.clientX, y: e.clientY });
                }}
                onTouchEnd={() => { if (longPressRef.current) clearTimeout(longPressRef.current); longPressRef.current = null; }}
                onTouchStart={() => {
                  const text = m.parts.find((p) => p.type === "text")?.content ?? "";
                  longPressRef.current = setTimeout(() => setMessageMenu({ msgId: m.id, text, x: 120, y: 200 }), 500);
                }}
              />
            ))}
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
                    <button type="button" onClick={() => { setMeetingPopupOpen(true); setAttachMenuOpen(false); }} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl"><Users className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />{isHe ? "צור פגישה" : "Create Meeting"}</button>
                    <button type="button" onClick={() => setAttachMenuOpen(false)} className="flex items-center gap-2 py-2.5 px-3 text-left text-xs font-medium text-gray-700 hover:bg-[#008080]/10 hover:text-[#008080] rounded-xl"><BarChart3 className="w-4 h-4 shrink-0 text-[#008080]" strokeWidth={2} />{isHe ? "צור סקר" : "Create Poll"}</button>
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
            {meetingPopupOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMeetingPopupOpen(false)} aria-hidden />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-gray-200 p-4" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm font-semibold text-gray-900 mb-3">{isHe ? "צור פגישה" : "Create Meeting"}</p>
                    <input type="text" value={eventMeetingTitle} onChange={(e) => setEventMeetingTitle(e.target.value)} placeholder={isHe ? "שם הפגישה" : "Meeting title"} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3 outline-none focus:ring-2 focus:ring-[#008080]/30" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setMeetingPopupOpen(false); setEventMeetingTitle(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">{isHe ? "ביטול" : "Cancel"}</button>
                      <button type="button" onClick={handleCreateMeetingSubmit} className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: TEAL }}>{isHe ? "צור" : "Create"}</button>
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

function MessageBubble({
  msg,
  isMe,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
}: {
  msg: InternalMessageRecord;
  isMe: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}) {
  const text = msg.parts.find((p) => p.type === "text")?.content;
  if (!text) return null;
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-2.5 py-1.5 text-xs rounded-xl select-text ${isMe ? "bg-[#008080] text-white" : "bg-white border border-gray-200 text-gray-900"}`}
        onContextMenu={onContextMenu}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {text}
      </div>
    </div>
  );
}

export default InternalChatPanel;
