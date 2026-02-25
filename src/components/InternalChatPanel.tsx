"use client";

import { useState, useRef, useCallback, useEffect } from "react"; // useEffect required for onSelectedContactChange sync
import Link from "next/link";
import { useContacts } from "@/contexts/ContactsContext";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useLiveCall } from "@/contexts/LiveCallContext";
import { isOllinUserId } from "@/lib/user-id";
import { Send, Mic, Paperclip, Search, QrCode, X, Camera, Phone, Video, ImageIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { InternalMessageRecord } from "@/contexts/ChatEngineContext";

function lastPreview(msgs: InternalMessageRecord[]): string {
  if (msgs.length === 0) return "";
  const last = msgs[msgs.length - 1];
  const part = last.parts[0];
  if (part.type === "text") return part.content.slice(0, 30) + (part.content.length > 30 ? "…" : "");
  if (part.type === "voice") return "🎤";
  return "📎";
}

type Props = { locale: "en" | "he"; compact?: boolean; onSelectedContactChange?: (id: string | null) => void };

export function InternalChatPanel({ locale, compact, onSelectedContactChange }: Props) {
  const { contacts, addContact } = useContacts();
  const { profile } = useProfile();
  const { getConversation, sendText, sendVoice, sendFile } = useInternalMessages();
  const liveCall = useLiveCall();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [recording, setRecording] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredContacts = searchLower
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          (c.email && c.email.toLowerCase().includes(searchLower)) ||
          (c.userId && c.userId.toLowerCase().includes(searchLower))
      )
    : contacts;
  const canAddByUsername = searchLower.length >= 2 && !contacts.some((c) => c.name.toLowerCase() === searchLower || c.email?.toLowerCase() === searchLower || c.userId?.toLowerCase() === searchLower);

  const selected = selectedId ? contacts.find((c) => c.id === selectedId) : null;
  const thread = selectedId ? getConversation(selectedId) : [];

  useEffect(() => {
    onSelectedContactChange?.(selectedId);
  }, [selectedId, onSelectedContactChange]);

  const handleAddByUsername = useCallback(() => {
    if (!searchLower || searchLower.length < 2) return;
    const name = isOllinUserId(searchLower) ? `User ${searchLower}` : searchLower;
    const newContact = addContact({
      name,
      email: `${searchLower.replace(/\s/g, "-")}@ollin.local`,
      userId: isOllinUserId(searchLower) ? searchLower : undefined,
    });
    setSelectedId(newContact.id);
    setSearchQuery("");
  }, [searchLower, addContact]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !selectedId) return;
    sendText(selectedId, text);
    setInput("");
  }, [input, selectedId, sendText]);

  const startVoice = useCallback(() => {
    if (!selectedId || !navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        sendVoice(selectedId, blob);
      };
      mr.start();
      setRecording(true);
    });
  }, [selectedId, sendVoice]);

  const stopVoice = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedId) return;
      sendFile(selectedId, file);
      e.target.value = "";
    },
    [selectedId, sendFile]
  );

  const onCameraCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedId) return;
      sendFile(selectedId, file);
      e.target.value = "";
    },
    [selectedId, sendFile]
  );

  const onGalleryPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedId) return;
      sendFile(selectedId, file);
      e.target.value = "";
    },
    [selectedId, sendFile]
  );

  const profileUrl = typeof window !== "undefined" && profile.username ? `${window.location.origin}/p/${encodeURIComponent(profile.username)}` : "";

  return (
    <div className={`flex flex-col ${compact ? "min-h-0 flex-1" : "h-full"} rounded-2xl bg-white/90 shadow-soft border-0 overflow-hidden`}>
      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setQrOpen(false)} role="dialog" aria-modal="true">
          <div className="rounded-2xl bg-white p-6 shadow-xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{locale === "he" ? "הקוד שלי" : "My QR Code"}</h3>
              <button type="button" onClick={() => setQrOpen(false)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            {profileUrl ? (
              <>
                <p className="text-xs text-gray-600 mb-3">{locale === "he" ? "סרוק כדי להוסיף אליי" : "Scan to add me"}</p>
                <div className="flex justify-center bg-gray-50 rounded-xl p-4">
                  <QRCodeSVG value={profileUrl} size={200} level="M" />
                </div>
                <p className="text-xs text-gray-500 mt-3 break-all">{profileUrl}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500 py-4">{locale === "he" ? "הגדר שם משתמש בפרופיל כדי להציג קוד QR." : "Set a username in your profile to show a QR code."}</p>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <aside className={`flex flex-col border-r border-gray-100 bg-gray-50/50 ${compact ? "w-28 sm:w-36 flex-shrink-0" : "w-32 sm:w-40 flex-shrink-0"}`}>
          <div className="p-1.5 flex-shrink-0 flex flex-col gap-1">
            <div className="relative flex items-center">
              <Search className="absolute left-2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canAddByUsername) {
                    e.preventDefault();
                    handleAddByUsername();
                  }
                }}
                placeholder={locale === "he" ? "חיפוש: שם משתמש או מזהה 7 ספרות (למשל 0123456)" : "Search: username or 7-digit ID (e.g. 0123456)"}
                className="w-full pl-8 pr-2 py-1.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
            {canAddByUsername && (
              <button
                type="button"
                onClick={handleAddByUsername}
                className="w-full text-left px-2 py-1.5 rounded-xl text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200"
              >
                + {locale === "he" ? `התחל צ'אט עם ${searchQuery}` : `Start chat with ${searchQuery}`}
              </button>
            )}
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-medium text-teal-600 hover:bg-teal-50"
            >
              <QrCode className="w-4 h-4" />
              {locale === "he" ? "הקוד שלי" : "My QR Code"}
            </button>
          </div>
          <div className="p-1.5 overflow-y-auto flex-1 min-h-0">
            {filteredContacts.length === 0 ? (
              <p className="p-2 text-xs text-gray-500">{searchQuery.trim() ? (locale === "he" ? "אין תוצאות" : "No results") : (locale === "he" ? "אין אנשי קשר" : "No contacts")}</p>
            ) : (
              filteredContacts.map((c) => {
                const msgs = getConversation(c.id);
                const preview = lastPreview(msgs);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-2 rounded-xl flex items-center gap-2 ${selectedId === c.id ? "bg-accent-muted/50" : "hover:bg-gray-100"}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center text-accent font-semibold text-sm flex-shrink-0">
                      {c.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 hidden sm:block">
                      <p className="font-medium text-gray-900 truncate text-sm">{c.name}</p>
                      {preview && <p className="text-[10px] text-gray-500 truncate">{preview}</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
        <main className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <>
              <div className="flex-shrink-0 px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                {/* Green glow only when a real WebRTC call is established (type === "active") with this contact */}
                <div
                  className={`w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center text-accent text-sm font-semibold flex-shrink-0 ${liveCall?.call?.type === "active" && (liveCall.call.contactId === selected.id || liveCall.call.contactName === selected.name) ? "ring-2 ring-green-400 shadow-lg" : ""}`}
                >
                  {selected.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="font-medium text-gray-900 text-sm truncate flex-1 min-w-0">{selected.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => liveCall?.startCall(selected.id, selected.name, false, selected.userId)}
                    className="p-2 rounded-xl text-gray-600 hover:bg-teal-50 hover:text-teal-600"
                    aria-label="Voice call"
                    title={locale === "he" ? "שיחת קול" : "Voice call"}
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => liveCall?.startCall(selected.id, selected.name, true, selected.userId)}
                    className="p-2 rounded-xl text-gray-600 hover:bg-teal-50 hover:text-teal-600"
                    aria-label="Video call"
                    title={locale === "he" ? "שיחת וידאו" : "Video call"}
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 min-h-0">
                {thread.map((m) => (
                  <div key={m.id} className={`flex ${m.senderId === "me" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`rounded-xl px-3 py-1.5 max-w-[90%] ${
                        m.senderId === "me" ? "bg-gradient-to-r from-accent-emerald to-accent text-white" : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {m.parts.map((p, i) => {
                        if (p.type === "text") return <p key={i} className="text-xs">{p.content}</p>;
                        if (p.type === "voice") return <audio key={i} src={p.url} controls className="max-w-full h-7" />;
                        return (
                          <a key={i} href={p.url} download={p.name} className="text-xs underline block">
                            📎 {p.name}
                          </a>
                        );
                      })}
                      <p className="text-[9px] opacity-80 mt-0.5">
                        {new Date(m.createdAt).toLocaleTimeString(undefined, { timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex-shrink-0 p-1.5 flex gap-1 items-center border-t border-gray-100">
                <input type="file" ref={fileInputRef} className="hidden" onChange={onFileChange} />
                <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={onCameraCapture} />
                <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={onGalleryPick} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100"
                  aria-label="File (Paperclip)"
                  title={locale === "he" ? "קובץ" : "File"}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100"
                  aria-label="Gallery (Image)"
                  title={locale === "he" ? "גלריה" : "Gallery"}
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100"
                  aria-label="Camera"
                  title={locale === "he" ? "מצלמה" : "Camera"}
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={locale === "he" ? "הודעה…" : "Message…"}
                  className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-xs min-w-0"
                />
                <button
                  type="button"
                  onMouseDown={startVoice}
                  onMouseUp={stopVoice}
                  onMouseLeave={stopVoice}
                  onTouchStart={startVoice}
                  onTouchEnd={stopVoice}
                  className={`p-1.5 rounded-xl ${recording ? "bg-red-100 text-red-600" : "text-gray-500 hover:bg-gray-100"}`}
                  aria-label="Voice note (Mic)"
                  title={locale === "he" ? "הקלטת קול" : "Voice note"}
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button type="button" onClick={handleSend} className="p-1.5 rounded-xl bg-accent text-white">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs p-4">
              {locale === "he" ? "בחר איש קשר" : "Select a contact"}
            </div>
          )}
        </main>
      </div>
      {!compact && (
        <div className="flex-shrink-0 p-2 border-t border-gray-100">
          <Link
            href="/dashboard/messages"
            className="block text-center py-2 rounded-xl bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20"
          >
            {locale === "he" ? "צ'אט מלא" : "Full chat"}
          </Link>
        </div>
      )}
    </div>
  );
}
