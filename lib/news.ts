import { SYMBOL } from "@/lib/finnhub";

/** Raw shape returned by https://finnhub.io/api/v1/company-news */
interface FinnhubNews {
  category: string;
  datetime: number; // unix seconds
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface NewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  /** ms since epoch */
  publishedAt: number;
}

/** How far back to look, and how many stories make the page. */
const LOOKBACK_DAYS = 14;
export const MAX_STORIES = 9;
/** Finnhub's news doesn't change by the second; refresh the page's copy every 10 minutes. */
export const NEWS_REVALIDATE_S = 600;

/** A story is "about the scandal" if its headline says so. Matching only headlines keeps out market wraps. */
const SCANDAL = /\b(jensen|huang|scandal|affair|unfaithful|infidelity|spy|spies|espionage|honey[- ]?trap|probe|investigat\w*|ouster|ousted|exit|resign\w*|interim ceo|board)\b/i;

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", "#39": "'", lt: "<", gt: ">", nbsp: " " };
const decode = (s: string) => s.replace(/&(amp|quot|apos|#39|lt|gt|nbsp);/g, (_, e: string) => ENTITIES[e]).trim();

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Latest headlines about the scandal, Jensen Huang and NVIDIA, newest first.
 * Falls back to plain NVDA headlines if too few mention the scandal.
 */
export async function fetchScandalNews(apiKey: string): Promise<NewsItem[]> {
  const to = new Date();
  const from = new Date(to.getTime() - LOOKBACK_DAYS * 86_400_000);
  const url = `https://finnhub.io/api/v1/company-news?symbol=${SYMBOL}&from=${ymd(from)}&to=${ymd(to)}`;
  const res = await fetch(url, {
    headers: { "X-Finnhub-Token": apiKey },
    next: { revalidate: NEWS_REVALIDATE_S },
  });
  if (!res.ok) throw new Error(`Finnhub responded ${res.status}`);

  const raw = (await res.json()) as FinnhubNews[];
  if (!Array.isArray(raw)) throw new Error("Finnhub returned no news list");

  const seen = new Set<string>();
  const items: NewsItem[] = [];
  for (const n of raw) {
    if (!n?.headline || !n.url?.startsWith("http")) continue;
    const headline = decode(n.headline);
    const key = headline.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: n.id,
      headline,
      summary: decode(n.summary ?? ""),
      source: n.source || "Wire",
      url: n.url,
      publishedAt: n.datetime * 1000,
    });
  }
  items.sort((a, b) => b.publishedAt - a.publishedAt);

  const onTopic = items.filter((n) => SCANDAL.test(n.headline));
  const rest = items.filter((n) => !SCANDAL.test(n.headline));
  return [...onTopic, ...rest].slice(0, MAX_STORIES);
}
