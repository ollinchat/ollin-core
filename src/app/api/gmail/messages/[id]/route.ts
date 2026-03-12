import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

function getHeader(headers: { name?: string; value?: string }[] | undefined, name: string): string {
  if (!headers) return "";
  const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

function decodeBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) {
    try {
      const base64 = payload.body.data.replace(/-/g, "+").replace(/_/g, "/");
      return Buffer.from(base64, "base64").toString("utf-8");
    } catch {
      return "";
    }
  }
  if (payload.parts) {
    const textPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
    const htmlPart = payload.parts.find((p: any) => p.mimeType === "text/html");
    if (htmlPart?.body?.data) {
      try {
        const base64 = htmlPart.body.data.replace(/-/g, "+").replace(/_/g, "/");
        return Buffer.from(base64, "base64").toString("utf-8");
      } catch {
        return "";
      }
    }
    if (textPart?.body?.data) {
      try {
        const base64 = textPart.body.data.replace(/-/g, "+").replace(/_/g, "/");
        return Buffer.from(base64, "base64").toString("utf-8");
      } catch {
        return "";
      }
    }
  }
  return "";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.providers?.google?.accessToken ?? null;
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated with Google" }, { status: 401 });
    }
    const { id } = await params;
    const res = await fetch(`${GMAIL_API}/messages/${id}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[Gmail API] Get message failed:", res.status, err);
      return NextResponse.json({ error: "Failed to fetch message", details: err }, { status: res.status });
    }
    const msg = await res.json();
    const headers = msg.payload?.headers ?? [];
    const body = decodeBody(msg.payload);
    return NextResponse.json({
      id: msg.id,
      threadId: msg.threadId,
      subject: getHeader(headers, "Subject"),
      from: getHeader(headers, "From"),
      to: getHeader(headers, "To"),
      date: getHeader(headers, "Date"),
      messageId: getHeader(headers, "Message-ID"),
      snippet: msg.snippet ?? "",
      body,
      labelIds: msg.labelIds ?? [],
    });
  } catch (e) {
    console.error("Gmail API get message error:", e);
    return NextResponse.json({ error: "Failed to fetch message", details: String(e) }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.providers?.google?.accessToken ?? null;
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated with Google" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const addLabelIds = (body.addLabelIds as string[]) ?? [];
    const removeLabelIds = (body.removeLabelIds as string[]) ?? [];
    const res = await fetch(`${GMAIL_API}/messages/${id}/modify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ addLabelIds, removeLabelIds }),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: "Failed to modify message", details: err }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("Gmail API modify error:", e);
    return NextResponse.json({ error: "Failed to modify message", details: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.providers?.google?.accessToken ?? null;
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated with Google" }, { status: 401 });
    }
    const { id } = await params;
    const res = await fetch(`${GMAIL_API}/messages/${id}/trash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: "Failed to delete message", details: err }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("Gmail API trash error:", e);
    return NextResponse.json({ error: "Failed to delete message", details: String(e) }, { status: 500 });
  }
}
