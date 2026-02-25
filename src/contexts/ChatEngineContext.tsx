"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import {
  type AIMessage,
  type InternalMessageRecord,
  type InternalMessagePart,
  type QuoteCardPayload,
  type EventCardPayload,
  detectLanguage,
  generateReply,
  getLastMessageIsTaskIntent,
  shouldUseSearchTool,
  loadAIMessages,
  saveAIMessages,
  loadInternalMessages,
  saveInternalMessages,
  conversationId,
  buildBoardSummary,
  buildFinanceSummary,
  parseTaskTitleFromIntent,
  isEventIntent,
  isPollIntent,
  isDoneIntent,
  parseDoneIntent,
  isHandledIntent,
  parseHandledIntent,
  parseMentionInPassing,
} from "@/lib/chat-engine";
import { useProfile } from "@/contexts/ProfileContext";
import { useBoard } from "@/contexts/BoardContext";
import { useFinance } from "@/contexts/FinanceContext";

// Re-export for consumers
export type { AIMessage, InternalMessageRecord, InternalMessagePart };
export type MessageStatus = "sending" | "sent" | "read";

type AISlice = {
  messages: AIMessage[];
  sendMessage: (content: string) => void;
  lastMessageIsTaskIntent: boolean;
  addFormMessage: (formType: "poll" | "event" | "task" | "converter") => void;
  addCard: (cardType: "quote" | "event", content: string, payload: QuoteCardPayload | EventCardPayload) => void;
  clearMessages: () => void;
};

type InternalSlice = {
  messages: InternalMessageRecord[];
  getConversation: (contactId: string) => InternalMessageRecord[];
  sendText: (contactId: string, text: string, currentUserId?: string) => void;
  sendVoice: (contactId: string, blob: Blob, currentUserId?: string) => void;
  sendFile: (contactId: string, file: File, currentUserId?: string) => void;
  markConversationAsRead: (contactId: string, currentUserId?: string) => void;
};

type ChatEngineValue = {
  /** Language detected from last user input (engine level). */
  detectedLanguage: "he" | "en";
  ai: AISlice;
  internal: InternalSlice;
};

/** Ollin: answer deeply, advice/local only. Never suggest a task unless they asked. */
function getMockSearchReply(query: string, lang: "he" | "en"): string {
  const q = query.toLowerCase();
  if (lang === "he") {
    if (/מכר|מוכר|איפה קונים|מי מוכר|איפה יש|צמיגים|מרכולים/.test(query)) return "בד\"כ תמצא את זה בחנויות מתמחות, ברשתות גדולות או באינטרנט. רוצה המלצות לידך? תכתוב \"באזור\" או \"ליד\" ואכוון אותך.";
    if (/מזג אוויר|מעלות|גשם/.test(query)) return "מזג אוויר לא מתעדכן אצלי עכשיו. עדיף אפליקציית מזג אוויר או חיפוש מזג אוויר בעיר שלך.";
    return "לא עלה בידי למצוא תשובה מדויקת. נסח שוב או תשאל שאלה אחרת.";
  }
  if (/who sells|where can i (buy|find|get)|who has|where do they sell/i.test(query) || /\bsells?\s+\w+/.test(q)) {
    return "Usually you’ll find that at specialty shops, auto parts chains (AutoZone, Advance, etc.), big-box stores, or local retailers. Want spots near you? Add \"nearby\" or \"near me\" and I’ll look for local options.";
  }
  if (/weather|temperature|forecast/i.test(q)) return "I don’t have live weather here. Best to use a weather app or search \"weather [your city]\".";
  return "Couldn’t get a clear answer on that. Try rephrasing, or ask e.g. \"who sells tires nearby\" for local results.";
}

const ChatEngineContext = createContext<ChatEngineValue | null>(null);

export function ChatEngineProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const board = useBoard();
  const finance = useFinance();
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [internalMessages, setInternalMessages] = useState<InternalMessageRecord[]>([]);
  const [lastTaskIntent, setLastTaskIntent] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<"he" | "en">("en");

  useEffect(() => {
    setAiMessages(loadAIMessages());
    setInternalMessages(loadInternalMessages());
  }, []);

  const sendMessage = useCallback((content: string) => {
    const lang = detectLanguage(content);
    setDetectedLanguage(lang);
    const userMsg: AIMessage = { id: crypto.randomUUID(), role: "user", content };
    const taskIntent = getLastMessageIsTaskIntent(content);
    setLastTaskIntent(taskIntent);
    let addedTaskTitle: string | undefined;
    let markedTaskTitle: string | undefined;
    let clearedLabel: string | undefined;
    let suggestedTaskTitle: string | undefined;

    if (taskIntent) {
      const title = parseTaskTitleFromIntent(content);
      const finalTitle = title || "New task";
      board.addGivenTask({
        title: finalTitle,
        otherParty: "—",
        checklist: [],
        done: false,
      });
      addedTaskTitle = finalTitle;
    }

    if (isDoneIntent(content)) {
      const rawHint = parseDoneIntent(content);
      const hint = rawHint?.replace(/^\s*the\s+/i, "").trim();
      if (hint) {
        const lowerHint = hint.toLowerCase();
        const hintWords = lowerHint.split(/\s+/).filter((w) => w.length > 1);
        const titleMatchesHint = (title: string) => {
          const t = title.toLowerCase();
          if (t.includes(lowerHint)) return true;
          return hintWords.length > 0 && hintWords.every((w) => t.includes(w));
        };
        const givenMatch = board.given.find((t) => !t.done && titleMatchesHint(t.title));
        const receivedMatch = board.received.find((t) => !t.done && titleMatchesHint(t.title));
        if (givenMatch) {
          board.setTaskDone("given", givenMatch.id, true);
          markedTaskTitle = givenMatch.title;
        } else if (receivedMatch) {
          board.setTaskDone("received", receivedMatch.id, true);
          markedTaskTitle = receivedMatch.title;
        }
      }
    }

    if (isHandledIntent(content)) {
      const handled = parseHandledIntent(content);
      if (handled?.invoiceNumber) {
        const inv = finance.invoices.find(
          (i) => i.status === "active" && (i.number === handled.invoiceNumber || i.number.endsWith(handled.invoiceNumber!) || i.number.includes(handled.invoiceNumber!))
        );
        if (inv) {
          finance.cancelInvoice(inv.id);
          clearedLabel = `Invoice #${inv.number}`;
        }
      }
      if (!clearedLabel) {
        const activeInv = finance.invoices.find((i) => i.status === "active");
        if (activeInv && (handled?.hint === "payment" || handled?.hint === "invoice")) {
          finance.cancelInvoice(activeInv.id);
          clearedLabel = `Invoice #${activeInv.number}`;
        }
      }
      if (!clearedLabel) {
        const payWords = ["payment", "pay", "invoice", "תשלום", "חשבונית"];
        const titleMatches = (title: string) => payWords.some((w) => title.toLowerCase().includes(w));
        const givenMatch = board.given.find((t) => !t.done && titleMatches(t.title));
        const receivedMatch = board.received.find((t) => !t.done && titleMatches(t.title));
        if (givenMatch) {
          board.setTaskDone("given", givenMatch.id, true);
          clearedLabel = givenMatch.title;
        } else if (receivedMatch) {
          board.setTaskDone("received", receivedMatch.id, true);
          clearedLabel = receivedMatch.title;
        }
      }
    }

    if (!addedTaskTitle && !markedTaskTitle && !clearedLabel) {
      const suggested = parseMentionInPassing(content);
      if (suggested) suggestedTaskTitle = suggested;
    }

    let historyWithUser: AIMessage[] = [];
    const formTypeToAdd = isEventIntent(content) ? "event" : isPollIntent(content) ? "poll" : null;
    setAiMessages((prev) => {
      historyWithUser = [...prev, userMsg];
      if (formTypeToAdd) {
        const formMsg: AIMessage = { id: crypto.randomUUID(), type: "form", formType: formTypeToAdd };
        historyWithUser = [...historyWithUser, formMsg];
      }
      saveAIMessages(historyWithUser);
      return historyWithUser;
    });

    const isNearby =
      /\b(nearby|near me|around here|local)\b/i.test(content) ||
      /(מי מוכר|איפה יש|ליד|באזור|קרוב)/.test(content);

    if (isNearby) {
      const placeholderId = crypto.randomUUID();
      const loadingMsg: AIMessage = {
        id: placeholderId,
        role: "assistant",
        content: lang === "he" ? "מחפש באזור…" : "Searching nearby…",
      };
      setAiMessages((prev) => {
        const next = [...prev, loadingMsg];
        saveAIMessages(next);
        return next;
      });
      Promise.all([
        import("@/lib/nearby-search"),
        new Promise<{ lat: number; lon: number }>((resolve) => {
          if (typeof navigator !== "undefined" && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
              () => resolve({ lat: 32.0853, lon: 34.7818 }),
              { timeout: 3000 }
            );
          } else resolve({ lat: 32.0853, lon: 34.7818 });
        }),
      ])
        .then(([mod, coords]) => {
          const query = mod.extractSearchQuery(content);
          return mod
            .fetchNearbyPlaces(query, coords.lat, coords.lon)
            .then((places: { name: string; type?: string; lat: number; lon: number }[]) =>
              mod.formatPlacesReply(places, lang === "he")
            );
        })
        .then((reply: string) => {
          setAiMessages((prev) => {
            const next = prev.map((m) =>
              "role" in m && m.id === placeholderId ? { ...m, content: reply } : m
            ) as AIMessage[];
            saveAIMessages(next);
            return next;
          });
        })
        .catch(() => {
          setAiMessages((prev) => {
            const fallback =
              lang === "he"
                ? "החיפוש נכשל. נסה שוב או חפש ב-Google Maps."
                : "Search failed. Try again or search on Google Maps.";
            const next = prev.map((m) =>
              "role" in m && m.id === placeholderId ? { ...m, content: fallback } : m
            ) as AIMessage[];
            saveAIMessages(next);
            return next;
          });
        });
      return;
    }

    if (shouldUseSearchTool(content)) {
      const placeholderId = crypto.randomUUID();
      const loadingMsg: AIMessage = {
        id: placeholderId,
        role: "assistant",
        content: lang === "he" ? "מחפש תשובה…" : "Searching for an answer…",
      };
      setAiMessages((prev) => {
        const next = [...prev, loadingMsg];
        saveAIMessages(next);
        return next;
      });
      const isConversationalTopic = /weather|temperature|travel|trip|flight|מזג אוויר|נסיע|טיסה/i.test(content.trim());
      const firstUnpaid = finance.invoices.find((i) => i.status === "active")?.number;
      const appendInvoiceFollowUp = (text: string) =>
        isConversationalTopic && firstUnpaid
          ? `${text}\n\nBy the way, while we're on that — invoice #${firstUnpaid} is still active.`
          : text;

      fetch(`/api/search?q=${encodeURIComponent(content.trim())}`)
        .then((r) => r.json())
        .then((body: { answer: string | null }) => {
          const answer = body?.answer?.trim();
          const reply = appendInvoiceFollowUp(answer || getMockSearchReply(content.trim(), lang));
          setAiMessages((prev) => {
            const next = prev.map((m) =>
              "role" in m && m.id === placeholderId ? { ...m, content: reply } : m
            ) as AIMessage[];
            saveAIMessages(next);
            return next;
          });
        })
        .catch(() => {
          const fallback = appendInvoiceFollowUp(getMockSearchReply(content.trim(), lang));
          setAiMessages((prev) => {
            const next = prev.map((m) =>
              "role" in m && m.id === placeholderId ? { ...m, content: fallback } : m
            ) as AIMessage[];
            saveAIMessages(next);
            return next;
          });
        });
      return;
    }

    // Analyze Board and Finances on every message for proactive, world-class partner replies
    setTimeout(() => {
      const boardSummary = buildBoardSummary({
        givenTotal: board.given.length,
        givenPending: board.given.filter((t) => !t.done).length,
        receivedTotal: board.received.length,
        receivedPending: board.received.filter((t) => !t.done).length,
        eventsCount: board.events.length,
        meetingsCount: board.meetings.length,
      });
      const financeSummary = buildFinanceSummary({
        quotesCount: finance.quotes.length,
        invoicesCount: finance.invoices.length,
        clientsCount: finance.clients.length,
      });
      const givenPending = board.given.filter((t) => !t.done).length;
      const receivedPending = board.received.filter((t) => !t.done).length;
      const pendingGiven = board.given.filter((t) => !t.done);
      const pendingReceived = board.received.filter((t) => !t.done);
      const pendingTaskTitles = [
        ...pendingGiven.slice(0, 2).map((t) => t.title || "Task"),
        ...pendingReceived.slice(0, 1).map((t) => t.title || "Task"),
      ].filter(Boolean);
      const activeInvoices = finance.invoices.filter((i) => i.status === "active");
      const unpaidInvoiceCount = activeInvoices.length;
      const firstUnpaidInvoiceNumber = activeInvoices[0]?.number;
      const ctx = {
        userName: profile?.name?.split(/\s+/)[0] || "Emil",
        boardSummary,
        financeSummary,
        pendingTaskCount: givenPending + receivedPending,
        unpaidInvoiceCount,
        firstUnpaidInvoiceNumber,
        founderId: profile?.userId,
        addedTaskTitle,
        markedTaskTitle,
        clearedLabel,
        suggestedTaskTitle,
        pendingTaskTitles: pendingTaskTitles.length > 0 ? pendingTaskTitles : undefined,
        offerFollowUp: !!(markedTaskTitle || clearedLabel),
      };
      const reply = generateReply(content, historyWithUser, lang, profile?.userId, ctx);
      const assistantMsg: AIMessage = { id: crypto.randomUUID(), role: "assistant", content: reply };
      setAiMessages((prev) => {
        const next = [...prev, assistantMsg];
        saveAIMessages(next);
        return next;
      });
    }, 400);
  }, [profile?.userId, profile?.name, board, finance]);

  const addFormMessage = useCallback((formType: "poll" | "event" | "task" | "converter") => {
    const formMsg: AIMessage = { id: crypto.randomUUID(), type: "form", formType };
    setAiMessages((prev) => {
      const next = [...prev, formMsg];
      saveAIMessages(next);
      return next;
    });
  }, []);

  const addCard = useCallback(
    (cardType: "quote" | "event", content: string, payload: QuoteCardPayload | EventCardPayload) => {
      const cardMsg: AIMessage = { id: crypto.randomUUID(), type: "card", cardType, content, payload };
      setAiMessages((prev) => {
        const next = [...prev, cardMsg];
        saveAIMessages(next);
        return next;
      });
    },
    []
  );

  const clearMessages = useCallback(() => {
    setAiMessages([]);
    saveAIMessages([]);
  }, []);

  const getConversation = useCallback(
    (contactId: string) => {
      const cid = conversationId("me", contactId);
      return internalMessages
        .filter((m) => m.conversationId === cid)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    [internalMessages]
  );

  const sendText = useCallback((contactId: string, text: string, currentUserId = "me") => {
    const msg: InternalMessageRecord = {
      id: crypto.randomUUID(),
      conversationId: conversationId(currentUserId, contactId),
      senderId: currentUserId,
      parts: [{ type: "text", content: text }],
      createdAt: Date.now(),
      status: "sent",
    };
    setInternalMessages((prev) => {
      const next = [msg, ...prev];
      saveInternalMessages(next);
      return next;
    });
  }, []);

  const sendVoice = useCallback((contactId: string, blob: Blob, currentUserId = "me") => {
    const url = URL.createObjectURL(blob);
    const msg: InternalMessageRecord = {
      id: crypto.randomUUID(),
      conversationId: conversationId(currentUserId, contactId),
      senderId: currentUserId,
      parts: [{ type: "voice", url }],
      createdAt: Date.now(),
      status: "sent",
    };
    setInternalMessages((prev) => {
      const next = [msg, ...prev];
      saveInternalMessages(next);
      return next;
    });
  }, []);

  const sendFile = useCallback((contactId: string, file: File, currentUserId = "me") => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const msg: InternalMessageRecord = {
        id: crypto.randomUUID(),
        conversationId: conversationId(currentUserId, contactId),
        senderId: currentUserId,
        parts: [{ type: "file", url, name: file.name }],
        createdAt: Date.now(),
        status: "sent",
      };
      setInternalMessages((prev) => {
        const next = [msg, ...prev];
        saveInternalMessages(next);
        return next;
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const markConversationAsRead = useCallback((contactId: string, currentUserId = "me") => {
    const cid = conversationId(currentUserId, contactId);
    setInternalMessages((prev) => {
      const next = prev.map((m) =>
        m.conversationId === cid && m.senderId === currentUserId ? { ...m, status: "read" as const } : m
      );
      saveInternalMessages(next);
      return next;
    });
  }, []);

  const value = useMemo<ChatEngineValue>(
    () => ({
      detectedLanguage,
      ai: {
        messages: aiMessages,
        sendMessage,
        lastMessageIsTaskIntent: lastTaskIntent,
        addFormMessage,
        addCard,
        clearMessages,
      },
      internal: {
        messages: internalMessages,
        getConversation,
        sendText,
        sendVoice,
        sendFile,
        markConversationAsRead,
      },
    }),
    [
      detectedLanguage,
      aiMessages,
      lastTaskIntent,
      internalMessages,
      sendMessage,
      addFormMessage,
      addCard,
      clearMessages,
      getConversation,
      sendText,
      sendVoice,
      sendFile,
      markConversationAsRead,
    ]
  );

  return (
    <ChatEngineContext.Provider value={value}>
      {children}
    </ChatEngineContext.Provider>
  );
}

export function useChatEngine() {
  const ctx = useContext(ChatEngineContext);
  if (!ctx) throw new Error("useChatEngine must be used within ChatEngineProvider");
  return ctx;
}

/** AI Hub / assistant chat – optimistic UI (message appears instantly). */
export function useChat() {
  const engine = useChatEngine();
  return engine.ai;
}

/** Internal network (contacts) – WhatsApp-style. */
export function useInternalMessages() {
  const engine = useChatEngine();
  return engine.internal;
}
