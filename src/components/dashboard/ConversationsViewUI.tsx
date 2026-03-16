"use client";

import React, { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { Camera, Plus, Search, Mail } from "lucide-react";
import { InternalChatPanel } from "@/components/InternalChatPanel";
import { SourceBadge, SOURCE_ICONS, type ChatSourceId } from "./SourceBadge";

type FilterChipId = "all" | "unread" | "favorites" | "groups";

interface ConversationsViewProps {
  locale: "en" | "he";
  onSelectedContactChange?: (id: string | null) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationsView({ locale, onSelectedContactChange }: ConversationsViewProps) {
  const { contacts } = useContacts();
  const { getConversationsWithMeta, currentUserId } = useInternalMessages();
  const [filterChip, setFilterChip] = useState<FilterChipId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showManageChannels, setShowManageChannels] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const conversationsWithMeta = getConversationsWithMeta(currentUserId);
  const isHe = locale === "he";

  const chips: { id: FilterChipId; labelEn: string; labelHe: string }[] = [
    { id: "all", labelEn: "All", labelHe: "הכל" },
    { id: "unread", labelEn: "Unread", labelHe: "לא נקרא" },
    { id: "favorites", labelEn: "Favorites", labelHe: "מועדפים" },
    { id: "groups", labelEn: "Groups", labelHe: "קבוצות" },
  ];

  const channelList: { id: ChatSourceId; name: string }[] = [
    { id: "whatsapp", name: "WhatsApp" },
    { id: "telegram", name: "Telegram" },
    { id: "signal", name: "Signal" },
    { id: "discord", name: "Discord" },
    { id: "slack", name: "Slack" },
    { id: "gmail", name: "Gmail" },
    { id: "viber", name: "Viber" },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-background text-gray-200" role="main">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-xl font-semibold tracking-heading text-white">{isHe ? "שיחות" : "Chats"}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-[#008080] hover:bg-accent-muted transition-colors"
            aria-label="Camera"
          >
            <Camera className="w-5 h-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setShowManageChannels(true)}
            className="p-2 text-gray-400 hover:text-[#008080] hover:bg-accent-muted transition-colors"
            aria-label="New chat / Manage"
          >
            <Plus className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 bg-surface border border-border px-3 py-2">
          <Search className="w-4 h-4 text-gray-500 shrink-0" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isHe ? "חיפוש שיחות" : "Search chats"}
            className="flex-1 bg-transparent text-gray-200 placeholder-gray-500 text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex-shrink-0 overflow-x-auto border-b border-border px-2 py-2">
        <div className="flex gap-1.5 min-w-max">
          {chips.map(({ id, labelEn, labelHe }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilterChip(id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                filterChip === id
                  ? "bg-[#008080] text-white"
                  : "bg-surface text-gray-400 hover:text-gray-200 border border-border"
              }`}
            >
              {isHe ? labelHe : labelEn}
            </button>
          ))}
        </div>
      </div>

      {selectedContactId ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <button
            type="button"
            onClick={() => { setSelectedContactId(null); onSelectedContactChange?.(null); }}
            className="flex-shrink-0 px-4 py-2 text-sm text-[#008080] border-b border-border"
          >
            ← {isHe ? "חזרה לרשימה" : "Back to list"}
          </button>
          <div className="flex-1 min-h-0">
            <InternalChatPanel
              locale={locale}
              compact={false}
              threadOnly
              preselectedContactId={selectedContactId}
              onSelectedContactChange={(id) => {
                setSelectedContactId(id);
                onSelectedContactChange?.(id);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ul className="divide-y divide-border">
            {conversationsWithMeta.length === 0 && (
              <li className="px-4 py-8 text-center text-gray-500 text-sm">
                {isHe ? "אין שיחות. התחל שיחה מהרשת או חבר ערוצים." : "No chats. Start a conversation or connect channels."}
              </li>
            )}
            {conversationsWithMeta.map(({ contactId, lastMessage, lastTime }: { contactId: string; lastMessage?: string; lastTime: number }) => {
              const contact = contacts.find((c) => c.id === contactId);
              const name = contact?.name || contact?.email || contactId;
              const source: ChatSourceId = "ollin";
              const filtered =
                (filterChip === "groups" && false) ||
                (filterChip === "unread" && false) ||
                (filterChip === "favorites" && false) ||
                filterChip === "all";
              if (!filtered) return null;
              if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) return null;
              return (
                <li key={contactId} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedContactId(contactId);
                      onSelectedContactChange?.(contactId);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface transition-colors"
                  >
                    <div className="relative w-12 h-12 flex-shrink-0 bg-surface-elevated flex items-center justify-center text-[#008080] font-semibold overflow-hidden border border-border">
                      {(name || "?").slice(0, 1).toUpperCase()}
                      <SourceBadge source={source} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-200 truncate">{name}</p>
                      <p className="text-xs text-gray-500 truncate">{lastMessage || (isHe ? "אין הודעות" : "No messages")}</p>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{formatTime(lastTime)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showManageChannels && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setShowManageChannels(false)} aria-hidden />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-h-[80vh] overflow-hidden flex flex-col bg-surface border border-border shadow-lg">
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-lg font-semibold tracking-heading text-white">
                {isHe ? "ניהול ערוצים" : "Manage Channels"}
              </h2>
              <button
                type="button"
                onClick={() => setShowManageChannels(false)}
                className="p-2 text-gray-400 hover:text-white"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="flex-shrink-0 px-4 py-2 text-xs text-gray-500">
              {isHe ? "חבר חשבונות כדי לסנכרן שיחות מ-WhatsApp, Telegram ועוד." : "Connect accounts to sync conversations from WhatsApp, Telegram, and more."}
            </p>
            <ul className="flex-1 overflow-y-auto p-4 space-y-2">
              {channelList.map(({ id, name }) => (
                <li key={id} className="flex items-center justify-between py-3 px-4 bg-surface-elevated border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-background border border-border">
                      {(() => {
                        const Icon = id === "gmail" ? Mail : SOURCE_ICONS[id];
                        return Icon ? <Icon className="w-5 h-5 text-[#008080]" strokeWidth={2} /> : null;
                      })()}
                    </div>
                    <span className="font-medium text-gray-200">{name}</span>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium bg-[#008080] text-white hover:bg-[#006666] transition-colors"
                  >
                    {isHe ? "חבר" : "Connect"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export type { ChatSourceId };
