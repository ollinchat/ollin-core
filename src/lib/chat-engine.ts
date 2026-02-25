/**
 * Chat-first data layer: types, language detection, and reply generation.
 * No React; used by ChatEngineContext.
 */

export type ChatLanguage = "he" | "en";

/** Detect language from text (Hebrew vs English) for AI reply. */
export function detectLanguage(text: string): ChatLanguage {
  if (!text || typeof text !== "string") return "en";
  const heCount = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const enCount = (text.match(/[a-zA-Z]/g) || []).length;
  return heCount >= enCount ? "he" : "en";
}

/** AI message: text or form/card. */
export type AIMessage =
  | { id: string; role: "user" | "assistant"; content: string }
  | { id: string; type: "form"; formType: "poll" | "event" | "task"; content?: string }
  | { id: string; type: "form"; formType: "converter"; content?: string }
  | { id: string; type: "card"; cardType: "quote" | "event"; content: string; payload: QuoteCardPayload | EventCardPayload };

export type QuoteCardPayload = { title: string; body: string; source?: string };
export type EventCardPayload = {
  title: string;
  when: string;
  where?: string;
  details?: string;
  imageUrl?: string;
  guestNames?: string[];
};

/** Internal (network) message part. */
export type InternalMessagePart =
  | { type: "text"; content: string }
  | { type: "voice"; url: string }
  | { type: "file"; url: string; name: string };

export type InternalMessageStatus = "sending" | "sent" | "read";

export interface InternalMessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  parts: InternalMessagePart[];
  createdAt: number;
  status?: InternalMessageStatus;
}

const STORAGE_AI = "ollin_chat_messages";
const STORAGE_INTERNAL = "ollin_internal_messages";

export function loadAIMessages(): AIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_AI);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAIMessages(messages: AIMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_AI, JSON.stringify(messages));
  } catch (_) {}
}

export function loadInternalMessages(): InternalMessageRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_INTERNAL);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveInternalMessages(messages: InternalMessageRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_INTERNAL, JSON.stringify(messages));
  } catch (_) {}
}

function isExplicitTaskIntent(text: string): boolean {
  const lower = text.trim().toLowerCase();
  const heTask = /^(תזכיר|הוסף משימה|צור משימה|רשום|שמור|הוסף ללוח|תזכור)/;
  const enTask = /^(remind me|add task|create task|add to board|save task|don't forget|remember to)/i;
  if (heTask.test(text.trim()) || enTask.test(lower)) return true;
  if (/\b(remind me to|add task|add to board)\b/i.test(lower)) return true;
  return false;
}

/** True if the message is a factual question we should answer via search (e.g. "Who sells tires?"). */
export function shouldUseSearchTool(text: string): boolean {
  const trimmed = (text || "").trim();
  if (trimmed.length < 3) return false;
  const lower = trimmed.toLowerCase();
  const isQuestion =
    /\?$/.test(trimmed) ||
    /^(who|what|where|when|why|how|which|is there|are there|can you|do you|does|did|will|would|could|should|מי|מה|איפה|מתי|למה|איך|האם)/i.test(trimmed);
  const looksLikeSearch = isQuestion || /who sells|where can i (buy|find)|who has|what is the|how do i/i.test(lower);
  if (!looksLikeSearch) return false;
  if (isExplicitTaskIntent(trimmed)) return false;
  const eventIntent = /^(add event|create event|הוסף אירוע|צור אירוע)/i.test(trimmed) || /\b(add|create)\s+(an?\s+)?event\b/i.test(lower);
  if (eventIntent) return false;
  const pollIntent = /^(add poll|create poll|הוסף סקר|צור סקר)/i.test(trimmed) || /\b(add|create)\s+(a\s+)?poll\b/i.test(lower);
  if (pollIntent) return false;
  return true;
}

/** Context passed to Ollin for proactive, agentic replies. */
export type OllinContext = {
  userName?: string;
  boardSummary?: string;
  financeSummary?: string;
  /** Total pending tasks (given + received) for proactive greeting. */
  pendingTaskCount?: number;
  /** Count of active (unpaid) invoices for proactive suggestion. */
  unpaidInvoiceCount?: number;
  /** First active invoice number for conversational follow-up (e.g. "invoice #0001 is still active"). */
  firstUnpaidInvoiceNumber?: string;
  /** 7-digit Founder ID for AI to reference as "Your Founder ID". */
  founderId?: string;
  /** When user just added a task: title we added, so reply can say "X is on the board." */
  addedTaskTitle?: string;
  /** When user just marked a task done: title we marked, so reply can say "Marked X done." */
  markedTaskTitle?: string;
  /** When user said they handled/paid something: label we cleared (e.g. "Invoice #0001"). */
  clearedLabel?: string;
  /** When user mentioned a name/task in passing: suggested task title to offer adding. */
  suggestedTaskTitle?: string;
  /** First few pending task titles (from GIVEN/received) so Ollin can reference by name. */
  pendingTaskTitles?: string[];
  /** When we just cleared a task/meeting: offer to add a follow-up task for tomorrow. */
  offerFollowUp?: boolean;
};

/** True if user is asking for status / what's pending (triggers board/finance context only here). */
function isStatusQuestion(text: string): boolean {
  const lower = (text || "").trim().toLowerCase();
  return /what'?s up|anything pending|what do we have|what'?s on the board|status\??|מה נשמע|מה יש|סטטוס|ממתין|מה על הלוח/i.test(lower);
}

/**
 * OLLIN — Witty, aggressive, strategic co-founder. Not an assistant.
 * Uses boardSummary/financeSummary as shared context only; never parrots data back.
 */
export function generateReply(
  content: string,
  history: AIMessage[],
  lang: ChatLanguage,
  userOllinId?: string,
  ctx?: OllinContext
): string {
  const trimmed = (content || "").trim();
  const lower = trimmed.toLowerCase();
  const name = ctx?.userName || "Emil";
  const isQuestion = /\?$/.test(trimmed) || /^(who|what|where|when|why|how|which|is there|are there|can you|do you|does|did|will|would|could|should|מי|מה|איפה|מתי|למה|איך|האם)/i.test(trimmed);
  const isCommand = isExplicitTaskIntent(trimmed);
  const isGreeting = /^(hello|hi|hey|good morning|good evening|שלום|היי|בוקר|ערב|הי)$/i.test(trimmed) || /^(hello|hi|hey)\s*[!.]?$/i.test(trimmed);
  const isStatus = isStatusQuestion(trimmed);
  const pending = ctx?.pendingTaskCount ?? 0;
  const unpaid = ctx?.unpaidInvoiceCount ?? 0;
  const showBoardContext = isGreeting || isStatus;
  const hasBoardData = pending > 0 || unpaid > 0;

  if (ctx?.clearedLabel) {
    const followUp = ctx.offerFollowUp ? (lang === "he" ? " רוצה שאוסיף משימת המשך למחר?" : " Should I add a follow-up task for tomorrow?") : "";
    return lang === "he"
      ? `עשיתי. הסרתי את זה. מה הניצחון הבא?${followUp}`
      : `Done. I've cleared that. What's our next win?${followUp}`;
  }
  if (ctx?.markedTaskTitle) {
    const followUp = ctx.offerFollowUp ? (lang === "he" ? " רוצה שאוסיף משימת המשך למחר?" : " Should I add a follow-up task for tomorrow?") : "";
    return lang === "he"
      ? `עשיתי. "${ctx.markedTaskTitle}" בוצע. מה הניצחון הבא?${followUp}`
      : `Done. I've cleared "${ctx.markedTaskTitle}". What's our next win?${followUp}`;
  }
  if (ctx?.suggestedTaskTitle) {
    return lang === "he"
      ? `רוצה שאוסיף "${ctx.suggestedTaskTitle}" ללוח?`
      : `Want me to add "${ctx.suggestedTaskTitle}" to the Board?`;
  }
  if (isQuestion && /my id|founder id|user id|what'?s my id|מה המזהה|המזהה שלי/i.test(lower) && ctx?.founderId) {
    return lang === "he" ? `המזהה המייסד שלך: ${ctx.founderId}. שתף ואחרים יוכלו להוסיף אותך.` : `Your Founder ID is ${ctx.founderId}. Share it so others can add you on Ollin.`;
  }
  if (isCommand && ctx?.addedTaskTitle) {
    return lang === "he"
      ? `בפנים, ${name}. "${ctx.addedTaskTitle}" על הלוח. עוד משהו?`
      : `Got it, ${name}. "${ctx.addedTaskTitle}" is on the board. Anything else for our next move?`;
  }

  const isEmotionalState = /\b(tired|exhausted|overwhelmed|burned out|need a break|עייף|מותש|לחץ)\b/i.test(trimmed);
  const firstTask = ctx?.pendingTaskTitles?.[0];
  if (isEmotionalState && pending > 0 && firstTask) {
    return lang === "he"
      ? `${name}, אני מבין. אבל יש לנו ${pending} משימות ב-GIVEN. בוא נסגור את "${firstTask}" ואז ננשום. דיל?`
      : `${name}, I get it. But we have ${pending} high-priority tasks in GIVEN. Let's close the "${firstTask}" and then call it a day. I'll handle the notification. Deal?`;
  }
  if (isEmotionalState && pending > 0 && !firstTask) {
    return lang === "he"
      ? `${name}, אני מבין. יש ${pending} משימות. נסגור אחת ואז ננשום. דיל?`
      : `${name}, I get it. We have ${pending} tasks. Let's close one and then call it a day. Deal?`;
  }

  const isPaymentMention = /\b(wire|sending payment|will pay|paying (?:the )?invoice|אעביר|אשלח תשלום)\b/i.test(trimmed);
  if (isPaymentMention && ctx?.firstUnpaidInvoiceNumber && !ctx?.clearedLabel) {
    const num = ctx.firstUnpaidInvoiceNumber;
    return lang === "he"
      ? `הכסף יעבור, תגיד "שילמתי" ואנקה. או "שילמתי #${num}" אם כבר בוצע.`
      : `When it's through, say "Paid" and I'll clear it. Or say "Paid #${num}" now if it's done.`;
  }

  // Context-first: answer the question first, then add strategic context (never "I have analyzed your board").
  const statusContextEn =
    showBoardContext && hasBoardData && (pending > 0 || unpaid > 0)
      ? pending > 0 && unpaid > 0
        ? ` We've got ${pending} open task${pending === 1 ? "" : "s"} and that invoice is still sitting there. Let's clear the deck. What's first?`
        : pending > 0
          ? ` We've got ${pending} open task${pending === 1 ? "" : "s"}. Let's clear the deck. What's first?`
          : ` That invoice is still sitting there. Let's clear it and move.`
      : "";
  const statusContextHe =
    showBoardContext && hasBoardData && (pending > 0 || unpaid > 0)
      ? pending > 0 && unpaid > 0
        ? ` יש ${pending} משימות וחשבונית אחת עדיין פתוחה. נפנה את השולחן. מה ראשון?`
        : pending > 0
          ? ` ${pending} משימות פתוחות. נפנה. מה ראשון?`
          : ` החשבונית עדיין שם. נסגור ונתקדם.`
      : "";

  if (lang === "he") {
    if (/שלום|היי|בוקר|ערב|הי/.test(trimmed)) return "היי. מה קורה?" + (statusContextHe || "");
    if (/תודה|מעולה|יופי|בסדר/.test(trimmed)) return "בשמחה. צריך עוד — אני כאן.";
    if (isQuestion && /מה נשמע|איך אתה|מה קורה/.test(trimmed)) return "הכל טוב. אתה?" + (isStatus ? statusContextHe : "");
    if (isQuestion && /הצעד הבא|המהלך הבא|מה הלאה|לאן אנחנו הולכים|מוניטיזציה|הכנסות/.test(trimmed)) {
      return `${name}, בוא נתמקד. תבחר דבר אחד, תשחרר השבוע. נשפר אחרי שזה באוויר.`;
    }
    if (isQuestion && /מה אתה יודע|מה אתה יכול|עזור/.test(trimmed)) return "שיחה, מידע, לוח, כספים. רוצה משימה או אירוע — תגיד במפורש.";
    if (isCommand) return "על הלוח. רוצה עוד?";
    if (isQuestion) return "שאל מה שאתה צריך. רוצה על הלוח — תגיד 'תזכיר' או 'הוסף אירוע'.";
    if (trimmed.length < 3) return "כן?";
    return "הבנתי. לוח? תגיד 'תזכיר' או 'הוסף אירוע'.";
  }

  if (/hello|hi|hey|good morning|good evening/i.test(trimmed)) return "Hey." + (statusContextEn || "");
  if (/thanks|thank you|great|perfect|ok|okay/i.test(trimmed)) return "Anytime.";
  if (isQuestion && /how are you|what'?s up/i.test(lower)) {
    return "Good. You?" + (isStatus ? statusContextEn : "");
  }
  if (isQuestion && /next big move|our next move|what'?s next|where do we go|what should we do next|big move/i.test(lower)) {
    return `${name}, growth or margin? Pick one thing, ship this week. We refine once it's live.`;
  }
  if (isCommand) return "On the board. What's next?";
  if (isQuestion) return "Ask away. Want something on the board? Say \"remind me to\" or \"add event\".";
  if (trimmed.length < 3) return "Yeah?";
  return "Got it. Board? Say \"remind me to [thing]\" or \"add event\".";
}

export function getLastMessageIsTaskIntent(content: string): boolean {
  return isExplicitTaskIntent(content);
}

export function isEventIntent(content: string): boolean {
  const t = (content || "").trim();
  const lower = t.toLowerCase();
  return /^(add event|create event|הוסף אירוע|צור אירוע)/i.test(t) || /\b(add|create)\s+(an?\s+)?event\b/i.test(lower);
}

export function isPollIntent(content: string): boolean {
  const t = (content || "").trim();
  return /^(add poll|create poll|הוסף סקר|צור סקר)/i.test(t) || /\b(add|create)\s+(a\s+)?poll\b/i.test(t.toLowerCase());
}

/** Build a short board summary for Ollin proactive context (English). */
export function buildBoardSummary(opts: {
  givenTotal: number;
  givenPending: number;
  receivedTotal: number;
  receivedPending: number;
  eventsCount: number;
  meetingsCount: number;
}): string {
  const { givenTotal, givenPending, receivedTotal, receivedPending, eventsCount, meetingsCount } = opts;
  const parts: string[] = [];
  if (givenTotal > 0) parts.push(`I see ${givenTotal} task(s) in GIVEN (${givenPending} pending)`);
  if (receivedTotal > 0) parts.push(`${receivedTotal} in RECEIVED (${receivedPending} pending)`);
  if (eventsCount > 0) parts.push(`${eventsCount} event(s)`);
  if (meetingsCount > 0) parts.push(`${meetingsCount} meeting(s)`);
  if (parts.length === 0) return "your board is empty — ready to add tasks or events.";
  return parts.join(", ") + ".";
}

/** Build a short finance summary for Ollin context (English). */
export function buildFinanceSummary(opts: { quotesCount: number; invoicesCount: number; clientsCount: number }): string {
  const { quotesCount, invoicesCount, clientsCount } = opts;
  const parts: string[] = [];
  if (clientsCount > 0) parts.push(`${clientsCount} client(s)`);
  if (quotesCount > 0) parts.push(`${quotesCount} quote(s)`);
  if (invoicesCount > 0) parts.push(`${invoicesCount} invoice(s)`);
  if (parts.length === 0) return "no finance data yet.";
  return parts.join(", ") + ".";
}

/** Extract task title from user message for auto-add (e.g. "remind me to buy milk" -> "buy milk"). */
export function parseTaskTitleFromIntent(content: string): string {
  const trimmed = (content || "").trim();
  const hePatterns = [
    /^תזכיר\s+(?:לי\s+)?(?:ל?־?)?(.+)$/,
    /^הוסף משימה\s*[:\s]*(.+)$/,
    /^צור משימה\s*[:\s]*(.+)$/,
    /^רשום\s+(.+)$/,
    /^שמור\s+(.+)$/,
    /^הוסף ללוח\s*[:\s]*(.+)$/,
    /^תזכור\s+(.+)$/,
  ];
  for (const p of hePatterns) {
    const m = trimmed.match(p);
    if (m?.[1]) return m[1].trim();
  }
  const enPatterns = [
    /^remind me (?:to\s+)?(.+)$/i,
    /^add task\s*[:\s]*(.+)$/i,
    /^create task\s*[:\s]*(.+)$/i,
    /^add to board\s*[:\s]*(.+)$/i,
    /^save task\s*[:\s]*(.+)$/i,
    /^(?:don't forget|remember) (?:to\s+)?(.+)$/i,
    /^put (?:down\s+)?(.+)$/i,
    /^note(?:\s+down)?\s+(.+)$/i,
  ];
  for (const p of enPatterns) {
    const m = trimmed.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return trimmed.slice(0, 120) || "New task";
}

/** True if user is saying they completed/did a task (e.g. "Done with the investor call", "I finished that report"). */
export function isDoneIntent(content: string): boolean {
  const t = (content || "").trim();
  const lower = t.toLowerCase();
  if (/^(done|finished|completed|did)\s+/i.test(t) || /^\s*(done|finished|completed)\s*[.!\?]?\s*$/i.test(t)) return true;
  if (/\b(done with|finished with|completed the|did the)\b/i.test(lower)) return true;
  if (/\b(i'?m?\s+)?(finished|done)\s+(with\s+)?(the|that)\b/i.test(lower)) return true;
  if (/\bi finished (the|that)\b/i.test(lower)) return true;
  if (/that'?s done|that one'?s done/i.test(lower)) return true;
  if (/^סיימתי\s+|^בוצע\s+|^הושלם\s+/i.test(t)) return true;
  return false;
}

/** Extract task hint from done intent (e.g. "I finished that report" -> "report"). */
export function parseDoneIntent(content: string): string | null {
  const trimmed = (content || "").trim();
  const enWith = trimmed.match(/(?:done with|finished with|completed the?|did the?)\s+(.+?)[.!\?]?$/i);
  if (enWith?.[1]) return enWith[1].trim();
  const enFinished = trimmed.match(/\bi finished (?:the|that)\s+(.+?)[.!\?]?$/i);
  if (enFinished?.[1]) return enFinished[1].trim();
  const enDoneWith = trimmed.match(/\b(?:i'?m?\s+)?(?:finished|done)\s+(?:with\s+)?(?:the|that)\s+(.+?)[.!\?]?$/i);
  if (enDoneWith?.[1]) return enDoneWith[1].trim();
  const enShort = trimmed.match(/^(done|finished|completed)\s+(.+?)[.!\?]?$/i);
  if (enShort?.[2]) return enShort[2].trim();
  const he = trimmed.match(/(?:סיימתי|בוצע|הושלם)\s+(.+?)[.!\?]?$/i);
  if (he?.[1]) return he[1].trim();
  return null;
}

/** True if user is saying they handled/paid something (e.g. "Handled the payment", "Paid #0001"). */
export function isHandledIntent(content: string): boolean {
  const t = (content || "").trim();
  const lower = t.toLowerCase();
  if (/\b(handled|paid|cleared|settled|wired|sent payment)\b/i.test(t) && /\b(payment|invoice|bill|חשבונית|תשלום)\b/i.test(t)) return true;
  if (/\bpaid\s*#?\d+/i.test(t)) return true;
  if (/^payment (?:is )?done|invoice paid|all (?:set|cleared)/i.test(lower)) return true;
  return false;
}

/** Extract hint from handled intent to match invoice or task (e.g. "Handled the payment" -> "payment"; "Paid invoice #0001" -> "#0001"). */
export function parseHandledIntent(content: string): { hint: string; invoiceNumber?: string } | null {
  const trimmed = (content || "").trim();
  const numMatch = trimmed.match(/#(\d+)/i);
  if (numMatch) return { hint: "invoice", invoiceNumber: numMatch[1].padStart(4, "0") };
  const lower = trimmed.toLowerCase();
  if (/payment|invoice|bill|תשלום|חשבונית/.test(lower)) return { hint: "payment" };
  return { hint: trimmed.slice(0, 40) };
}

/** Detect mention of a name or task in passing (e.g. "I'll sync with Sarah" -> "Sync with Sarah"). Returns suggested task title or null. */
export function parseMentionInPassing(content: string): string | null {
  const trimmed = (content || "").trim();
  if (isExplicitTaskIntent(trimmed) || isDoneIntent(trimmed) || isHandledIntent(trimmed)) return null;
  const lower = trimmed.toLowerCase();
  const withName = trimmed.match(/(?:sync|meeting|review|call|talk|chat|connect)\s+with\s+([A-Za-z\u0590-\u05FF][A-Za-z\u0590-\u05FF\s\-']{0,30})/i);
  if (withName?.[1]) {
    const name = withName[1].trim();
    const verb = trimmed.match(/^(?:i'll?|we'll?|gonna|need to|will)\s+(\w+)/i)?.[1] || "Review";
    return `${verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase()} with ${name}`;
  }
  const meeting = trimmed.match(/(?:meeting|call)\s+(?:with\s+)?([A-Za-z\u0590-\u05FF][A-Za-z\u0590-\u05FF\s\-']{0,30})/i);
  if (meeting?.[1]) return `Meeting with ${meeting[1].trim()}`;
  return null;
}

export function conversationId(a: string, b: string): string {
  return [a, b].sort().join("--");
}
