import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

function getHeader(headers: { name?: string; value?: string }[] | undefined, name: string): string {
  if (!headers) return "";
  const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

export type GmailMessageItem = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  labelIds?: string[];
};

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.providers?.google?.accessToken ?? null;
    console.log("[Gmail API] Session present:", !!session, "Access token present:", !!accessToken);
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated with Google" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const maxResults = Math.min(Number(searchParams.get("maxResults")) || 20, 50);
    const labelId = searchParams.get("labelIds") || searchParams.get("label") || "INBOX";
    const labelIds = labelId.split(",").map((s) => s.trim()).filter(Boolean);
    const listUrl = new URL(`${GMAIL_API}/messages`);
    listUrl.searchParams.set("maxResults", String(maxResults));
    labelIds.forEach((id) => listUrl.searchParams.append("labelIds", id));

    const listRes = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const listBody = await listRes.text();
    if (!listRes.ok) {
      let parsed: unknown = listBody;
      try {
        parsed = JSON.parse(listBody);
      } catch {
        // keep as text
      }
      console.error("[Gmail API] Gmail list failed. Status:", listRes.status, "Body:", parsed);
      return NextResponse.json(
        { error: "Gmail list failed", details: listBody },
        { status: listRes.status }
      );
    }
    const listData = JSON.parse(listBody) as { messages?: { id: string; threadId: string }[] };
    const messageIds: { id: string; threadId: string }[] = (listData.messages ?? []).map(
      (m: { id: string; threadId: string }) => ({ id: m.id, threadId: m.threadId })
    );

    const messages: GmailMessageItem[] = await Promise.all(
      messageIds.map(async ({ id, threadId }) => {
        const getRes = await fetch(
          `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!getRes.ok) {
          return {
            id,
            threadId,
            subject: "",
            from: "",
            date: "",
            snippet: "",
          };
        }
        const msg = await getRes.json();
        const headers = msg.payload?.headers ?? [];
        return {
          id,
          threadId,
          subject: getHeader(headers, "Subject"),
          from: getHeader(headers, "From"),
          date: getHeader(headers, "Date"),
          snippet: msg.snippet ?? "",
          labelIds: msg.labelIds,
        };
      })
    );

    return NextResponse.json({ messages });
  } catch (e) {
    console.error("Gmail API error:", e);
    return NextResponse.json(
      { error: "Failed to fetch messages", details: String(e) },
      { status: 500 }
    );
  }
}
