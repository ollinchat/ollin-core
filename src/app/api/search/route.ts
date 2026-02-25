/**
 * Proxy for DuckDuckGo Instant Answer API (no key, server-side to avoid CORS).
 * Used when the user asks a factual question (e.g. weather, tires, what is X).
 */

import { NextResponse } from "next/server";

const DDG_URL = "https://api.duckduckgo.com/";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ answer: null });
  }
  try {
    const res = await fetch(
      `${DDG_URL}?q=${encodeURIComponent(q)}&format=json&no_html=1`,
      { headers: { Accept: "application/json" }, next: { revalidate: 60 } }
    );
    if (!res.ok) return NextResponse.json({ answer: null });
    const data = (await res.json()) as {
      AbstractText?: string;
      Answer?: string;
      RelatedTopics?: { Text?: string }[];
    };
    const answer =
      data.Answer ||
      data.AbstractText ||
      (Array.isArray(data.RelatedTopics) && data.RelatedTopics[0]?.Text
        ? data.RelatedTopics[0].Text
        : null);
    return NextResponse.json({ answer: answer || null });
  } catch {
    return NextResponse.json({ answer: null });
  }
}
