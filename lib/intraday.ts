import { SYMBOL } from "./finnhub";

export interface Point {
  t: number;
  price: number;
}

export interface Intraday {
  points: Point[];
  prevClose: number | null;
}

/** The parts of Yahoo's (undocumented) v8 chart response we read. */
interface YahooChart {
  chart?: {
    result?: Array<{
      meta?: { chartPreviousClose?: number; previousClose?: number };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }> | null;
  };
}

/** Closing prices for one Yahoo chart range (e.g. "1y" at "1d" bars), cached for `revalidate` seconds. */
export async function fetchChart(range: string, interval: string, revalidate: number): Promise<Intraday> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${SYMBOL}?range=${range}&interval=${interval}`;
  const res = await fetch(url, {
    // Yahoo rejects requests that don't send a User-Agent.
    headers: { "User-Agent": "Mozilla/5.0 (compatible; JensenTimes/1.0)" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Yahoo responded ${res.status}`);

  const body = (await res.json()) as YahooChart;
  const result = body.chart?.result?.[0];
  const times = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];

  const points: Point[] = [];
  times.forEach((t, i) => {
    const price = closes[i];
    if (typeof price === "number" && Number.isFinite(price)) {
      points.push({ t: t * 1000, price });
    }
  });
  if (points.length < 2) throw new Error("Yahoo returned an empty chart");

  const prev = result?.meta?.chartPreviousClose ?? result?.meta?.previousClose;
  return { points, prevClose: typeof prev === "number" ? prev : null };
}

/** 5-minute bars for the latest US session (today, or the last one if the market is shut). */
export const fetchIntraday = () => fetchChart("1d", "5m", 60);

/** 15-minute bars for the last five sessions. */
export const fetchFiveDay = () => fetchChart("5d", "15m", 300);

/** Daily closes for the last year; the 1M and 6M views are slices of this. */
export const fetchDailyYear = () => fetchChart("1y", "1d", 3600);
