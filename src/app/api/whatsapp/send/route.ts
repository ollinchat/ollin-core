import { NextRequest, NextResponse } from "next/server";

const META_GRAPH_VERSION = "v21.0";

export async function POST(request: NextRequest) {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      return NextResponse.json(
        { error: "WhatsApp API not configured (missing token or phone number ID)" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { to, text } = body as { to?: string; text?: string };

    if (!to || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid 'to' or 'text'" },
        { status: 400 }
      );
    }

    // E.164: digits only (Meta accepts with or without leading +)
    const toE164 = to.replace(/\D/g, "");
    if (!toE164.length) {
      return NextResponse.json(
        { error: "Invalid recipient phone number" },
        { status: 400 }
      );
    }

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toE164,
        type: "text",
        text: {
          body: text.trim(),
          preview_url: false,
        },
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || "WhatsApp API error", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id });
  } catch (e) {
    console.error("[whatsapp/send]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed" },
      { status: 500 }
    );
  }
}
