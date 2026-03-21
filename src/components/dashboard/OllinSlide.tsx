"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useNotes } from "@/contexts/NotesContext";
import { useChat, useInternalMessages } from "@/contexts/ChatEngineContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useBoard } from "@/contexts/BoardContext";
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
  FileOutput,
  Send,
  ListTodo,
  Clock,
  ChevronUp,
  Menu,
  MessageSquare,
  Calculator,
  Ruler,
  DollarSign,
  X,
  GripVertical,
  Brain,
} from "lucide-react";
import { t } from "@/lib/translations";
import { PollCreator } from "@/components/board/PollCreator";
import { MeetingEventFormModal } from "@/components/board/MeetingEventFormModal";
import { GPSClockModal } from "@/components/tools/GPSClockModal";
import { TimeAttendanceManagementPanel } from "@/components/tools/TimeAttendanceManagementPanel";
import { generateUUID } from "@/lib/uuid";

const EASE_SMOOTH = [0.32, 0.72, 0, 1];
const TRANSITION_MS = 300;
const OLLIN_SLIDE_TOOLS_KEY = "ollin_slide_tools";

type FeatureItem = {
  key: string;
  labelEn: string;
  labelHe: string;
  icon: typeof ScanLine;
  href?: string;
  action?: "scanner" | "converter" | "poll" | "task" | "event" | "timetracker";
};

/** Time Tracker replaces File Converter in the default 6; converter stays in the tool library. */
const DEFAULT_TOOL_KEYS = ["scanner", "invoices", "files", "sign", "poll", "timetracker"];

/** Full tool library: grid tools + addable tools (Calculator, Meter, Currency, Task, Event) */
const TOOL_LIBRARY: FeatureItem[] = [
  { key: "scanner", labelEn: "Quick Scan", labelHe: "סריקה מהירה", icon: ScanLine, action: "scanner" },
  // Jump directly to the Invoices tab/area.
  { key: "invoices", labelEn: "Invoices", labelHe: "חשבוניות", icon: FileText, href: "/dashboard/finances/documents" },
  { key: "files", labelEn: "Files", labelHe: "קבצים", icon: FileStack, href: "/dashboard/folders" },
  { key: "sign", labelEn: "Sign Docs", labelHe: "חתימת מסמכים", icon: PenLine, href: "/dashboard/documents/sign" },
  { key: "poll", labelEn: "Create Poll", labelHe: "סקרים", icon: BarChart2, action: "poll" },
  { key: "timetracker", labelEn: "CLOCK & READY", labelHe: "שעון נוכחות", icon: Clock, action: "timetracker" },
  { key: "converter", labelEn: "File Converter", labelHe: "המרת קבצים", icon: FileOutput, action: "converter" },
  { key: "calculator", labelEn: "Smart Calculator", labelHe: "מחשבון חכם", icon: Calculator, href: "/dashboard/convert" },
  { key: "meter", labelEn: "Measure", labelHe: "מדידה", icon: Ruler, href: "/dashboard" },
  { key: "currency", labelEn: "Real-time FX Converter", labelHe: "המרת מטבע חיה", icon: DollarSign, href: "/dashboard/convert" },
  { key: "task", labelEn: "Task", labelHe: "משימה", icon: ListTodo, action: "task" },
  { key: "event", labelEn: "Event", labelHe: "אירוע", icon: CalendarDays, action: "event" },
  { key: "translator", labelEn: "Translator", labelHe: "מתרגם", icon: MessageSquare, href: "/dashboard/translate" },
];

function loadToolKeys(): string[] {
  if (typeof window === "undefined") return DEFAULT_TOOL_KEYS;
  try {
    const raw = localStorage.getItem(OLLIN_SLIDE_TOOLS_KEY);
    if (!raw) return DEFAULT_TOOL_KEYS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TOOL_KEYS;
    const strings = parsed.filter((k): k is string => typeof k === "string").map((k) => (k === "converter" ? "timetracker" : k));
    return Array.from(new Set(strings));
  } catch {
    return DEFAULT_TOOL_KEYS;
  }
}

function saveToolKeys(keys: string[]) {
  try {
    localStorage.setItem(OLLIN_SLIDE_TOOLS_KEY, JSON.stringify(keys));
  } catch {}
}

const PLUS_ACTIONS: { action: "poll" | "event" | "task" | "converter"; labelEn: string; labelHe: string; icon: typeof BarChart2 }[] = [
  { action: "poll", labelEn: "Poll", labelHe: "סקר", icon: BarChart2 },
  { action: "event", labelEn: "Event", labelHe: "אירוע", icon: CalendarDays },
  { action: "task", labelEn: "Task", labelHe: "משימה", icon: ListTodo },
  { action: "converter", labelEn: "Converter", labelHe: "המרה", icon: FileOutput },
];

const BRAIN_MODELS: { label: string; key: string }[] = [
  { key: "ollin-private", label: "Ollin Private" },
  { key: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { key: "gpt-4o", label: "GPT-4o" },
  { key: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { key: "llama-3", label: "Llama 3" },
  { key: "mistral-large", label: "Mistral Large" },
  { key: "perplexity", label: "Perplexity" },
  { key: "deepseek", label: "DeepSeek" },
  { key: "grok-1", label: "Grok-1" },
  { key: "dall-e-3", label: "DALL-E 3" },
  { key: "midjourney", label: "Midjourney (Image)" },
  { key: "stable-diffusion", label: "Stable Diffusion" },
  { key: "sora", label: "Sora (Video)" },
  { key: "suno", label: "Suno (Music)" },
  { key: "elevenlabs", label: "ElevenLabs (Voice)" },
  { key: "wolframalpha", label: "WolframAlpha (Math)" },
  { key: "github-copilot", label: "GitHub Copilot" },
  { key: "adobe-firefly", label: "Adobe Firefly" },
  { key: "runway-gen-3", label: "Runway Gen-3" },
  { key: "searchgpt", label: "SearchGPT" },
];

const BRAIN_MODEL_DESCRIPTIONS: Record<string, string> = {
  "ollin-private": "Ollin Private: internal reasoning and personalized assistance.",
  "gemini-1.5-pro": "Gemini 1.5 Pro: long-context multimodal understanding for deep work.",
  "gpt-4o": "GPT-4o: OpenAI's most advanced multimodal model for reasoning and creativity.",
  "claude-3.5-sonnet": "Claude 3.5 Sonnet: strong writing, coding, and thoughtful analysis.",
  "llama-3": "Llama 3: fast, capable open model for general tasks.",
  "mistral-large": "Mistral Large: high-performance general reasoning at scale.",
  perplexity: "Perplexity: research-first answers with web exploration style.",
  deepseek: "DeepSeek: efficient reasoning and problem solving.",
  "grok-1": "Grok-1: real-time style conversation and analysis.",
  "dall-e-3": "DALL-E 3: high-end AI image generation with great prompt fidelity.",
  midjourney: "Midjourney: premium image aesthetics and creative generation.",
  "stable-diffusion": "Stable Diffusion: customizable image generation pipeline.",
  sora: "Sora: AI video generation from text prompts.",
  suno: "Suno: music generation and creative songwriting.",
  elevenlabs: "ElevenLabs: high-quality text-to-speech voice generation.",
  wolframalpha: "WolframAlpha: math and computational knowledge engine.",
  "github-copilot": "GitHub Copilot: coding assistance and autocomplete workflows.",
  "adobe-firefly": "Adobe Firefly: creative tools for design and generative editing.",
  "runway-gen-3": "Runway Gen-3: video generation and creative visual effects.",
  searchgpt: "SearchGPT: answer summaries with search-focused intelligence.",
};

/** Small draggable calculator overlay: title bar drag, basic + - * / = C and digits. */
function DraggableCalculator({
  isHe,
  position,
  onPositionChange,
  onClose,
  dragRef,
}: {
  isHe: boolean;
  position: { x: number; y: number };
  onPositionChange: (p: { x: number; y: number }) => void;
  onClose: () => void;
  dragRef: React.MutableRefObject<{ isDragging: boolean; startX: number; startY: number; startLeft: number; startTop: number }>;
}) {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onPositionChange({ x: dragRef.current.startLeft + dx, y: dragRef.current.startTop + dy });
    };
    const onUp = () => { dragRef.current.isDragging = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [onPositionChange, dragRef]);

  const onDigit = (d: string) => {
    setDisplay((v) => (v === "0" ? d : v + d));
  };
  const onClear = () => {
    setDisplay("0");
    setPrevValue(null);
    setOp(null);
  };
  const onOperator = (nextOp: string) => {
    const n = parseFloat(display);
    if (prevValue != null && op) {
      const res = op === "+" ? prevValue + n : op === "−" ? prevValue - n : op === "×" ? prevValue * n : op === "÷" ? prevValue / n : n;
      setDisplay(String(res));
      setPrevValue(res);
    } else setPrevValue(n);
    setOp(nextOp);
    setDisplay("0");
  };
  const onEquals = () => {
    const n = parseFloat(display);
    if (prevValue == null || !op) return;
    const res = op === "+" ? prevValue + n : op === "−" ? prevValue - n : op === "×" ? prevValue * n : op === "÷" ? (n === 0 ? 0 : prevValue / n) : n;
    setDisplay(String(res));
    setPrevValue(null);
    setOp(null);
  };

  return (
    <div
      className="fixed z-[100] w-[240px] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={(e) => {
          e.preventDefault();
          dragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, startLeft: position.x, startTop: position.y };
        }}
      >
        <span className="text-sm font-semibold text-slate-600">{isHe ? "מחשבון" : "Calculator"}</span>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-gray-500 hover:text-gray-800">
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div className="h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-end px-3 text-right text-lg font-mono font-semibold text-gray-900 truncate">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {["C", "÷", "×", "−", "7", "8", "9", "+", "4", "5", "6", "=", "1", "2", "3", "0"].map((btn) => (
            <button
              key={btn}
              type="button"
              onClick={() => {
                if (btn === "C") onClear();
                else if (["+", "−", "×", "÷"].includes(btn)) onOperator(btn);
                else if (btn === "=") onEquals();
                else onDigit(btn);
              }}
              className={`h-9 rounded-lg text-sm font-semibold transition-colors ${
                btn === "C" ? "bg-red-100 text-red-700 hover:bg-red-200" : ["+", "−", "×", "÷", "="].includes(btn) ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export type OllinSlideProps = {
  onOpenNote?: (noteId: string) => void;
  onNewNote?: () => void;
  onOpenBoard?: () => void;
  onOpenScanner?: () => void;
};

export function OllinSlide({ onOpenNote, onNewNote, onOpenBoard, onOpenScanner }: OllinSlideProps) {
  const { locale } = useLocale();
  const isHe = locale === "he";
  const { folders, getNotesInFolder } = useNotes();
  const { messages, sendMessage, addFormMessage, clearMessages } = useChat();
  const { sendText, currentUserId } = useInternalMessages();
  const { contacts } = useContacts();
  const { addMeeting } = useBoard();
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const defaultFolderId = folders[0]?.id ?? "default";
  const recentNotes = (defaultFolderId ? getNotesInFolder(defaultFolderId) : []).slice(0, 8);

  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  // Brain UI (Internal chat only). Kept here because this component hosts the "expanded" chat input.
  const [brainMenuOpen, setBrainMenuOpen] = useState(false);
  const [brainInfoOpenKey, setBrainInfoOpenKey] = useState<string | null>(null);
  const [activeBrainModel, setActiveBrainModel] = useState<string>("ollin-private");
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [gpsOpen, setGpsOpen] = useState(false);
  const [timeAttendancePanelOpen, setTimeAttendancePanelOpen] = useState(false);
  const [placeholderDots, setPlaceholderDots] = useState("");
  const [topicsSidebarOpen, setTopicsSidebarOpen] = useState(false);
  const [topics, setTopics] = useState<{ id: string; title: string }[]>([]);
  const [visibleToolKeys, setVisibleToolKeys] = useState<string[]>(() => loadToolKeys());
  const [toolsEditMode, setToolsEditMode] = useState(false);
  const [addToolMenuOpen, setAddToolMenuOpen] = useState(false);
  const [draggedToolIndex, setDraggedToolIndex] = useState<number | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorPosition, setCalculatorPosition] = useState({ x: 80, y: 120 });
  const calculatorDragRef = useRef({ isDragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topInputRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const dashboardScrollRef = useRef<HTMLDivElement>(null);

  // Grid: exactly 2 rows x 3 blocks (6 total).
  // If localStorage order misses core blocks, we auto-heal from defaults (without touching saved order too aggressively).
  const GRID_SLOTS = 6;
  const coreDefaults = DEFAULT_TOOL_KEYS.filter((k) => !["calculator", "currency"].includes(k));
  const safeVisible = visibleToolKeys.filter((k) => !["calculator", "currency"].includes(k));
  const merged = [...safeVisible];
  for (const k of coreDefaults) {
    if (!merged.includes(k)) merged.push(k);
  }
  const gridToolKeys = merged.slice(0, GRID_SLOTS);
  const toolItems = gridToolKeys
    .map((key) => TOOL_LIBRARY.find((t) => t.key === key))
    .filter(Boolean) as FeatureItem[];
  const availableToAdd = TOOL_LIBRARY.filter((t) => !visibleToolKeys.includes(t.key));

  const persistTools = useCallback((keys: string[]) => {
    setVisibleToolKeys(keys);
    saveToolKeys(keys);
  }, []);

  const addToolToFront = useCallback(
    (key: string) => {
      persistTools([key, ...visibleToolKeys.filter((k) => k !== key)]);
    },
    [persistTools, visibleToolKeys]
  );

  const removeTool = useCallback((key: string) => {
    persistTools(visibleToolKeys.filter((k) => k !== key));
  }, [visibleToolKeys, persistTools]);

  const addTool = useCallback((key: string) => {
    if (visibleToolKeys.includes(key)) return;
    persistTools([...visibleToolKeys, key]);
    setAddToolMenuOpen(false);
  }, [visibleToolKeys, persistTools]);

  const reorderTools = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const next = [...visibleToolKeys];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    persistTools(next);
    setDraggedToolIndex(null);
  }, [visibleToolKeys, persistTools]);

  const handleToolLongPress = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => setToolsEditMode(true), 500);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); };
  }, []);

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
        {/* '+' (Tool Hub) */}
        <div className="relative">
          <motion.button
            type="button"
            onClick={() => setPlusMenuOpen((o) => !o)}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
            whileTap={{ scale: 0.95 }}
            aria-label="Add"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </motion.button>
          <AnimatePresence>
            {plusMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} aria-hidden />
                    <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-[20px] bg-white/95 backdrop-blur-md border border-slate-200 py-3 z-[60] min-w-[280px] max-w-[320px] shadow-[0_24px_60px_rgba(2,6,23,0.18)] overflow-hidden"
                      style={{ maxHeight: "65vh" }}
                >
                  <div className="px-4 pb-2 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{isHe ? "Tool Hub" : "Tool Hub"}</p>
                      <p className="text-[12px] text-slate-700">{isHe ? "מעלים כרטיסים לרשת" : "Add blocks to your grid"}</p>
                    </div>
                    <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-full">
                      {visibleToolKeys.length}/10
                    </span>
                  </div>
                  <div className="px-3 pb-3 grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
                    {[
                      { key: "calculator", labelEn: "Smart Calc", labelHe: "מחשבון חכם", icon: Calculator },
                      { key: "currency", labelEn: "FX Converter", labelHe: "המרת מטבע", icon: DollarSign },
                      { key: "scanner", labelEn: "Quick Scan", labelHe: "סריקה מהירה", icon: ScanLine },
                      { key: "translator", labelEn: "Translator", labelHe: "מתרגם", icon: MessageSquare },
                    ].map(({ key, labelEn, labelHe, icon: Icon }) => {
                      const isAdded = visibleToolKeys.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isAdded) addToolToFront(key);
                            setPlusMenuOpen(false);
                          }}
                          className="w-full h-[56px] rounded-xl bg-white border border-slate-200/80 hover:shadow-[0_6px_14px_rgba(2,6,23,0.06)] transition-all flex items-center justify-start gap-2 px-3"
                        >
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-slate-500" strokeWidth={2} />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-700 leading-tight truncate">
                            {isHe ? labelHe : labelEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-3 pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGpsOpen(true);
                        setPlusMenuOpen(false);
                      }}
                      className="w-full py-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
                    >
                      {isHe ? "יומן נוכחות וייצוא" : "Attendance log & export"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBrainMenuOpen(true);
                        setBrainInfoOpenKey(null);
                        setPlusMenuOpen(false);
                      }}
                      className="w-full py-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <Brain className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={2} />
                      Brain
                    </button>
                  </div>
                  <div className="px-4 pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-500">{isHe ? "פעולות מהירות (טפסים בצ'אט)" : "Quick actions (chat forms)"}</p>
                  </div>
                  <div className="px-4 pt-3 grid grid-cols-2 gap-2">
                    {PLUS_ACTIONS.map(({ action, labelEn, labelHe, icon: Icon }) => (
                      <button
                        key={action}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (action === "poll") {
                            setPollModalOpen(true);
                            setPlusMenuOpen(false);
                          } else {
                            addFormMessage(action);
                            setPlusMenuOpen(false);
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-xl border border-slate-200/60 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-slate-500" strokeWidth={2} />
                        <span className="truncate">{isHe ? labelHe : labelEn}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        placeholder={`How can I help${placeholderDots}`}
        className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-slate-200 bg-white text-gray-900 placeholder-gray-500 focus:ring-0 focus:border-slate-300 outline-none text-sm min-h-[44px]"
      />
      <motion.button type="button" onClick={handleSend} className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0 flex items-center justify-center shadow-sm" whileTap={{ scale: 0.95 }} aria-label="Send">
        <Send className="w-5 h-5" strokeWidth={2} />
      </motion.button>

      {/* Brain centered modal (internal chat only) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {brainMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-[999998] bg-black/20 backdrop-blur-sm"
                  onClick={() => {
                    setBrainInfoOpenKey(null);
                    setBrainMenuOpen(false);
                  }}
                  aria-hidden
                />
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999999] w-[92vw] max-w-[560px] rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200 shadow-2xl overflow-hidden">
                  {/*
                    Keep centering on the outer fixed container.
                    Framer Motion's scale can override Tailwind's translate() transform,
                    which can make the modal visually drift off-center.
                  */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full h-full"
                  >
                    <div className="sr-only" aria-hidden>
                      Brain modal
                    </div>

                    {!brainInfoOpenKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setBrainInfoOpenKey(null);
                          setBrainMenuOpen(false);
                        }}
                        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900"
                        aria-label="Close"
                      >
                        <X className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    )}

                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-slate-700">Brain</p>
                      <span aria-hidden className="w-8 h-8" />
                    </div>

                    {!brainInfoOpenKey ? (
                      <div className="p-4 max-h-[calc(80vh-120px)] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-2">
                          {BRAIN_MODELS.map((m) => {
                            const active = m.key === activeBrainModel;
                            const creditsRaw =
                              typeof window !== "undefined" ? localStorage.getItem("ollin_credits") : null;
                            const credits = creditsRaw ? parseFloat(creditsRaw) : 0;
                            const locked = !credits || credits <= 0;
                            return (
                              <button
                                key={m.key}
                                type="button"
                                onClick={() => {
                                  setActiveBrainModel(m.key);
                                  setBrainMenuOpen(false);
                                }}
                                className={`rounded-xl px-2 py-2 border text-[11px] font-medium transition-all ${
                                  active
                                    ? "border-slate-300 bg-slate-100 text-slate-700"
                                    : "border-slate-200/70 bg-white hover:bg-slate-50 text-slate-800"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate">{m.label}</span>
                                  <span className="flex items-center gap-2 shrink-0">
                                    {locked && (
                                      <a
                                        href="/billing"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-[10px] font-semibold text-slate-600 hover:underline"
                                      >
                                        Upgrade
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBrainInfoOpenKey(m.key);
                                      }}
                                      className="w-4 h-4 rounded-full border border-slate-200 text-[9px] text-slate-500 flex items-center justify-center hover:text-slate-700"
                                      aria-label="Info"
                                    >
                                      i
                                    </button>
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center max-h-[calc(80vh-120px)] overflow-y-auto font-[Inter,ui-sans-serif,system-ui,sans-serif]">
                        <button
                          type="button"
                          onClick={() => setBrainInfoOpenKey(null)}
                          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900"
                          aria-label="Back"
                        >
                          <X className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                        <p className="text-[13px] font-semibold text-slate-800">
                          {BRAIN_MODELS.find((x) => x.key === brainInfoOpenKey)?.label ?? "Tool"}
                        </p>
                        <p className="mt-2 text-[12px] text-slate-700 leading-relaxed line-clamp-2">
                          {BRAIN_MODEL_DESCRIPTIONS[brainInfoOpenKey] ?? "AI tool description."}
                        </p>
                        {(() => {
                          const creditsRaw =
                            typeof window !== "undefined" ? localStorage.getItem("ollin_credits") : null;
                          const credits = creditsRaw ? parseFloat(creditsRaw) : 0;
                          if (!credits || credits <= 0) {
                            return (
                              <div className="mt-4">
                                <a href="/billing" className="text-slate-600 font-semibold hover:underline">
                                  Upgrade / Buy Credits
                                </a>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );

  const handleNewChat = useCallback(() => {
    const firstUser = messages.find((m: { role?: string; content?: string }) => "role" in m && m.role === "user");
    const title = typeof firstUser?.content === "string" ? firstUser.content.slice(0, 40).trim() || (isHe ? "שיחה חדשה" : "New Chat") : isHe ? "שיחה חדשה" : "New Chat";
    if (messages.length > 0) setTopics((prev) => [{ id: generateUUID(), title }, ...prev]);
    clearMessages();
    setTopicsSidebarOpen(false);
  }, [messages, isHe, clearMessages]);

  return (
    <div className="relative h-full min-h-0 flex flex-col overflow-hidden rounded-[32px] bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg">
      {/* Top: AI Input — static, does not scroll. No fixed/sticky. */}
        <div ref={dashboardScrollRef} className="flex-none p-3 sm:p-4 bg-white/95 backdrop-blur-md border-b border-slate-200/70">
        <div
          className="w-full flex flex-col overflow-hidden bg-white min-h-[152px] border border-slate-200 rounded-2xl shadow-sm focus-within:border-slate-300 focus-within:shadow-sm cursor-text transition-[box-shadow,border-color] duration-300"
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
                  rows={2}
                  className="flex-1 min-w-0 w-full px-5 pt-4 pb-2 rounded-t-2xl border-0 bg-transparent text-gray-900 placeholder-gray-400 focus:ring-0 outline-none text-base min-h-[78px] resize-none"
                />
                <div className="flex items-center justify-between px-3 pb-3 pt-1.5">
                  <div className="flex items-center gap-x-2">
                    <div className="relative">
                      <motion.button type="button" onClick={(e) => { e.stopPropagation(); setPlusMenuOpen((o) => !o); }} className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm" whileTap={{ scale: 0.95 }} aria-label="Add">
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                      </motion.button>
                      <AnimatePresence>
                        {plusMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} aria-hidden />
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              className="absolute bottom-full left-0 mb-2 rounded-[20px] bg-white/95 backdrop-blur-md border border-slate-200 py-3 z-[60] min-w-[320px] max-w-[360px] shadow-[0_24px_60px_rgba(2,6,23,0.18)] overflow-hidden"
                              style={{ maxHeight: "65vh" }}
                            >
                              <div className="px-4 pb-2 flex items-center justify-between">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tool Hub</p>
                                  <p className="text-[12px] text-slate-700">{isHe ? "בחר כלי" : "Pick a tool"}</p>
                                </div>
                                <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-full">
                                  {visibleToolKeys.length}/10
                                </span>
                              </div>

                              <div className="px-3 pb-3 grid grid-cols-2 gap-2 max-h-[32vh] overflow-y-auto pr-1">
                                {[
                                  { key: "calculator", labelEn: "Smart Calc", labelHe: "מחשבון חכם", icon: Calculator },
                                  { key: "currency", labelEn: "FX Converter", labelHe: "המרת מטבע", icon: DollarSign },
                                  { key: "scanner", labelEn: "Quick Scan", labelHe: "סריקה מהירה", icon: ScanLine },
                                  { key: "translator", labelEn: "Translator", labelHe: "מתרגם", icon: MessageSquare },
                                ].map(({ key, labelEn, labelHe, icon: Icon }) => {
                                  const isAdded = visibleToolKeys.includes(key);
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isAdded) addToolToFront(key);
                                        setPlusMenuOpen(false);
                                      }}
                                      className="w-full h-[56px] rounded-xl bg-white border border-slate-200/80 hover:shadow-[0_12px_30px_rgba(2,6,23,0.10)] transition-all flex items-center gap-2 px-3"
                                    >
                                      <span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                        <Icon className="w-4 h-4 text-slate-500" strokeWidth={2} />
                                      </span>
                                      <span className="text-[11px] font-semibold text-slate-700 truncate">
                                        {isHe ? labelHe : labelEn}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="px-3 pt-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGpsOpen(true);
                                    setPlusMenuOpen(false);
                                  }}
                                  className="w-full py-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
                                >
                                  {isHe ? "יומן נוכחות וייצוא" : "Attendance log & export"}
                                </button>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <motion.button type="button" onClick={(e) => { e.stopPropagation(); handleSend(); }} className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center shadow-sm" whileTap={{ scale: 0.95 }} aria-label="Send">
                    <Send className="w-5 h-5" strokeWidth={2} />
                  </motion.button>
                </div>
              </div>
            </div>
        </div>

      {/* Bottom: only this section scrolls (icons/grid + notes). flex-1 overflow-y-auto. relative z-10 so grid is above top block. */}
      <motion.div
        animate={{ opacity: expanded ? 0 : 1 }}
        transition={{ duration: TRANSITION_MS / 1000, ease: EASE_SMOOTH }}
        className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 pb-2 pt-1"
        style={{ pointerEvents: expanded ? "none" : "auto" }}
      >
          <div className="flex-shrink-0 pb-2 pt-1">
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-1">
              {toolItems.map((item, index) => {
                const { key, href, action, labelEn, labelHe, icon: Icon } = item;
                const tileBase =
                  // Premium soft tiles aligned with Explore visual language.
                  "w-full h-[92px] flex flex-col items-center justify-center gap-1 rounded-[32px] bg-white border border-slate-200/80 hover:bg-slate-50 text-gray-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] relative";
                const tileClass = toolsEditMode ? `${tileBase} animate-wiggle cursor-grab active:cursor-grabbing` : tileBase;
                const tileContent = (
                  <>
                    {toolsEditMode && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeTool(key); }}
                        className="absolute -top-1 -right-1 z-10 w-5 h-5 rounded-lg bg-white text-red-600 border border-red-200 flex items-center justify-center shadow-[0_1px_6px_rgba(239,68,68,0.10)] hover:bg-red-50"
                        aria-label={isHe ? "הסר" : "Remove"}
                      >
                        <X className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                    )}
                    {toolsEditMode && (
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
                        <GripVertical className="w-4 h-4" strokeWidth={2} />
                      </span>
                    )}
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-slate-500" strokeWidth={2} />
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight text-gray-700 px-1 line-clamp-2">{isHe ? labelHe : labelEn}</span>
                  </>
                );
                const handleClick = () => {
                  if (toolsEditMode) return;
                  if (action === "task") { addFormMessage("task"); return; }
                  if (action === "event") { setMeetingModalOpen(true); return; }
                };
                const handleContextMenu = (e: React.MouseEvent) => {
                  e.preventDefault();
                  setToolsEditMode(true);
                };
                const handleTouchStart = () => handleToolLongPress();
                const handleTouchEnd = () => cancelLongPress();

                const dragProps = toolsEditMode ? {
                  draggable: true,
                  onDragStart: () => setDraggedToolIndex(index),
                  onDragEnd: () => setDraggedToolIndex(null),
                  onDragOver: (e: React.DragEvent) => {
                    e.preventDefault();
                    if (draggedToolIndex === null || draggedToolIndex === index) return;
                    reorderTools(draggedToolIndex, index);
                    setDraggedToolIndex(index);
                  },
                } : {};

                if (key === "timetracker") {
                  const trackerTileBase =
                    "w-full h-[92px] flex flex-col items-center justify-center gap-1 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-50 text-gray-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] relative";
                  const trackerTileClass = toolsEditMode
                    ? `${trackerTileBase} animate-wiggle cursor-grab active:cursor-grabbing`
                    : trackerTileBase;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={(e) => {
                        if (toolsEditMode) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setTimeAttendancePanelOpen(true);
                      }}
                      onContextMenu={handleContextMenu}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={cancelLongPress}
                      className={trackerTileClass}
                      {...(toolsEditMode ? dragProps : {})}
                      aria-label={isHe ? "שעון נוכחות" : "Clock & Ready"}
                    >
                      {tileContent}
                    </button>
                  );
                }

                if (key === "files") {
                  return (
                    <div
                      key={key}
                      className={tileClass}
                      onContextMenu={handleContextMenu}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={cancelLongPress}
                      {...dragProps}
                    >
                      {toolsEditMode ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                          {tileContent}
                        </div>
                      ) : (
                        <Link href="/dashboard/folders" className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                          {tileContent}
                        </Link>
                      )}
                    </div>
                  );
                }
                if (action === "scanner" && onOpenScanner) {
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={toolsEditMode ? undefined : onOpenScanner}
                      onContextMenu={handleContextMenu}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={cancelLongPress}
                      className={tileClass}
                      {...(toolsEditMode ? dragProps : {})}
                    >
                      {tileContent}
                    </button>
                  );
                }
                if (action === "converter") {
                  return (
                    <div
                      key={key}
                      className={tileClass}
                      onContextMenu={handleContextMenu}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={cancelLongPress}
                      {...dragProps}
                    >
                      {toolsEditMode ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">{tileContent}</div>
                      ) : (
                        <Link href="/dashboard/convert" className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                          {tileContent}
                        </Link>
                      )}
                    </div>
                  );
                }
                if (action === "poll") {
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={(e) => {
                        if (toolsEditMode) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setPollModalOpen(true);
                      }}
                      onContextMenu={handleContextMenu}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={cancelLongPress}
                      className={tileClass}
                      {...(toolsEditMode ? dragProps : {})}
                    >
                      {tileContent}
                    </button>
                  );
                }
                if (action === "task" || action === "event") {
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={handleClick}
                      onContextMenu={handleContextMenu}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={cancelLongPress}
                      className={tileClass}
                      {...(toolsEditMode ? dragProps : {})}
                    >
                      {tileContent}
                    </button>
                  );
                }
                if (key === "calculator") {
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { if (!toolsEditMode) setCalculatorOpen(true); }}
                      onContextMenu={handleContextMenu}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={cancelLongPress}
                      className={tileClass}
                      {...(toolsEditMode ? dragProps : {})}
                    >
                      {tileContent}
                    </button>
                  );
                }
                return (
                  <div
                    key={key}
                    className={tileClass}
                    onContextMenu={handleContextMenu}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={cancelLongPress}
                    {...dragProps}
                  >
                    {toolsEditMode ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">{tileContent}</div>
                    ) : (
                      <Link href={href ?? "/dashboard"} className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                        {tileContent}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
            {toolsEditMode && (
              <button
                type="button"
                onClick={() => setToolsEditMode(false)}
                className="mt-2 w-full py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 shadow-sm"
              >
                {isHe ? "סיום עריכה" : "Done"}
              </button>
            )}
            <div className="flex flex-col items-center mt-2">
              <button
                type="button"
                onClick={() => setAddToolMenuOpen((o) => !o)}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
                aria-label={isHe ? "הוסף כלי" : "Add Tool"}
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>
              {addToolMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAddToolMenuOpen(false)} aria-hidden />
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-white border border-slate-200 shadow-lg py-2 max-h-48 overflow-y-auto">
                    {availableToAdd.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-gray-500">{isHe ? "כל הכלים נוספו" : "All tools added."}</p>
                    ) : (
                      availableToAdd.map(({ key: k, labelEn: le, labelHe: lh, icon: Ico }) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => addTool(k)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-slate-50"
                        >
                          <Ico className="w-4 h-4 text-slate-500" strokeWidth={2} />
                          {isHe ? lh : le}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 pt-2 border-t border-slate-200">
            <ul className="space-y-0.5">
              <li>
                <button type="button" onClick={onNewNote} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium w-full text-left">
                  <Plus className="w-3 h-3" strokeWidth={2.5} /> {isHe ? "פתק חדש" : "New Note"}
                </button>
              </li>
              {recentNotes.slice(0, 3).map((note) => (
                <li key={note.id}>
                  <button type="button" onClick={() => onOpenNote?.(note.id)} className="w-full flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-white/70 text-left border border-transparent hover:border-slate-200 transition-all">
                    <Pencil className="w-3 h-3 text-slate-500 shrink-0" strokeWidth={2} />
                    <span className="text-xs text-gray-700 truncate">{note.title || (isHe ? "ללא כותרת" : "Untitled")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

      {/* Draggable calculator widget — over the slide */}
      {calculatorOpen && createPortal(
        <DraggableCalculator
          isHe={isHe}
          position={calculatorPosition}
          onPositionChange={setCalculatorPosition}
          onClose={() => setCalculatorOpen(false)}
          dragRef={calculatorDragRef}
        />,
        document.body
      )}

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
            className="absolute inset-0 z-20 flex flex-col min-h-0 overflow-hidden rounded-[32px] border border-slate-200 bg-white/95 backdrop-blur-sm shadow-lg"
            style={{ boxShadow: "0 8px 32px rgba(0,128,128,0.12), 0 0 0 1px rgba(0,128,128,0.08)" }}
          >
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-white/90 rounded-t-[32px]">
              <button type="button" onClick={() => setExpanded(false)} className="p-2 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5" aria-label={isHe ? "חזרה ללוח" : "Back to dashboard"}>
                <ChevronUp className="w-5 h-5" strokeWidth={2} />
                <span className="text-sm font-medium">{isHe ? "חזרה" : "Back"}</span>
              </button>
              <button type="button" onClick={() => setTopicsSidebarOpen((o) => !o)} className="p-2 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors" aria-label={isHe ? "נושאים ושיחות" : "Topics & Conversations"}>
                <Menu className="w-5 h-5" strokeWidth={2} />
              </button>
              <span className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-1">
                <CircleCheck className="w-4 h-4 text-slate-500" strokeWidth={2} />
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
                    className="flex-shrink-0 border-r border-slate-200 bg-white/95 backdrop-blur-sm overflow-hidden flex flex-col"
                  >
                    <div className="p-3 border-b border-slate-200">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-slate-500" strokeWidth={2} />
                        {isHe ? "נושאים ושיחות" : "Topics & Conversations"}
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2 min-w-[260px]">
                      <button type="button" onClick={handleNewChat} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg mx-2 transition-colors">
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        {isHe ? "שיחה חדשה" : "New chat"}
                      </button>
                      <div className="border-t border-gray-100 my-2" />
                      {topics.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">{isHe ? "אין שיחות קודמות" : "No previous conversations"}</p>}
                      <ul className="space-y-0.5 px-2">
                        {topics.map((t) => (
                          <li key={t.id}>
                            <button type="button" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-slate-50 hover:text-gray-900 truncate border border-transparent hover:border-slate-200 transition-colors">
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
              {messages.map((m: { id: string; role?: string; content?: string; type?: string; taskTitle?: string }) =>
                "role" in m ? (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-slate-100 text-slate-800 shadow-sm border border-slate-200" : "bg-white/90 backdrop-blur-sm border border-slate-200 text-gray-900 shadow-sm"}`}>
                      {typeof m.content === "string" ? m.content : ""}
                    </div>
                  </div>
                ) : "type" in m && m.type === "taskAdded" ? (
                  <div key={m.id} className="flex justify-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 text-xs font-medium">
                      <ListTodo className="w-4 h-4 shrink-0" strokeWidth={2} />
                      {isHe ? "נוסף ללוח" : "Added to Board"}: <span className="font-semibold truncate max-w-[140px]">{m.taskTitle}</span>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-white/60 border border-slate-200 text-gray-500 text-xs">{"formType" in m ? `[${m.formType}]` : ""}</div>
                  </div>
                )
              )}
              <div ref={chatScrollRef} />
              </div>
            </div>
            <div className="flex-shrink-0 p-3 border-t border-slate-200 bg-white/80 backdrop-blur-sm rounded-b-[32px]">
              {inputRow}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {gpsOpen && <GPSClockModal onClose={() => setGpsOpen(false)} defaultScrollToSummary />}

      {typeof document !== "undefined" &&
        timeAttendancePanelOpen &&
        createPortal(
          <TimeAttendanceManagementPanel layout="fullscreen" onClose={() => setTimeAttendancePanelOpen(false)} />,
          document.body
        )}

      {meetingModalOpen && (
        <MeetingEventFormModal
          type="meeting"
          contacts={contacts}
          onClose={() => setMeetingModalOpen(false)}
          onSubmit={(item) => {
            addMeeting({ ...item, creatorId: currentUserId });
            setMeetingModalOpen(false);
          }}
        />
      )}

      {/* Create Poll modal — same as InternalChatPanel; render via portal so no parent can block it */}
      {typeof document !== "undefined" &&
        pollModalOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setPollModalOpen(false)} aria-hidden />
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
              <div
                className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[32px] bg-white shadow-lg border border-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">{isHe ? "צור סקר" : "Create a Poll"}</h2>
                  <button type="button" onClick={() => setPollModalOpen(false)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label={isHe ? "סגור" : "Close"}>×</button>
                </div>
                <div className="p-4">
                  <PollCreator
                    locale={locale}
                    contacts={contacts}
                    compact
                    onSendToContacts={(data, contactIds) => {
                      const text = `Poll: ${data.question}\n${data.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
                      contactIds.forEach((id) => sendText(id, text, currentUserId));
                      setPollModalOpen(false);
                    }}
                    onSubmit={() => setPollModalOpen(false)}
                  />
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
