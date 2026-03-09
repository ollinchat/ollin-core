"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import * as ChatLib from "@/lib/chat-engine";
import { generateUUID } from "@/lib/uuid";

const DEV_USER_KEY = "ollin_dev_current_user";

/** Document language preference for generated documents */
export type DocumentLanguagePreference = "he" | "en" | "bilingual";

/** Bank details for payments (shown on tax invoices, not on receipts) */
export interface BankDetails {
  iban?: string;
  swift?: string;
  bitLink?: string;
  bankName?: string;
  branchNumber?: string;
  accountNumber?: string;
}

/** Business/issuer identity for billing (From section on invoices). */
export interface BusinessProfile {
  legalName: string;
  taxId: string;
  address: string;
  businessLogo: string;
  bankDetails: BankDetails;
  /** Bilingual display */
  legalNameEn?: string;
  legalNameHe?: string;
  addressEn?: string;
  addressHe?: string;
  /** Structured address (bilingual) for document generation */
  addressCityEn?: string;
  addressCityHe?: string;
  addressStreetEn?: string;
  addressStreetHe?: string;
  addressZipEn?: string;
  addressZipHe?: string;
  addressCountryEn?: string;
  addressCountryHe?: string;
  /** Office contact (synced across languages for documents) */
  officeEmail?: string;
  officePhone?: string;
  /** Signature image (data URL) for PDFs */
  signature?: string;
  /** Document language: Hebrew only, English only, or both */
  documentLanguage?: DocumentLanguagePreference;
  /** Initial sequence numbers for document numbering */
  initialInvoiceNumber?: number;
  initialReceiptNumber?: number;
  initialQuoteNumber?: number;
  initialDeliveryNoteNumber?: number;
}

export type DevCurrentUser = {
  id: string;
  name: string;
  phone: string;
  businessProfile?: BusinessProfile;
};

function loadDevCurrentUser(): DevCurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEV_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DevCurrentUser;
    if (parsed?.id && parsed?.name != null) {
      return { ...parsed, businessProfile: parsed.businessProfile };
    }
    return null;
  } catch {
    return null;
  }
}

function saveDevCurrentUser(user: DevCurrentUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) localStorage.setItem(DEV_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(DEV_USER_KEY);
  } catch (_) {}
}

function DevIdentityPrompt({ onSet }: { onSet: (u: DevCurrentUser) => void }) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const p = phone.trim();
    const id = p || n || "me";
    if (id) onSet({ id, name: n || id, phone: p });
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Who are you? (dev)
        </h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Enter name and phone so you can test chat between two users.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            autoFocus
          />
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

const ChatEngineContext = createContext<any>(null);

export function ChatEngineProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<DevCurrentUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCurrentUserState(loadDevCurrentUser());
    setHydrated(true);
  }, []);

  const setCurrentUser = useCallback((user: DevCurrentUser | null) => {
    setCurrentUserState(user);
    saveDevCurrentUser(user);
  }, []);

  const updateBusinessProfile = useCallback((updater: (prev: BusinessProfile | undefined) => BusinessProfile) => {
    setCurrentUserState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, businessProfile: updater(prev.businessProfile) };
      saveDevCurrentUser(next);
      return next;
    });
  }, []);

  const currentUserId = currentUser?.id ?? "me";

  // AI assistant messages (Gemini-backed)
  const [messages, setMessages] = useState<ChatLib.AIMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [internalVersion, setInternalVersion] = useState(0);

  // Restore assistant history from lib (if available)
  useEffect(() => {
    try {
      if (ChatLib.loadAIMessages) {
        const saved = ChatLib.loadAIMessages();
        if (Array.isArray(saved)) setMessages(saved);
      }
    } catch {
      // fail silently, start with empty history
    }
  }, []);

  // Persist assistant messages whenever they change
  useEffect(() => {
    try {
      if (ChatLib.saveAIMessages) ChatLib.saveAIMessages(messages);
    } catch {
      // ignore persistence errors
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const userMsg: ChatLib.AIMessage = { id: generateUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    const placeholderId = generateUUID();
    setMessages((prev) => [...prev, { id: placeholderId, role: "assistant", content: "Thinking…" } as ChatLib.AIMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      const replyText = (data && typeof data.text === "string" && data.text.trim()) || "No response";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId ? { ...m, content: replyText } as ChatLib.AIMessage : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? ({ ...m, content: "Connection error. Please try again." } as ChatLib.AIMessage)
            : m
        )
      );
    } finally {
      setIsThinking(false);
    }
  }, []);

  // Helpers for internal (user-to-user) messages stored in lib
  const loadInternal = useCallback((): ChatLib.InternalMessageRecord[] => {
    try {
      if (ChatLib.loadInternalMessages) {
        const stored = ChatLib.loadInternalMessages();
        return Array.isArray(stored) ? stored : [];
      }
    } catch {
      // ignore
    }
    return [];
  }, []);

  const saveInternal = useCallback((records: ChatLib.InternalMessageRecord[]) => {
    try {
      if (ChatLib.saveInternalMessages) ChatLib.saveInternalMessages(records);
      setInternalVersion((v) => v + 1);
    } catch {
      // ignore persistence errors
    }
  }, []);

  // Cross-tab sync: when another tab updates internal messages, refresh
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ollin_internal_messages") setInternalVersion((v) => v + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const getConversationsWithMeta = useCallback(
    (currentUserId: string) => {
      // Prefer lib implementation if it exists
      // (pass currentUserId if the lib expects it, otherwise ignore)
      const anyLib = ChatLib as any;
      if (typeof anyLib.getConversationsWithMeta === "function") {
        try {
          const result = anyLib.getConversationsWithMeta(currentUserId);
          return Array.isArray(result) ? result : [];
        } catch {
          return [];
        }
      }

      const records = loadInternal();
      if (!records.length) return [];

      const byCid = new Map<string, { last: string; time: number }>();
      for (const m of records) {
        const parts = m.conversationId.split("--");
        const otherId = parts.find((p) => p !== currentUserId);
        if (!otherId) continue;
        const text =
          m.parts.find((p) => p.type === "text")?.content ??
          (m.parts[0]?.type === "voice" ? "🎤" : "📎");
        const existing = byCid.get(m.conversationId);
        if (!existing || m.createdAt > existing.time) {
          byCid.set(m.conversationId, { last: text, time: m.createdAt });
        }
      }

      return Array.from(byCid.entries())
        .map(([cid, { last, time }]) => {
          const parts = cid.split("--");
          const contactId = parts.find((p) => p !== currentUserId) ?? parts[0];
          return { contactId, lastMessage: last, lastTime: time };
        })
        .sort((a, b) => b.lastTime - a.lastTime);
    },
    [loadInternal, internalVersion]
  );

  const getConversation = useCallback(
    (contactId: string, forUserId?: string) => {
      const uid = forUserId ?? currentUserId;
      const anyLib = ChatLib as any;
      if (typeof anyLib.getConversation === "function") {
        try {
          const thread = anyLib.getConversation(contactId, uid);
          return Array.isArray(thread) ? thread : [];
        } catch {
          return [];
        }
      }

      const records = loadInternal();
      if (!records.length) return [];
      const cid = ChatLib.conversationId
        ? ChatLib.conversationId(uid, contactId)
        : [uid, contactId].sort().join("--");
      return records
        .filter((m) => m.conversationId === cid)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    [loadInternal, internalVersion, currentUserId]
  );

  const sendText = useCallback(
    (contactId: string, text: string, senderId?: string) => {
      const uid = senderId ?? currentUserId;
      const trimmed = text.trim();
      if (!trimmed) return;

      const anyLib = ChatLib as any;
      if (typeof anyLib.sendText === "function") {
        anyLib.sendText(contactId, trimmed, uid);
        setInternalVersion((v) => v + 1);
        return;
      }

      const existing = loadInternal();
      const cid = ChatLib.conversationId
        ? ChatLib.conversationId(uid, contactId)
        : [uid, contactId].sort().join("--");
      const msg: ChatLib.InternalMessageRecord = {
        id: generateUUID(),
        conversationId: cid,
        senderId: uid,
        parts: [{ type: "text", content: trimmed }],
        createdAt: Date.now(),
        status: "sent",
      };
      saveInternal([msg, ...existing]);
    },
    [loadInternal, saveInternal, currentUserId]
  );

  const sendVoice = useCallback(
    (contactId: string, blob: Blob, senderId?: string) => {
      const uid = senderId ?? currentUserId;
      const anyLib = ChatLib as any;
      if (typeof anyLib.sendVoice === "function") {
        anyLib.sendVoice(contactId, blob, uid);
        setInternalVersion((v) => v + 1);
        return;
      }

      const existing = loadInternal();
      const cid = ChatLib.conversationId
        ? ChatLib.conversationId(uid, contactId)
        : [uid, contactId].sort().join("--");
      const url = URL.createObjectURL(blob);
      const msg: ChatLib.InternalMessageRecord = {
        id: generateUUID(),
        conversationId: cid,
        senderId: uid,
        parts: [{ type: "voice", url }],
        createdAt: Date.now(),
        status: "sent",
      };
      saveInternal([msg, ...existing]);
    },
    [loadInternal, saveInternal, currentUserId]
  );

  const sendFile = useCallback(
    (contactId: string, file: File, senderId?: string) => {
      const uid = senderId ?? currentUserId;
      const anyLib = ChatLib as any;
      if (typeof anyLib.sendFile === "function") {
        anyLib.sendFile(contactId, file, uid);
        setInternalVersion((v) => v + 1);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const existing = loadInternal();
        const cid = ChatLib.conversationId
          ? ChatLib.conversationId(uid, contactId)
          : [uid, contactId].sort().join("--");
        const url = reader.result as string;
        const msg: ChatLib.InternalMessageRecord = {
          id: generateUUID(),
          conversationId: cid,
          senderId: uid,
          parts: [{ type: "file", url, name: file.name }],
          createdAt: Date.now(),
          status: "sent",
        };
        saveInternal([msg, ...existing]);
      };
      reader.readAsDataURL(file);
    },
    [loadInternal, saveInternal, currentUserId]
  );

  const markConversationAsRead = useCallback(
    (contactId: string, forUserId?: string) => {
      const uid = forUserId ?? currentUserId;
      const anyLib = ChatLib as any;
      if (typeof anyLib.markConversationAsRead === "function") {
        anyLib.markConversationAsRead(contactId, uid);
        setInternalVersion((v) => v + 1);
        return;
      }

      const existing = loadInternal();
      const cid = ChatLib.conversationId
        ? ChatLib.conversationId(uid, contactId)
        : [uid, contactId].sort().join("--");
      const next = existing.map((m) =>
        m.conversationId === cid && m.senderId === uid
          ? { ...m, status: "read" as const }
          : m
      );
      saveInternal(next);
    },
    [loadInternal, saveInternal, currentUserId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    try {
      if (ChatLib.saveAIMessages) ChatLib.saveAIMessages([]);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      // Dev identity (for testing chat between two users)
      currentUser,
      setCurrentUser,
      updateBusinessProfile,
      currentUserId,
      // AI chat (Gemini)
      messages,
      sendMessage,
      isThinking,
      clearMessages,
      // Internal chats
      getConversationsWithMeta,
      getConversation,
      sendText,
      sendVoice,
      sendFile,
      markConversationAsRead,
    }),
    [
      currentUser,
      setCurrentUser,
      updateBusinessProfile,
      currentUserId,
      messages,
      sendMessage,
      isThinking,
      clearMessages,
      getConversationsWithMeta,
      getConversation,
      sendText,
      sendVoice,
      sendFile,
      markConversationAsRead,
    ]
  );

  const content = !hydrated
    ? null
    : !currentUser
      ? <DevIdentityPrompt onSet={setCurrentUser} />
      : children;

  return <ChatEngineContext.Provider value={value}>{content}</ChatEngineContext.Provider>;
}

export const useChat = () => useContext(ChatEngineContext) || {};
export const useInternalMessages = () => useContext(ChatEngineContext) || {};