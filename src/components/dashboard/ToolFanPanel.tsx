"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useNotes } from "@/contexts/NotesContext";
import { useArchitect } from "@/contexts/ArchitectContext";
import { useBoard } from "@/contexts/BoardContext";
import { useProfile } from "@/contexts/ProfileContext";
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
  Scale,
  Send,
  LayoutGrid,
  ListTodo,
  Brain,
  Sparkles,
  X,
  Check,
} from "lucide-react";
import { ProNoteEditor } from "@/components/notes/ProNoteEditor";
import { PanelWrapper } from "@/components/dashboard/PanelWrapper";

/** Evolution Suggestion: proposed change to Dashboard/Explore/Payments */
export type EvolutionSuggestion = {
  id: string;
  area: "explore" | "dashboard" | "payments";
  titleEn: string;
  titleHe: string;
  descriptionEn: string;
  descriptionHe: string;
  status: "pending" | "applied" | "dismissed";
};

/** Brain scan result: technical improvement suggestion */
type BrainSuggestion = {
  id: string;
  area: string;
  textEn: string;
  textHe: string;
  actionEn: string;
  actionHe: string;
};

type AIMessage = { id: string; role: "user" | "assistant"; text: string; createdAt: number };

/** Scan AI response for [TASK] title or JSON like {"task":"..."}. Returns task title or null. */
function parseTaskFromAssistantMessage(text: string): string | null {
  const trimmed = text.trim();
  const taskTag = "[TASK]";
  const idx = trimmed.indexOf(taskTag);
  if (idx !== -1) {
    const after = trimmed.slice(idx + taskTag.length).trim();
    const end = after.indexOf("\n");
    const title = (end === -1 ? after : after.slice(0, end)).trim();
    if (title.length > 0) return title;
  }
  try {
    const obj = JSON.parse(trimmed) as { task?: string; title?: string };
    const t = obj?.task ?? obj?.title;
    if (typeof t === "string" && t.trim()) return t.trim();
  } catch {
    // Not JSON, ignore
  }
  return null;
}

type FeatureItem = { key: string; labelEn: string; labelHe: string; icon: typeof ScanLine; href: string };

const FEATURE_GRID: FeatureItem[] = [
  { key: "scanner", labelEn: "Scanner", labelHe: "סורק", icon: ScanLine, href: "/dashboard" },
  { key: "invoices", labelEn: "Invoices", labelHe: "חשבוניות", icon: FileText, href: "/dashboard/finances/documents" },
  { key: "files", labelEn: "Files", labelHe: "קבצים", icon: FileStack, href: "/dashboard" },
  { key: "sign", labelEn: "Sign Docs", labelHe: "חתימת מסמכים", icon: PenLine, href: "/dashboard/finances/documents" },
  { key: "poll", labelEn: "Create Poll", labelHe: "סקרים", icon: BarChart2, href: "/dashboard" },
  { key: "events", labelEn: "Events", labelHe: "אירועים", icon: CalendarDays, href: "/dashboard/events/new" },
  { key: "meetings", labelEn: "Meetings", labelHe: "פגישות", icon: Users, href: "/dashboard" },
  { key: "converter", labelEn: "File Converter", labelHe: "המרת קבצים", icon: FileOutput, href: "/dashboard" },
  { key: "compare", labelEn: "Product Comparison", labelHe: "השוואת מוצרים", icon: Scale, href: "/dashboard" },
];

type ToolFanPanelProps = {
  onOpenBoard?: () => void;
};

export function ToolFanPanel({ onOpenBoard: _onOpenBoard }: ToolFanPanelProps) {
  const { locale } = useLocale();
  const { folders, getNotesInFolder, addNote, updateNote, getNote } = useNotes();
  const {
    state: architectState,
    setExploreSortByDistance,
    setAdaptiveLayoutMode,
    setPredictivePaymentEnabled,
    setExploreBridgeEnabled,
  } = useArchitect();
  const { addGivenTask } = useBoard();
  const { profile } = useProfile();
  const currentUserId = profile?.userId ?? "";
  const defaultFolderId = folders[0]?.id ?? "default";
  const recentNotes = (defaultFolderId ? getNotesInFolder(defaultFolderId) : []).slice(0, 12);
  const isHe = locale === "he";

  const [view, setView] = useState<"chat" | "tools">("chat");
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [brainOpen, setBrainOpen] = useState(false);
  const [taskAddedToast, setTaskAddedToast] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change (chat scroll fix)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Evolution Suggestions: Stage content — populated by Self-Optimization Scan (no mocks; real ArchitectContext)
  const INITIAL_EVOLUTIONS: EvolutionSuggestion[] = [
    {
      id: "explore-near-me-first",
      area: "explore",
      titleEn: "Sort Explore by distance",
      titleHe: "מיון גילוי לפי מרחק",
      descriptionEn: "Add a 'Near me first' toggle so the feed sorts by proximity. Users will see the closest deals and jobs at the top.",
      descriptionHe: "הוסף מתג 'קרוב אליי קודם' כדי למיין את הפיד לפי קרבה. המשתמשים יראו מבצעים ומשרות קרובים בראש.",
      status: "pending",
    },
    {
      id: "layout-adaptive",
      area: "dashboard",
      titleEn: "AI-Driven Layout (Desktop vs Mobile)",
      titleHe: "פריסה מותאמת (שולחן vs נייד)",
      descriptionEn: "Layout adapts to your usage: desktop-optimized when on large screens, mobile-first when on the go. Single source of truth for breakpoints and density.",
      descriptionHe: "הפריסה מתאימה את עצמה לשימוש: מותאמת שולחן במסכים גדולים, וניידת כשאתה בדרך. מקור אמת אחד לשבירות וצפיפות.",
      status: "pending",
    },
    {
      id: "payment-predictive",
      area: "payments",
      titleEn: "Predictive Payment System",
      titleHe: "מערכת תשלומים חיזוי",
      descriptionEn: "Suggests which bill to pay first based on your Board history: due dates, overdue items, and past payment patterns. Payments tab highlights 'Pay this first'.",
      descriptionHe: "מציע איזה חשבון לשלם קודם לפי היסטוריית הלוח: תאריכי יעד, פריטים באיחור ודפוסי תשלום. טאב תשלומים מדגיש 'שלם קודם'.",
      status: "pending",
    },
    {
      id: "bridge-explore-architect",
      area: "dashboard",
      titleEn: "Global State Bridge (Explore → Architect)",
      titleHe: "גשר מצב גלובלי (גילוי → ארכיטקט)",
      descriptionEn: "The Architect sees what you're doing in Explore (category, search, recent items) and offers relevant AI chat prompts—e.g. 'Ask about the Jobs you're viewing'.",
      descriptionHe: "הארכיטקט רואה מה אתה עושה בגילוי (קטגוריה, חיפוש, פריטים אחרונים) ומציע הנחיות צ'אט רלוונטיות—למשל 'שאל על המשרות שאתה צופה בהן'.",
      status: "pending",
    },
  ];

  const [evolutionSuggestions, setEvolutionSuggestions] = useState<EvolutionSuggestion[]>(INITIAL_EVOLUTIONS);

  // Self-Optimization Scan: run on mount so Stage always has the latest evolutions (recursive loop — build yourself)
  useEffect(() => {
    setEvolutionSuggestions((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      INITIAL_EVOLUTIONS.forEach((ev) => {
        if (!byId.has(ev.id)) byId.set(ev.id, { ...ev, status: "pending" as const });
      });
      return Array.from(byId.values()).sort((a, b) => {
        const order = INITIAL_EVOLUTIONS.map((e) => e.id);
        return order.indexOf(a.id) - order.indexOf(b.id);
      });
    });
  }, []);

  const handleApplySuggestion = (id: string) => {
    if (id === "explore-near-me-first") setExploreSortByDistance(true);
    else if (id === "layout-adaptive") setAdaptiveLayoutMode("auto");
    else if (id === "payment-predictive") setPredictivePaymentEnabled(true);
    else if (id === "bridge-explore-architect") setExploreBridgeEnabled(true);
    setEvolutionSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "applied" as const } : s)));
  };
  const handleDismissSuggestion = (id: string) => {
    setEvolutionSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "dismissed" as const } : s)));
  };

  // Brain: scan app and suggest 3 technical improvements
  const brainSuggestions: BrainSuggestion[] = [
    { id: "b1", area: "Explore", textEn: "Job search may be slow with many posts — consider virtualized list or index.", textHe: "חיפוש משרות עלול להיות איטי עם הרבה פוסטים — שקול רשימה וירטואלית או אינדקס.", actionEn: "Optimize index?", actionHe: "לשפר אינדקס?" },
    { id: "b2", area: "Explore", textEn: "Local signals API is called on every city change — consider 5min cache to reduce load.", textHe: "API של אותות מקומיים נקרא בכל שינוי עיר — שקול cache של 5 דקות.", actionEn: "Add cache?", actionHe: "להוסיף cache?" },
    { id: "b3", area: "Payments", textEn: "Export to CSV would improve UX for power users tracking transactions.", textHe: "ייצוא ל-CSV ישפר חוויית משתמש למתקדמים.", actionEn: "Add export?", actionHe: "להוסיף ייצוא?" },
  ];

  const editingNote = editingNoteId ? getNote(editingNoteId) : null;

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const userMsg: AIMessage = { id: crypto.randomUUID(), role: "user", text, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const lower = text.toLowerCase();
    const wantsTask =
      lower.includes("task") ||
      lower.includes("recommend") ||
      lower.includes("add ") ||
      lower.includes("משימה") ||
      lower.includes("הוסף משימה") ||
      lower.includes("המלץ");
    const replyText = wantsTask
      ? (isHe
          ? "הנה משימה מומלצת:\n\n[TASK] Set up marketing funnel\n\nנוספה ללוח המשימות שלך."
          : "Here’s a recommended task:\n\n[TASK] Set up marketing funnel\n\nAdded to your Board.")
      : (isHe ? "התקבל. אולין כאן לעזור — חיבור מלא יגיע בקרוב." : "Got it. Ollin is here to help — full connection coming soon.");

    const reply: AIMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      text: replyText,
      createdAt: Date.now() + 1,
    };
    setMessages((prev) => [...prev, reply]);

    const taskTitle = parseTaskFromAssistantMessage(replyText);
    if (taskTitle && currentUserId) {
      addGivenTask({
        title: taskTitle,
        otherParty: "—",
        checklist: [],
        done: false,
        creatorId: currentUserId,
      });
      setTaskAddedToast(true);
      setTimeout(() => setTaskAddedToast(false), 3000);
    }
  }, [input, isHe, currentUserId, addGivenTask]);

  const handleNewNote = () => {
    if (!defaultFolderId) return;
    const note = addNote(defaultFolderId, isHe ? "פתק חדש" : "New note");
    setEditingNoteId(note.id);
  };

  const handleOpenNote = (noteId: string) => setEditingNoteId(noteId);
  const handleBackFromEditor = () => setEditingNoteId(null);

  if (editingNoteId && editingNote) {
    return (
      <ProNoteEditor
        body={editingNote.body}
        onBack={handleBackFromEditor}
        onSave={({ body, title }) => updateNote(editingNote.id, { body, title })}
        locale={locale}
      />
    );
  }

  // Gemini-style: Tools & Notes view (grid + notes list)
  if (view === "tools") {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden border border-gray-200 bg-white shadow-sm rounded-xl">
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">{isHe ? "כלים ופתקים" : "Tools & Notes"}</span>
          <button type="button" onClick={() => setView("chat")} className="p-2 rounded-xl text-[#008080] hover:bg-[#008080]/10 text-sm font-medium">
            {isHe ? "חזרה לאולין" : "Back to Ollin"}
          </button>
        </div>
        <div className="flex-shrink-0 px-3 py-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {FEATURE_GRID.map(({ key, labelEn, labelHe, icon: Icon, href }) => (
              <Link key={key} href={href} className="flex items-center gap-2 py-2.5 px-2.5 rounded-xl border border-gray-100 bg-gray-50/80 hover:bg-gray-100">
                <Icon className="w-4 h-4 text-gray-500 shrink-0" strokeWidth={2} />
                <span className="text-xs font-medium text-gray-700 truncate">{isHe ? labelHe : labelEn}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-t border-gray-100">
          <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">{isHe ? "פתקים" : "Notes"}</span>
            <button type="button" onClick={handleNewNote} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#008080] text-white text-xs font-medium">
              <Plus className="w-4 h-4" strokeWidth={2.5} /> {isHe ? "פתק חדש" : "New Note"}
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto p-3">
            {recentNotes.length === 0 && <li className="text-xs text-gray-500 py-6 text-center">{isHe ? "אין פתקים." : "No notes."}</li>}
            {recentNotes.map((note) => (
              <li key={note.id}>
                <button type="button" onClick={() => handleOpenNote(note.id)} className="w-full flex items-center gap-2 py-3 px-3 hover:bg-gray-50 rounded-xl text-left">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{note.title || (isHe ? "ללא כותרת" : "Untitled")}</p>
                    <p className="text-[10px] text-gray-500">{new Date(note.updatedAt).toLocaleDateString(locale === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short" })}</p>
                  </div>
                  <Pencil className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Full-screen Architect workspace: Stage + conversation + large input (same layout as Explore via PanelWrapper)
  const pendingEvolutions = evolutionSuggestions.filter((s) => s.status === "pending");

  const architectHeader = (
    <div className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4 border-b border-gray-200/80 bg-white">
      <h1 className="text-lg lg:text-xl font-semibold text-gray-900 tracking-tight">
        {isHe ? "אולין ארכיטקט" : "Ollin Architect"}
      </h1>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setBrainOpen((o) => !o)}
          className={`p-2.5 rounded-xl transition-colors lg:p-3 ${brainOpen ? "bg-[#008080]/15 text-[#008080]" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
          aria-label={isHe ? "סריקת שיפורים" : "Scan for improvements"}
          title={isHe ? "סרוק אפליקציה והצע שיפורים" : "Scan app and suggest improvements"}
        >
          <Brain className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => setView("tools")}
          className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:p-3"
          aria-label={isHe ? "כלים ופתקים" : "Tools & Notes"}
        >
          <LayoutGrid className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2} />
        </button>
      </div>
    </div>
  );

  const architectFooter = (
    <div className="p-4 lg:p-6 bg-white border-t border-gray-200/80">
      <div className="max-w-3xl mx-auto">
        {architectState.exploreBridgeEnabled && architectState.exploreContextForArchitect && (
          <div className="flex flex-wrap gap-2 mb-2">
            {architectState.exploreContextForArchitect.lastCategory && architectState.exploreContextForArchitect.lastCategory !== "all" && (
              <button
                type="button"
                onClick={() => setInput(isHe ? `סכם את מה שראיתי ב־${architectState.exploreContextForArchitect!.lastCategory} בגילוי` : `Summarize what I'm viewing in ${architectState.exploreContextForArchitect!.lastCategory} in Explore`)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#008080]/10 text-[#008080] border border-[#008080]/20 hover:bg-[#008080]/20"
              >
                {isHe ? `שאל על ${architectState.exploreContextForArchitect!.lastCategory} בגילוי` : `Ask about ${architectState.exploreContextForArchitect!.lastCategory} in Explore`}
              </button>
            )}
            {architectState.exploreContextForArchitect.lastQuery && (
              <button
                type="button"
                onClick={() => setInput(isHe ? `הרחב את החיפוש: ${architectState.exploreContextForArchitect!.lastQuery}` : `Expand search: ${architectState.exploreContextForArchitect!.lastQuery}`)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#008080]/10 text-[#008080] border border-[#008080]/20 hover:bg-[#008080]/20"
              >
                {isHe ? `הרחב: "${architectState.exploreContextForArchitect!.lastQuery}"` : `Expand: "${architectState.exploreContextForArchitect!.lastQuery}"`}
              </button>
            )}
          </div>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={isHe ? "תן הנחיה לארכיטקט — למשל: הוסף מיון לפי מרחק בפיד גילוי" : "Give the Architect a prompt — e.g. Add sort by distance to the Explore feed"}
          rows={2}
          className="w-full px-4 py-3.5 lg:py-4 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm lg:text-base focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] outline-none resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={handleSend}
            className="inline-flex items-center gap-2 px-4 py-2.5 lg:px-5 lg:py-3 rounded-xl bg-[#008080] text-white text-sm font-medium hover:bg-[#006666] transition-colors"
            aria-label={isHe ? "שלח" : "Send"}
          >
            <Send className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2} />
            {isHe ? "שלח" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Toast: task added to board from chat */}
      {taskAddedToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl bg-[#008080] text-white text-sm font-medium shadow-lg border border-[#006666]/30"
          role="status"
          aria-live="polite"
        >
          <ListTodo className="w-5 h-5 shrink-0" strokeWidth={2} />
          {isHe ? "משימה נוספה ללוח" : "Task Added to Board"}
        </div>
      )}

      {/* Brain panel overlay */}
      {brainOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setBrainOpen(false)} aria-hidden />
          <div className="absolute left-4 right-4 top-14 z-50 max-w-lg mx-auto rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                {isHe ? "הצעות שיפור טכני" : "Technical improvement suggestions"}
              </span>
              <button type="button" onClick={() => setBrainOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <ul className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {brainSuggestions.map((s) => (
                <li key={s.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs font-medium text-[#008080] uppercase tracking-wide mb-1">{s.area}</p>
                  <p className="text-sm text-gray-800 mb-2">{isHe ? s.textHe : s.textEn}</p>
                  <button type="button" className="text-xs font-medium text-[#008080] hover:underline">
                    {isHe ? s.actionHe : s.actionEn}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <PanelWrapper header={architectHeader} footer={architectFooter} className="bg-[#fafafa]">
        {/* Message list: flex-column with useRef at bottom for auto-scroll to bottom */}
        {pendingEvolutions.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 lg:px-6 lg:py-4 border-b border-gray-200/60 bg-white/80">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#008080]" strokeWidth={2} />
              {isHe ? "הצעת אבולוציה" : "Evolution suggestion"}
            </p>
            <p className="text-[10px] text-gray-400 mb-2">{isHe ? "סריקת אופטימיזציה עצמית — אבולוציות על הבמה" : "Self-Optimization Scan — evolutions on Stage"}</p>
            <div className="space-y-3">
              {pendingEvolutions.map((s) => (
                <div key={s.id} className="rounded-xl border border-[#008080]/20 bg-[#008080]/05 p-4 lg:p-5">
                  <h3 className="font-semibold text-gray-900 text-sm lg:text-base mb-1">{isHe ? s.titleHe : s.titleEn}</h3>
                  <p className="text-xs lg:text-sm text-gray-600 mb-3">{isHe ? s.descriptionHe : s.descriptionEn}</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleApplySuggestion(s.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#008080] text-white text-xs font-medium hover:bg-[#006666]">
                      <Check className="w-4 h-4" strokeWidth={2} /> {isHe ? "החל" : "Apply"}
                    </button>
                    <button type="button" onClick={() => handleDismissSuggestion(s.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50">
                      <X className="w-4 h-4" strokeWidth={2} /> {isHe ? "בטל" : "Dismiss"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0 px-4 py-5 lg:px-8 lg:py-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[180px] text-center max-w-xl mx-auto">
              <p className="text-gray-500 text-base lg:text-lg mb-1">
                {isHe ? "אני הארכיטקט. אני יכול לשנות את הדשבורד, גילוי ותשלומים לפי השיחה." : "I'm the Architect. I can modify Dashboard, Explore, and Payments based on our conversation."}
              </p>
              <p className="text-gray-400 text-sm lg:text-base">{isHe ? "מה תרצה לבנות?" : "What would you like to build?"}</p>
            </div>
          )}
          <div className="flex flex-col space-y-5 lg:space-y-6 max-w-2xl mx-auto flex-1">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] lg:max-w-[75%] rounded-2xl px-4 py-3 lg:px-5 lg:py-3.5 ${
                    m.role === "user" ? "bg-[#008080] text-white" : "bg-white border border-gray-200 text-gray-900 shadow-sm"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <CircleCheck className="w-4 h-4 text-[#008080] shrink-0" strokeWidth={2} />
                      <span className="text-xs font-medium text-gray-500">Ollin Architect</span>
                    </div>
                  )}
                  <p className="text-sm lg:text-base whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div ref={scrollRef} aria-hidden />
        </div>
      </PanelWrapper>
    </>
  );
}
