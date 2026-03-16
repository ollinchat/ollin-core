/**
 * Live local signals API: search for real local news, rumors, and deals.
 * Uses Tavily (preferred), Serper, or DuckDuckGo fallback. No API key = fallback only.
 * GET ?city=Haifa → returns normalized signals for Yellow Press / Explore feed.
 */

import { NextResponse } from "next/server";

export type LocalSignalItem = {
  title: string;
  snippet: string;
  url: string;
  imageUrl?: string;
  category: "gossip" | "deals" | "jobs" | "pros" | "general";
  sourceName?: string;
};

export type LocalSignalsResponse = {
  signals: LocalSignalItem[];
  source: "tavily" | "serper" | "duckduckgo" | "none";
  city: string;
  query: string;
};

function inferCategory(title: string, snippet: string): LocalSignalItem["category"] {
  const t = (title + " " + snippet).toLowerCase();
  if (/\b(job|hire|hiring|position|career|vacancy|משרה|הגשה)\b/.test(t)) return "jobs";
  if (/\b(deal|discount|sale|off|מבצע|הנחה|חד פעמי)\b/.test(t)) return "deals";
  if (/\b(plumber|electrician|technician|מקצוען|חשמלאי|אינסטלטור)\b/.test(t)) return "pros";
  if (/\b(news|rumor|local|event|חדשות|רכילות|מקומי)\b/.test(t)) return "gossip";
  return "gossip";
}

function toYellowPressTitle(snippet: string): string {
  const s = snippet.slice(0, 80).trim();
  return s.endsWith("...") ? s : s + (s.length >= 75 ? "..." : "");
}

/** Tavily: POST https://api.tavily.com/search */
async function searchTavily(queryOrCity: string): Promise<LocalSignalsResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  const query = queryOrCity.includes(" in ") ? queryOrCity : `Local news, rumors, and deals in ${queryOrCity}`;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 12,
        topic: "news",
        search_depth: "basic",
        include_images: true,
      }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: { title?: string; url?: string; content?: string }[];
      images?: { url?: string; description?: string }[];
    };
    const results = data.results ?? [];
    const images = data.images ?? [];
    const signals: LocalSignalItem[] = results.slice(0, 12).map((r, i) => ({
      title: r.title || "Local update",
      snippet: r.content || "",
      url: r.url || "#",
      imageUrl: images[i]?.url,
      category: inferCategory(r.title || "", r.content || ""),
      sourceName: r.url ? new URL(r.url).hostname.replace(/^www\./, "") : undefined,
    }));
    return { signals, source: "tavily", city: queryOrCity.split(" in ").pop() || queryOrCity, query };
  } catch {
    return null;
  }
}

/** Serper: POST https://google.serper.dev/search */
async function searchSerper(queryOrCity: string): Promise<LocalSignalsResponse | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;
  const query = queryOrCity.includes(" in ") ? queryOrCity : `Local news, rumors, and deals in ${queryOrCity}`;
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ q: query, num: 12 }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      organic?: { title?: string; link?: string; snippet?: string }[];
    };
    const organic = data.organic ?? [];
    const signals: LocalSignalItem[] = organic.slice(0, 12).map((o) => ({
      title: o.title || "Local update",
      snippet: o.snippet || "",
      url: o.link || "#",
      category: inferCategory(o.title || "", o.snippet || ""),
      sourceName: o.link ? new URL(o.link).hostname.replace(/^www\./, "") : undefined,
    }));
    return { signals, source: "serper", city: queryOrCity.split(" in ").pop() || queryOrCity, query };
  } catch {
    return null;
  }
}

/** DuckDuckGo Instant Answer fallback (no key); limited but real. */
async function searchDuckDuckGo(queryOrCity: string): Promise<LocalSignalsResponse> {
  const query = queryOrCity.includes(" in ") ? queryOrCity : `Local news and events ${queryOrCity}`;
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
      { headers: { Accept: "application/json" }, next: { revalidate: 300 } }
    );
    if (!res.ok) return { signals: [], source: "duckduckgo", city, query };
    const data = (await res.json()) as {
      AbstractText?: string;
      AbstractURL?: string;
      RelatedTopics?: { Text?: string; FirstURL?: string }[];
    };
    const signals: LocalSignalItem[] = [];
    if (data.AbstractText && data.AbstractURL) {
      signals.push({
        title: toYellowPressTitle(data.AbstractText),
        snippet: data.AbstractText,
        url: data.AbstractURL,
        category: "gossip",
        sourceName: data.AbstractURL ? new URL(data.AbstractURL).hostname.replace(/^www\./, "") : undefined,
      });
    }
    (data.RelatedTopics ?? []).slice(0, 8).forEach((t) => {
      if (t.Text && t.FirstURL) {
        signals.push({
          title: t.Text.slice(0, 80),
          snippet: t.Text,
          url: t.FirstURL,
          category: inferCategory(t.Text, t.Text),
          sourceName: new URL(t.FirstURL).hostname.replace(/^www\./, ""),
        });
      }
    });
    return { signals, source: "duckduckgo", city, query };
  } catch {
    return { signals: [], source: "duckduckgo", city, query };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim() || "Tel Aviv";
  const topic = searchParams.get("topic")?.trim() || "";
  const effectiveQuery = topic ? `${topic} in ${city}` : city;
  try {
    const tavily = await searchTavily(effectiveQuery);
    if (tavily && tavily.signals.length > 0) {
      return NextResponse.json(tavily);
    }
    const serper = await searchSerper(effectiveQuery);
    if (serper && serper.signals.length > 0) {
      return NextResponse.json(serper);
    }
    const fallback = await searchDuckDuckGo(effectiveQuery);
    return NextResponse.json(fallback);
  } catch (e) {
    return NextResponse.json(
      { signals: [], source: "none", city, query: topic || "", error: String(e) },
      { status: 200 }
    );
  }
}
