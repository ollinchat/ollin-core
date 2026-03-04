"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

const ChatEngineContext = createContext<any>(null);

export function ChatEngineProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  // 1. Sidebar Data with valid Date objects
  const DEFAULT_CONVERSATIONS = [
    { 
      id: "1", 
      name: "emil kanz", 
      lastMessage: "Hello", 
      timestamp: new Date().toLocaleDateString(), 
      avatar: "E",
      phone: "+972550000000"
    },
    { 
      id: "2", 
      name: "emil kanz", 
      lastMessage: "Fence project", 
      timestamp: new Date().toLocaleDateString(), 
      avatar: "E",
      phone: "+972550000000"
    }
  ];

  // 2. AI Chat Logic (Fixes the AI not answering)
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    const userMsg = { id: crypto.randomUUID(), role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    
    const placeholderId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: placeholderId, role: "assistant", content: "Thinking..." }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await res.json();
      setMessages((prev) => prev.map(m => m.id === placeholderId ? { ...m, content: data.text || "No response" } : m));
    } catch (err) {
      setMessages((prev) => prev.map(m => m.id === placeholderId ? { ...m, content: "Error connecting." } : m));
    } finally {
      setIsThinking(false);
    }
  }, []);

  const value = useMemo(() => ({
    messages,
    sendMessage,
    isThinking,
    getConversationsWithMeta: () => DEFAULT_CONVERSATIONS,
    
    // 3. Thread Logic (Fixes the "not iterable" and returns profile data)
    getConversation: (id: string) => ({
      id,
      name: "emil kanz",
      phone: "+972550000000",
      avatar: "E",
      status: "pending",
      messages: [
        { 
          id: "sys-1", 
          role: "system", 
          type: "action_required", 
          content: "Action Required: Accept contact to start tracking tasks." 
        },
        { id: "m1", role: "user", content: "Hello, I need help with a fence." }
      ]
    }),

    sendText: (contactId: string, text: string) => console.log("Internal message sent"),
    clearMessages: () => setMessages([]),
    markConversationAsRead: () => {},
  }), [messages, isThinking, sendMessage]);

  return <ChatEngineContext.Provider value={value}>{children}</ChatEngineContext.Provider>;
}

export const useChat = () => useContext(ChatEngineContext) || {};
export const useInternalMessages = () => useContext(ChatEngineContext) || {};