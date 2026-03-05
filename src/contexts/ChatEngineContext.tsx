"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import * as ChatLib from "@/lib/chat-engine";

const ChatEngineContext = createContext<any>(null);

export function ChatEngineProvider({ children }: { children: React.ReactNode }) {
  // AI assistant messages (Gemini-backed)
  const [messages, setMessages] = useState<ChatLib.AIMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  // Simple tick so internal chats can trigger re-renders when they change
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

    const userMsg: ChatLib.AIMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    const placeholderId = crypto.randomUUID();
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
    (contactId: string) => {
      const anyLib = ChatLib as any;
      if (typeof anyLib.getConversation === "function") {
        try {
          const thread = anyLib.getConversation(contactId);
          return Array.isArray(thread) ? thread : [];
        } catch {
          return [];
        }
      }

      const records = loadInternal();
      if (!records.length) return [];
      const cid = ChatLib.conversationId
        ? ChatLib.conversationId("me", contactId)
        : ["me", contactId].sort().join("--");
      return records
        .filter((m) => m.conversationId === cid)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    [loadInternal, internalVersion]
  );

  const sendText = useCallback(
    (contactId: string, text: string, currentUserId = "me") => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const anyLib = ChatLib as any;
      if (typeof anyLib.sendText === "function") {
        anyLib.sendText(contactId, trimmed, currentUserId);
        setInternalVersion((v) => v + 1);
        return;
      }

      const existing = loadInternal();
      const cid = ChatLib.conversationId
        ? ChatLib.conversationId(currentUserId, contactId)
        : [currentUserId, contactId].sort().join("--");
      const msg: ChatLib.InternalMessageRecord = {
        id: crypto.randomUUID(),
        conversationId: cid,
        senderId: currentUserId,
        parts: [{ type: "text", content: trimmed }],
        createdAt: Date.now(),
        status: "sent",
      };
      saveInternal([msg, ...existing]);
    },
    [loadInternal, saveInternal]
  );

  const sendVoice = useCallback(
    (contactId: string, blob: Blob, currentUserId = "me") => {
      const anyLib = ChatLib as any;
      if (typeof anyLib.sendVoice === "function") {
        anyLib.sendVoice(contactId, blob, currentUserId);
        setInternalVersion((v) => v + 1);
        return;
      }

      const existing = loadInternal();
      const cid = ChatLib.conversationId
        ? ChatLib.conversationId(currentUserId, contactId)
        : [currentUserId, contactId].sort().join("--");
      const url = URL.createObjectURL(blob);
      const msg: ChatLib.InternalMessageRecord = {
        id: crypto.randomUUID(),
        conversationId: cid,
        senderId: currentUserId,
        parts: [{ type: "voice", url }],
        createdAt: Date.now(),
        status: "sent",
      };
      saveInternal([msg, ...existing]);
    },
    [loadInternal, saveInternal]
  );

  const sendFile = useCallback(
    (contactId: string, file: File, currentUserId = "me") => {
      const anyLib = ChatLib as any;
      if (typeof anyLib.sendFile === "function") {
        anyLib.sendFile(contactId, file, currentUserId);
        setInternalVersion((v) => v + 1);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const existing = loadInternal();
        const cid = ChatLib.conversationId
          ? ChatLib.conversationId(currentUserId, contactId)
          : [currentUserId, contactId].sort().join("--");
        const url = reader.result as string;
        const msg: ChatLib.InternalMessageRecord = {
          id: crypto.randomUUID(),
          conversationId: cid,
          senderId: currentUserId,
          parts: [{ type: "file", url, name: file.name }],
          createdAt: Date.now(),
          status: "sent",
        };
        saveInternal([msg, ...existing]);
      };
      reader.readAsDataURL(file);
    },
    [loadInternal, saveInternal]
  );

  const markConversationAsRead = useCallback(
    (contactId: string, currentUserId = "me") => {
      const anyLib = ChatLib as any;
      if (typeof anyLib.markConversationAsRead === "function") {
        anyLib.markConversationAsRead(contactId, currentUserId);
        setInternalVersion((v) => v + 1);
        return;
      }

      const existing = loadInternal();
      const cid = ChatLib.conversationId
        ? ChatLib.conversationId(currentUserId, contactId)
        : [currentUserId, contactId].sort().join("--");
      const next = existing.map((m) =>
        m.conversationId === cid && m.senderId === currentUserId
          ? { ...m, status: "read" as const }
          : m
      );
      saveInternal(next);
    },
    [loadInternal, saveInternal]
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

  return <ChatEngineContext.Provider value={value}>{children}</ChatEngineContext.Provider>;
}

export const useChat = () => useContext(ChatEngineContext) || {};
export const useInternalMessages = () => useContext(ChatEngineContext) || {};