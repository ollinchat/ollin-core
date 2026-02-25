"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";

export type ChatMessage =
  | { id: string; role: "user" | "assistant"; content: string }
  | { id: string; type: "form"; formType: "poll" | "event" | "task"; content?: string };

const STORAGE_KEY = "ollin_chat_messages";

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (_) {}
}

/** Detect if text is primarily Hebrew (for language-sync replies). */
function isHebrew(text: string): boolean {
  const hebrewBlocks = /[\u0590-\u05FF]/;
  const heCount = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const enCount = (text.match(/[a-zA-Z]/g) || []).length;
  return heCount >= enCount || (hebrewBlocks.test(text) && heCount > 0);
}

/** Only true when user explicitly asks to add a task/reminder (not for questions or chat). */
function isExplicitTaskIntent(text: string): boolean {
  const lower = text.trim().toLowerCase();
  const heTask = /^(תזכיר|הוסף משימה|צור משימה|רשום|שמור|הוסף ללוח|תזכור)/;
  const enTask = /^(remind me|add task|create task|add to board|save task|don't forget|remember to)/i;
  if (heTask.test(text.trim()) || enTask.test(lower)) return true;
  if (/\b(remind me to|add task|add to board)\b/i.test(lower)) return true;
  return false;
}

/** Detect if message is a question (who/what/where/why) – answer it, don't default to tasks. */
function isQuestionIntent(text: string): boolean {
  const t = text.trim();
  const en = /^(who|what|where|when|why|how|which|is there|are there|can you find|do you know)\b/i.test(t);
  const he = /^(מי|מה|איפה|מתי|למה|איך|האם|יש)\s/.test(t) || /\?$/.test(t);
  return en || he;
}

/** Generate a conversational, language-synced reply. Questions get answers, not task suggestions. */
function generateReplySync(userMessage: string, history: ChatMessage[]): string {
  const isHe = isHebrew(userMessage);
  const recent = history.filter((m): m is ChatMessage & { role: "user" | "assistant"; content: string } => "role" in m && !!m.role && typeof m.content === "string").slice(-6);
  const msg = (userMessage || "").trim().toLowerCase();

  if (isHe) {
    if (/שלום|היי|בוקר|ערב טוב|הי/.test(userMessage)) return "שלום! איך אוכל לעזור? נשמח לשיחה או לעזור עם משימות.";
    if (/תודה|מעולה|יופי|סופי|בסדר/.test(userMessage)) return "בשמחה! אם תצטרך עוד משהו – אני כאן.";
    if (/מה נשמע|איך אתה|מה קורה/.test(userMessage)) return "הכל טוב, תודה! איך אוכל לעזור לך היום?";
    if (/מה אתה יודע|מה אתה יכול|עזור/.test(userMessage)) return "אני יכול לשוחח איתך, להזכיר לך משימות, ולהוסיף אירועים ללוח. אם תרצה שאוסיף משימה – תגיד במפורש 'תזכיר לי' או 'הוסף משימה'.";
    if (recent.length >= 2) return "הבנתי. מה תרצה לעשות הלאה?";
    return "הבנתי. נשמח לשיחה – או אם תרצה שאוסיף משימה או אירוע, תגיד במפורש.";
  }

  if (/hello|hi|hey|good morning|good evening|hey there/i.test(userMessage)) return "Hello! How can I help? Happy to chat or help with tasks.";
  if (/thanks|thank you|great|perfect|ok|okay/i.test(userMessage)) return "You're welcome! If you need anything else, I'm here.";
  if (/how are you|what'?s up|what can you do|how can you help/i.test(msg)) return "I'm here to chat and help. I can add tasks or events if you say e.g. \"remind me to...\" or \"add task\". What would you like to do?";
  if (recent.length >= 2) return "Got it. What would you like to do next?";
  return "Understood. Happy to keep chatting – or say \"remind me to...\" / \"add task\" if you want something on your board.";
}

type ChatContextType = {
  messages: ChatMessage[];
  sendMessage: (content: string) => void;
  /** True when the last user message was explicit task intent (show Add to Board only then). */
  lastMessageIsTaskIntent: boolean;
  addFormMessage: (formType: "poll" | "event" | "task") => void;
  clearMessages: () => void;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastTaskIntent, setLastTaskIntent] = useState(false);

  useEffect(() => {
    setMessages(loadMessages());
  }, []);

  const sendMessage = useCallback((content: string) => {
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    const taskIntent = isExplicitTaskIntent(content);
    setLastTaskIntent(taskIntent);
    let prevSnapshot: ChatMessage[] = [];
    setMessages((prev) => {
      prevSnapshot = prev;
      const next = [...prev, userMsg];
      saveMessages(next);
      return next;
    });

    const isNearby =
      /\b(nearby|near me|around here|local)\b/i.test(content) ||
      /(מי מוכר|איפה יש|ליד|באזור|קרוב)/.test(content);

    if (isNearby) {
      const placeholderId = crypto.randomUUID();
      const loadingMsg: ChatMessage = { id: placeholderId, role: "assistant", content: isHebrew(content) ? "מחפש באזור…" : "Searching nearby…" };
      setMessages((prev) => {
        const next = [...prev, loadingMsg];
        saveMessages(next);
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
          return mod.fetchNearbyPlaces(query, coords.lat, coords.lon).then((places: { name: string; type?: string; lat: number; lon: number }[]) =>
            mod.formatPlacesReply(places, isHebrew(content))
          );
        })
        .then((reply: string) => {
          setMessages((prev) => {
            const next = prev.map((m) => ("role" in m && m.id === placeholderId ? { ...m, content: reply } : m));
            saveMessages(next);
            return next;
          });
        })
        .catch(() => {
          setMessages((prev) => {
            const fallback = isHebrew(content) ? "החיפוש נכשל. נסה שוב או חפש ב-Google Maps." : "Search failed. Try again or search on Google Maps.";
            const next = prev.map((m) => ("role" in m && m.id === placeholderId ? { ...m, content: fallback } : m));
            saveMessages(next);
            return next;
          });
        });
      return;
    }

    setTimeout(() => {
      const reply = generateReplySync(content, [...prevSnapshot, userMsg]);
      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: reply };
      setMessages((prev) => {
        const next = [...prev, assistantMsg];
        saveMessages(next);
        return next;
      });
    }, 400);
  }, []);

  const addFormMessage = useCallback((formType: "poll" | "event" | "task") => {
    const formMsg: ChatMessage = { id: crypto.randomUUID(), type: "form", formType };
    setMessages((prev) => {
      const next = [...prev, formMsg];
      saveMessages(next);
      return next;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    saveMessages([]);
  }, []);

  const value = useMemo(
    () => ({
      messages,
      sendMessage,
      lastMessageIsTaskIntent: lastTaskIntent,
      addFormMessage,
      clearMessages,
    }),
    [messages, sendMessage, lastTaskIntent, addFormMessage, clearMessages]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
