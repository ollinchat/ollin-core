"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import * as ChatLib from "@/lib/chat-engine";

const ChatEngineContext = createContext<any>(null);

export function ChatEngineProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    if (ChatLib.loadAIMessages) {
      const saved = ChatLib.loadAIMessages();
      if (saved) setMessages(saved);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    const userMsg = { id: crypto.randomUUID(), role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    const placeholderId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: placeholderId, role: "assistant", content: "Ollin is thinking..." }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await res.json();
      setMessages((prev) => prev.map(m => m.id === placeholderId ? { ...m, content: data.text || "No response" } : m));
    } catch (err) {
      setMessages((prev) => prev.map(m => m.id === placeholderId ? { ...m, content: "Connection error." } : m));
    } finally {
      setIsThinking(false);
    }
  }, []);

  const value = useMemo(() => ({
    messages,
    sendMessage,
    isThinking,
    clearMessages: () => { setMessages([]); if(ChatLib.saveAIMessages) ChatLib.saveAIMessages([]); },
    // Safely calling internal functions if they exist
    getConversation: (id: string) => ChatLib.getConversation ? ChatLib.getConversation(id) : { messages: [] },
    getConversationsWithMeta: () => ChatLib.getConversationsWithMeta ? ChatLib.getConversationsWithMeta() : [],
    sendText: (contactId: string, text: string) => ChatLib.sendText ? ChatLib.sendText(contactId, text) : console.log("sendText missing"),
    sendVoice: () => {},
    sendFile: () => {},
    markConversationAsRead: () => {},
    deleteConversation: () => {}
  }), [messages, sendMessage, isThinking]);

  return <ChatEngineContext.Provider value={value}>{children}</ChatEngineContext.Provider>;
}

export const useChat = () => {
  const ctx = useContext(ChatEngineContext);
  if (!ctx) return { messages: [], sendMessage: async () => {}, isThinking: false };
  return ctx;
};

export const useInternalMessages = () => useChat();