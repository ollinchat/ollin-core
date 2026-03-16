"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import DOMPurify from "dompurify";
import { signIn, useSession } from "next-auth/react";
import {
  Menu,
  Search,
  Star,
  Send,
  Inbox,
  Tag,
  Info,
  Clock,
  Bookmark,
  ShoppingBag,
  FileText,
  Archive,
  Trash2,
  Mail,
  Video,
  Pencil,
  Users,
  LayoutGrid,
  ArrowLeft,
  ArchiveRestore,
  MailOpen,
  MoreVertical,
  Reply,
  Forward,
  ChevronDown,
} from "lucide-react";
import { GmailIcon } from "@/components/dashboard/ChannelBrandIcons";

type GmailMessageItem = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  labelIds?: string[];
};

type GmailLabelItem = {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
};

type MessageDetail = {
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  snippet: string;
  threadId?: string;
  messageId?: string;
};

const SIDEBAR_ITEMS: {
  id: string;
  label: string;
  gmailLabelId: string;
  icon: React.ReactNode;
  badgeColor?: "gray" | "blue" | "green" | "orange";
}[] = [
  { id: "all_inboxes", label: "All inboxes", gmailLabelId: "INBOX", icon: <LayoutGrid className="w-5 h-5" /> },
  { id: "primary", label: "Primary", gmailLabelId: "INBOX", icon: <Inbox className="w-5 h-5" /> },
  { id: "social", label: "Social", gmailLabelId: "CATEGORY_SOCIAL", icon: <Users className="w-5 h-5" />, badgeColor: "blue" },
  { id: "promotions", label: "Promotions", gmailLabelId: "CATEGORY_PROMOTIONS", icon: <Tag className="w-5 h-5" />, badgeColor: "green" },
  { id: "updates", label: "Updates", gmailLabelId: "CATEGORY_UPDATES", icon: <Info className="w-5 h-5" />, badgeColor: "orange" },
  { id: "starred", label: "Starred", gmailLabelId: "STARRED", icon: <Star className="w-5 h-5" /> },
  { id: "snoozed", label: "Snoozed", gmailLabelId: "SNOOZED", icon: <Clock className="w-5 h-5" /> },
  { id: "important", label: "Important", gmailLabelId: "IMPORTANT", icon: <Bookmark className="w-5 h-5" /> },
  { id: "purchases", label: "Purchases", gmailLabelId: "CATEGORY_PROMOTIONS", icon: <ShoppingBag className="w-5 h-5" /> },
  { id: "sent", label: "Sent", gmailLabelId: "SENT", icon: <Send className="w-5 h-5" /> },
  { id: "scheduled", label: "Scheduled", gmailLabelId: "SENT", icon: <Clock className="w-5 h-5" /> },
  { id: "outbox", label: "Outbox", gmailLabelId: "SENT", icon: <Send className="w-5 h-5" /> },
  { id: "drafts", label: "Drafts", gmailLabelId: "DRAFT", icon: <FileText className="w-5 h-5" /> },
  { id: "all_mail", label: "All mail", gmailLabelId: "ALL", icon: <Archive className="w-5 h-5" /> },
  { id: "spam", label: "Spam", gmailLabelId: "SPAM", icon: <Info className="w-5 h-5" /> },
  { id: "trash", label: "Trash", gmailLabelId: "TRASH", icon: <Trash2 className="w-5 h-5" /> },
  { id: "manage", label: "Manage subscriptions", gmailLabelId: "INBOX", icon: null },
];

function formatDate(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (today) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (yesterday.toDateString() === d.toDateString()) {
    return "Yesterday";
  }
  const sameYear = now.getFullYear() === d.getFullYear();
  if (sameYear) {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function parseFrom(from: string): { name: string; initial: string } {
  if (!from) return { name: "", initial: "?" };
  const match = from.match(/^(.+?)\s*<[^>]+>$/);
  const name = match ? match[1].trim().replace(/^["']|["']$/g, "") : from.trim();
  const initial = name.charAt(0).toUpperCase() || "?";
  return { name: name || from, initial };
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1].trim() : from.trim();
}

function Badge({
  count,
  unread,
  color = "gray",
}: {
  count: number;
  unread?: number;
  color?: "gray" | "blue" | "green" | "orange";
}) {
  const display = unread !== undefined && unread > 0 ? (unread >= 99 ? "99+" : `${unread} new`) : count >= 99 ? "99+" : String(count);
  if (count === 0 && (unread === undefined || unread === 0)) return null;
  const bg =
    color === "blue"
      ? "bg-[#1a73e8]"
      : color === "green"
        ? "bg-[#0b804b]"
        : color === "orange"
          ? "bg-[#e37400]"
          : "bg-[#5f6368]";
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium text-white ${bg}`}>
      {display}
    </span>
  );
}

export function GmailPanel() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<GmailMessageItem[]>([]);
  const [labels, setLabels] = useState<GmailLabelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<MessageDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarSelected, setSidebarSelected] = useState("all_inboxes");
  const [replyMode, setReplyMode] = useState<"reply" | "forward" | null>(null);
  const [replyText, setReplyText] = useState("");
  const [forwardTo, setForwardTo] = useState("");
  const [sendingMail, setSendingMail] = useState(false);
  const isConnected = status === "authenticated" && !!session;

  const currentLabelId = useMemo(() => {
    const item = SIDEBAR_ITEMS.find((i) => i.id === sidebarSelected);
    return item?.gmailLabelId ?? "INBOX";
  }, [sidebarSelected]);

  useEffect(() => {
    if (!isConnected) return;
    fetch("/api/gmail/labels")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error && data.labels) setLabels(data.labels);
      })
      .catch(() => {});
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ maxResults: "25" });
    if (currentLabelId !== "ALL") params.set("labelIds", currentLabelId);
    fetch(`/api/gmail/messages?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setMessages([]);
        } else {
          setMessages(data.messages ?? []);
        }
      })
      .catch((e) => {
        setError(e.message || "Failed to load");
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, [isConnected, currentLabelId]);

  useEffect(() => {
    if (!selectedId || !isConnected) {
      setSelectedDetail(null);
      return;
    }
    fetch(`/api/gmail/messages/${selectedId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setSelectedDetail(null);
        } else {
          setSelectedDetail({
            subject: data.subject ?? "",
            from: data.from ?? "",
            to: data.to ?? "",
            date: data.date ?? "",
            body: data.body ?? data.snippet ?? "",
            snippet: data.snippet ?? "",
            threadId: data.threadId,
            messageId: data.messageId,
          });
        }
      })
      .catch(() => setSelectedDetail(null));
  }, [selectedId, isConnected]);

  const labelCounts = useMemo(() => {
    const map: Record<string, { total: number; unread: number }> = {};
    labels.forEach((l) => {
      map[l.id] = {
        total: l.messagesTotal ?? 0,
        unread: l.messagesUnread ?? 0,
      };
    });
    return map;
  }, [labels]);

  const sendReplyOrForward = useCallback(
    async (mode: "reply" | "forward") => {
      if (!selectedDetail) return;
      const to =
        mode === "reply" ? extractEmail(selectedDetail.from) : forwardTo.trim();
      const subject =
        mode === "reply"
          ? (selectedDetail.subject.startsWith("Re:") ? selectedDetail.subject : `Re: ${selectedDetail.subject}`)
          : (selectedDetail.subject.startsWith("Fwd:") ? selectedDetail.subject : `Fwd: ${selectedDetail.subject}`);
      const body =
        mode === "reply"
          ? replyText.trim()
          : `---------- Forwarded message ---------\nFrom: ${selectedDetail.from}\nDate: ${selectedDetail.date}\nSubject: ${selectedDetail.subject}\nTo: ${selectedDetail.to}\n\n${selectedDetail.body?.slice(0, 5000) || selectedDetail.snippet}\n\n${replyText.trim()}`;
      if (!to || !body) return;
      setSendingMail(true);
      try {
        const res = await fetch("/api/gmail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to,
            subject,
            body,
            contentType: "text/plain",
            threadId: mode === "reply" ? selectedDetail.threadId : undefined,
            inReplyTo: mode === "reply" ? selectedDetail.messageId : undefined,
            references: mode === "reply" ? selectedDetail.messageId : undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setReplyMode(null);
          setReplyText("");
          setForwardTo("");
        } else {
          setError(data.error || "Send failed");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Send failed");
      } finally {
        setSendingMail(false);
      }
    },
    [selectedDetail, replyText, forwardTo]
  );

  const inboxTotalUnread = useMemo(() => {
    const inb = labelCounts["INBOX"];
    return inb?.unread ?? 0;
  }, [labelCounts]);

  if (status === "loading") {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-[#ffffff] p-0 m-0 w-full h-full" style={{ color: "#1f1f1f" }}>
        <p className="text-sm" style={{ color: "#5f6368" }}>Loading…</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[#ffffff] p-8 m-0 w-full h-full" style={{ color: "#1f1f1f" }}>
        <GmailIcon className="w-14 h-14 mb-4 opacity-90" />
        <h3 className="text-lg font-semibold mb-2" style={{ color: "#1f1f1f" }}>Gmail</h3>
        <p className="text-sm text-center max-w-sm mb-6" style={{ color: "#5f6368" }}>
          Connect your Google account to read and send mail from OllinChat.
        </p>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard?panel=4" })}
          className="px-5 py-2.5 rounded-xl text-white font-medium text-sm bg-[#ea4335] hover:bg-[#d33426] transition-colors shadow-sm"
        >
          Connect with Google
        </button>
      </div>
    );
  }

  const userImage = (session?.user as any)?.image ?? null;
  const userName = (session?.user as any)?.name ?? (session?.user as any)?.email ?? "";

  const textPrimary = "#1f1f1f";
  const textSecondary = "#5f6368";
  const bgMain = "#ffffff";
  const bgSidebar = "#f6f8fc";
  const borderColor = "rgba(0,0,0,0.08)";

  return (
    <div
      className="flex-1 min-h-0 flex flex-col w-full h-full p-0 m-0 overflow-hidden font-sans"
      style={{ backgroundColor: bgMain, color: textPrimary }}
    >
      {/* Internal Email View: full white page (mobile + desktop when message open) */}
      {selectedId && selectedDetail && (
        <div
          className="absolute inset-0 z-50 flex flex-col bg-[#ffffff] overflow-hidden"
          style={{ color: textPrimary }}
        >
          {/* Action bar */}
          <header className="flex items-center justify-between shrink-0 h-14 px-2 border-b min-w-0" style={{ borderColor, backgroundColor: bgMain }}>
            <button
              type="button"
              onClick={() => { setSelectedId(null); setReplyMode(null); setReplyText(""); setForwardTo(""); }}
              className="p-2 -ml-1 rounded-full hover:bg-[#f6f8fc] transition-colors"
              style={{ color: textPrimary }}
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-1">
              <button type="button" className="p-2 rounded-full hover:bg-[#f6f8fc]" style={{ color: textPrimary }} aria-label="Archive">
                <ArchiveRestore className="w-5 h-5" />
              </button>
              <button type="button" className="p-2 rounded-full hover:bg-[#f6f8fc]" style={{ color: textPrimary }} aria-label="Delete">
                <Trash2 className="w-5 h-5" />
              </button>
              <button type="button" className="p-2 rounded-full hover:bg-[#f6f8fc]" style={{ color: textPrimary }} aria-label="Mark as unread">
                <MailOpen className="w-5 h-5" />
              </button>
              <button type="button" className="p-2 rounded-full hover:bg-[#f6f8fc]" style={{ color: textPrimary }} aria-label="More">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Subject + star + Inbox pill */}
          <div className="shrink-0 px-4 pt-3 pb-2 border-b" style={{ borderColor }}>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-semibold flex-1 min-w-0 pr-2" style={{ color: textPrimary }}>
                {selectedDetail.subject || "(No subject)"}
              </h1>
              <Star className="w-5 h-5 shrink-0 mt-0.5" style={{ color: textSecondary }} strokeWidth={2} />
            </div>
            <span className="inline-block mt-2 rounded-full px-2.5 py-0.5 text-xs" style={{ backgroundColor: "#f6f8fc", color: textSecondary }}>
              Inbox
            </span>
          </div>

          {/* Sender row — Gmail mobile style: avatar, name, time, "to me" dropdown, Unsubscribe */}
          <div className="shrink-0 flex items-start gap-3 px-4 py-3 border-b" style={{ borderColor }}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-medium text-white"
              style={{ backgroundColor: "#5f6368" }}
            >
              {parseFrom(selectedDetail.from).initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                <span className="font-semibold text-sm" style={{ color: textPrimary }}>{parseFrom(selectedDetail.from).name || selectedDetail.from}</span>
                <span className="text-sm" style={{ color: textSecondary }}>{formatDate(selectedDetail.date)}</span>
              </div>
              <button
                type="button"
                className="flex items-center gap-0.5 mt-0.5 text-sm text-left w-full rounded hover:bg-[#f6f8fc] px-1 py-0.5 -mx-1 transition-colors"
                style={{ color: textSecondary }}
              >
                to me
                <ChevronDown className="w-4 h-4 shrink-0 opacity-70" />
              </button>
              <div className="mt-1.5 flex items-center flex-wrap gap-1">
                <a
                  href="#unsubscribe"
                  className="text-sm font-medium hover:underline"
                  style={{ color: "#1a73e8" }}
                  onClick={(e) => e.preventDefault()}
                >
                  Unsubscribe
                </a>
                <button type="button" className="p-1 rounded-full hover:bg-[#f6f8fc] inline-flex" style={{ color: textSecondary }} aria-label="More">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content — professional formatted email (HTML or plain); no raw code */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-[#ffffff]">
            <div className="max-w-[720px] mx-auto px-4 py-5 text-[15px] leading-relaxed" style={{ color: textPrimary }}>
              {(() => {
                const raw = selectedDetail.body || selectedDetail.snippet || "";
                const hasEscapedEntities = typeof raw === "string" && (/&lt;|&gt;|&amp;/.test(raw));
                const decoded = hasEscapedEntities && typeof document !== "undefined" ? (() => {
                  try {
                    const div = document.createElement("div");
                    div.innerHTML = raw;
                    return div.textContent || raw;
                  } catch {
                    return raw;
                  }
                })() : raw;
                const looksLikeHtml = /<[a-z][\s\S]*>/i.test(decoded);
                if (looksLikeHtml && decoded.trim()) {
                  const sanitized = DOMPurify.sanitize(decoded, {
                    ALLOWED_TAGS: [
                      "p", "div", "span", "br", "a", "strong", "b", "em", "i", "u", "ul", "ol", "li",
                      "h1", "h2", "h3", "h4", "h5", "h6", "img", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
                      "blockquote", "hr", "sub", "sup", "pre", "code", "font", "center", "section", "header", "footer",
                    ],
                    ALLOWED_ATTR: [
                      "href", "src", "alt", "title", "target", "rel", "style", "class", "id",
                      "width", "height", "border", "cellpadding", "cellspacing", "colspan", "rowspan",
                      "align", "valign", "color", "size", "face", "background",
                    ],
                    ADD_ATTR: ["target"],
                  });
                  return (
                    <div
                      className="gmail-email-body break-words [&_a]:text-[#1a73e8] [&_a]:underline [&_img]:max-w-full [&_img]:h-auto [&_table]:max-w-full [&_table]:border-collapse [&_p]:mb-3 [&_ul]:my-2 [&_ol]:my-2"
                      dangerouslySetInnerHTML={{ __html: sanitized }}
                    />
                  );
                }
                return (
                  <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                    {decoded || "No content."}
                  </div>
                );
              })()}
            </div>
          </div>

          {replyMode && (
            <div className="shrink-0 px-4 py-3 border-t" style={{ borderColor, backgroundColor: "#f6f8fc" }}>
              {replyMode === "forward" && (
                <input
                  type="email"
                  placeholder="To"
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm mb-2"
                  style={{ borderColor, color: textPrimary }}
                />
              )}
              <textarea
                placeholder={replyMode === "reply" ? "Write your reply..." : "Add a note (optional)"}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ borderColor, color: textPrimary }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => sendReplyOrForward(replyMode)}
                  disabled={sendingMail || (replyMode === "reply" ? !replyText.trim() : !forwardTo.trim())}
                  className="px-4 py-2 rounded-full text-sm font-medium text-white bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50"
                >
                  {sendingMail ? "Sending…" : replyMode === "reply" ? "Send Reply" : "Send Forward"}
                </button>
                <button
                  type="button"
                  onClick={() => { setReplyMode(null); setReplyText(""); setForwardTo(""); }}
                  className="px-4 py-2 rounded-full text-sm font-medium"
                  style={{ borderColor, color: textPrimary }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* Reply / Forward — fixed at bottom (Gmail mobile style) */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-t" style={{ borderColor, backgroundColor: bgMain }}>
            <button
              type="button"
              onClick={() => setReplyMode(replyMode === "reply" ? null : "reply")}
              className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 border-2 transition-colors hover:bg-[#f6f8fc]"
              style={{ borderColor, color: textPrimary }}
            >
              <Reply className="w-5 h-5 shrink-0" />
              <span className="font-medium text-sm">Reply</span>
            </button>
            <button
              type="button"
              onClick={() => setReplyMode(replyMode === "forward" ? null : "forward")}
              className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 border-2 transition-colors hover:bg-[#f6f8fc]"
              style={{ borderColor, color: textPrimary }}
            >
              <Forward className="w-5 h-5 shrink-0" />
              <span className="font-medium text-sm">Forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Top bar: search + hamburger + profile */}
      <header
        className="flex items-center gap-2 shrink-0 h-14 px-2 md:px-3 border-b min-w-0"
        style={{ borderColor, backgroundColor: bgMain }}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          className="p-2 rounded-full hover:bg-[#f6f8fc] transition-colors"
          style={{ color: textPrimary }}
          aria-label="Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div
          className="flex-1 flex items-center gap-2 min-w-0 rounded-full px-4 py-2.5 shadow-sm border"
          style={{ backgroundColor: bgMain, borderColor }}
        >
          <Search className="w-5 h-5 shrink-0" style={{ color: textSecondary }} />
          <span className="text-sm" style={{ color: textSecondary }}>Search in mail</span>
        </div>
        <div
          className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 border"
          style={{ backgroundColor: "#4a86e8", borderColor }}
        >
          {userImage ? (
            <img src={userImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-medium text-white">{userName ? userName.charAt(0).toUpperCase() : "G"}</span>
          )}
        </div>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
        )}

        <aside
          className={`
            fixed md:relative z-50 top-0 left-0 bottom-0 w-[280px] max-w-[85vw] flex flex-col
            border-r transform transition-transform duration-200 ease-out
            ${drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
          style={{ backgroundColor: bgSidebar, borderColor }}
        >
          <div className="flex items-center gap-2 px-4 py-4 border-b" style={{ borderColor }}>
            <GmailIcon className="w-8 h-8 shrink-0" />
            <span className="font-medium text-lg" style={{ color: textPrimary }}>Gmail</span>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {SIDEBAR_ITEMS.map((item) => {
              if (item.id === "manage") {
                return (
                  <div key={item.id} className="px-4 py-2 flex items-center gap-3">
                    <span className="text-sm" style={{ color: textSecondary }}>Manage subscriptions</span>
                    <span className="rounded bg-[#1a73e8] px-1.5 py-0.5 text-[10px] font-medium text-white">New</span>
                  </div>
                );
              }
              const counts = labelCounts[item.gmailLabelId];
              const total = counts?.total ?? 0;
              const unread = counts?.unread ?? 0;
              const isSelected = sidebarSelected === item.id;
              const showBadge = total > 0 || unread > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSidebarSelected(item.id);
                    setDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-r-full transition-colors"
                  style={{
                    backgroundColor: isSelected ? "rgba(26, 115, 232, 0.08)" : "transparent",
                    color: isSelected ? "#1a73e8" : textPrimary,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "#f6f8fc";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {item.icon && <span className="shrink-0" style={{ color: "inherit" }}>{item.icon}</span>}
                  <span className="flex-1 text-sm truncate">{item.label}</span>
                  {showBadge && <Badge count={total} unread={unread} color={item.badgeColor} />}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 relative" style={{ backgroundColor: bgMain }}>
          <div className="shrink-0 px-3 py-2 border-b" style={{ borderColor, backgroundColor: bgMain }}>
            <p className="text-sm" style={{ color: textSecondary }}>
              {SIDEBAR_ITEMS.find((i) => i.id === sidebarSelected)?.label ?? "All inboxes"}
            </p>
          </div>

          {error && (
            <p className="px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: textSecondary }}>Loading…</div>
          ) : (
            <ul className="flex-1 overflow-y-auto list-none m-0 p-0">
              {messages.length === 0 && (
                <li className="px-4 py-8 text-sm text-center" style={{ color: textSecondary }}>No messages</li>
              )}
              {messages.map((m) => {
                const { name, initial } = parseFrom(m.from);
                const isSelected = selectedId === m.id;
                return (
                  <li key={m.id} className="border-b" style={{ borderColor }}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(m.id)}
                      className="w-full flex items-start gap-3 px-3 py-3 text-left transition-colors rounded-none"
                      style={{
                        backgroundColor: isSelected ? "#f6f8fc" : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "#f6f8fc";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-medium text-white"
                        style={{ backgroundColor: "#5f6368" }}
                      >
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm truncate" style={{ color: textPrimary }}>{name || m.from}</span>
                          <span className="text-xs shrink-0" style={{ color: textSecondary }}>{formatDate(m.date)}</span>
                        </div>
                        <p className="text-sm truncate mt-0.5" style={{ color: textPrimary }}>{m.subject || "(No subject)"}</p>
                        <p className="text-xs truncate mt-0.5" style={{ color: textSecondary }}>{m.snippet}</p>
                      </div>
                      <div className="flex flex-col items-center shrink-0 pt-1">
                        <Star className="w-4 h-4" style={{ color: textSecondary }} strokeWidth={2} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="absolute bottom-20 right-4 md:bottom-6 md:right-6 z-30">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 py-3 shadow-lg transition-colors"
            >
              <Pencil className="w-5 h-5" />
              <span className="font-medium text-sm">Compose</span>
            </button>
          </div>
        </div>
      </div>

      <nav
        className="flex shrink-0 h-14 items-center justify-around px-4 border-t"
        style={{ borderColor, backgroundColor: bgMain }}
      >
        <div className="relative flex flex-col items-center gap-0.5">
          <Mail className="w-6 h-6" style={{ color: textPrimary }} />
          <span className="text-[10px]" style={{ color: textSecondary }}>Mail</span>
          {inboxTotalUnread > 0 && (
            <span className="absolute -top-0.5 right-1/2 translate-x-6 min-w-[18px] h-[18px] rounded-full bg-[#ea4335] text-[10px] font-medium text-white flex items-center justify-center px-1">
              {inboxTotalUnread >= 99 ? "99+" : inboxTotalUnread}
            </span>
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Video className="w-6 h-6" style={{ color: textSecondary }} />
          <span className="text-[10px]" style={{ color: textSecondary }}>Video</span>
        </div>
      </nav>
    </div>
  );
}
