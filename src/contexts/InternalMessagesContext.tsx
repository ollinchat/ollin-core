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

export type ConversationMeta = { contactId: string; lastMessage: string; lastTime: number };

type InternalMessagesContextType = {
  messages: InternalMessage[];
  groups: GroupConversation[];
  getConversation: (contactId: string) => InternalMessage[];
  getConversationsWithMeta: (currentUserId: string) => ConversationMeta[];
  getGroupConversation: (groupId: string) => InternalMessage[];
  sendText: (contactId: string, text: string, currentUserId?: string) => void;
  sendTextToGroup: (groupId: string, text: string, currentUserId?: string) => void;
  sendVoice: (contactId: string, blob: Blob, currentUserId?: string) => void;
  sendFile: (contactId: string, file: File, currentUserId?: string) => void;
  markConversationAsRead: (contactId: string, currentUserId?: string) => void;
  createGroup: (name: string, participantIds: string[]) => GroupConversation;
  updateGroupName: (groupId: string, name: string) => void;
  removeGroup: (groupId: string) => void;
};

const InternalMessagesContext = createContext<InternalMessagesContextType | null>(null);

export function conversationId(a: string, b: string) {
  return [a, b].sort().join("--");
}

const GROUP_PREFIX = "group:";

export interface GroupConversation {
  id: string;
  name: string;
  participantIds: string[];
  createdAt: number;
}

const GROUPS_KEY = "ollin_internal_groups";

function loadGroups(): GroupConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGroups(groups: GroupConversation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  } catch (_) {}
}

export function InternalMessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [groups, setGroups] = useState<GroupConversation[]>([]);

  useEffect(() => {
    setMessages(loadMessages());
    setGroups(loadGroups());
  }, []);

  const getConversation = useCallback(
    (contactId: string) => {
      const cid = conversationId("me", contactId);
      return messages.filter((m) => m.conversationId === cid).sort((a, b) => a.createdAt - b.createdAt);
    },
    [messages]
  );

  const getConversationsWithMeta = useCallback(
    (currentUserId: string) => {
      const byCid = new Map<string, { last: string; time: number }>();
      for (const m of messages) {
        const parts = m.conversationId.split("--");
        const otherId = parts.find((p) => p !== currentUserId);
        if (!otherId) continue;
        const text = m.parts.find((p) => p.type === "text")?.content ?? (m.parts[0]?.type === "voice" ? "🎤" : "📎");
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
    [messages]
  );

  const getGroupConversation = useCallback(
    (groupId: string) => {
      const cid = GROUP_PREFIX + groupId;
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

  const sendTextToGroup = useCallback((groupId: string, text: string, currentUserId = "me") => {
    const cid = GROUP_PREFIX + groupId;
    const msg: InternalMessage = {
      id: crypto.randomUUID(),
      conversationId: cid,
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

  const createGroup = useCallback((name: string, participantIds: string[]) => {
    const group: GroupConversation = {
      id: crypto.randomUUID(),
      name: name.trim() || "Group",
      participantIds: [...participantIds],
      createdAt: Date.now(),
    };
    setGroups((prev) => {
      const next = [group, ...prev];
      saveGroups(next);
      return next;
    });
    return group;
  }, []);

  const updateGroupName = useCallback((groupId: string, name: string) => {
    setGroups((prev) => {
      const next = prev.map((g) => (g.id === groupId ? { ...g, name: name.trim() || g.name } : g));
      saveGroups(next);
      return next;
    });
  }, []);

  const removeGroup = useCallback((groupId: string) => {
    const cid = GROUP_PREFIX + groupId;
    setGroups((prev) => {
      const next = prev.filter((g) => g.id !== groupId);
      saveGroups(next);
      return next;
    });
    setMessages((prev) => {
      const next = prev.filter((m) => m.conversationId !== cid);
      saveMessages(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      messages,
      groups,
      getConversation,
      getConversationsWithMeta,
      getGroupConversation,
      sendText,
      sendTextToGroup,
      sendVoice,
      sendFile,
      markConversationAsRead,
      createGroup,
      updateGroupName,
      removeGroup,
    }),
    [
      messages,
      groups,
      getConversation,
      getConversationsWithMeta,
      getGroupConversation,
      sendText,
      sendTextToGroup,
      sendVoice,
      sendFile,
      markConversationAsRead,
      createGroup,
      updateGroupName,
      removeGroup,
    ]
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
