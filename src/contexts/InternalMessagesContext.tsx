"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";

export type MessagePart = { type: "text"; content: string } | { type: "voice"; url: string } | { type: "file"; url: string; name: string };

export type MessageStatus = "sending" | "sent" | "read";

export interface InternalMessage {
  id: string;
  conversationId: string;
  senderId: string;
  parts: MessagePart[];
  createdAt: number;
  status?: MessageStatus;
}

const STORAGE_KEY = "ollin_internal_messages";

function loadMessages(): InternalMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: InternalMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (_) {}
}

type InternalMessagesContextType = {
  messages: InternalMessage[];
  getConversation: (contactId: string) => InternalMessage[];
  sendText: (contactId: string, text: string, currentUserId?: string) => void;
  sendVoice: (contactId: string, blob: Blob, currentUserId?: string) => void;
  sendFile: (contactId: string, file: File, currentUserId?: string) => void;
  markConversationAsRead: (contactId: string, currentUserId?: string) => void;
};

const InternalMessagesContext = createContext<InternalMessagesContextType | null>(null);

function conversationId(a: string, b: string) {
  return [a, b].sort().join("--");
}

export function InternalMessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<InternalMessage[]>([]);

  useEffect(() => {
    setMessages(loadMessages());
  }, []);

  const getConversation = useCallback(
    (contactId: string) => {
      const cid = conversationId("me", contactId);
      return messages.filter((m) => m.conversationId === cid).sort((a, b) => a.createdAt - b.createdAt);
    },
    [messages]
  );

  const sendText = useCallback((contactId: string, text: string, currentUserId = "me") => {
    const msg: InternalMessage = {
      id: crypto.randomUUID(),
      conversationId: conversationId(currentUserId, contactId),
      senderId: currentUserId,
      parts: [{ type: "text", content: text }],
      createdAt: Date.now(),
      status: "sent",
    };
    setMessages((prev) => {
      const next = [msg, ...prev];
      saveMessages(next);
      return next;
    });
  }, []);

  const sendVoice = useCallback((contactId: string, blob: Blob, currentUserId = "me") => {
    const url = URL.createObjectURL(blob);
    const msg: InternalMessage = {
      id: crypto.randomUUID(),
      conversationId: conversationId(currentUserId, contactId),
      senderId: currentUserId,
      parts: [{ type: "voice", url }],
      createdAt: Date.now(),
      status: "sent",
    };
    setMessages((prev) => {
      const next = [msg, ...prev];
      saveMessages(next);
      return next;
    });
  }, []);

  const sendFile = useCallback((contactId: string, file: File, currentUserId = "me") => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const msg: InternalMessage = {
        id: crypto.randomUUID(),
        conversationId: conversationId(currentUserId, contactId),
        senderId: currentUserId,
        parts: [{ type: "file", url, name: file.name }],
        createdAt: Date.now(),
        status: "sent",
      };
      setMessages((prev) => {
        const next = [msg, ...prev];
        saveMessages(next);
        return next;
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const markConversationAsRead = useCallback((contactId: string, currentUserId = "me") => {
    const cid = conversationId(currentUserId, contactId);
    setMessages((prev) => {
      const next = prev.map((m) =>
        m.conversationId === cid && m.senderId === currentUserId ? { ...m, status: "read" as MessageStatus } : m
      );
      saveMessages(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ messages, getConversation, sendText, sendVoice, sendFile, markConversationAsRead }),
    [messages, getConversation, sendText, sendVoice, sendFile, markConversationAsRead]
  );

  return (
    <InternalMessagesContext.Provider value={value}>
      {children}
    </InternalMessagesContext.Provider>
  );
}

export function useInternalMessages() {
  const ctx = useContext(InternalMessagesContext);
  if (!ctx) throw new Error("useInternalMessages must be used within InternalMessagesProvider");
  return ctx;
}
