import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export type GmailLabelItem = {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.providers?.google?.accessToken ?? null;
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated with Google" }, { status: 401 });
    }

    const res = await fetch(`${GMAIL_API}/labels`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[Gmail API] Labels failed:", res.status, err);
      return NextResponse.json({ error: "Failed to fetch labels", details: err }, { status: res.status });
    }
    const data = (await res.json()) as { labels?: GmailLabelItem[] };
    const labels = (data.labels ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      messagesTotal: l.messagesTotal ?? 0,
      messagesUnread: l.messagesUnread ?? 0,
      threadsTotal: l.threadsTotal ?? 0,
      threadsUnread: l.threadsUnread ?? 0,
    }));

    return NextResponse.json({ labels });
  } catch (e) {
    console.error("Gmail labels API error:", e);
    return NextResponse.json(
      { error: "Failed to fetch labels", details: String(e) },
      { status: 500 }
    );
  }
}
