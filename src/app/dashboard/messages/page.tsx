"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useContacts } from "@/contexts/ContactsContext";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { ChevronLeft, Send, Mic, Paperclip, Check } from "lucide-react";
import type { InternalMessageRecord } from "@/contexts/ChatEngineContext";
import { VoiceWaveformPlayer } from "@/components/VoiceWaveformPlayer";

function lastMessagePreview(msgs: InternalMessageRecord[]): string {
  if (msgs.length === 0) return "No messages yet";
  const last = msgs[msgs.length - 1];
  const part = last.parts[0];
  if (part.type === "text") return part.content.slice(0, 40) + (part.content.length > 40 ? "…" : "");
  if (part.type === "voice") return "🎤 Voice note";
  return `📎 ${part.name}`;
}

export default function MessagesPage() {
  const { contacts } = useContacts();
  const { getConversation, sendText, sendVoice, sendFile, markConversationAsRead, currentUserId } = useInternalMessages();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  const selected = selectedId ? contacts.find((c) => c.id === selectedId) : null;
  const thread = selectedId ? getConversation(selectedId) : [];

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  // Simulate read receipts: when viewing the thread, mark our messages as "read" after a short delay
  useEffect(() => {
    if (!selectedId) return;
    const t = setTimeout(() => markConversationAsRead(selectedId, currentUserId), 1500);
    return () => clearTimeout(t);
  }, [selectedId, markConversationAsRead, currentUserId]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !selectedId) return;
    sendText(selectedId, text, currentUserId);
    setInput("");
    setTypingIndicator(false);
  }, [input, selectedId, sendText, currentUserId]);

  const startVoice = useCallback(() => {
    if (!selectedId) return;
    if (!navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        sendVoice(selectedId, blob, currentUserId);
      };
      mr.start();
      setRecording(true);
    });
  }, [selectedId, sendVoice, currentUserId]);

  const stopVoice = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedId) return;
      sendFile(selectedId, file, currentUserId);
      e.target.value = "";
    },
    [selectedId, sendFile, currentUserId]
  );

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setTypingIndicator(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTypingIndicator(false), 2000);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white shadow-sm">
        <Link href="/dashboard" className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 flex-1">Messages</h1>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-full sm:w-80 flex-shrink-0 border-r border-gray-100 flex flex-col bg-white">
          <div className="p-2 overflow-y-auto flex-1">
            {contacts.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No contacts. Add contacts to start messaging.</p>
            ) : (
              contacts.map((c) => {
                const msgs = getConversation(c.id);
                const preview = lastMessagePreview(msgs);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 ${selectedId === c.id ? "bg-[#008080]/10" : "hover:bg-gray-50"}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#008080]/15 flex items-center justify-center text-[#008080] font-semibold flex-shrink-0">
                      {c.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 truncate">{preview}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
          {selected ? (
            <>
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#008080]/15 flex items-center justify-center text-[#008080] text-sm font-semibold">
                  {selected.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="font-semibold text-gray-900">{selected.name}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {thread.map((m, index) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${m.senderId === currentUserId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-2.5 max-w-[85%] shadow-sm ${
                          m.senderId === currentUserId
                            ? "bg-gradient-to-br from-[#008080] to-[#006666] text-white rounded-br-md"
                            : "bg-white text-gray-900 border border-gray-100 rounded-bl-md"
                        }`}
                      >
                        {m.parts.map((p, i) => {
                          if (p.type === "text") return <p key={i} className="text-sm leading-snug">{p.content}</p>;
                          if (p.type === "voice")
                            return (
                              <div key={i} className={m.senderId === currentUserId ? "text-white" : "text-gray-800"}>
                                <VoiceWaveformPlayer src={p.url} />
                              </div>
                            );
                          return (
                            <a key={i} href={p.url} download={p.name} className="text-sm underline flex items-center gap-1">
                              📎 {p.name}
                            </a>
                          );
                        })}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] opacity-80">
                            {new Date(m.createdAt).toLocaleTimeString(undefined, { timeStyle: "short" })}
                          </span>
                          {m.senderId === currentUserId && (
                            <span className="opacity-90" title={m.status === "read" ? "Read" : "Sent"}>
                              {m.status === "read" ? (
                                <span className="inline-flex">
                                  <Check className="w-3.5 h-3.5" />
                                  <Check className="w-3.5 h-3.5 -ml-2.5" />
                                </span>
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {typingIndicator && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-start"
                  >
                    <div className="rounded-2xl rounded-bl-md px-4 py-2 bg-white border border-gray-100 text-gray-500 text-xs">
                      {selected.name} is typing…
                    </div>
                  </motion.div>
                )}
                <div ref={listEndRef} />
              </div>

              <div className="flex-shrink-0 p-3 flex gap-2 items-center border-t border-gray-100 bg-white">
                <input type="file" ref={fileInputRef} className="hidden" onChange={onFileChange} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-2xl text-gray-500 hover:bg-gray-100 transition-colors"
                  aria-label="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={onInputChange}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type a message…"
                  className="flex-1 rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#008080]/20 focus:bg-white border border-transparent focus:border-[#008080]/30"
                />
                <button
                  type="button"
                  onMouseDown={startVoice}
                  onMouseUp={stopVoice}
                  onMouseLeave={stopVoice}
                  onTouchStart={startVoice}
                  onTouchEnd={stopVoice}
                  className={`p-2.5 rounded-2xl transition-colors ${recording ? "bg-red-100 text-red-600" : "text-gray-500 hover:bg-gray-100"}`}
                  aria-label="Voice note"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  className="p-2.5 rounded-2xl bg-gradient-to-br from-[#008080] to-[#006666] text-white shadow-md hover:shadow-lg transition-shadow"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              Select a contact to start chatting
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
