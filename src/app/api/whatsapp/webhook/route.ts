import { NextRequest, NextResponse } from "next/server";
import { loadWaMessages, saveWaMessages } from "@/lib/whatsapp-store";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "ollin_wa_verify";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;
    if (!Array.isArray(messages)) {
      return NextResponse.json({ ok: true });
    }
    const contacts = value?.contacts ?? [];
    const { appendWaMessage } = await import("@/lib/whatsapp-store");
    for (const m of messages) {
      const from = String(m.from ?? "");
      const id = m.id ?? `w-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const timestamp = Number(m.timestamp ?? 0) * 1000;
      const type = m.type ?? "text";
      let text = "";
      let media_url: string | undefined;
      if (type === "text" && m.text) {
        text = m.text.body ?? "";
      } else if (m[type]?.caption) {
        text = m[type].caption ?? "";
      }
      if (m[type]?.id) {
        media_url = `https://graph.facebook.com/v21.0/${m[type].id}`;
      }
      await appendWaMessage({
        id,
        phone: from,
        from_me: false,
        text: text || `[${type}]`,
        timestamp_ms: timestamp,
        type: type === "audio" ? "audio" : type === "image" ? "image" : type === "document" ? "document" : type === "video" ? "video" : "text",
        media_url,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[whatsapp/webhook]", e);
    return NextResponse.json({ ok: true });
  }
}
