export const SYMBOL = "NVDA";

/** Raw shape returned by https://finnhub.io/api/v1/quote */
interface FinnhubQuote {
  c: number; // current price
  d: number | null; // change
  dp: number | null; // percent change
  h: number; // day high
  l: number; // day low
  o: number; // day open
  pc: number; // previous close
  t: number; // unix seconds of last update
}

/** What our API route sends to the browser. */
export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  /** ms since epoch of the last trade Finnhub knows about */
  updatedAt: number;
}

export async function fetchQuote(apiKey: string): Promise<Quote> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${SYMBOL}`;
  const res = await fetch(url, {
    headers: { "X-Finnhub-Token": apiKey },
    next: { revalidate: 5 },
  });
  if (!res.ok) throw new Error(`Finnhub responded ${res.status}`);

  const q = (await res.json()) as FinnhubQuote;
  if (!q || typeof q.c !== "number" || q.c === 0) {
    throw new Error("Finnhub returned an empty quote");
  }

  return {
    symbol: SYMBOL,
    price: q.c,
    change: q.d ?? q.c - q.pc,
    changePercent: q.dp ?? ((q.c - q.pc) / q.pc) * 100,
    high: q.h,
    low: q.l,
    open: q.o,
    prevClose: q.pc,
    updatedAt: q.t * 1000,
  };
}

/** Slow-moving numbers for the money page. Any field Finnhub doesn't supply is null. */
export interface Fundamentals {
  high52: number | null;
  low52: number | null;
  /** YYYY-MM-DD */
  high52Date: string | null;
  low52Date: string | null;
  peTTM: number | null;
  beta: number | null;
  /** Shares outstanding, in units (not millions). */
  shares: number | null;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

async function finnhubJson(path: string, apiKey: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/${path}`, {
      headers: { "X-Finnhub-Token": apiKey },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Finnhub responded ${res.status}`);
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    console.error(`[fundamentals] ${path.split("?")[0]}`, err);
    return null;
  }
}

export async function fetchFundamentals(apiKey: string): Promise<Fundamentals> {
  const [metricBody, profile] = await Promise.all([
    finnhubJson(`stock/metric?symbol=${SYMBOL}&metric=all`, apiKey),
    finnhubJson(`stock/profile2?symbol=${SYMBOL}`, apiKey),
  ]);
  const m = (metricBody?.metric ?? {}) as Record<string, unknown>;
  const sharesM = num(profile?.shareOutstanding);

  return {
    high52: num(m["52WeekHigh"]),
    low52: num(m["52WeekLow"]),
    high52Date: str(m["52WeekHighDate"]),
    low52Date: str(m["52WeekLowDate"]),
    peTTM: num(m.peTTM) ?? num(m.peBasicExclExtraTTM),
    beta: num(m.beta),
    shares: sharesM === null ? null : sharesM * 1e6,
  };
}
