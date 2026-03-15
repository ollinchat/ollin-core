import { NextRequest, NextResponse } from "next/server";

/**
 * Returns message history for a WhatsApp contact.
 * Uses WHATSAPP_ACCESS_TOKEN from .env.local. When you have webhook-stored
 * messages in a DB, fetch by contactId and return them here.
 */
export type WhatsAppMessage = {
  id: string;
  text: string;
  out: boolean;
  time: string;
  seen?: boolean;
};

export async function GET(request: NextRequest) {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId") ?? "";

    if (!contactId) {
      return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
    }

    // When you have webhook-stored messages, fetch from DB by contactId.
    // Meta's Cloud API does not expose a "get conversation history" endpoint.
    const messages: WhatsAppMessage[] = [];

    return NextResponse.json({ messages, hasApi: !!token });
  } catch (e) {
    console.error("[whatsapp/messages]", e);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}
