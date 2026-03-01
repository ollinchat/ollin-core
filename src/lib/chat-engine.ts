/**
 * OLLIN MASTER ENGINE - FINAL UX & STABILITY
 */
import { parseInvoiceFromChat } from './invoice-parser';

// --- 1. MANDATORY UI EXPORTS (Fixes the White Screen Error) ---
export const OLLIN_AI_SESSION_ID = "ollin-main-session";
/** Build a unique conversation id for 1:1 (order-independent). */
export function conversationId(a: string, b: string): string {
  return [a, b].sort().join("--");
}
export const loadAIMessages = () => JSON.parse(localStorage.getItem('ollin_ai_messages') || '[]');
export const saveAIMessages = (msgs: any[]) => localStorage.setItem('ollin_ai_messages', JSON.stringify(msgs));
export const loadInternalMessages = () => JSON.parse(localStorage.getItem('ollin_internal_messages') || '[]');
export const saveInternalMessages = (msgs: any[]) => localStorage.setItem('ollin_internal_messages', JSON.stringify(msgs));
export const detectLanguage = (input: string) => (/[א-ת]/.test(input) ? 'he' : 'en');
export const shouldUseSearchTool = (input: string) => input.length > 50;

export type InternalMessagePart = { type: "text"; content: string } | { type: "voice"; url: string } | { type: "file"; url: string; name: string };
export interface InternalMessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  parts: InternalMessagePart[];
  createdAt: number;
  status?: "sending" | "sent" | "read";
}

/** Event card payload for AI message cards. */
export interface EventCardPayload {
  title?: string;
  when?: string;
  where?: string;
  details?: string;
  imageUrl?: string;
  guestNames?: string[];
}

/** Quote card payload for AI message cards. */
export interface QuoteCardPayload {
  title?: string;
  body?: string;
  amount?: number;
  currency?: string;
  [key: string]: unknown;
}

/** AI chat message (user, assistant, form, card, or task-added notification). */
export type AIMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string }
  | { id: string; type: "form"; formType: "poll" | "event" | "task" | "converter" }
  | { id: string; type: "card"; cardType: "quote" | "event"; content: string; payload: QuoteCardPayload | EventCardPayload }
  | { id: string; role: "assistant"; content: string; status?: "loading" }
  | { id: string; type: "taskAdded"; taskTitle: string };

// --- 2. INTENT PARSING ---
/** Prompt trigger: [TASK: title] or [TASK:title] */
const TASK_TRIGGER_REGEX = /\[TASK\s*:\s*([^\]]+)\]/i;
/** Explicit phrases (EN + HE) that mean "add a task to the board". */
const EXPLICIT_TASK_PHRASES = {
  en: /^(remind me to|add task|create task|add to board|save task|don't forget|remember to)\b|\b(remind me|add task|add to board)\b/i,
  he: /^(תזכיר|הוסף משימה|צור משימה|רשום|שמור|הוסף ללוח|תזכור)/,
};

export function parseTaskTrigger(input: string): { title: string } | null {
  const m = input.trim().match(TASK_TRIGGER_REGEX);
  if (m) return { title: m[1].trim() || "New task" };
  return null;
}

export const getLastMessageIsTaskIntent = (input: string): boolean => {
  const t = input.trim();
  if (TASK_TRIGGER_REGEX.test(t)) return true;
  if (/צריך|משימה|TODO/i.test(t)) return true;
  if (EXPLICIT_TASK_PHRASES.en.test(t) || EXPLICIT_TASK_PHRASES.he.test(t)) return true;
  return false;
};

export const parseTaskTitleFromIntent = (input: string): string => {
  const trigger = parseTaskTrigger(input);
  if (trigger) return trigger.title;
  const stripped = input
    .replace(TASK_TRIGGER_REGEX, "")
    .replace(/^(remind me to|add task|create task|add to board|save task|don't forget|remember to)\s*/gi, "")
    .replace(/^(תזכיר\s*(לי)?|הוסף משימה|צור משימה|רשום|שמור|הוסף ללוח|תזכור\s*(לי)?)\s*/i, "")
    .replace(/צריך|משימה|TODO/gi, "")
    .trim();
  return stripped || "New task";
};
export const isDoneIntent = (input: string) => /בוצע|סיימתי|done/i.test(input);
export const parseDoneIntent = (input: string) => input;
export const isHandledIntent = (input: string) => false;
export const parseHandledIntent = (input: string) => input;
export const parseMentionInPassing = (input: string) => null;
export const isEventIntent = (input: string) => false;
export const isPollIntent = (input: string) => false;

// --- 3. SUMMARY BUILDERS ---
export const buildBoardSummary = () => "Strategic R&D in progress.";
export const buildFinanceSummary = () => "Operational burn is active.";

// --- 4. THE CORE RESPONSE LOGIC (Ollin DNA: context-aware, Hebrew + Personality) ---
export type OllinContext = {
  boardSummary?: string;
  financeSummary?: string;
  pendingTaskCount?: number;
  unpaidInvoiceCount?: number;
  userName?: string;
  checklistBrief?: string;
  /** Overdue invoices */
  overdueBrief?: string;
  /** "We have 2 Price Quotes waiting for approval and 1 Overdue Invoice. Want me to send a reminder to the clients?" */
  financeProactiveBrief?: string;
  /** Set when a task was just added to the board (human-centric reply). */
  addedTaskTitle?: string;
};

export const generateReply = (userInput: string, context?: OllinContext) => generateOllinResponse(userInput, context);

export const generateOllinResponse = (userInput: string, ctx?: OllinContext) => {
  if (ctx?.addedTaskTitle) {
    const day = "today";
    const time = "9:00 AM";
    return `DONE. I've scheduled your task: '${ctx.addedTaskTitle}' for ${day} at ${time}. Let me know if you need any changes.`;
  }

  const isHebrew = detectLanguage(userInput) === 'he';
  const name = ctx?.userName ?? 'Emil';
  const pending = ctx?.pendingTaskCount ?? 0;
  const unpaid = ctx?.unpaidInvoiceCount ?? 0;

  // A. Handle Money
  const financialData = parseInvoiceFromChat(userInput);
  if (financialData) {
    const saved = localStorage.getItem('ollin_finance');
    const entries = saved ? JSON.parse(saved) : [];
    const newEntry = { ...financialData, id: Math.random().toString(36).substr(2, 9), status: 'cleared', category: 'rnd' };
    localStorage.setItem('ollin_finance', JSON.stringify([...entries, newEntry]));
    return isHebrew 
      ? `בוצע. רשמתי הוצאה של ${newEntry.amount} ${newEntry.currency} בלוח האסטרטגי.`
      : `Logged ${newEntry.amount} ${newEntry.currency} to the board.`;
  }

  // B. Handle Tasks
  if (getLastMessageIsTaskIntent(userInput)) {
    const saved = localStorage.getItem('ollin_tasks');
    const tasks = saved ? JSON.parse(saved) : [];
    const newTask = { id: Math.random().toString(36).substr(2, 9), text: parseTaskTitleFromIntent(userInput), status: 'pending', date: new Date().toISOString() };
    localStorage.setItem('ollin_tasks', JSON.stringify([...tasks, newTask]));
    return isHebrew 
      ? `משימה חדשה בלוח: "${newTask.text}"`
      : `Task pinned: "${newTask.text}"`;
  }

  // C. Context-aware replies (Ollin DNA: board/finance/checklists/overdue)
  const brief = ctx?.checklistBrief;
  const hasPendingInBrief = brief && /Still to do|still to do/i.test(brief);
  const overdue = ctx?.overdueBrief;
  const financeProactive = ctx?.financeProactiveBrief;
  const trimmed = userInput.trim().toLowerCase();

  if (isHebrew) {
    if (/מה קורה|היי|שלום|בוקר טוב|ערב טוב/.test(userInput)) {
      if (financeProactive) {
        return `${name}, ${financeProactive.replace("Want me to send a reminder to the clients?", "לשלוח תזכורת ללקוחות?")}`;
      }
      if (overdue) {
        return `${name}, ${overdue.replace("Should I send a reminder or mark as handled?", "לשלוח תזכורת או לסמן כה טופל?")}`;
      }
      if (brief) {
        const nudge = hasPendingInBrief ? " להזכיר למישהו?" : "";
        return `${name}, ${brief}${nudge}`;
      }
      if (pending > 0 || unpaid > 0) {
        return `${name}, הכל פועל. ${pending > 0 ? `יש ${pending} משימות פתוחות.` : ''} ${unpaid > 0 ? `חשבונית אחת ממתינה.` : ''} נטפל?`;
      }
      return "הכל פועל. מחכה לפקודות.";
    }
    if (/מה המצב|סיכום|סטטוס|משימות|חשבוניות/.test(userInput)) {
      if (pending > 0 && unpaid > 0) return `יש ${pending} משימות פתוחות ו־${unpaid} חשבונית ממתינה. רוצה פירוט?`;
      if (pending > 0) return `יש ${pending} משימות פתוחות. לרשום או לסמן בוצע?`;
      if (unpaid > 0) return `חשבונית אחת ממתינה. לשלוח תזכורת או לסמן כה טופל?`;
      return "אין משימות פתוחות או חשבוניות ממתינות.";
    }
    return "אני שומע אותך. להוסיף הוצאה או משימה?";
  }

  if (/what'?s up|how are you|hello|hi|hey|status|summary/i.test(trimmed)) {
    if (financeProactive) {
      return `${name}, ${financeProactive}`;
    }
    if (overdue) {
      return `${name}, ${overdue}`;
    }
    if (brief) {
      const nudge = /Still to do|still to do/.test(brief) ? " Should I nudge them?" : "";
      return `${name}, ${brief}.${nudge}`;
    }
    if (pending > 0 || unpaid > 0) {
      return `${name}, we're good. ${pending > 0 ? `We have ${pending} open tasks.` : ''} ${unpaid > 0 ? 'One invoice pending.' : ''} Let's clear them?`;
    }
    return "All systems green. What's next?";
  }

  if (/status|summary|tasks|invoices/i.test(trimmed)) {
    if (pending > 0 && unpaid > 0) return `You have ${pending} open tasks and ${unpaid} invoice pending. Want details?`;
    if (pending > 0) return `${pending} open task(s). Add a new one or mark one done?`;
    if (unpaid > 0) return `One invoice pending. Send a reminder or mark as handled?`;
    return "No open tasks or pending invoices.";
  }

  return "Ollin operational. Ready for updates.";
};