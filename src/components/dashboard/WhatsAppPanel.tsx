"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  Camera,
  Mic,
  CheckCheck,
  Phone,
  MessageCircle,
  Settings,
  Video,
  ChevronLeft,
  Search,
  Image,
  FileText,
  MapPin,
  User,
  Send,
  ScanLine,
  FileImage,
  Bell,
  Lock,
  Shield,
  ChevronRight,
} from "lucide-react";
import { useBoard } from "@/contexts/BoardContext";
import type { WhatsAppConversation } from "@/app/api/whatsapp/conversations/route";

const WA = {
  sidebarBg: "#ffffff",
  chatHeaderBg: "#f0f2f5",
  chatBg: "#e5ddd5",
  bubbleOut: "#dcf8c6",
  bubbleIn: "#ffffff",
  inputBg: "#ffffff",
  text: "#111b21",
  textMuted: "#667781",
  border: "#e9edef",
  green: "#008069",
  blueTicks: "#53bdeb",
  badgeGreen: "#25D366",
  graySilhouette: "#8696a0",
} as const;

const DOODLE_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 L50 10 M30 20 L55 35 M15 40 L45 55 M20 25 L25 30 M40 15 L45 20' stroke='rgba(0,0,0,0.04)' fill='none' stroke-width='1'/%3E%3Ccircle cx='25' cy='35' r='2' fill='rgba(0,0,0,0.03)'/%3E%3Ccircle cx='45' cy='25' r='1.5' fill='rgba(0,0,0,0.03)'/%3E%3C/svg%3E\")";

type ChatMessage = { id: string; text: string; out: boolean; time: string; seen?: boolean };

const PLUS_MENU_ITEMS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "document", label: "Document", icon: <FileText className="w-6 h-6" /> },
  { id: "camera", label: "Camera", icon: <Camera className="w-6 h-6" /> },
  { id: "gallery", label: "Gallery", icon: <Image className="w-6 h-6" /> },
  { id: "location", label: "Location", icon: <MapPin className="w-6 h-6" /> },
  { id: "contact", label: "Contact", icon: <User className="w-6 h-6" /> },
  { id: "scan", label: "Scan Document", icon: <ScanLine className="w-6 h-6" /> },
];

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "favorites", label: "Favorites" },
  { id: "groups", label: "Groups" },
] as const;

function WhatsAppAvatar({
  avatar,
  name,
  size = 12,
  className = "",
}: {
  avatar?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const s = size * 4;
  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: s, height: s }}
      />
    );
  }
  return (
    <span
      className={`rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: s, height: s, backgroundColor: WA.graySilhouette }}
      aria-hidden
    >
      <svg width={s * 0.5} height={s * 0.6} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </span>
  );
}

export function WhatsAppPanel() {
  const { addGivenTask } = useBoard();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<(typeof FILTER_TABS)[number]["id"]>("all");
  const [viewMode, setViewMode] = useState<"list" | "chat">("list");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/whatsapp/conversations")
      .then((res) => res.json())
      .then((data) => {
        if (data.conversations) setConversations(data.conversations);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeChatId) {
      fetch(`/api/whatsapp/messages?contactId=${encodeURIComponent(activeChatId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages?.length) {
            setMessagesByChat((prev) => ({ ...prev, [activeChatId]: data.messages }));
          }
        })
        .catch(() => {});
    }
  }, [activeChatId]);

  useEffect(() => {
    if (plusMenuOpen) {
      const close = (e: MouseEvent | TouchEvent) => {
        if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) setPlusMenuOpen(false);
      };
      document.addEventListener("mousedown", close);
      document.addEventListener("touchstart", close, { passive: true });
      return () => {
        document.removeEventListener("mousedown", close);
        document.removeEventListener("touchstart", close);
      };
    }
  }, [plusMenuOpen]);

  useEffect(() => {
    const closeContext = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", closeContext);
      return () => document.removeEventListener("click", closeContext);
    }
  }, [contextMenu]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesByChat, activeChatId]);

  const selectedChat = activeChatId ? conversations.find((c) => c.id === activeChatId) : null;
  const messages = (activeChatId && messagesByChat[activeChatId]) || [];

  const openChat = (chat: WhatsAppConversation) => {
    setActiveChatId(chat.id);
    setViewMode("chat");
    setProfileSidebarOpen(false);
    setSendError(null);
  };

  const goBack = () => {
    setViewMode("list");
    setPlusMenuOpen(false);
    setProfileSidebarOpen(false);
    setContextMenu(null);
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !selectedChat) return;
    const phone = (selectedChat.phone || testPhone).replace(/\D/g, "");
    if (!phone) {
      setSendError("Enter recipient phone (E.164) below to send via API.");
      return;
    }
    setSending(true);
    setSendError(null);
    const tempId = `temp-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: tempId,
      text,
      out: true,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      seen: true,
    };
    setMessagesByChat((prev) => ({
      ...prev,
      [selectedChat.id]: [...(prev[selectedChat.id] || []), newMsg],
    }));
    setInput("");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(data.error || "Failed to send");
        return;
      }
      setMessagesByChat((prev) => {
        const list = prev[selectedChat.id] || [];
        return {
          ...prev,
          [selectedChat.id]: list.map((m) => (m.id === tempId ? { ...m, id: data.messageId || m.id } : m)),
        };
      });
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }, [input, sending, selectedChat, testPhone]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const createTaskFromMessage = useCallback(
    (msg: ChatMessage) => {
      if (!selectedChat) return;
      addGivenTask({
        title: msg.text.slice(0, 200),
        checklist: [],
        done: false,
        otherParty: selectedChat.name,
      });
      setContextMenu(null);
    },
    [selectedChat, addGivenTask]
  );

  const filteredBySearch = conversations.filter((c) =>
    c.name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );
  const filteredChats =
    filterTab === "unread"
      ? filteredBySearch.filter((c) => c.unread > 0)
      : filterTab === "groups"
        ? filteredBySearch.filter((c) => c.isGroup)
        : filteredBySearch;

  const statusPlaceholders = [
    { id: "s1", name: "My status", time: "Just now", avatar: null },
    { id: "s2", name: "סאלוניקי", time: "18:10", avatar: null },
    { id: "s3", name: "Young Media", time: "16:27", avatar: null },
  ];

  return (
    <div
      className="flex flex-1 min-h-0 w-full h-full overflow-hidden flex-col p-0 m-0"
      style={{ backgroundColor: WA.chatBg, backgroundImage: DOODLE_PATTERN, backgroundRepeat: "repeat" }}
    >
      {/* ——— List view: Settings + Chats header, search, filters, status, list (no bottom nav) ——— */}
      {viewMode === "list" && (
        <aside
          className="flex flex-col w-full flex-1 min-h-0"
          style={{ backgroundColor: WA.sidebarBg, borderColor: WA.border }}
        >
          <div
            className="flex items-center shrink-0 h-14 px-3 border-b gap-2"
            style={{ backgroundColor: WA.sidebarBg, borderColor: WA.border }}
          >
            <button
              type="button"
              className="p-2 rounded-full hover:bg-black/5"
              style={{ color: WA.textMuted }}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold truncate flex-1 min-w-0" style={{ color: WA.text }}>
              Chats
            </h1>
            <button type="button" className="p-2 rounded-full hover:bg-black/5" style={{ color: WA.textMuted }} aria-label="Camera">
              <Camera className="w-5 h-5" />
            </button>
            <button type="button" className="p-2 rounded-full hover:bg-black/5" style={{ color: WA.textMuted }} aria-label="New chat">
              <Plus className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          <div className="shrink-0 px-2 py-2" style={{ borderBottom: `1px solid ${WA.border}` }}>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-full backdrop-blur-md"
              style={{ backgroundColor: "rgba(0,0,0,0.06)" }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: WA.textMuted }} />
              <input
                type="search"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Search"
                className="flex-1 min-w-0 bg-transparent border-0 text-sm focus:outline-none placeholder:opacity-70"
                style={{ color: WA.text }}
              />
            </div>
          </div>

          <div className="shrink-0 flex gap-1 px-2 pb-2 overflow-x-auto scrollbar-hide">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0"
                style={
                  filterTab === tab.id
                    ? { backgroundColor: WA.green, color: "#fff" }
                    : { color: WA.textMuted, backgroundColor: "transparent" }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="shrink-0 flex gap-3 px-3 py-3 overflow-x-auto scrollbar-hide border-b" style={{ borderColor: WA.border }}>
            {statusPlaceholders.map((s) => (
              <button
                key={s.id}
                type="button"
                className="flex flex-col items-center gap-1 shrink-0"
                onClick={() => {}}
              >
                <span
                  className="rounded-full border-2 flex items-center justify-center overflow-hidden"
                  style={{ width: 56, height: 56, borderColor: WA.border }}
                >
                  <WhatsAppAvatar avatar={s.avatar} name={s.name} size={14} />
                </span>
                <span className="text-xs truncate max-w-[64px]" style={{ color: WA.text }}>
                  {s.name}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-8" style={{ color: WA.textMuted }}>
              <span className="text-sm">Loading chats…</span>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto list-none m-0 p-0" role="list">
              {filteredChats.map((chat) => (
                <li key={chat.id} className="border-b" style={{ borderColor: WA.border }}>
                  <button
                    type="button"
                    onClick={() => openChat(chat)}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-black/5"
                  >
                    <WhatsAppAvatar avatar={chat.avatar} name={chat.name} size={12} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[15px] truncate" style={{ color: WA.text }}>
                        {chat.name}
                      </p>
                      <p className="text-sm truncate" style={{ color: WA.textMuted }}>
                        {chat.lastMessage}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-xs" style={{ color: WA.textMuted }}>
                        {chat.time}
                      </span>
                      {chat.unread > 0 && (
                        <span
                          className="min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-medium text-white"
                          style={{ backgroundColor: WA.badgeGreen }}
                        >
                          {chat.unread > 99 ? "99+" : chat.unread}
                        </span>
                      )}
                      {chat.muted && (
                        <Bell className="w-4 h-4 -mt-0.5" style={{ color: WA.textMuted }} strokeWidth={2} />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      {/* ——— Full-screen internal chat ——— */}
      {viewMode === "chat" && selectedChat && (
        <div className="absolute inset-0 z-10 flex flex-col bg-[#e5ddd5]" style={{ backgroundImage: DOODLE_PATTERN, backgroundRepeat: "repeat" }}>
          <header
            className="flex items-center gap-3 shrink-0 h-14 px-2 border-b"
            style={{ backgroundColor: "#1f2c34", borderColor: "rgba(255,255,255,0.1)" }}
          >
            <button type="button" onClick={goBack} className="p-2 rounded-full text-white/90 hover:bg-white/10" aria-label="Back">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => setProfileSidebarOpen(true)}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <WhatsAppAvatar avatar={selectedChat.avatar} name={selectedChat.name} size={10} className="shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <h1 className="font-semibold text-[16px] truncate text-white">{selectedChat.name}</h1>
                <p className="text-xs truncate text-white/70">online</p>
              </div>
            </button>
            <div className="flex items-center gap-0.5 shrink-0">
              <button type="button" className="p-2 rounded-full text-white/90 hover:bg-white/10" aria-label="Video call">
                <Video className="w-5 h-5" />
              </button>
              <button type="button" className="p-2 rounded-full text-white/90 hover:bg-white/10" aria-label="Voice call">
                <Phone className="w-5 h-5" />
              </button>
            </div>
          </header>

          <div className="flex-1 flex min-h-0 relative">
            <div
              className="flex-1 overflow-y-auto flex flex-col gap-1 min-h-0 px-3 py-3"
              style={{ backgroundColor: WA.chatBg, backgroundImage: DOODLE_PATTERN, backgroundRepeat: "repeat" }}
            >
              {messages.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: WA.textMuted }}>
                  No messages yet. Type below and send.
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.out ? "justify-end" : "justify-start"}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
                  }}
                  onTouchEnd={(e) => {
                    if (e.changedTouches?.[0]) {
                      const t = e.changedTouches[0];
                      const target = document.elementFromPoint(t.clientX, t.clientY);
                      if (target?.closest("[data-msg-bubble]")) {
                        setContextMenu({ x: t.clientX, y: t.clientY, message: msg });
                      }
                    }
                  }}
                >
                  <div
                    data-msg-bubble
                    className="max-w-[75%] px-3 py-2 shadow-sm"
                    style={{
                      backgroundColor: msg.out ? WA.bubbleOut : WA.bubbleIn,
                      color: WA.text,
                      borderRadius: msg.out ? "8px 8px 2px 8px" : "8px 8px 8px 2px",
                      boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                    }}
                  >
                    <p className="text-[14px] whitespace-pre-wrap break-words">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[11px] opacity-80" style={{ color: WA.textMuted }}>
                        {msg.time}
                      </span>
                      {msg.out && (
                        <CheckCheck className="w-3.5 h-3.5 shrink-0" style={{ color: WA.blueTicks }} strokeWidth={2.5} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {contextMenu && (
              <div
                className="fixed z-[100] py-1 rounded-lg shadow-xl border min-w-[200px]"
                style={{
                  left: contextMenu.x,
                  top: contextMenu.y,
                  backgroundColor: WA.sidebarBg,
                  borderColor: WA.border,
                }}
              >
                <button
                  type="button"
                  onClick={() => createTaskFromMessage(contextMenu.message)}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-black/5 flex items-center gap-2"
                  style={{ color: WA.text }}
                >
                  <FileText className="w-4 h-4" style={{ color: WA.green }} />
                  Create Task from Message
                </button>
              </div>
            )}

            {profileSidebarOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/30"
                  onClick={() => setProfileSidebarOpen(false)}
                  aria-hidden
                />
                <aside
                  className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm flex flex-col shadow-2xl overflow-hidden"
                  style={{ backgroundColor: WA.sidebarBg, borderLeft: `1px solid ${WA.border}` }}
                >
                  <div className="shrink-0 flex items-center justify-between h-14 px-4 border-b" style={{ borderColor: WA.border }}>
                    <span className="text-lg font-semibold" style={{ color: WA.text }}>
                      Contact info
                    </span>
                    <button
                      type="button"
                      onClick={() => setProfileSidebarOpen(false)}
                      className="p-2 rounded-full hover:bg-black/5"
                      style={{ color: WA.textMuted }}
                      aria-label="Close"
                    >
                      <ChevronLeft className="w-5 h-5 rotate-180" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex flex-col items-center pb-4 border-b" style={{ borderColor: WA.border }}>
                      <WhatsAppAvatar avatar={selectedChat.avatar} name={selectedChat.name} size={24} className="mb-3" />
                      <h2 className="text-xl font-bold text-center" style={{ color: WA.text }}>
                        {selectedChat.name}
                      </h2>
                      {selectedChat.phone && (
                        <p className="text-sm mt-1" style={{ color: WA.textMuted }}>
                          {selectedChat.phone}
                        </p>
                      )}
                      <p className="text-sm mt-2" style={{ color: WA.textMuted }}>
                        About
                      </p>
                    </div>
                    <div className="py-3 border-b" style={{ borderColor: WA.border }}>
                      {[
                        { icon: FileText, label: "Media, links and docs", sub: "None" },
                        { icon: FileImage, label: "Starred", sub: "None" },
                      ].map(({ icon: Icon, label, sub }) => (
                        <button
                          key={label}
                          type="button"
                          className="w-full flex items-center gap-3 py-3 text-left hover:bg-black/5 rounded-lg px-2"
                          style={{ color: WA.text }}
                        >
                          <Icon className="w-5 h-5 shrink-0" style={{ color: WA.textMuted }} />
                          <span className="flex-1 text-sm">{label}</span>
                          <span className="text-sm" style={{ color: WA.textMuted }}>
                            {sub}
                          </span>
                          <ChevronRight className="w-4 h-4" style={{ color: WA.textMuted }} />
                        </button>
                      ))}
                    </div>
                    <div className="py-3">
                      {[
                        { icon: Bell, label: "Notifications" },
                        { icon: Lock, label: "Lock chat", sub: "Lock and hide this chat on this device." },
                        { icon: Shield, label: "Advanced chat privacy", sub: "Off" },
                      ].map(({ icon: Icon, label, sub }) => (
                        <button
                          key={label}
                          type="button"
                          className="w-full flex items-center gap-3 py-3 text-left hover:bg-black/5 rounded-lg px-2"
                          style={{ color: WA.text }}
                        >
                          <Icon className="w-5 h-5 shrink-0" style={{ color: WA.textMuted }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm block">{label}</span>
                            {sub && (
                              <span className="text-xs block mt-0.5" style={{ color: WA.textMuted }}>
                                {sub}
                              </span>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: WA.textMuted }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>
              </>
            )}
          </div>

          {selectedChat.phone ? null : (
            <div className="shrink-0 px-3 py-2 border-t bg-white/80" style={{ borderColor: WA.border }}>
              <label className="text-xs font-medium block mb-1" style={{ color: WA.textMuted }}>
                Recipient phone (E.164)
              </label>
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="15551234567"
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: WA.border, backgroundColor: WA.inputBg, color: WA.text }}
              />
            </div>
          )}

          {sendError && (
            <div className="shrink-0 px-3 py-2 bg-red-50 text-red-700 text-sm">{sendError}</div>
          )}

          <div
            className="shrink-0 flex items-center gap-2 px-2 py-3 border-t"
            style={{ backgroundColor: "#1f2c34", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="relative shrink-0" ref={plusMenuRef}>
              <button
                type="button"
                onClick={() => setPlusMenuOpen((o) => !o)}
                className="p-2 rounded-full text-white/90 hover:bg-white/10"
                aria-label="Attach"
                aria-expanded={plusMenuOpen}
              >
                <Plus className="w-6 h-6" strokeWidth={2} />
              </button>
              {plusMenuOpen && (
                <div
                  className="absolute bottom-full left-0 mb-1 w-[260px] rounded-2xl border shadow-2xl py-3 px-2 grid grid-cols-3 gap-2 z-50"
                  style={{ backgroundColor: "#233138", borderColor: "rgba(255,255,255,0.1)" }}
                >
                  {PLUS_MENU_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPlusMenuOpen(false)}
                      className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-white/10 text-white/90 transition-colors"
                    >
                      <span className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10">
                        {item.icon}
                      </span>
                      <span className="text-[11px] font-medium truncate w-full text-center">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              className="flex-1 flex items-center min-w-0 rounded-2xl px-4 py-2.5"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message"
                className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-white/50"
                style={{ color: "#e9edef" }}
              />
            </div>
            <button type="button" className="p-2 rounded-full text-white/70 hover:bg-white/10" aria-label="Emoji">
              <span className="w-5 h-5 rounded bg-white/20 flex items-center justify-center text-xs">😊</span>
            </button>
            <button type="button" className="p-2 rounded-full text-white/70 hover:bg-white/10" aria-label="Camera">
              <Camera className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (input.trim()) sendMessage();
                else setRecordingVoice((r) => !r);
              }}
              className={`p-2 rounded-full ${recordingVoice ? "bg-red-500/30 text-red-300" : "text-white/70 hover:bg-white/10"}`}
              aria-label={input.trim() ? "Send" : "Voice note"}
            >
              {input.trim() ? (
                <Send className="w-5 h-5" style={{ color: WA.blueTicks }} />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
