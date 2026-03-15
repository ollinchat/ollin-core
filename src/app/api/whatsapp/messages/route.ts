import { NextRequest, NextResponse } from "next/server";
import { getMessagesByPhone } from "@/lib/whatsapp-store";

export type WhatsAppMessage = {
  id: string;
  text: string;
  out: boolean;
  time: string;
  seen?: boolean;
  type?: "text" | "image" | "audio" | "document" | "video";
  media_url?: string;
};

export async function GET(request: NextRequest) {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone") ?? searchParams.get("contactId") ?? "";

    if (!phone.trim()) {
      return NextResponse.json({ messages: [], hasApi: !!token });
    }

    const stored = await getMessagesByPhone(phone);
    const messages: WhatsAppMessage[] = stored.map((m) => ({
      id: m.id,
      text: m.text,
      out: m.from_me,
      time: new Date(m.timestamp_ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      seen: true,
      type: m.type,
      media_url: m.media_url,
    }));

    return NextResponse.json({ messages, hasApi: !!token });
  } catch (e) {
    console.error("[whatsapp/messages]", e);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}
