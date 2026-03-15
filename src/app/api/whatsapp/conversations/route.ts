import { NextResponse } from "next/server";
import { loadWaMessages } from "@/lib/whatsapp-store";

/**
 * Returns WhatsApp conversations for the panel.
 * When WhatsApp Cloud API is configured with webhook storage, replace demo data
 * with real conversations from your DB. Meta's API does not expose a "list chats"
 * endpoint; conversations are typically built from incoming message webhooks.
 */
export type WhatsAppConversation = {
  id: string;
  name: string;
  avatar?: string | null;
  phone: string;
  lastMessage: string;
  time: string;
  unread: number;
  muted?: boolean;
  isGroup?: boolean;
};

function getDemoConversations(): WhatsAppConversation[] {
  return [
    {
      id: "wa-salonic",
      name: "סאלוניקי",
      avatar: null,
      phone: "+972508818183",
      lastMessage: "מעולה",
      time: "18:10",
      unread: 1,
      muted: false,
    },
    {
      id: "wa-home",
      name: "Home sweet home",
      avatar: null,
      phone: "",
      lastMessage: "Draft זה :",
      time: "18:07",
      unread: 0,
      muted: true,
      isGroup: true,
    },
    {
      id: "wa-udi",
      name: "אודי גלאן מכללה lcs",
      avatar: null,
      phone: "",
      lastMessage: "Voice call",
      time: "17:55",
      unread: 0,
      muted: false,
    },
    {
      id: "wa-bekirim",
      name: "מספרים של בכירים",
      avatar: null,
      phone: "",
      lastMessage: "~ Dror c: מוטי אבנר",
      time: "17:30",
      unread: 22,
      muted: true,
      isGroup: true,
    },
    {
      id: "wa-young",
      name: "Young Media LTD",
      avatar: null,
      phone: "",
      lastMessage: "ליד חדש הגיע מהקמפיין! שם מלא: Sana 97250690711...+ :טלפון Farhoud-abu Rahme",
      time: "16:27",
      unread: 0,
      muted: false,
    },
    {
      id: "wa-eyad",
      name: "Eyad Burqan",
      avatar: null,
      phone: "",
      lastMessage: "✓✓ Voice message (0:06)",
      time: "14:35",
      unread: 0,
      muted: false,
    },
  ];
}

export async function GET() {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const hasApi = !!token;

    const conversations = getDemoConversations();
    const stored = await loadWaMessages();
    const byPhone = new Map<string, { text: string; time: number }>();
    for (const m of stored) {
      const key = m.phone.replace(/\D/g, "");
      if (!key) continue;
      const existing = byPhone.get(key);
      if (!existing || m.timestamp_ms > existing.time) {
        byPhone.set(key, { text: m.text, time: m.timestamp_ms });
      }
    }
    const merged = conversations.map((c) => {
      const key = c.phone?.replace(/\D/g, "");
      const last = key ? byPhone.get(key) : undefined;
      if (!last) return c;
      return {
        ...c,
        lastMessage: last.text,
        time: new Date(last.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    });

    const totalUnread = merged.reduce((s, c) => s + c.unread, 0);
    const missedCallsCount = 1;
    const settingsNotificationCount = 1;

    return NextResponse.json({
      conversations: merged,
      meta: {
        totalUnread,
        missedCallsCount,
        settingsNotificationCount,
        hasApi,
      },
    });
  } catch (e) {
    console.error("[whatsapp/conversations]", e);
    return NextResponse.json(
      { error: "Failed to load conversations" },
      { status: 500 }
    );
  }
}
