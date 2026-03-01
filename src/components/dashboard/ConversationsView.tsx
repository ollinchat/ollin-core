"use client";

import React from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { InternalChatPanel } from "@/components/InternalChatPanel";

export type ChatSourceId = "ollin" | "whatsapp" | "telegram" | "gmail" | "discord" | "signal" | "slack" | "viber";

interface ConversationsViewProps {
  locale: "en" | "he";
  onSelectedContactChange?: (id: string | null) => void;
}

export function ConversationsView({ locale, onSelectedContactChange }: ConversationsViewProps) {
  return (
    <InternalChatPanel
      locale={locale}
      compact={false}
      onSelectedContactChange={onSelectedContactChange}
    />
  );
}
