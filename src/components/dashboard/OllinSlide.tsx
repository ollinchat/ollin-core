"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useNotes } from "@/contexts/NotesContext";
import { useChat } from "@/contexts/ChatEngineContext";
import {
  CircleCheck,
  ScanLine,
  FileText,
  FileStack,
  PenLine,
  Pencil,
  Plus,
  BarChart2,
  CalendarDays,
  Users,
  FileOutput,
  Send,
  ListTodo,
  Clock,
  ChevronUp,
  Menu,
  MessageSquare,
} from "lucide-react";
import { t } from "@/lib/translations";
import { GPSClockModal } from "@/components/tools/GPSClockModal";

const EASE_SMOOTH = [0.32, 0.72, 0, 1];
const TRANSITION_MS = 300;

const FEATURE_GRID: { key: string; labelEn: string; labelHe: string; icon: typeof ScanLine; href: string }[] = [
  { key: "scanner", labelEn: "Scanner", labelHe: "סורק", icon: ScanLine, href: "/dashboard" },
  { key: "invoices", labelEn: "Invoices", labelHe: "חשבוניות", icon: FileText, href: "/dashboard/finances/documents" },
  { key: "files", labelEn: "Files", labelHe: "קבצים", icon: FileStack, href: "/dashboard" },
  { key: "sign", labelEn: "Sign Docs", labelHe: "חתימת מסמכים", icon: PenLine, href: "/dashboard/finances/documents" },
  { key: "poll", labelEn: "Create Poll", labelHe: "סקרים", icon: BarChart2, href: "/dashboard" },
  { key: "events", labelEn: "Events", labelHe: "אירועים", icon: CalendarDays, href: "/dashboard/events/new" },
  { key: "meetings", labelEn: "Meetings", labelHe: "פגישות", icon: Users, href: "/dashboard" },
  { key: "converter", labelEn: "File Converter", labelHe: "המרת קבצים", icon: FileOutput, href: "/dashboard" },
];

const PLUS_ACTIONS: { action: "poll" | "event" | "task" | "converter"; labelEn: string; labelHe: string; icon: typeof BarChart2 }[] = [
  { action: "poll", labelEn: "Poll", labelHe: "סקר", icon: BarChart2 },
  { action: "event", labelEn: "Event", labelHe: "אירוע", icon: CalendarDays },
  { action: "task", labelEn: "Task", labelHe: "משימה", icon: ListTodo },
  { action: "converter", labelEn: "Converter", labelHe: "המרה", icon: FileOutput },
];

export type OllinSlideProps = {
  onOpenNote?: (noteId: string) => void;
  onNewNote?: () => void;
  onOpenBoard?: () => void;
};

export function OllinSlide({ onOpenNote, onNewNote, onOpenBoard: _onOpenBoard }: OllinSlideProps) {
  const { locale } = useLocale();
  const isHe = locale === "he";
  const { folders, getNotesInFolder } = useNotes();
  const { messages, sendMessage, addFormMessage, clearMessages } = useChat();
  const defaultFolderId = folders[0]?.id ?? "default";
  const recentNotes = (defaultFolderId ? getNotesInFolder(defaultFolderId) : []).slice(0, 8);

  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [gpsOpen, setGpsOpen] = useState(false);
  const [placeholderDots, setPlaceholderDots] = useState("");
  const [topicsSidebarOpen, setTopicsSidebarOpen] = useState(false);
  const [topics, setTopics] = useState<{ id: string; title: string }[]>([]);
  const topInputRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const dashboardScrollRef = useRef<HTMLDivElement>(null);

  // Animated "waiting/thinking" dots for placeholder
  useEffect(() => {
    const frames = ["", ".", "..", "..."];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % 4;
      setPlaceholderDots(frames[i]);
    }, 400);
    return () => clearInterval(id);
  }, []);

  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    sendMessage(t);
    setExpanded(true);
  }, [input, sendMessage]);

  useEffect(() => {
    if (expanded && chatScrollRef.current) chatScrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [expanded, messages]);
  useEffect(() => {
    if (!expanded) {
      const t = setTimeout(() => topInputRef.current?.focus({ preventScroll: true }), 300);
      return () => clearTimeout(t);
    }
  }, [expanded]);

  const slideTransition = { type: "tween" as const, duration: TRANSITION_MS / 1000, ease: EASE_SMOOTH };
  const openChat = useCallback(() => {
    setExpanded(true);
    setTimeout(() => topInputRef.current?.focus({ preventScroll: true }), TRANSITION_MS + 50);
  }, []);

  const inputRow = (
    <div className="flex gap-2 items-center">
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <motion.button type="button" onClick={() => setPlusMenuOpen((o) => !o)} className="w-11 h-11 rounded-xl bg-[#008080] text-white flex items-center justify-center hover:bg-[#006666] transition-colors shadow-[0_2px_12px_rgba(0,128,128,0.28)]" whileTap={{ scale: 0.95 }} aria-label="Add">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </motion.button>
          <AnimatePresence>
            {plusMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} aria-hidden />
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute bottom-full left-0 mb-2 rounded-xl bg-white/95 backdrop-blur-md border border-[#008080]/15 py-2 z-50 min-w-[160px] shadow-lg">
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
        <button type="button" onClick={() => setGpsOpen(true)} className="w-11 h-11 rounded-xl border-2 border-[#008080]/25 bg-white text-[#008080] hover:bg-[#008080]/10 flex items-center justify-center transition-colors shadow-sm" aria-label={t(locale, "dashboard.gpsClock")}>
          <Clock className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        placeholder={`How can I help${placeholderDots}`}
        className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-[#008080]/15 bg-white/95 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080]/40 outline-none text-sm min-h-[44px]"
      />
      <motion.button type="button" onClick={handleSend} className="w-11 h-11 rounded-xl bg-[#008080] text-white hover:bg-[#006666] transition-colors shrink-0 flex items-center justify-center shadow-[0_2px_12px_rgba(0,128,128,0.28)]" whileTap={{ scale: 0.95 }} aria-label="Send">
        <Send className="w-5 h-5" strokeWidth={2} />
      </motion.button>
    </div>
  );

  const handleNewChat = useCallback(() => {
    const firstUser = messages.find((m) => "role" in m && m.role === "user");
    const title = typeof firstUser?.content === "string" ? firstUser.content.slice(0, 40).trim() || (isHe ? "שיחה חדשה" : "New Chat") : isHe ? "שיחה חדשה" : "New Chat";
    if (messages.length > 0) setTopics((prev) => [{ id: crypto.randomUUID(), title }, ...prev]);
    clearMessages();
    setTopicsSidebarOpen(false);
  }, [messages, isHe, clearMessages]);

  return (
    <div className="relative h-full min-h-0 flex flex-col overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-[#008080]/10 shadow-[0_8px_32px_rgba(0,128,128,0.06)]">
      {/* Top: AI Input — static, does not scroll. No fixed/sticky. */}
      <div ref={dashboardScrollRef} className="flex-none p-3 sm:p-4 bg-white/95 backdrop-blur-md border-b border-[#008080]/5">
        <div
          className="w-full flex flex-col overflow-hidden bg-white/95 backdrop-blur-md min-h-[176px] border-2 border-[#008080]/20 rounded-2xl shadow-[0_6px_28px_rgba(0,128,128,0.10)] focus-within:border-[#008080]/40 focus-within:shadow-[0_8px_32px_rgba(0,128,128,0.14)] cursor-text transition-[box-shadow,border-color] duration-300"
        >
              <div
                role="button"
                tabIndex={0}
                onClick={openChat}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openChat(); } }}
                className="w-full h-full flex flex-col min-h-0"
              >
                <textarea
                  ref={topInputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={`How can I help${placeholderDots}`}
                  rows={3}
                  className="flex-1 min-w-0 w-full px-5 pt-5 pb-2 rounded-t-2xl border-0 bg-transparent text-gray-900 placeholder-gray-400 focus:ring-0 outline-none text-base min-h-[96px] resize-none"
                />
                <div className="flex items-center justify-between px-3 pb-3 pt-1.5">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <motion.button type="button" onClick={(e) => { e.stopPropagation(); setPlusMenuOpen((o) => !o); }} className="w-11 h-11 rounded-xl bg-[#008080] text-white flex items-center justify-center hover:bg-[#006666] transition-colors shadow-[0_2px_12px_rgba(0,128,128,0.28)]" whileTap={{ scale: 0.95 }} aria-label="Add">
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                      </motion.button>
                      <AnimatePresence>
                        {plusMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} aria-hidden />
                            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute bottom-full left-0 mb-2 rounded-xl bg-white/95 backdrop-blur-md border border-[#008080]/15 py-2 z-50 min-w-[160px] shadow-lg">
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
                    <button type="button" onClick={(e) => { e.stopPropagation(); setGpsOpen(true); }} className="w-11 h-11 rounded-xl border-2 border-[#008080]/25 bg-white text-[#008080] hover:bg-[#008080]/10 flex items-center justify-center transition-colors shadow-sm" aria-label={t(locale, "dashboard.gpsClock")}>
                      <Clock className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </div>
                  <motion.button type="button" onClick={(e) => { e.stopPropagation(); handleSend(); }} className="w-11 h-11 rounded-xl bg-[#008080] text-white hover:bg-[#006666] transition-colors flex items-center justify-center shadow-[0_2px_12px_rgba(0,128,128,0.28)]" whileTap={{ scale: 0.95 }} aria-label="Send">
                    <Send className="w-5 h-5" strokeWidth={2} />
                  </motion.button>
                </div>
              </div>
            </div>
        </div>

      {/* Bottom: only this section scrolls (icons/grid + notes). flex-1 overflow-y-auto. */}
      <motion.div
        animate={{ opacity: expanded ? 0 : 1 }}
        transition={{ duration: TRANSITION_MS / 1000, ease: EASE_SMOOTH }}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 pb-4 pt-1"
      >
          <div className="flex-shrink-0 pb-2 pt-1">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {FEATURE_GRID.map(({ key, href, labelEn, labelHe, icon: Icon }) => (
                <Link key={key} href={href} className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white/70 backdrop-blur-sm border border-[#008080]/15 hover:bg-white/95 hover:border-[#008080]/30 text-gray-700 hover:text-gray-900 transition-all shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-[#008080]/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight text-gray-700">{isHe ? labelHe : labelEn}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex-shrink-0 pt-2 border-t border-[#008080]/10">
            <ul className="space-y-0.5">
              <li>
                <button type="button" onClick={onNewNote} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-[#008080] hover:bg-[#008080]/10 text-xs font-medium w-full text-left">
                  <Plus className="w-3 h-3" strokeWidth={2.5} /> {isHe ? "פתק חדש" : "New Note"}
                </button>
              </li>
              {recentNotes.slice(0, 3).map((note) => (
                <li key={note.id}>
                  <button type="button" onClick={() => onOpenNote?.(note.id)} className="w-full flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-white/70 text-left border border-transparent hover:border-[#008080]/15 transition-all">
                    <Pencil className="w-3 h-3 text-[#008080] shrink-0" strokeWidth={2} />
                    <span className="text-xs text-gray-700 truncate">{note.title || (isHe ? "ללא כותרת" : "Untitled")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

      {/* Blurred backdrop when expanded — subtle blur on dashboard so focus is on conversation */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TRANSITION_MS / 1000, ease: EASE_SMOOTH }}
            className="absolute inset-0 z-[18] rounded-2xl bg-white/20 backdrop-blur-md pointer-events-none"
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Expanded full-screen chat: slides up (0.3s ease-in-out), turquoise borders */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: TRANSITION_MS / 1000, ease: EASE_SMOOTH }}
            className="absolute inset-0 z-20 flex flex-col min-h-0 overflow-hidden rounded-2xl border-2 border-[#008080]/20 bg-white/95 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,128,128,0.12)]"
            style={{ boxShadow: "0 8px 32px rgba(0,128,128,0.12), 0 0 0 1px rgba(0,128,128,0.08)" }}
          >
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-[#008080]/10 bg-white/90 rounded-t-2xl">
              <button type="button" onClick={() => setExpanded(false)} className="p-2 rounded-xl text-[#008080] hover:bg-[#008080]/10 transition-colors flex items-center gap-1.5" aria-label={isHe ? "חזרה ללוח" : "Back to dashboard"}>
                <ChevronUp className="w-5 h-5" strokeWidth={2} />
                <span className="text-sm font-medium">{isHe ? "חזרה" : "Back"}</span>
              </button>
              <button type="button" onClick={() => setTopicsSidebarOpen((o) => !o)} className="p-2 rounded-xl text-[#008080] hover:bg-[#008080]/10 transition-colors" aria-label={isHe ? "נושאים ושיחות" : "Topics & Conversations"}>
                <Menu className="w-5 h-5" strokeWidth={2} />
              </button>
              <span className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-1">
                <CircleCheck className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                {isHe ? "אולין AI" : "Ollin AI"}
              </span>
            </div>
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Topics & Conversations sidebar */}
              <AnimatePresence>
                {topicsSidebarOpen && (
                  <motion.aside
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 260, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "tween", duration: 0.2 }}
                    className="flex-shrink-0 border-r border-[#008080]/10 bg-white/95 backdrop-blur-sm overflow-hidden flex flex-col"
                  >
                    <div className="p-3 border-b border-[#008080]/10">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                        {isHe ? "נושאים ושיחות" : "Topics & Conversations"}
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2 min-w-[260px]">
                      <button type="button" onClick={handleNewChat} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-[#008080] hover:bg-[#008080]/10 rounded-lg mx-2 transition-colors">
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        {isHe ? "שיחה חדשה" : "New chat"}
                      </button>
                      <div className="border-t border-gray-100 my-2" />
                      {topics.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">{isHe ? "אין שיחות קודמות" : "No previous conversations"}</p>}
                      <ul className="space-y-0.5 px-2">
                        {topics.map((t) => (
                          <li key={t.id}>
                            <button type="button" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-[#008080]/5 hover:text-gray-900 truncate border border-transparent hover:border-[#008080]/10 transition-colors">
                              {t.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-white/30 min-h-0">
              {messages.length === 0 && <p className="text-center text-gray-500 text-sm py-8">{isHe ? "שלח הודעה — משימות יישמרו ללוח." : "Send a message — tasks are saved to your board."}</p>}
              {messages.map((m) =>
                "role" in m ? (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-[#008080] text-white shadow-[0_2px_12px_rgba(0,128,128,0.25)]" : "bg-white/90 backdrop-blur-sm border border-[#008080]/15 text-gray-900 shadow-sm"}`}>
                      {typeof m.content === "string" ? m.content : ""}
                    </div>
                  </div>
                ) : "type" in m && m.type === "taskAdded" ? (
                  <div key={m.id} className="flex justify-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#008080]/10 border border-[#008080]/25 text-[#008080] px-3 py-1.5 text-xs font-medium">
                      <ListTodo className="w-4 h-4 shrink-0" strokeWidth={2} />
                      {isHe ? "נוסף ללוח" : "Added to Board"}: <span className="font-semibold truncate max-w-[140px]">{m.taskTitle}</span>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-white/60 border border-[#008080]/10 text-gray-500 text-xs">{"formType" in m ? `[${m.formType}]` : ""}</div>
                  </div>
                )
              )}
              <div ref={chatScrollRef} />
              </div>
            </div>
            <div className="flex-shrink-0 p-3 border-t border-[#008080]/10 bg-white/80 backdrop-blur-sm rounded-b-2xl">
              {inputRow}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {gpsOpen && <GPSClockModal onClose={() => setGpsOpen(false)} defaultScrollToSummary />}
    </div>
  );
}
