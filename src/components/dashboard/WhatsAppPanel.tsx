"use client";

import React, { useState, useRef, useEffect } from "react";

const WA = {
  green: "#00a884",
  sidebarBg: "#f0f2f5",
  chatBg: "#efeae2",
  bubbleOut: "#d9fdd3",
  bubbleIn: "#ffffff",
  headerBg: "#f0f2f5",
  inputBg: "#ffffff",
  text: "#111b21",
  textMuted: "#667781",
  border: "#e9edef",
} as const;

const TEST_CONTACT = {
  id: "test-contact",
  name: "Test Contact",
  phone: "",
  lastMessage: "Tap to start a conversation",
  time: "",
  unread: 0,
};

type Chat = typeof TEST_CONTACT & { phone?: string };

export function WhatsAppPanel() {
  const [chats, setChats] = useState<Chat[]>([{ ...TEST_CONTACT }]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>({ ...TEST_CONTACT });
  const [messages, setMessages] = useState<{ id: string; text: string; out: boolean; time: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectChat = (chat: Chat) => {
    setSelectedChat(chat);
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
    const newMsg = {
      id: tempId,
      text,
      out: true,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
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
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.messageId || m.id } : m))
      );
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Send failed");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
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
      className="flex flex-1 min-h-0 w-full h-full overflow-hidden bg-[#e5ddd5]"
      style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      }}
    >
      {/* Left: WhatsApp contact list only — no other sidebars in this tab */}
      <aside
        className="flex flex-col shrink-0 border-r w-[300px] min-w-[260px] min-h-0"
        style={{ backgroundColor: WA.sidebarBg, borderColor: WA.border }}
      >
        <div className="flex items-center gap-3 px-3 py-3 shrink-0" style={{ backgroundColor: WA.headerBg, borderBottom: `1px solid ${WA.border}` }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-medium shrink-0" style={{ backgroundColor: WA.green }}>WA</div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-[15px] truncate" style={{ color: WA.text }}>Chats</h2>
            <p className="text-xs truncate" style={{ color: WA.textMuted }}>WhatsApp Web</p>
          </div>
        </div>
        <div className="shrink-0 px-2 py-2" style={{ backgroundColor: WA.sidebarBg, borderBottom: `1px solid ${WA.border}` }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: WA.inputBg, border: `1px solid ${WA.border}` }}>
            <span className="text-[#667781]"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></span>
            <input type="search" value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} placeholder="Search" className="flex-1 min-w-0 bg-transparent border-0 text-sm focus:outline-none" style={{ color: WA.text }} />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto list-none m-0 p-0" role="list">
          {chats.map((chat) => (
            <li key={chat.id} className="border-b" style={{ borderColor: WA.border }}>
              <button type="button" onClick={() => selectChat(chat)} className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-black/5" style={{ backgroundColor: selectedChat?.id === chat.id ? "rgba(0,0,0,0.06)" : undefined }}>
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
            <header className="flex items-center gap-3 px-3 py-2 shrink-0" style={{ backgroundColor: WA.headerBg, borderBottom: `1px solid ${WA.border}` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shrink-0" style={{ backgroundColor: WA.green }}>{selectedChat.name.slice(0, 2).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-[16px] truncate" style={{ color: WA.text }}>{selectedChat.name}</h1>
                <p className="text-xs truncate" style={{ color: WA.textMuted }}>{selectedChat.phone || "Set phone below to send"}</p>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1 min-h-0">
              {messages.length === 0 && <p className="text-sm text-center py-8" style={{ color: WA.textMuted }}>No messages yet. Type below and send via WhatsApp API.</p>}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.out ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[65%] rounded-lg px-3 py-2 shadow-sm" style={{ backgroundColor: msg.out ? WA.bubbleOut : WA.bubbleIn, color: WA.text }}>
                    <p className="text-[14px] whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className="text-[11px] mt-1 opacity-70" style={{ color: WA.textMuted }}>{msg.time}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {selectedChat.id === TEST_CONTACT.id && (
              <div className="px-4 py-2 shrink-0 border-t" style={{ backgroundColor: WA.sidebarBg, borderColor: WA.border }}>
                <label className="text-xs font-medium block mb-1" style={{ color: WA.textMuted }}>Recipient phone (E.164)</label>
                <input type="tel" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="15551234567" className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2" style={{ borderColor: WA.border, backgroundColor: WA.inputBg, color: WA.text }} />
              </div>
            )}
            {sendError && <div className="px-4 py-2 shrink-0 bg-red-50 text-red-700 text-sm">{sendError}</div>}
            <div className="flex items-end gap-2 px-4 py-3 shrink-0" style={{ backgroundColor: WA.headerBg, borderTop: `1px solid ${WA.border}` }}>
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message" rows={1} className="flex-1 min-h-[42px] max-h-32 px-4 py-2.5 rounded-lg border resize-none text-sm focus:outline-none focus:ring-2" style={{ borderColor: WA.border, backgroundColor: WA.inputBg, color: WA.text }} disabled={sending} />
              <button type="button" onClick={sendMessage} disabled={sending || !input.trim()} className="shrink-0 w-12 h-[42px] rounded-full flex items-center justify-center text-white disabled:opacity-50" style={{ backgroundColor: WA.green }} title="Send">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
