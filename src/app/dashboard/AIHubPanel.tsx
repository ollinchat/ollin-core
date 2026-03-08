"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useBoard } from "@/contexts/BoardContext";
import { useContacts } from "@/contexts/ContactsContext";
import { t } from "@/lib/translations";
import {
  Clock,
  Send,
  Plus,
  Upload,
  FileCode2,
  CalendarPlus,
  BarChart3,
  MessageSquare,
  ScanLine,
  Mic,
  MicOff,
  PlusCircle,
  Share2,
  ChevronDown,
  ChevronUp,
  Globe,
  ShoppingBag,
} from "lucide-react";
import { EventForm } from "@/components/board/EventForm";
import { PollCreator } from "@/components/board/PollCreator";
import { GPSClockModal } from "@/components/tools/GPSClockModal";
import { DirectCameraView } from "@/components/tools/DirectCameraView";
import { ShoppingAgentModal } from "@/components/tools/ShoppingAgentModal";
import { useScans } from "@/contexts/ScansContext";
import { parseReceiptText } from "@/lib/receipt-parser";
import { useChat, useInternalMessages } from "@/contexts/ChatEngineContext";
import type { AIMessage, EventCardPayload } from "@/lib/chat-engine";

/** Minimal type for Web Speech API (not in TS lib). */
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { results: { length: number; [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type PlusMenuItem = {
  icon: typeof Upload;
  labelKey: "hub.fileUpload" | "hub.fileConvert" | "hub.createEvent" | "hub.createPoll" | "hub.aiScanner" | "hub.shoppingAgent";
  action?: "scanner" | "poll" | "event" | "task" | "converter" | "shopping";
};

const PLUS_MENU_ITEMS: PlusMenuItem[] = [
  { icon: ScanLine, labelKey: "hub.aiScanner", action: "scanner" },
  { icon: ShoppingBag, labelKey: "hub.shoppingAgent", action: "shopping" },
  { icon: Upload, labelKey: "hub.fileUpload", action: "task" },
  { icon: FileCode2, labelKey: "hub.fileConvert", action: "converter" },
  { icon: CalendarPlus, labelKey: "hub.createEvent", action: "event" },
  { icon: BarChart3, labelKey: "hub.createPoll", action: "poll" },
];

/** Contact shape for poll sharing (id, name, email, optional userId) */
type PollContact = { id: string; name: string; email: string; userId?: string };

/** Survey mockup: question + dynamic numbered option slots + Create + Send to User/ID. */
function InlinePollForm({
  locale,
  contacts,
  onSubmit,
  onSendToContacts,
}: {
  locale: "en" | "he";
  contacts: PollContact[];
  onSubmit: (data: { question: string; options: string[] }) => void;
  onSendToContacts?: (question: string, options: string[], contactIds: string[]) => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const addOption = () => setOptions((prev) => [...prev, ""]);
  const setOption = (i: number, v: string) =>
    setOptions((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });

  const handleCreate = () => {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim() && opts.length >= 1) onSubmit({ question: question.trim(), options: opts });
  };

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendToContacts = () => {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim() && opts.length >= 1 && selectedIds.size > 0 && onSendToContacts) {
      onSendToContacts(question.trim(), opts, Array.from(selectedIds));
      setShowContactPicker(false);
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 w-full max-w-[85%] space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Poll</p>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">
          {locale === "he" ? "שאלה" : "Question"}
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={locale === "he" ? "שאל שאלה…" : "Ask a question…"}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-2">
          {locale === "he" ? "אפשרויות" : "Options"}
        </label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-400 w-6">{i + 1}.</span>
              <input
                type="text"
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`${locale === "he" ? "אפשרות" : "Option"} ${i + 1}`}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#008080] hover:bg-[#008080]/10 border border-dashed border-[#008080]/30"
          >
            <PlusCircle className="w-4 h-4" />
            {locale === "he" ? "הוסף אפשרות" : "Add option"}
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCreate}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-[#008080] to-[#006666] text-white"
        >
          {locale === "he" ? "צור סקר" : "Create"}
        </button>
        {onSendToContacts && contacts.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">{locale === "he" ? "שלח למשתמש/מזהה" : "Send to User/ID"}</span>
            <button
              type="button"
              onClick={() => setShowContactPicker(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-[#008080]/10 text-[#006666] border border-[#008080]/30 hover:bg-[#008080]/20 w-fit"
            >
              <Share2 className="w-4 h-4" />
              {locale === "he" ? "העבר למשתמש/מזהה" : "Forward to User/ID"}
            </button>
          </div>
        )}
      </div>
      {showContactPicker && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2 mt-2">
          <p className="text-xs font-medium text-gray-600">{locale === "he" ? "בחר משתמש (שם או מזהה 7 ספרות)" : "Select user (name or 7-digit ID)"}</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {contacts.map((c) => (
              <label key={c.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleContact(c.id)} className="rounded border-gray-300 text-[#008080]" />
                <span className="text-sm text-gray-800">{c.name || c.email}</span>
                {c.userId && <span className="text-xs text-gray-500 font-mono">{c.userId}</span>}
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowContactPicker(false)} className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700">
              {locale === "he" ? "ביטול" : "Cancel"}
            </button>
            <button type="button" onClick={handleSendToContacts} disabled={selectedIds.size === 0} className="flex-1 py-2 rounded-lg text-sm font-medium bg-[#008080] text-white disabled:opacity-50">
              {locale === "he" ? "שלח" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineFormBubble({
  formType,
  locale,
  onSubmit,
}: {
  formType: "task";
  locale: "en" | "he";
  onSubmit: (data: Record<string, string>) => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const placeholder = "What to do?";

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 w-full max-w-[85%] space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase">{formType}</p>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
      />
      <input
        type="text"
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="Details"
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
      />
      <button
        type="button"
        onClick={() => onSubmit({ title, detail })}
        className="rounded-xl px-3 py-2 text-sm font-medium bg-gradient-to-r from-[#008080] to-[#006666] text-white"
      >
        Submit
      </button>
    </div>
  );
}

const CONVERT_FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Word" },
  { value: "xlsx", label: "Excel" },
] as const;

/** Inline converter: Upload file → Select format (PDF/Word/Excel) → Convert. */
function InlineConverterForm({
  locale,
  onClose,
}: {
  locale: "en" | "he";
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<"pdf" | "docx" | "xlsx">("pdf");
  const [converting, setConverting] = useState(false);
  const [done, setDone] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setDone(false);
      setDownloadUrl(null);
    }
    e.target.value = "";
  };

  const handleConvert = () => {
    if (!file) return;
    setConverting(true);
    setDownloadUrl(null);
    setTimeout(() => {
      setDownloadUrl(URL.createObjectURL(file));
      setConverting(false);
      setDone(true);
    }, 800);
  };

  const handleDownload = () => {
    if (!downloadUrl || !file) return;
    const base = file.name.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${base}_converted.${targetFormat}`;
    a.click();
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 w-full max-w-[85%] space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {locale === "he" ? "המרת מסמך" : "Document converter"}
      </p>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">
          {locale === "he" ? "העלאת קובץ" : "Upload file"}
        </label>
        <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 cursor-pointer hover:border-[#008080]/40">
          <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={onFileChange} className="hidden" />
          <Upload className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-600">{file ? file.name : (locale === "he" ? "בחר קובץ" : "Select file")}</span>
        </label>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">
          {locale === "he" ? "פורמט יעד" : "Select target format"}
        </label>
        <select
          value={targetFormat}
          onChange={(e) => setTargetFormat(e.target.value as "pdf" | "docx" | "xlsx")}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900"
        >
          {CONVERT_FORMATS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {converting && (
        <p className="text-sm text-[#008080] text-center py-1">{locale === "he" ? "ממיר…" : "Converting…"}</p>
      )}
      {done && downloadUrl && (
        <div className="rounded-xl bg-[#008080]/10 p-3 flex flex-col gap-2">
          <p className="text-sm text-gray-700">{locale === "he" ? "ההמרה הושלמה" : "Conversion complete"}</p>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-xl px-4 py-2 text-sm font-medium bg-[#006666] text-white"
          >
            {locale === "he" ? "הורד" : "Download"}
          </button>
        </div>
      )}
      {!done && !converting && (
        <button
          type="button"
          onClick={handleConvert}
          disabled={!file}
          className="w-full rounded-xl px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-[#008080] to-[#006666] text-white disabled:opacity-50"
        >
          {locale === "he" ? "המר" : "Convert"}
        </button>
      )}
    </div>
  );
}

function EventSummaryCard({
  msgId,
  content,
  payload,
  expanded,
  onToggle,
  locale,
}: {
  msgId: string;
  content: string;
  payload: EventCardPayload;
  expanded: boolean;
  onToggle: () => void;
  locale: "en" | "he";
}) {
  const { title, when, where, details, imageUrl, guestNames } = payload;
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-soft overflow-hidden max-w-[85%]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between gap-2 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#008080] uppercase tracking-wider">Event</p>
          <p className="text-sm font-medium text-gray-900 truncate">{title || content}</p>
          <p className="text-xs text-gray-500 mt-0.5">{when}</p>
          {where && <p className="text-xs text-gray-500">{where}</p>}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3">
          {imageUrl && (
            <img src={imageUrl} alt="" className="w-full h-32 object-cover rounded-xl" />
          )}
          {details && <p className="text-sm text-gray-700">{details}</p>}
          {guestNames && guestNames.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {locale === "he" ? "מוזמנים" : "Guests"}
              </p>
              <ul className="text-sm text-gray-700 space-y-0.5">
                {guestNames.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type HubToolAction = "scanner" | "poll" | "event" | "task" | "converter" | "camera" | "voice" | "shopping";

export type AIHubPanelHandle = { openTool: (action: HubToolAction) => void };

const ACTION_GRID_ITEMS: { key: string; labelEn: string; labelHe: string; icon: typeof MessageSquare; href?: string }[] = [
  { key: "notebook", labelEn: "Notebook", labelHe: "מחברת", icon: MessageSquare },
  { key: "finance", labelEn: "Finance", labelHe: "כספים", icon: ShoppingBag },
  { key: "tasks", labelEn: "Tasks", labelHe: "משימות", icon: BarChart3 },
  { key: "profile", labelEn: "Profile", labelHe: "פרופיל", icon: Globe },
];

async function processImageFileForScan(file: File) {
  const Tesseract = (await import("tesseract.js")).default;
  const { data } = await Tesseract.recognize(file, "eng", { logger: () => {} });
  return parseReceiptText(data.text);
}

const AIHubPanelInner = forwardRef<AIHubPanelHandle, { locale: "en" | "he"; panelIndex?: number }>(function AIHubPanelInner({ locale, panelIndex = 0 }, ref) {
  const router = useRouter();
  const { addReceivedTask, addEvent } = useBoard();
  const { contacts } = useContacts();
  const { addDoc } = useScans();
  const { messages, sendMessage, addFormMessage, addCard } = useChat();
  const { sendText, currentUserId } = useInternalMessages();
  const [chatViewActive, setChatViewActive] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [chatsDrawerOpen, setChatsDrawerOpen] = useState(false);
  const [gpsOpen, setGpsOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [sharePollMessageId, setSharePollMessageId] = useState<string | null>(null);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const previousChats: { id: string; title: string }[] = [];
  const showGridFirst = !chatViewActive && panelIndex === 1;

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setThinking(true);
    sendMessage(text);
    setTimeout(() => setThinking(false), 600);
  };

  const toggleVoice = useCallback(() => {
    if (typeof window === "undefined") return;
    const Win = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance };
    const SpeechRecognition = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInput((prev) => prev + " [Voice not supported in this browser]");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition: SpeechRecognitionInstance = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = locale === "he" ? "he-IL" : "en-US";
    recognition.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, locale]);

  const handlePlusAction = (action?: HubToolAction) => {
    setPlusMenuOpen(false);
    if (action === "camera" || action === "voice") return; // Handled by switching to chat panel where camera/mic live
    if (action === "scanner") setScannerOpen(true);
    if (action === "shopping") setShoppingOpen(true);
    if (action === "poll") setIsPollModalOpen(true);
    if (action === "event") addFormMessage("event");
    if (action === "task") addFormMessage("task");
    if (action === "converter") router.push("/dashboard/convert");
  };

  useImperativeHandle(ref, () => ({ openTool: handlePlusAction }), [handlePlusAction]);

  if (showGridFirst) {
    return (
      <div className="flex flex-col h-full min-h-0 rounded-md overflow-hidden bg-white/95 border border-[#008080]/20">
        <h2 className="flex-shrink-0 text-lg font-semibold text-gray-900 px-4 py-3 border-b border-[#008080]/20">
          {t(locale, "dashboard.toolsHub")}
        </h2>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3 w-full max-w-[280px] mb-6"
          >
            {ACTION_GRID_ITEMS.map(({ key, labelEn, labelHe, icon: Icon }, idx) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  href={key === "finance" ? "/dashboard/finances" : key === "profile" ? "/profile" : "/dashboard"}
                  className="flex flex-col items-center justify-center gap-2 rounded-md border border-[#008080]/30 bg-white py-5 px-4 text-gray-700 hover:bg-[#008080]/5 hover:border-[#008080]/50 transition-colors"
                >
                  <Icon className="w-6 h-6 text-[#008080]" />
                  <span className="text-sm font-medium">{locale === "he" ? labelHe : labelEn}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
          <motion.button
            type="button"
            onClick={() => setChatViewActive(true)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-[280px] py-4 rounded-md bg-[#008080] text-white font-semibold text-base shadow-md hover:bg-[#006666] transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-5 h-5" />
            {locale === "he" ? "צ'אט עם Ollin" : "Chat with Ollin"}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 rounded-md overflow-hidden bg-white/90 backdrop-blur-sm shadow-soft-md border border-[#008080]/20">
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setChatsDrawerOpen((o) => !o)}
          className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label={t(locale, "hub.previousChats")}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        <h2 className="flex-1 text-lg font-semibold text-gray-900">
          {t(locale, "dashboard.toolsHub")}
        </h2>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Previous Chats drawer */}
        <AnimatePresence>
          {chatsDrawerOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-shrink-0 border-r border-gray-100 overflow-hidden bg-white/50"
            >
              <div className="w-[200px] p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {t(locale, "hub.previousChats")}
                </p>
                {previousChats.length === 0 ? (
                  <p className="text-sm text-gray-400">No previous chats</p>
                ) : (
                  <ul className="space-y-1">
                    {previousChats.map((c) => (
                      <li key={c.id}>
                        <button type="button" className="text-sm text-left text-gray-700 hover:text-accent w-full truncate rounded-lg px-2 py-1.5">
                          {c.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main: conversation history + thinking orb */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col justify-end">
          <div className="relative flex flex-col gap-2 min-h-[120px] py-4">
            {messages.length === 0 && !thinking && null}
            {messages.map((msg: AIMessage) => (
              <div key={msg.id} className="flex flex-col gap-1">
                {"role" in msg ? (
                  <div
                    className={`rounded-2xl px-4 py-2 text-sm max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-[#008080] to-[#006666] text-white ml-auto shadow-sm"
                        : "bg-gray-100 border border-gray-200 text-gray-800"
                    }`}
                  >
                    {typeof msg.content === "string" ? msg.content : String(msg.content ?? "")}
                  </div>
                ) : "type" in msg && msg.type === "card" ? (
                  msg.cardType === "event" ? (
                    <EventSummaryCard
                      msgId={msg.id}
                      content={msg.content}
                      payload={msg.payload as EventCardPayload}
                      expanded={expandedCardId === msg.id}
                      onToggle={() => setExpandedCardId((id) => (id === msg.id ? null : msg.id))}
                      locale={locale}
                    />
                  ) : (
                    <div className="rounded-2xl bg-white border border-gray-100 shadow-soft p-4 max-w-[85%] space-y-2">
                      <p className="text-xs font-semibold text-[#008080] uppercase tracking-wider">Poll</p>
                      <p className="text-sm font-medium text-gray-900">{typeof msg.content === "string" ? msg.content : ""}</p>
                      {"body" in msg.payload && msg.payload.body && <p className="text-sm text-gray-600">{typeof msg.payload.body === "string" ? msg.payload.body : ""}</p>}
                      <button
                        type="button"
                        onClick={() => setSharePollMessageId(msg.id)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#008080] bg-[#008080]/10 hover:bg-[#008080]/20 border border-[#008080]/30 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        {locale === "he" ? "שתף עם אנשי קשר" : "Share with Contacts"}
                      </button>
                    </div>
                  )
                ) : "formType" in msg && msg.formType === "event" ? (
                  <EventForm
                    locale={locale}
                    contacts={contacts}
                    onSubmit={({ title, description, date, location, guestIds, imageDataUrl, isOnline }) => {
                      if (!title.trim()) return;
                      const startAt = new Date(date).getTime() || Date.now();
                      const guestList = guestIds
                        .map((id) => contacts.find((c) => c.id === id))
                        .filter(Boolean)
                        .map((c) => ({ email: c!.email, name: c!.name, rsvp: "pending" as const }));
                      const guestNames = guestList.map((g) => g.name || g.email);
                      addEvent({
                        title: title.trim(),
                        startAt,
                        guests: guestList,
                        showFullGuestList: true,
                        type: "event",
                        location: isOnline ? "Online" : location || undefined,
                        description: description.trim() || undefined,
                        imageUrl: imageDataUrl,
                      });
                      addCard("event", title.trim(), {
                        title: title.trim(),
                        when: new Date(date).toLocaleString(),
                        where: isOnline ? "Online" : location || undefined,
                        details: description || undefined,
                        imageUrl: imageDataUrl,
                        guestNames,
                      });
                    }}
                  />
                ) : "formType" in msg && msg.formType === "poll" ? (
                  <InlinePollForm
                    locale={locale}
                    contacts={contacts}
                    onSubmit={({ question, options }) => {
                      if (question && options.length) {
                        addCard("quote", question, { title: question, body: options.join(" · ") });
                      }
                    }}
                    onSendToContacts={(question, options, contactIds) => {
                      const text = `Poll: ${question}\n${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
                      contactIds.forEach((id) => sendText(id, text, currentUserId));
                    }}
                  />
                ) : "formType" in msg && msg.formType === "converter" ? (
                  <InlineConverterForm locale={locale} onClose={() => {}} />
                ) : "formType" in msg && msg.formType === "task" ? (
                  <InlineFormBubble
                    formType="task"
                    locale={locale}
                    onSubmit={(data) => {
                      if (data.title) addReceivedTask({ title: data.title, otherParty: "—", checklist: [], done: false });
                    }}
                  />
                ) : "type" in msg && msg.type === "taskAdded" ? (
                  <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 text-xs font-medium shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                      {locale === "he" ? "נוסף ללוח" : "Added to Board"}: <span className="font-semibold truncate max-w-[180px]">{msg.taskTitle}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
            <AnimatePresence mode="wait">
              {thinking && (
                <motion.div
                  key="orb"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative flex justify-center py-2"
                >
                  <motion.div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-emerald/30 to-accent/40 shadow-soft"
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(5, 150, 105, 0.3)",
                        "0 0 40px rgba(13, 148, 136, 0.4)",
                        "0 0 20px rgba(5, 150, 105, 0.3)",
                      ],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {messages.length === 0 && !thinking && (
              <p className="text-gray-500 text-sm text-center relative z-10">
                Start typing or use a tool below. Your conversation appears here.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-gray-100">
        <div className="flex gap-2 items-center">
          <div className="relative">
            <motion.button
              type="button"
              onClick={() => setPlusMenuOpen((o) => !o)}
              className="w-11 h-11 rounded-xl bg-[#008080] text-white flex items-center justify-center hover:bg-[#006666] transition-colors"
              whileTap={{ scale: 0.98 }}
              aria-label="Add"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
            <AnimatePresence>
              {plusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} aria-hidden />
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute bottom-full left-0 mb-2 rounded-xl bg-white shadow-lg border border-gray-200 py-2 z-[60] min-w-[180px]"
                  >
                    {PLUS_MENU_ITEMS.map(({ icon: Icon, labelKey, action }) => (
                      <button
                        key={labelKey}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlusAction(action);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        <Icon className="w-4 h-4 text-[#008080]" />
                        {t(locale, labelKey)}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            type="button"
            onClick={() => setGpsOpen(true)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            whileTap={{ scale: 0.98 }}
          >
            <Clock className="w-4 h-4 text-[#008080]" />
            <span className="hidden sm:inline">{t(locale, "dashboard.gpsClock")}</span>
          </motion.button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask or type a message…"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#008080]/20 focus:bg-white min-h-[48px]"
          />
          <button
            type="button"
            onClick={toggleVoice}
            className={`rounded-xl p-3 flex items-center justify-center min-h-[48px] transition-colors ${listening ? "bg-red-100 text-red-600" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            aria-label="Voice input"
          >
            {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <motion.button
            type="button"
            onClick={handleSend}
            className="rounded-xl px-4 py-3 text-sm font-medium bg-gradient-to-br from-[#008080] to-[#006666] text-white inline-flex items-center justify-center min-h-[48px]"
            whileTap={{ scale: 0.98 }}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {gpsOpen && <GPSClockModal onClose={() => setGpsOpen(false)} />}
      {scannerOpen && (
        <DirectCameraView
          onCapture={async (file) => {
            try {
              const parsed = await processImageFileForScan(file);
              addDoc({
                fileName: file.name,
                date: parsed.date,
                amount: parsed.amount,
                supplier: parsed.supplier,
                vat: parsed.vat,
                status: "Pending",
                category: parsed.category,
              });
            } finally {
              setScannerOpen(false);
            }
          }}
          onCancel={() => setScannerOpen(false)}
        />
      )}
      {shoppingOpen && <ShoppingAgentModal onClose={() => setShoppingOpen(false)} />}

      {/* Create Poll modal */}
      {isPollModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setIsPollModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={locale === "he" ? "צור סקר" : "Create a Poll"}
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-[#008080]/20" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-[#008080]/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{locale === "he" ? "צור סקר" : "Create a Poll"}</h2>
              <button type="button" onClick={() => setIsPollModalOpen(false)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label={locale === "he" ? "סגור" : "Close"}>×</button>
            </div>
            <div className="p-4">
              <PollCreator
                locale={locale}
                contacts={contacts}
                compact
                onSubmit={({ question, options }) => {
                  addCard("quote", question, { title: question, body: options.join(" · ") });
                  setIsPollModalOpen(false);
                }}
                onSendToContacts={(data, contactIds) => {
                  const text = `Poll: ${data.question}\n${data.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
                  contactIds.forEach((id) => sendText(id, text, currentUserId));
                  setIsPollModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Share poll with contacts modal */}
      {sharePollMessageId && (() => {
        const pollMsg = messages.find((m: AIMessage) => "id" in m && m.id === sharePollMessageId);
        let pollText = "";
        if (pollMsg && "type" in pollMsg && pollMsg.type === "card" && pollMsg.cardType === "quote") {
          const body = "body" in pollMsg.payload ? (pollMsg.payload as { body?: string }).body : undefined;
          pollText = [pollMsg.content, body?.replace(/ · /g, "\n")].filter(Boolean).join("\n");
        }
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setSharePollMessageId(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-gray-200 p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-gray-900">
                {locale === "he" ? "שתף סקר עם אנשי קשר" : "Share with Contacts"}
              </h3>
              <p className="text-xs text-gray-500">
                {locale === "he" ? "בחר אנשי קשר לשתף איתם את הסקר." : "Select contacts to share this poll with."}
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-100 rounded-xl p-2">
                {contacts.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">{locale === "he" ? "אין אנשי קשר" : "No contacts"}</p>
                ) : (
                  contacts.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300 text-[#008080]" />
                      <span className="text-sm text-gray-800">{c.name || c.email}</span>
                    </label>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSharePollMessageId(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {locale === "he" ? "ביטול" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pollText && typeof navigator !== "undefined") {
                      if (navigator.share) {
                        navigator.share({ title: "Poll", text: pollText }).catch(() => {});
                      } else {
                        navigator.clipboard?.writeText(pollText);
                      }
                    }
                    setSharePollMessageId(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#008080] text-white hover:bg-[#006666]"
                >
                  {locale === "he" ? "שתף" : "Share"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
});

export const AIHubPanel = AIHubPanelInner;
