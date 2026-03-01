/**
 * Explore live data: fetch and normalize local signals for the feed.
 * Used by ExplorePanel to replace/supplement mock data with real search results.
 */

import type { ExplorePost, PostCategory } from "@/components/dashboard/ExplorePanel";

export type LocalSignalItem = {
  title: string;
  snippet: string;
  url: string;
  imageUrl?: string;
  category: "gossip" | "deals" | "jobs" | "pros" | "general";
  sourceName?: string;
};

export type LocalSignalsApiResponse = {
  signals: LocalSignalItem[];
  source: string;
  city: string;
  query: string;
};

/**
 * Fetch local signals from the backend (Tavily/Serper/DuckDuckGo).
 * Summarizes into Yellow Press format and returns normalized ExplorePost[].
 */
export async function analyzeLocalSignals(city: string): Promise<{
  posts: ExplorePost[];
  source: string;
  query: string;
}> {
  const res = await fetch(
    `/api/explore/local-signals?city=${encodeURIComponent(city)}`
  );
  const data = (await res.json()) as LocalSignalsApiResponse;
  const posts: ExplorePost[] = (data.signals ?? []).map((s, i) => ({
    id: `live-${data.source}-${Date.now()}-${i}`,
    category: (s.category === "general" ? "gossip" : s.category) as PostCategory,
    authorName: "Ollin AI",
    timestamp: "Just now",
    title: s.title,
    description: s.snippet,
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
    commentsList: [],
    generatedByAI: true,
    aiSummary: s.title,
    sourceLabel: `Sourced from: ${s.sourceName ?? "Web search"}`,
    sourceLink: s.url,
    sourceName: s.sourceName,
    imageUrl: s.imageUrl,
    location: city,
    statusPill: s.category === "deals" ? "Hot Deal" : s.category === "jobs" ? "Urgent Hiring" : "Trending Now",
  }));
  return { posts, source: data.source ?? "none", query: data.query ?? "" };
}
