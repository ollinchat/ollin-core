"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { type AIMessage, loadAIMessages, saveAIMessages } from "@/lib/chat-engine";

// This interface must match what LibraryPanel and other components expect
type ChatEngineValue = {
  messages: AIMessage[];
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  // Adding this to prevent crashes if some components look for it
  isThinking?: boolean; 
};

const ChatEngineContext = createContext<ChatEngineValue | null>(null);

export function ChatEngineProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    const saved = loadAIMessages();
    if (saved) setMessages(saved);
  }, []);

  useEffect(() => {
    saveAIMessages(messages);
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    // 1. Add User Message
    const userMsg: AIMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);

    // 2. Add "Thinking" placeholder
    const placeholderId = crypto.randomUUID();
    setIsThinking(true);
    setMessages((prev) => [
      ...prev,
      { id: placeholderId, role: "assistant", content: "Thinking..." }
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();
      
      // 3. Replace placeholder with real response
      setMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? { ...m, content: data.text || "No response received." } : m))
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? { ...m, content: "Error connecting to AI. Please check your connection." } : m))
      );
    } finally {
      setIsThinking(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    saveAIMessages([]);
  }, []);

  const value = useMemo(() => ({ 
    messages, 
    sendMessage, 
    clearMessages,
    isThinking 
  }), [messages, sendMessage, clearMessages, isThinking]);

  return <ChatEngineContext.Provider value={value}>{children}</ChatEngineContext.Provider>;
}

export const useChat = () => {
  const ctx = useContext(ChatEngineContext);
  if (!ctx) {
    // Return a fallback to prevent "undefined" errors in LibraryPanel
    return { messages: [], sendMessage: async () => {}, clearMessages: () => {} };
  }
  return ctx;
};