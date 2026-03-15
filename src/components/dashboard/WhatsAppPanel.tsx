"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, Camera, Mic, CheckCheck, Bell, Phone, MessageCircle } from "lucide-react";

const WA = {
  // WhatsApp Business Light — white/beige only, no dark mode
  tealSidebar: "#008069", // sidebar header (WhatsApp Business Green)
  sidebarBg: "#ffffff",
  chatHeaderBg: "#f0f2f5",
  chatBg: "#e5ddd5", // beige doodle background
  bubbleOut: "#dcf8c6",
  bubbleIn: "#ffffff",
  inputBg: "#ffffff",
  text: "#111b21",
  textMuted: "#667781",
  border: "#e9edef",
  green: "#008069",
  greenLight: "#008069",
} as const;

// Light beige doodle pattern (subtle, #e5ddd5 tint)
const DOODLE_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 L50 10 M30 20 L55 35 M15 40 L45 55 M20 25 L25 30 M40 15 L45 20' stroke='rgba(0,0,0,0.04)' fill='none' stroke-width='1'/%3E%3Ccircle cx='25' cy='35' r='2' fill='rgba(0,0,0,0.03)'/%3E%3Ccircle cx='45' cy='25' r='1.5' fill='rgba(0,0,0,0.03)'/%3E%3C/svg%3E\")";

const TEST_CONTACT = {
  id: "test-contact",
  name: "Test Contact",
  phone: "",
  lastMessage: "Tap to start a conversation",
  time: "",
  unread: 0,
};

type Chat = typeof TEST_CONTACT & { phone?: string };
type ChatMessage = { id: string; text: string; out: boolean; time: string; seen?: boolean };

export function WhatsAppPanel() {
  const [chats] = useState<Chat[]>([{ ...TEST_CONTACT }]);
  const [activeChatId, setActiveChatId] = useState<string>(TEST_CONTACT.id);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({
    [TEST_CONTACT.id]: [],
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedChat = chats.find((c) => c.id === activeChatId) ?? chats[0];
  const messages = messagesByChat[activeChatId] ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectChat = (chat: Chat) => {
    setActiveChatId(chat.id);
    setSendError(null);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || !selectedChat) return;
    const phone = selectedChat.phone || testPhone;
    if (!phone.trim()) {
      setSendError("Enter recipient phone (e.g. 15551234567) below to send.");
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
    setMessagesByChat((prev) => {
      const prevForChat = prev[activeChatId] ?? [];
      return { ...prev, [activeChatId]: [...prevForChat, newMsg] };
    });
    setInput("");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone.replace(/\D/g, ""), text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(data.error || "Failed to send");
        return;
      }
      setMessagesByChat((prev) => {
        const current = prev[activeChatId] ?? [];
        return {
          ...prev,
          [activeChatId]: current.map((m) =>
            m.id === tempId ? { ...m, id: data.messageId || m.id } : m
          ),
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

  return (
    <div
      className="flex flex-1 min-h-0 w-full h-full overflow-hidden flex-col"
      style={{
        backgroundColor: WA.chatBg,
        backgroundImage: DOODLE_PATTERN,
        backgroundRepeat: "repeat",
      }}
    >
      {/* Left: WhatsApp contact list only — no other sidebars in this tab */}
      <aside
        className="flex flex-col shrink-0 border-r w-[350px] min-w-[320px] min-h-0"
        style={{ backgroundColor: WA.sidebarBg, borderColor: WA.border }}
      >
        {/* Sidebar header with avatar + icons */}
        <div
          className="flex items-center gap-3 px-3 py-3 shrink-0"
          style={{
            backgroundColor: WA.tealSidebar,
            borderBottom: `1px solid rgba(255,255,255,0.2)`,
            height: 60,
          }}
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold text-white">
            U
          </div>
          <div className="flex-1 min-w-0" />
          <button type="button" className="p-1.5 rounded-full text-white/90 hover:bg-white/10" aria-label="Status">
            <Bell className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 rounded-full text-white/90 hover:bg-white/10" aria-label="New chat">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="shrink-0 px-2 py-2" style={{ backgroundColor: WA.sidebarBg, borderBottom: `1px solid ${WA.border}` }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: WA.inputBg, border: `1px solid ${WA.border}` }}>
            <span className="text-[#667781]"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></span>
            <input type="search" value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} placeholder="Search" className="flex-1 min-w-0 bg-transparent border-0 text-sm focus:outline-none" style={{ color: WA.text }} />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto list-none m-0 p-0" role="list">
          {chats
            .filter((chat) =>
              chat.name.toLowerCase().includes(sidebarSearch.toLowerCase())
            )
            .map((chat) => (
            <li key={chat.id} className="border-b" style={{ borderColor: WA.border }}>
              <button
                type="button"
                onClick={() => selectChat(chat)}
                className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-black/5"
                style={{
                  backgroundColor:
                    selectedChat?.id === chat.id ? "rgba(0,0,0,0.06)" : undefined,
                }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium shrink-0" style={{ backgroundColor: WA.green }}>{chat.name.slice(0, 2).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[15px] truncate" style={{ color: WA.text }}>{chat.name}</p>
                  <p className="text-sm truncate" style={{ color: WA.textMuted }}>{chat.lastMessage}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {selectedChat && (
          <>
            {/* Chat header with contact name + online status */}
            <header
              className="flex items-center gap-3 px-4 py-2 shrink-0"
              style={{
                backgroundColor: WA.chatHeaderBg,
                borderBottom: `1px solid ${WA.border}`,
                height: 60,
                borderLeft: "1px solid #ddd",
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium shrink-0 border border-white/30"
                style={{ backgroundColor: WA.green }}
              >
                {selectedChat.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-[15px] truncate" style={{ color: WA.text }}>
                  {selectedChat.name}
                </h1>
                <p className="text-xs truncate" style={{ color: WA.textMuted }}>
                  online
                </p>
              </div>
            </header>

            {/* Messages list with independent scroll */}
            <div
              className="flex-1 overflow-y-auto flex flex-col gap-1 min-h-0"
              style={{
                backgroundColor: WA.chatBg,
                backgroundImage: DOODLE_PATTERN,
                backgroundRepeat: "repeat",
                padding: "12px 16px",
              }}
            >
              {messages.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: WA.textMuted }}>
                  No messages yet. Type below and send via WhatsApp API.
                </p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.out ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[70%] px-3 py-2 shadow-sm relative"
                    style={{
                      backgroundColor: msg.out ? WA.bubbleOut : WA.bubbleIn,
                      color: WA.text,
                      borderRadius: msg.out
                        ? "8px 0 8px 8px"
                        : "0 8px 8px 8px",
                      boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                    }}
                  >
                    <p className="text-[14px] whitespace-pre-wrap break-words">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span
                        className="text-[10px] opacity-70"
                        style={{ color: WA.textMuted }}
                      >
                        {msg.time}
                      </span>
                      {msg.out && (
                        <CheckCheck
                          className="w-3 h-3"
                          style={{ color: WA.textMuted }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Recipient phone for test contact */}
            {selectedChat.id === TEST_CONTACT.id && (
              <div
                className="px-4 py-2 shrink-0 border-t"
                style={{ backgroundColor: WA.sidebarBg, borderColor: WA.border }}
              >
                <label
                  className="text-xs font-medium block mb-1"
                  style={{ color: WA.textMuted }}
                >
                  Recipient phone (E.164)
                </label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="15551234567"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{
                    borderColor: WA.border,
                    backgroundColor: WA.inputBg,
                    color: WA.text,
                  }}
                />
              </div>
            )}

            {sendError && (
              <div className="px-4 py-2 shrink-0 bg-red-50 text-red-700 text-sm">
                {sendError}
              </div>
            )}

            {/* Bottom input bar: + (left), text field, Camera, Microphone (right) — mobile layout */}
            <div
              className="flex items-center gap-2 px-4 py-3 shrink-0"
              style={{
                backgroundColor: WA.chatHeaderBg,
                padding: "10px 16px",
              }}
            >
              <button
                type="button"
                className="p-2 rounded-full shrink-0"
                style={{ color: WA.textMuted }}
                aria-label="Attach or add"
              >
                <Plus className="w-6 h-6" strokeWidth={2} />
              </button>
              <div
                className="flex-1 flex items-center min-w-0 rounded-2xl px-4 py-2.5"
                style={{ backgroundColor: WA.inputBg, border: `1px solid ${WA.border}` }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message"
                  className="flex-1 min-w-0 bg-transparent text-sm outline-none"
                  style={{ color: WA.text }}
                />
              </div>
              <button
                type="button"
                className="p-2 rounded-full shrink-0"
                style={{ color: WA.textMuted }}
                aria-label="Camera"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="p-2 rounded-full shrink-0 disabled:opacity-50"
                style={{ color: input.trim() ? WA.green : WA.textMuted }}
                aria-label="Send or voice"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </main>

      {/* Bottom navigation: Updates, Calls, Chats — WhatsApp style */}
      <nav
        className="flex shrink-0 items-center justify-around border-t px-2 py-2"
        style={{ backgroundColor: WA.sidebarBg, borderColor: WA.border }}
      >
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 py-1"
          style={{ color: WA.textMuted }}
          aria-label="Updates"
        >
          <Bell className="w-6 h-6" />
          <span className="text-[10px]">Updates</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 py-1 relative"
          style={{ color: WA.textMuted }}
          aria-label="Calls"
        >
          <Phone className="w-6 h-6" />
          <span className="text-[10px]">Calls</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 py-1 relative"
          style={{ color: WA.green }}
          aria-label="Chats"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-[10px] font-medium">Chats</span>
        </button>
      </nav>
    </div>
  );
}
