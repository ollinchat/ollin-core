"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Camera,
  Mic,
  CheckCheck,
  Bell,
  Phone,
  MessageCircle,
  Wrench,
  Settings,
  Video,
  ChevronLeft,
  Search,
  Image,
  FileText,
  MapPin,
  User,
  Receipt,
  Store,
  Zap,
  ListOrdered,
  Calendar,
  Megaphone,
  Send,
} from "lucide-react";
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
} as const;

const DOODLE_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 L50 10 M30 20 L55 35 M15 40 L45 55 M20 25 L25 30 M40 15 L45 20' stroke='rgba(0,0,0,0.04)' fill='none' stroke-width='1'/%3E%3Ccircle cx='25' cy='35' r='2' fill='rgba(0,0,0,0.03)'/%3E%3Ccircle cx='45' cy='25' r='1.5' fill='rgba(0,0,0,0.03)'/%3E%3C/svg%3E\")";

type ChatMessage = { id: string; text: string; out: boolean; time: string; seen?: boolean };

const ATTACH_MENU_ITEMS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "camera", label: "Camera", icon: <Camera className="w-6 h-6" /> },
  { id: "photos", label: "Photos", icon: <Image className="w-6 h-6" /> },
  { id: "document", label: "Document", icon: <FileText className="w-6 h-6" /> },
  { id: "location", label: "Location", icon: <MapPin className="w-6 h-6" /> },
  { id: "contact", label: "Contact", icon: <User className="w-6 h-6" /> },
  { id: "order", label: "Order", icon: <Receipt className="w-6 h-6" /> },
  { id: "catalog", label: "Catalog", icon: <Store className="w-6 h-6" /> },
  { id: "quick_replies", label: "Quick replies", icon: <Zap className="w-6 h-6" /> },
  { id: "poll", label: "Poll", icon: <ListOrdered className="w-6 h-6" /> },
  { id: "event", label: "Event", icon: <Calendar className="w-6 h-6" /> },
];

export function WhatsAppPanel() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [meta, setMeta] = useState<{ totalUnread: number; missedCallsCount: number; settingsNotificationCount?: number }>({ totalUnread: 0, missedCallsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "chat">("list");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/whatsapp/conversations")
      .then((res) => res.json())
      .then((data) => {
        if (data.conversations) setConversations(data.conversations);
        if (data.meta) setMeta(data.meta);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesByChat, activeChatId]);

  const selectedChat = activeChatId ? conversations.find((c) => c.id === activeChatId) : null;
  const messages = (activeChatId && messagesByChat[activeChatId]) || [];

  const openChat = (chat: WhatsAppConversation) => {
    setActiveChatId(chat.id);
    setViewMode("chat");
    setSendError(null);
  };

  const goBack = () => {
    setViewMode("list");
    setPlusMenuOpen(false);
  };

  const sendMessage = async () => {
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredChats = conversations.filter((c) =>
    c.name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  return (
    <div
      className="flex flex-1 min-h-0 w-full h-full overflow-hidden flex-col p-0 m-0"
      style={{ backgroundColor: WA.chatBg, backgroundImage: DOODLE_PATTERN, backgroundRepeat: "repeat" }}
    >
      {/* ——— List view: Chats header, search, contact list, bottom nav ——— */}
      {viewMode === "list" && (
        <>
          <aside
            className="flex flex-col shrink-0 w-full flex-1 min-h-0 border-r-0"
            style={{ backgroundColor: WA.sidebarBg, borderColor: WA.border }}
          >
            <div
              className="flex items-center justify-between shrink-0 h-14 px-3 border-b"
              style={{ backgroundColor: WA.sidebarBg, borderColor: WA.border }}
            >
              <h1 className="text-xl font-bold truncate" style={{ color: WA.text }}>
                Chats
              </h1>
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" className="p-2 rounded-full hover:bg-black/5" style={{ color: WA.textMuted }} aria-label="Camera">
                  <Camera className="w-5 h-5" />
                </button>
                <button type="button" className="p-2 rounded-full hover:bg-black/5" style={{ color: WA.textMuted }} aria-label="New chat">
                  <Plus className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
            </div>
            <div className="shrink-0 px-2 py-2" style={{ backgroundColor: WA.sidebarBg, borderBottom: `1px solid ${WA.border}` }}>
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
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium shrink-0"
                        style={{ backgroundColor: WA.green }}
                      >
                        {chat.avatar ? (
                          <img src={chat.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          chat.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
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

          <nav
            className="flex shrink-0 items-center justify-around border-t py-2"
            style={{ backgroundColor: WA.sidebarBg, borderColor: WA.border }}
          >
            <button type="button" className="relative flex flex-col items-center gap-0.5 py-1 min-w-0 flex-1" style={{ color: WA.textMuted }} aria-label="Updates">
              <span className="relative inline-block">
                <Megaphone className="w-6 h-6" />
                {meta.totalUnread > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-medium text-white px-1"
                    style={{ backgroundColor: WA.badgeGreen }}
                  >
                    {meta.totalUnread > 99 ? "99+" : meta.totalUnread}
                  </span>
                )}
              </span>
              <span className="text-[10px] truncate w-full text-center">Updates</span>
            </button>
            <button type="button" className="relative flex flex-col items-center gap-0.5 py-1 min-w-0 flex-1" style={{ color: WA.textMuted }} aria-label="Calls">
              <span className="relative inline-block">
                <Phone className="w-6 h-6" />
                {meta.missedCallsCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-medium text-white px-1"
                    style={{ backgroundColor: WA.badgeGreen }}
                  >
                    {meta.missedCallsCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] truncate w-full text-center">Calls</span>
            </button>
            <button type="button" className="relative flex flex-col items-center gap-0.5 py-1 min-w-0 flex-1" style={{ color: WA.textMuted }} aria-label="Tools">
              <Wrench className="w-6 h-6" />
              <span className="text-[10px] truncate w-full text-center">Tools</span>
            </button>
            <button type="button" className="relative flex flex-col items-center gap-0.5 py-1 min-w-0 flex-1" style={{ color: WA.green }} aria-label="Chats">
              <span className="relative inline-block">
                <MessageCircle className="w-6 h-6" strokeWidth={2.5} />
                {meta.totalUnread > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-medium text-white px-1"
                    style={{ backgroundColor: WA.badgeGreen }}
                  >
                    {meta.totalUnread > 99 ? "99+" : meta.totalUnread}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium truncate w-full text-center">Chats</span>
            </button>
            <button type="button" className="relative flex flex-col items-center gap-0.5 py-1 min-w-0 flex-1" style={{ color: WA.textMuted }} aria-label="Settings">
              <span className="relative inline-block">
                <Settings className="w-6 h-6" />
                {(meta.settingsNotificationCount ?? 0) > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-medium text-white px-1"
                    style={{ backgroundColor: WA.badgeGreen }}
                  >
                    {meta.settingsNotificationCount! > 99 ? "99+" : meta.settingsNotificationCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] truncate w-full text-center">Settings</span>
            </button>
          </nav>
        </>
      )}

      {/* ——— Full-screen internal chat (inner page) ——— */}
      {viewMode === "chat" && selectedChat && (
        <div className="absolute inset-0 z-10 flex flex-col bg-[#e5ddd5]" style={{ backgroundImage: DOODLE_PATTERN, backgroundRepeat: "repeat" }}>
          {/* Header: back, profile pic, name, Video + Voice call */}
          <header
            className="flex items-center gap-3 shrink-0 h-14 px-2 border-b"
            style={{ backgroundColor: "#1f2c34", borderColor: "rgba(255,255,255,0.1)" }}
          >
            <button
              type="button"
              onClick={goBack}
              className="p-2 rounded-full text-white/90 hover:bg-white/10"
              aria-label="Back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-semibold"
              style={{ backgroundColor: WA.green }}
            >
              {selectedChat.avatar ? (
                <img src={selectedChat.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                selectedChat.name.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-[16px] truncate text-white">{selectedChat.name}</h1>
              <p className="text-xs truncate text-white/70">online</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button type="button" className="p-2 rounded-full text-white/90 hover:bg-white/10" aria-label="Video call">
                <Video className="w-5 h-5" />
              </button>
              <button type="button" className="p-2 rounded-full text-white/90 hover:bg-white/10" aria-label="Voice call">
                <Phone className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Messages — doodle bg, #dcf8c6 sent, #ffffff received, blue ticks */}
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
              <div key={msg.id} className={`flex ${msg.out ? "justify-end" : "justify-start"}`}>
                <div
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

          {/* Input bar: + (opens menu), text field, emoji placeholder, Camera, Mic */}
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
                  className="absolute bottom-full left-0 mb-1 w-[280px] rounded-2xl border shadow-2xl py-3 px-2 grid grid-cols-4 gap-2 z-50"
                  style={{ backgroundColor: "#233138", borderColor: "rgba(255,255,255,0.1)" }}
                >
                  {ATTACH_MENU_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPlusMenuOpen(false);
                        // Placeholder: could open camera, file picker, etc.
                      }}
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
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="p-2 rounded-full text-white/70 hover:bg-white/10 disabled:opacity-50"
              aria-label="Send or voice"
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
