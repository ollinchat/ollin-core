"use client";

import React, { useState, useEffect, useMemo } from "react";
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
      ? "bg-[#1a73e8]/90"
      : color === "green"
        ? "bg-[#0b804b]/90"
        : color === "orange"
          ? "bg-[#e37400]/90"
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
  const [body, setBody] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarSelected, setSidebarSelected] = useState("all_inboxes");
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
      setBody(null);
      return;
    }
    fetch(`/api/gmail/messages/${selectedId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setBody("Could not load message.");
        else setBody(data.body ?? data.snippet ?? "");
      })
      .catch(() => setBody("Could not load message."));
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

  const inboxTotalUnread = useMemo(() => {
    const inb = labelCounts["INBOX"];
    return inb?.unread ?? 0;
  }, [labelCounts]);

  if (status === "loading") {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-[#121212] p-0 m-0 w-full h-full">
        <p className="text-sm text-[#9aa0a6]">Loading…</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[#121212] p-8 m-0 w-full h-full">
        <GmailIcon className="w-14 h-14 mb-4 opacity-90" />
        <h3 className="text-lg font-semibold text-white mb-2">Gmail</h3>
        <p className="text-sm text-[#9aa0a6] text-center max-w-sm mb-6">
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

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full h-full bg-[#121212] text-white p-0 m-0 overflow-hidden">
      {/* Top bar: search + hamburger + profile */}
      <header className="flex items-center gap-2 shrink-0 h-14 px-2 md:px-3 bg-[#1f1f1f] border-b border-[#3c4043]">
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          className="p-2 rounded-full hover:bg-white/10 text-[#e8eaed]"
          aria-label="Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex-1 flex items-center gap-2 min-w-0 rounded-lg bg-[#3c4043] px-3 py-2">
          <Search className="w-5 h-5 shrink-0 text-[#9aa0a6]" />
          <span className="text-[#9aa0a6] text-sm">Search in mail</span>
        </div>
        <div className="w-9 h-9 rounded-full overflow-hidden bg-[#4a86e8] flex items-center justify-center shrink-0 border-2 border-white/20">
          {userImage ? (
            <img src={userImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-medium text-white">{userName ? userName.charAt(0).toUpperCase() : "G"}</span>
          )}
        </div>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar overlay (mobile) */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:relative z-50 top-0 left-0 bottom-0 w-[280px] max-w-[85vw] flex flex-col bg-[#2d2d2d] 
            border-r border-[#3c4043] transform transition-transform duration-200 ease-out
            ${drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          <div className="flex items-center gap-2 px-4 py-4 border-b border-[#3c4043]">
            <GmailIcon className="w-8 h-8 shrink-0" />
            <span className="font-medium text-white text-lg">Gmail</span>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {SIDEBAR_ITEMS.map((item) => {
              if (item.id === "manage") {
                return (
                  <div key={item.id} className="px-4 py-2 flex items-center gap-3">
                    <span className="text-sm text-[#9aa0a6]">Manage subscriptions</span>
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
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-left
                    ${isSelected ? "bg-[#5f4b32]" : "hover:bg-white/5"}
                  `}
                >
                  {item.icon && <span className="text-[#e8eaed] shrink-0">{item.icon}</span>}
                  <span className="flex-1 text-sm text-white truncate">{item.label}</span>
                  {showBadge && (
                    <Badge
                      count={total}
                      unread={unread}
                      color={item.badgeColor}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main: list + detail */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#121212] relative">
          {/* Inbox list header */}
          <div className="shrink-0 px-3 py-2 bg-[#1f1f1f] border-b border-[#3c4043]">
            <p className="text-sm text-[#9aa0a6]">
              {SIDEBAR_ITEMS.find((i) => i.id === sidebarSelected)?.label ?? "All inboxes"}
            </p>
          </div>

          {error && (
            <p className="px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-[#9aa0a6] text-sm">Loading…</div>
          ) : (
            <ul className="flex-1 overflow-y-auto list-none m-0 p-0">
              {messages.length === 0 && (
                <li className="px-4 py-8 text-sm text-[#9aa0a6] text-center">No messages</li>
              )}
              {messages.map((m) => {
                const { name, initial } = parseFrom(m.from);
                const isSelected = selectedId === m.id;
                return (
                  <li key={m.id} className="border-b border-[#3c4043]/50">
                    <button
                      type="button"
                      onClick={() => setSelectedId(m.id)}
                      className={`w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-white/5 ${isSelected ? "bg-white/10" : ""}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#5f6368] flex items-center justify-center shrink-0 text-sm font-medium text-white">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-white text-sm truncate">{name || m.from}</span>
                          <span className="text-xs text-[#9aa0a6] shrink-0">{formatDate(m.date)}</span>
                        </div>
                        <p className="text-sm text-[#e8eaed] truncate mt-0.5">{m.subject || "(No subject)"}</p>
                        <p className="text-xs text-[#9aa0a6] truncate mt-0.5">{m.snippet}</p>
                      </div>
                      <div className="flex flex-col items-center shrink-0 pt-1">
                        <Star className="w-4 h-4 text-[#9aa0a6] stroke-[2]" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* FAB Compose */}
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

        {/* Detail panel (when message selected) - desktop */}
        {selectedId && (
          <div className="hidden md:flex w-[50%] min-w-[320px] max-w-[480px] flex-col bg-[#1f1f1f] border-l border-[#3c4043] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 text-sm text-[#e8eaed] whitespace-pre-wrap">
              {body === null ? "Loading…" : body}
            </div>
          </div>
        )}

        {/* Mobile: full-screen message view when selected */}
        {selectedId && (
          <div className="md:hidden fixed inset-0 z-30 flex flex-col bg-[#1f1f1f]">
            <header className="flex items-center gap-2 h-14 px-3 border-b border-[#3c4043] bg-[#2d2d2d]">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="p-2 -ml-1 text-[#e8eaed]"
                aria-label="Back"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-sm text-white truncate">Message</span>
            </header>
            <div className="flex-1 overflow-y-auto p-4 text-sm text-[#e8eaed] whitespace-pre-wrap">
              {body === null ? "Loading…" : body}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="flex shrink-0 h-14 items-center justify-around bg-[#1f1f1f] border-t border-[#3c4043] px-4">
        <div className="relative flex flex-col items-center gap-0.5">
          <Mail className="w-6 h-6 text-white" />
          <span className="text-[10px] text-[#9aa0a6]">Mail</span>
          {inboxTotalUnread > 0 && (
            <span className="absolute -top-0.5 right-1/2 translate-x-6 min-w-[18px] h-[18px] rounded-full bg-[#ea4335] text-[10px] font-medium text-white flex items-center justify-center px-1">
              {inboxTotalUnread >= 99 ? "99+" : inboxTotalUnread}
            </span>
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Video className="w-6 h-6 text-[#9aa0a6]" />
          <span className="text-[10px] text-[#9aa0a6]">Video</span>
        </div>
      </nav>
    </div>
  );
}
