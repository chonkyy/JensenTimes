"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import type { Quote } from "@/lib/finnhub";
import nvidiaLogo from "@/public/nvidia-logo.png";
import type { Intraday } from "@/lib/intraday";
import { useIntroPhase } from "./CoverIntro";
import Sparkline, { type Point } from "./Sparkline";

const POLL_MS = 5000;
const CHART_POLL_MS = 60_000;
const MAX_POINTS = 240;
/** Live ticks only extend the chart if they follow on from its last bar (i.e. during the session). */
const TICK_JOIN_MS = 15 * 60 * 1000;

type Direction = "up" | "down" | null;

interface QuoteState {
  quote: Quote | null;
  error: string | null;
  history: Point[];
  /** 5-minute bars for the latest session; empty if the chart source is unavailable. */
  intraday: Intraday | null;
  /** True once the chart request has succeeded or failed. */
  chartSettled: boolean;
  /** Direction of the most recent tick, cleared after a short flash. */
  flash: Direction;
}

const QuoteContext = createContext<QuoteState>({
  quote: null,
  error: null,
  history: [],
  intraday: null,
  chartSettled: false,
  flash: null,
});

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuoteState>({
    quote: null,
    error: null,
    history: [],
    intraday: null,
    chartSettled: false,
    flash: null,
  });
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/quote", { cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "The price wire is down.");
        const q = body as Quote;
        if (cancelled) return;

        setState((prev) => {
          const prevPrice = prev.quote?.price;
          const flash: Direction =
            prevPrice === undefined || prevPrice === q.price
              ? null
              : q.price > prevPrice
                ? "up"
                : "down";
          const last = prev.history[prev.history.length - 1];
          const history =
            last && last.price === q.price
              ? prev.history
              : [...prev.history, { t: Date.now(), price: q.price }].slice(-MAX_POINTS);
          return { ...prev, quote: q, error: null, history, flash };
        });

        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => {
          setState((s) => ({ ...s, flash: null }));
        }, 900);
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({ ...s, error: (e as Error).message }));
        }
      }
    }

    async function pollChart() {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/intraday", { cache: "no-store" });
        // On failure, keep whatever chart we already have.
        const intraday = res.ok ? ((await res.json()) as Intraday) : null;
        if (!cancelled && intraday && Array.isArray(intraday.points)) {
          setState((s) => ({ ...s, intraday }));
        }
      } catch {
        // The chart is decoration; live ticks still draw a line without it.
      } finally {
        if (!cancelled) setState((s) => (s.chartSettled ? s : { ...s, chartSettled: true }));
      }
    }

    poll();
    pollChart();
    const id = setInterval(poll, POLL_MS);
    const chartId = setInterval(pollChart, CHART_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      poll();
      pollChart();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(chartId);
      document.removeEventListener("visibilitychange", onVisible);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  return <QuoteContext.Provider value={state}>{children}</QuoteContext.Provider>;
}

/** True once the first price (or a failure) and the chart request are both in. */
export function useQuoteReady() {
  const { quote, error, chartSettled } = useContext(QuoteContext);
  return (quote !== null || error !== null) && chartSettled;
}

/** The live quote plus the last tick's flash direction. */
export function useQuote() {
  const { quote, error, flash } = useContext(QuoteContext);
  return { quote, error, flash };
}

/** The latest session's 5-minute bars, extended by live ticks seen since the last bar. */
export function useSessionSeries(): Point[] {
  const { history, intraday } = useContext(QuoteContext);
  return useMemo(() => {
    const bars = intraday?.points ?? [];
    if (bars.length === 0) return history;
    const lastBar = bars[bars.length - 1].t;
    const ticks = history.filter((p) => p.t > lastBar && p.t - lastBar < TICK_JOIN_MS);
    return ticks.length ? [...bars, ...ticks] : bars;
  }, [intraday, history]);
}

export const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const signed = (n: number, digits = 2) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}`;

/** The little price where a tabloid prints its cover price. */
export function CornerPrice() {
  const { quote, flash } = useContext(QuoteContext);
  return (
    <div className={`corner-price ${flash ? `flash-${flash}` : ""}`} aria-live="polite">
      <span className="corner-price__label">NVDA</span>
      <span className="corner-price__value">{quote ? usd.format(quote.price) : "—"}</span>
    </div>
  );
}

/** The black "BREAKING!" inset in the top-right of the cover. */
export function BreakingBox() {
  const { quote, error, flash } = useContext(QuoteContext);
  const series = useSessionSeries();
  const phase = useIntroPhase();
  const dir = quote ? (quote.change >= 0 ? "up" : "down") : null;

  return (
    <section className="breaking" aria-label="Live NVIDIA stock price">
      <div className="breaking__head">
        <span className="breaking__tag">Breaking!</span>
        <Image src={nvidiaLogo} alt="NVIDIA" className="breaking__logo" sizes="200px" />
      </div>

      {quote ? (
        <>
          <div className="breaking__info">
            <p className="breaking__kicker">Leather-clad ex-CEO&rsquo;s stock is</p>
            <p className={`breaking__price ${flash ? `flash-${flash}` : ""}`}>
              {usd.format(quote.price)}
            </p>
            <p className={`breaking__change ${dir}`}>
              {dir === "up" ? "▲" : "▼"} {signed(quote.change)} ({signed(quote.changePercent)}%)
            </p>
            <p className="breaking__range">
              Hi {usd.format(quote.high)} · Lo {usd.format(quote.low)}
            </p>
          </div>
          <div className="breaking__chart">
            <Sparkline
              points={series}
              baseline={quote.prevClose}
              up={dir === "up"}
              animate={phase === "text"}
            />
          </div>
        </>
      ) : (
        <p className="breaking__kicker breaking__kicker--big">
          {error ? "Price wire down! Editors scrambling!" : "Wire incoming…"}
        </p>
      )}
    </section>
  );
}
