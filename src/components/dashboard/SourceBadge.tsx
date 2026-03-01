"use client";

import React from "react";
import { MessageCircle, Send, Mail, Phone } from "lucide-react";

export type ChatSourceId = "ollin" | "whatsapp" | "telegram" | "gmail" | "discord" | "signal" | "slack" | "viber";

type IconProps = { className?: string; strokeWidth?: number };
export const SOURCE_ICONS: { [K in ChatSourceId]: React.ComponentType<IconProps> } = {
  ollin: MessageCircle as React.ComponentType<IconProps>,
  whatsapp: MessageCircle as React.ComponentType<IconProps>,
  telegram: Send as React.ComponentType<IconProps>,
  gmail: Mail as React.ComponentType<IconProps>,
  discord: MessageCircle as React.ComponentType<IconProps>,
  signal: Phone as React.ComponentType<IconProps>,
  slack: MessageCircle as React.ComponentType<IconProps>,
  viber: Phone as React.ComponentType<IconProps>,
};

export function SourceBadge({ source }: { source: ChatSourceId }) {
  const Icon = SOURCE_ICONS[source];
  return (
    <div
      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-surface-elevated border border-border flex items-center justify-center"
      title={source}
    >
      <Icon className="w-2.5 h-2.5 text-[#008080]" strokeWidth={2} />
    </div>
  );
}
