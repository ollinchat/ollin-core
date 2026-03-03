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
import { useChecklists } from "@/contexts/ChecklistsContext";

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

export type ConversationMeta = {
  contactId: string;
  lastMessage: string;
  lastTime: number;
};

type InternalSlice = {
  messages: InternalMessageRecord[];
  getConversation: (contactId: string) => InternalMessageRecord[];
  getConversationsWithMeta: (currentUserId: string) => ConversationMeta[];
  deleteConversation: (contactId: string, currentUserId?: string) => void;
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
  const checklists = useChecklists();
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [internalMessages, setInternalMessages] = useState<InternalMessageRecord[]>([]);
  const [lastTaskIntent, setLastTaskIntent] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<"he" | "en">("en");

  useEffect(() => {
    setAiMessages(loadAIMessages());
    let list = loadInternalMessages();
    if (list.length === 0 && typeof window !== "undefined" && !localStorage.getItem("ollin_internal_messages_seeded")) {
      const now = Date.now();
      const demoMessages: InternalMessageRecord[] = [];
      const contactIds = ["demo-1", "demo-2", "demo-3", "demo-4", "demo-5", "demo-6"];
      const snippets = [
        "Sounds good, let's meet tomorrow at 10.",
        "I've sent the report. Can you review?",
        "Thanks for the update!",
        "The design looks great. Ready for dev.",
        "Can we push the deadline to Friday?",
        "Meeting notes from today are in the drive.",
      ];
      contactIds.forEach((contactId, i) => {
        const cid = conversationId("me", contactId);
        const fromThem = {
          id: `dm-${i}-1`,
          conversationId: cid,
          senderId: contactId,
          parts: [{ type: "text" as const, content: snippets[i] }],
          createdAt: now - (contactIds.length - i) * 120000,
          status: "read" as const,
        };
        const fromMe = {
          id: `dm-${i}-2`,
          conversationId: cid,
          senderId: "me",
          parts: [{ type: "text" as const, content: i % 2 === 0 ? "Sure, see you then." : "On it." }],
          createdAt: now - (contactIds.length - i) * 120000 + 60000,
          status: "read" as const,
        };
        demoMessages.push(fromThem, fromMe);
      });
      // Demo unknown number (not in contact list) — for Safety Block / Block & Add flow
      const unknownId = "+972550000000";
      const unknownCid = conversationId("me", unknownId);
      demoMessages.push(
        {
          id: "dm-unknown-1",
          conversationId: unknownCid,
          senderId: unknownId,
          parts: [{ type: "text" as const, content: "Hi, I got your number from the event. Can we sync on the project?" }],
          createdAt: now - 60000,
          status: "read" as const,
        },
        {
          id: "dm-unknown-2",
          conversationId: unknownCid,
          senderId: "me",
          parts: [{ type: "text" as const, content: "Sure, who is this?" }],
          createdAt: now - 30000,
          status: "read" as const,
        }
      );
      saveInternalMessages(demoMessages);
      localStorage.setItem("ollin_internal_messages_seeded", "1");
      list = demoMessages;
    } else if (list.length > 0 && typeof window !== "undefined" && !localStorage.getItem("ollin_internal_messages_unknown_seeded")) {
      const unknownId = "+972550000000";
      const unknownCid = conversationId("me", unknownId);
      const hasUnknown = list.some((m: InternalMessageRecord) => m.conversationId === unknownCid);
      if (!hasUnknown) {
        const now = Date.now();
        const unknownMessages: InternalMessageRecord[] = [
          {
            id: "dm-unknown-1",
            conversationId: unknownCid,
            senderId: unknownId,
            parts: [{ type: "text" as const, content: "Hi, I got your number from the event. Can we sync on the project?" }],
            createdAt: now - 60000,
            status: "read" as const,
          },
          {
            id: "dm-unknown-2",
            conversationId: unknownCid,
            senderId: "me",
            parts: [{ type: "text" as const, content: "Sure, who is this?" }],
            createdAt: now - 30000,
            status: "read" as const,
          },
        ];
        const next = [...unknownMessages, ...list];
        saveInternalMessages(next);
        localStorage.setItem("ollin_internal_messages_unknown_seeded", "1");
        list = next;
      } else {
        localStorage.setItem("ollin_internal_messages_unknown_seeded", "1");
      }
    }
    setInternalMessages(list);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (aiMessages.length === 0) {
        const stored = localStorage.getItem("ollin_ai_messages");
        if (stored && stored !== "[]") return;
      }
      saveAIMessages(aiMessages);
    } catch (_) {}
  }, [aiMessages]);

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
      if (!clearedLabel) {
        const activeInv = finance.invoices.find((i) => i.status === "active");
        if (activeInv) {
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
      if (addedTaskTitle) {
        const taskAddedMsg: AIMessage = { id: crypto.randomUUID(), type: "taskAdded", taskTitle: addedTaskTitle };
        historyWithUser = [...historyWithUser, taskAddedMsg];
      }
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
      const boardSummary = buildBoardSummary();
      const financeSummary = buildFinanceSummary();
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
      const checklistBrief = profile?.userId
        ? checklists.getChecklistBrief(profile.userId)
        : undefined;
      const today = new Date().toISOString().slice(0, 10);
      const overdueList = finance.overdueInvoices || [];
      const overdueBrief =
        overdueList.length > 0
          ? overdueList
              .slice(0, 2)
              .map((inv) => {
                const due = inv.dueDate || today;
                const days = Math.floor((new Date(today).getTime() - new Date(due).getTime()) / 86400000);
                return `Invoice #${inv.number} for '${inv.clientName}' is ${days} day${days !== 1 ? "s" : ""} overdue.`;
              })
              .join(" ") + " Should I send a reminder or mark as handled?"
          : undefined;
      const quotesWaiting = finance.quotes.filter((q) => (q.status as string) !== "canceled").length;
      const financeProactiveBrief =
        quotesWaiting > 0 || overdueList.length > 0
          ? [
              quotesWaiting > 0 ? `We have ${quotesWaiting} Price Quote${quotesWaiting !== 1 ? "s" : ""} waiting for approval` : null,
              overdueList.length > 0 ? `${overdueList.length} Overdue Invoice${overdueList.length !== 1 ? "s" : ""}` : null,
            ]
              .filter(Boolean)
              .join(" and ") + ". Want me to send a reminder to the clients?"
          : undefined;
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
        checklistBrief,
        overdueBrief,
        financeProactiveBrief,
      };
      const reply = generateReply(content, ctx);
      const assistantMsg: AIMessage = { id: crypto.randomUUID(), role: "assistant", content: reply };
      setAiMessages((prev) => {
        const next = [...prev, assistantMsg];
        saveAIMessages(next);
        return next;
      });
    }, 400);
  }, [profile?.userId, profile?.name, board, finance, checklists]);

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

  const getConversationsWithMeta = useCallback(
    (currentUserId: string) => {
      const byCid = new Map<string, { last: string; time: number }>();
      for (const m of internalMessages) {
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
    [internalMessages]
  );

  const deleteConversation = useCallback((contactId: string, currentUserId = "me") => {
    const cid = conversationId(currentUserId, contactId);
    setInternalMessages((prev) => {
      const next = prev.filter((m) => m.conversationId !== cid);
      saveInternalMessages(next);
      return next;
    });
  }, []);

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
        getConversationsWithMeta,
        deleteConversation,
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
      getConversationsWithMeta,
      deleteConversation,
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
