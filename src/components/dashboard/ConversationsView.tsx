"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useNotes } from "@/contexts/NotesContext";
import { useChat } from "@/contexts/ChatEngineContext";
import {
  ScanLine,
  FileText,
  FileStack,
  PenLine,
  BarChart2,
  CalendarDays,
  Users,
  FileOutput,
  Scale,
  StickyNote,
  Plus,
  Pencil,
  Send,
  CircleCheck,
  ListTodo,
  Brain,
  ChevronLeft,
} from "lucide-react";

export type ChatSourceId = "ollin" | "whatsapp" | "telegram" | "gmail" | "discord" | "signal" | "slack" | "viber";

interface ConversationsViewProps {
  locale: "en" | "he";
  onSelectedContactChange?: (id: string | null) => void;
}

const TOOLS: { key: string; href: string; labelEn: string; labelHe: string; icon: typeof ScanLine }[] = [
  { key: "scanner", href: "/dashboard", labelEn: "Scanner", labelHe: "סורק", icon: ScanLine },
  { key: "invoices", href: "/dashboard/finances/documents", labelEn: "Invoices", labelHe: "חשבוניות", icon: FileText },
  { key: "files", href: "/dashboard", labelEn: "Files", labelHe: "קבצים", icon: FileStack },
  { key: "sign", href: "/dashboard/finances/documents", labelEn: "Sign Docs", labelHe: "חתימת מסמכים", icon: PenLine },
  { key: "poll", href: "/dashboard", labelEn: "Create Poll", labelHe: "סקרים", icon: BarChart2 },
  { key: "events", href: "/dashboard/events/new", labelEn: "Events", labelHe: "אירועים", icon: CalendarDays },
  { key: "meetings", href: "/dashboard", labelEn: "Meetings", labelHe: "פגישות", icon: Users },
  { key: "converter", href: "/dashboard", labelEn: "Converter", labelHe: "המרת קבצים", icon: FileOutput },
  { key: "compare", href: "/dashboard", labelEn: "Compare", labelHe: "השוואת מוצרים", icon: Scale },
];

const PLUS_ACTIONS: { action: "poll" | "event" | "task" | "converter"; labelEn: string; labelHe: string; icon: typeof BarChart2 }[] = [
  { action: "poll", labelEn: "Poll", labelHe: "סקר", icon: BarChart2 },
  { action: "event", labelEn: "Event", labelHe: "אירוע", icon: CalendarDays },
  { action: "task", labelEn: "Task", labelHe: "משימה", icon: ListTodo },
  { action: "converter", labelEn: "Converter", labelHe: "המרה", icon: FileOutput },
];

export function ConversationsView({ locale, onSelectedContactChange }: ConversationsViewProps) {
  const isHe = locale === "he";
  const { folders, getNotesInFolder } = useNotes();
  const { messages, sendMessage, addFormMessage } = useChat();
  const defaultFolderId = folders[0]?.id ?? "default";
  const recentNotes = (defaultFolderId ? getNotesInFolder(defaultFolderId) : []).slice(0, 8);
  const [slideMode, setSlideMode] = useState<"tools" | "chat">("tools");
  const [input, setInput] = useState("");
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [brainMenuOpen, setBrainMenuOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const topInputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    sendMessage(t);
  };

  useEffect(() => {
    if (slideMode === "chat" && chatScrollRef.current) chatScrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [slideMode, messages]);
  useEffect(() => {
    if (slideMode === "tools") {
      const t = setTimeout(() => topInputRef.current?.focus({ preventScroll: true }), 300);
      return () => clearTimeout(t);
    }
  }, [slideMode]);

  const slideTransition = { type: "tween" as const, duration: 0.35, ease: [0.32, 0.72, 0, 1] };

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-gray-200 bg-[#fafafa] shadow-sm relative">
      {/* Slide 1: Light top-down — Ollin block (top) → Tools grid (middle) → Notes (bottom) */}
      <motion.div
        className="absolute inset-0 flex flex-col min-h-0 overflow-y-auto"
        initial={false}
        animate={{ x: slideMode === "chat" ? "-100%" : 0 }}
        transition={slideTransition}
        style={{ width: "100%" }}
      >
        {/* TOP: Large Ollin Command Center — dominant, welcoming textarea */}
        <div className="flex-shrink-0 p-4">
          <div className="w-full flex gap-3 items-start rounded-2xl border-2 border-[#008080]/25 bg-[#fafdfd] px-4 py-4 shadow-md focus-within:border-[#008080]/50 focus-within:ring-2 focus-within:ring-[#008080]/15 transition-all min-h-[140px]">
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <div className="relative">
                <motion.button type="button" onClick={() => setPlusMenuOpen((o) => !o)} className="w-12 h-12 rounded-xl bg-[#008080] text-white flex items-center justify-center hover:bg-[#006666] transition-colors shadow-sm" whileTap={{ scale: 0.95 }} aria-label="Add">
                  <Plus className="w-6 h-6" strokeWidth={2.5} />
                </motion.button>
                <AnimatePresence>
                  {plusMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} aria-hidden />
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute bottom-full left-0 mb-2 rounded-xl bg-white border border-gray-200 py-2 z-50 min-w-[160px] shadow-lg">
                        {PLUS_ACTIONS.map(({ action, labelEn, labelHe, icon: Icon }) => (
                          <button key={action} type="button" onClick={() => { addFormMessage(action); setPlusMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-[#008080]/10 rounded-lg">
                            <Icon className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                            {isHe ? labelHe : labelEn}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative">
                <button type="button" onClick={() => setBrainMenuOpen((o) => !o)} className="w-12 h-12 rounded-xl border border-gray-200 bg-white text-[#008080] hover:bg-[#008080]/10 flex items-center justify-center transition-colors shadow-sm" aria-label={isHe ? "מודל AI" : "AI model"}>
                  <Brain className="w-6 h-6" strokeWidth={2} />
                </button>
                {brainMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setBrainMenuOpen(false)} aria-hidden />
                    <div className="absolute bottom-full left-0 mb-2 rounded-xl bg-white border border-gray-200 py-2 z-50 w-48 shadow-lg">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{isHe ? "מודל" : "Model"}</p>
                      {["Ollin", "GPT-4", "Claude"].map((name) => (
                        <button key={name} type="button" onClick={() => setBrainMenuOpen(false)} className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-[#008080]/10 rounded-lg">
                          {name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <textarea
              ref={topInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isHe ? "כתוב לאולין — משימות, שאלות, פקודות..." : "Message Ollin — tasks, questions, commands..."}
              rows={3}
              className="flex-1 min-w-0 px-4 py-3 rounded-xl border-0 bg-white/90 text-gray-900 placeholder-gray-500 focus:ring-0 focus:bg-white outline-none text-base min-h-[100px] resize-none"
            />
            <motion.button type="button" onClick={handleSend} className="w-12 h-12 rounded-xl bg-[#008080] text-white hover:bg-[#006666] transition-colors shrink-0 flex items-center justify-center shadow-sm mt-0.5" whileTap={{ scale: 0.95 }} aria-label="Send">
              <Send className="w-6 h-6" strokeWidth={2} />
            </motion.button>
          </div>
          <button type="button" onClick={() => setSlideMode("chat")} className="mt-2 text-xs text-[#008080] hover:underline font-medium">
            {isHe ? "פתח צ'אט מלא" : "Open full chat"}
          </button>
        </div>

        {/* MIDDLE: Tools in a structured grid */}
        <div className="flex-shrink-0 px-4 pb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{isHe ? "כלים" : "Tools"}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {TOOLS.map(({ key, href, labelEn, labelHe, icon: Icon }) => (
              <Link key={key} href={href} className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl border border-gray-200 bg-white hover:bg-[#008080]/08 hover:border-[#008080]/30 text-gray-700 hover:text-gray-900 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#008080]/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                </div>
                <span className="text-xs font-medium text-center leading-tight">{isHe ? labelHe : labelEn}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* BOTTOM: Notes section */}
        <div className="flex-shrink-0 px-4 pb-4 border-t border-gray-200/80 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <StickyNote className="w-3.5 h-3.5" strokeWidth={2} />
            {isHe ? "פתקים אחרונים" : "Recent notes"}
          </p>
          <ul className="space-y-1">
            {recentNotes.slice(0, 5).map((note) => (
              <li key={note.id}>
                <Link href="/dashboard" className="flex items-center gap-2 py-2.5 px-3 rounded-xl hover:bg-white text-left border border-transparent hover:border-gray-200 transition-colors">
                  <Pencil className="w-4 h-4 text-[#008080] shrink-0" strokeWidth={2} />
                  <span className="text-sm text-gray-700 truncate">{note.title || (isHe ? "ללא כותרת" : "Untitled")}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/dashboard" className="flex items-center gap-2 py-2.5 px-3 rounded-xl text-[#008080] hover:bg-[#008080]/10 text-sm font-medium">
                <Plus className="w-4 h-4" strokeWidth={2.5} /> {isHe ? "פתק חדש" : "New Note"}
              </Link>
            </li>
          </ul>
        </div>
      </motion.div>

      {/* Slide 2: Full chat — light, [+] & Brain */}
      <motion.div
        className="absolute inset-0 flex flex-col min-h-0 bg-white"
        initial={false}
        animate={{ x: slideMode === "chat" ? 0 : "100%" }}
        transition={slideTransition}
        style={{ width: "100%" }}
      >
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3 border-b border-gray-200 bg-white">
          <button type="button" onClick={() => setSlideMode("tools")} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors" aria-label={isHe ? "חזרה" : "Back"}>
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          </button>
          <span className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <CircleCheck className="w-5 h-5 text-[#008080]" strokeWidth={2} />
            {isHe ? "אולין AI" : "Ollin AI"}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
          {messages.length === 0 && <p className="text-center text-gray-500 text-sm py-8">{isHe ? "שלח הודעה — משימות יישמרו ללוח." : "Send a message — tasks are saved to your board."}</p>}
          {messages.map((m) =>
            "role" in m ? (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-[#008080] text-white" : "bg-white border border-gray-200 text-gray-900 shadow-sm"}`}>
                  {typeof m.content === "string" ? m.content : ""}
                </div>
              </div>
            ) : "type" in m && m.type === "taskAdded" ? (
              <div key={m.id} className="flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#008080]/10 border border-[#008080]/30 text-[#008080] px-3 py-1.5 text-xs font-medium">
                  <ListTodo className="w-4 h-4 shrink-0" strokeWidth={2} />
                  {isHe ? "נוסף ללוח" : "Added to Board"}: <span className="font-semibold truncate max-w-[140px]">{m.taskTitle}</span>
                </div>
              </div>
            ) : null
          )}
          <div ref={chatScrollRef} />
        </div>
        <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white">
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1 shrink-0">
              <div className="flex items-center gap-1">
                <div className="relative">
                  <motion.button type="button" onClick={() => setPlusMenuOpen((o) => !o)} className="w-11 h-11 rounded-xl bg-[#008080] text-white flex items-center justify-center hover:bg-[#006666] transition-colors" whileTap={{ scale: 0.95 }} aria-label="Add">
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                  </motion.button>
                  <AnimatePresence>
                    {plusMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} aria-hidden />
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute bottom-full left-0 mb-2 rounded-xl bg-white border border-gray-200 py-2 z-50 min-w-[160px] shadow-lg">
                          {PLUS_ACTIONS.map(({ action, labelEn, labelHe, icon: Icon }) => (
                            <button key={action} type="button" onClick={() => { addFormMessage(action); setPlusMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-[#008080]/10 rounded-lg">
                              <Icon className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                              {isHe ? labelHe : labelEn}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <div className="relative">
                  <button type="button" onClick={() => setBrainMenuOpen((o) => !o)} className="w-11 h-11 rounded-xl border border-gray-200 bg-gray-50 text-[#008080] hover:bg-[#008080]/10 flex items-center justify-center transition-colors" aria-label={isHe ? "מודל AI" : "AI model"}>
                    <Brain className="w-5 h-5" strokeWidth={2} />
                  </button>
                  {brainMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setBrainMenuOpen(false)} aria-hidden />
                      <div className="absolute bottom-full left-0 mb-2 rounded-xl bg-white border border-gray-200 py-2 z-50 w-48 shadow-lg">
                        <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{isHe ? "מודל" : "Model"}</p>
                        {["Ollin", "GPT-4", "Claude"].map((name) => (
                          <button key={name} type="button" onClick={() => setBrainMenuOpen(false)} className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-[#008080]/10 rounded-lg">
                            {name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isHe ? "הודעה לאולין..." : "Message Ollin..."}
              className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] outline-none text-sm min-h-[44px]"
            />
            <motion.button type="button" onClick={handleSend} className="p-3 rounded-xl bg-[#008080] text-white hover:bg-[#006666] transition-colors shrink-0 min-h-[44px] flex items-center justify-center" whileTap={{ scale: 0.95 }} aria-label="Send">
              <Send className="w-5 h-5" strokeWidth={2} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
