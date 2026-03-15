import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.providers?.google?.accessToken ?? null;
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated with Google" }, { status: 401 });
    }
    const body = await request.json();
    const to = String(body.to ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const text = String(body.body ?? body.text ?? "").trim();
    const contentType = String(body.contentType ?? "text/plain").toLowerCase();
    const isHtml = contentType === "text/html";
    const references = body.references ? String(body.references) : "";
    const inReplyTo = body.inReplyTo ? String(body.inReplyTo) : "";

    if (!to) {
      return NextResponse.json({ error: "Missing 'to' address" }, { status: 400 });
    }

    const fromEmail = (session?.user?.email as string) ?? "noreply@localhost";
    const ctLine = isHtml
      ? "Content-Type: text/html; charset=utf-8"
      : "Content-Type: text/plain; charset=utf-8";
    const lines = [
      `From: ${fromEmail}`,
      `To: ${to}`,
      `Subject: ${subject.replace(/\r?\n/g, " ")}`,
      "MIME-Version: 1.0",
      ctLine,
      ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
      ...(references ? [`References: ${references}`] : []),
      "",
      text,
    ];
    const raw = base64UrlEncode(lines.join("\r\n"));

    const res = await fetch(GMAIL_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw, threadId: body.threadId || undefined }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Gmail API] Send failed:", res.status, err);
      return NextResponse.json({ error: "Failed to send", details: err }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("Gmail API send error:", e);
    return NextResponse.json({ error: "Failed to send", details: String(e) }, { status: 500 });
  }
}
