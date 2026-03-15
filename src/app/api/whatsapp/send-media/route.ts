import { NextRequest, NextResponse } from "next/server";
import { appendWaMessage } from "@/lib/whatsapp-store";

const META_GRAPH_VERSION = "v21.0";

export async function POST(request: NextRequest) {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      return NextResponse.json(
        { error: "WhatsApp API not configured" },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const to = formData.get("to") as string | null;
    const type = (formData.get("type") as string) || "document";
    const file = formData.get("file") as File | null;

    if (!to?.replace(/\D/g, "") || !file?.size) {
      return NextResponse.json(
        { error: "Missing 'to' or 'file'" },
        { status: 400 }
      );
    }

    const toE164 = to.replace(/\D/g, "");
    const mediaType = type === "audio" ? "audio" : type === "image" ? "image" : type === "document" ? "document" : "document";

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("type", file.type || (mediaType === "audio" ? "audio/ogg" : mediaType === "image" ? "image/jpeg" : "application/pdf"));
    uploadForm.append("messaging_product", "whatsapp");

    const uploadUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/media`;
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: uploadForm,
    });
    const uploadData = await uploadRes.json().catch(() => ({}));
    const mediaId = uploadData?.id;

    if (!uploadRes.ok || !mediaId) {
      return NextResponse.json(
        { error: uploadData?.error?.message || "Media upload failed" },
        { status: uploadRes.status || 500 }
      );
    }

    const messagePayload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toE164,
      type: mediaType,
      [mediaType]: mediaType === "document" ? { id: mediaId, filename: file.name || "file" } : { id: mediaId },
    };

    const sendUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`;
    const sendRes = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(messagePayload),
    });
    const sendData = await sendRes.json().catch(() => ({}));
    const messageId = sendData?.messages?.[0]?.id;

    if (!sendRes.ok) {
      return NextResponse.json(
        { error: sendData?.error?.message || "Send failed" },
        { status: sendRes.status || 500 }
      );
    }

    await appendWaMessage({
      id: messageId || `m-${Date.now()}`,
      phone: toE164,
      from_me: true,
      text: `[${mediaType}]`,
      timestamp_ms: Date.now(),
      type: mediaType,
    });

    return NextResponse.json({ success: true, messageId });
  } catch (e) {
    console.error("[whatsapp/send-media]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed" },
      { status: 500 }
    );
  }
}
