"use client";

import { useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { Fundamentals } from "@/lib/finnhub";
import type { Intraday, Point } from "@/lib/intraday";
import { baseIndex, nyDate, pct, pctChange, withLivePrice, type PerfKey, type RangeKey } from "@/lib/market";
import { MARKET_EVENTS } from "@/lib/scandals";
import { signed, usd, useQuote, useSessionSeries } from "./LiveQuote";

const RANGES: { key: RangeKey; long: string }[] = [
  { key: "1D", long: "the latest session" },
  { key: "5D", long: "five days" },
  { key: "1M", long: "one month" },
  { key: "6M", long: "six months" },
  { key: "1Y", long: "one year" },
];

const REPORT: { key: PerfKey; label: string }[] = [
  { key: "5D", label: "5 days" },
  { key: "1M", label: "1 month" },
  { key: "YTD", label: "Year to date" },
  { key: "1Y", label: "1 year" },
];

const TZ = "America/New_York";
const fmtTime = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const fmtHour = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });
const fmtWeekday = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const fmtDate = new Intl.DateTimeFormat("en-US", { timeZone: TZ, day: "numeric" });
const fmtDay = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" });
const fmtFull = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" });
const fmtStamp = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const fmtMonth = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short" });
const fmtIsoDay = (d: string) => fmtDay.format(new Date(`${d}T12:00:00Z`));

const pctText = (n: number) => `${signed(n)}%`;
const dirOf = (n: number | null) => (n === null ? "" : n >= 0 ? "up" : "down");
const arrow = (n: number) => (n >= 0 ? "▲" : "▼");

function money(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return usd.format(n);
}

interface Series {
  points: Point[];
  /** Price the range's change is measured from; drawn as a dotted line. */
  base: number | null;
  baseLabel: string;
  /** Plot x by time (1D) instead of by bar index (skips nights and weekends). */
  byTime: boolean;
  intraday: boolean;
}

interface Props {
  daily: Point[] | null;
  fiveDay: Intraday | null;
  fundamentals: Fundamentals | null;
}

export default function MarketBoard({ daily, fiveDay, fundamentals: f }: Props) {
  const { quote, flash } = useQuote();
  const session = useSessionSeries();
  const [range, setRange] = useState<RangeKey>("1M");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelId = `market-panel${useId().replace(/[^\w-]/g, "")}`;

  const live = useMemo(() => (quote ? { t: quote.updatedAt, price: quote.price } : null), [quote]);
  const dailyLive = useMemo(() => (daily ? withLivePrice(daily, live) : null), [daily, live]);
  const price = quote?.price ?? dailyLive?.[dailyLive.length - 1]?.price ?? null;

  const series = useMemo<Series>(() => {
    if (range === "1D") {
      return { points: session, base: quote?.prevClose ?? null, baseLabel: "Prev. close", byTime: true, intraday: true };
    }
    if (range === "5D") {
      const points = fiveDay ? withLivePrice(fiveDay.points, live) : [];
      return { points, base: fiveDay?.prevClose ?? null, baseLabel: "Prev. close", byTime: false, intraday: true };
    }
    const i = dailyLive ? baseIndex(dailyLive, range) : null;
    const points = dailyLive && i !== null ? dailyLive.slice(i) : [];
    return { points, base: points[0]?.price ?? null, baseLabel: "Start", byTime: false, intraday: false };
  }, [range, session, fiveDay, dailyLive, quote?.prevClose, live]);

  const last = series.points[series.points.length - 1]?.price;
  const rangeChange =
    range === "1D" && quote ? quote.changePercent : series.base !== null && last !== undefined ? pct(series.base, last) : null;
  const rangeLong = RANGES.find((r) => r.key === range)!.long;

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = RANGES.findIndex((r) => r.key === range);
    const next =
      e.key === "ArrowRight" ? (i + 1) % RANGES.length
      : e.key === "ArrowLeft" ? (i - 1 + RANGES.length) % RANGES.length
      : e.key === "Home" ? 0
      : e.key === "End" ? RANGES.length - 1
      : null;
    if (next === null) return;
    e.preventDefault();
    setRange(RANGES[next].key);
    tabRefs.current[RANGES[next].key]?.focus();
  };

  const dayDir = quote ? dirOf(quote.change) : "";

  return (
    <div className="market__body">
      <div className="market__board">
        <div className="market__quote" aria-live="polite">
          <span className="market__ticker">NVDA</span>
          <span className={`market__price ${flash ? `flash-${flash}` : ""}`}>{price !== null ? usd.format(price) : "—"}</span>
          {quote && (
            <span className={`market__change ${dayDir}`}>
              {arrow(quote.change)} {signed(quote.change)} ({pctText(quote.changePercent)})
            </span>
          )}
          {quote && <span className="market__asof">As of {fmtStamp.format(quote.updatedAt)} ET</span>}
        </div>

        <div className="market__controls">
          <div className="market__tabs" role="tablist" aria-label="Chart range">
            {RANGES.map((r) => (
              <button
                key={r.key}
                ref={(el) => {
                  tabRefs.current[r.key] = el;
                }}
                type="button"
                role="tab"
                className="market__tab"
                aria-selected={range === r.key}
                aria-controls={panelId}
                tabIndex={range === r.key ? 0 : -1}
                onClick={() => setRange(r.key)}
                onKeyDown={onTabKey}
              >
                {r.key}
              </button>
            ))}
          </div>
          {rangeChange !== null && (
            <p className={`market__range-change ${dirOf(rangeChange)}`}>
              {arrow(rangeChange)} {pctText(rangeChange)} <span>over {rangeLong}</span>
            </p>
          )}
        </div>

        <div id={panelId} role="tabpanel" aria-label={`${range} chart`}>
          <PriceChart series={series} range={range} rangeLong={rangeLong} change={rangeChange} />
        </div>
      </div>

      <aside className="market__stats" aria-labelledby="market-stats-title">
        <h3 id="market-stats-title" className="market__stats-title">
          The Damage <span>Report</span>
        </h3>
        <Stats f={f} price={price} />
      </aside>

      <section className="market__report" aria-labelledby="market-report-title">
        <h3 id="market-report-title" className="market__report-title">
          Report card
        </h3>
        <ol className="market__report-list">
          {REPORT.map(({ key, label }) => {
            const v = dailyLive ? pctChange(dailyLive, key) : null;
            return (
              <li key={key} className="market__grade">
                <span className="market__grade-label">{label}</span>
                <span className={`market__grade-value ${dirOf(v)}`}>{v === null ? "—" : pctText(v)}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Stats({ f, price }: { f: Fundamentals | null; price: number | null }) {
  const high = f?.high52 != null && price !== null ? Math.max(f.high52, price) : (f?.high52 ?? null);
  const low = f?.low52 != null && price !== null ? Math.min(f.low52, price) : (f?.low52 ?? null);
  const atHigh = high !== null && price !== null && price >= high;
  const atLow = low !== null && price !== null && price <= low;
  const cap = f?.shares != null && price !== null ? f.shares * price : null;

  const rows: { label: string; value: string; gloss: string | null }[] = [
    {
      label: "52-week high",
      value: high !== null ? usd.format(high) : "—",
      gloss:
        high === null || price === null ? null
        : atHigh ? "The good old days: today, apparently."
        : `The good old days${f?.high52Date ? `: ${fmtIsoDay(f.high52Date)}` : ""}. Now ${Math.abs(pct(high, price)).toFixed(1)}% below.`,
    },
    {
      label: "52-week low",
      value: low !== null ? usd.format(low) : "—",
      gloss:
        low === null || price === null ? null
        : atLow ? "Rock bottom: today."
        : `Rock bottom${f?.low52Date ? `: ${fmtIsoDay(f.low52Date)}` : ""}. Now ${pct(low, price).toFixed(1)}% above.`,
    },
    {
      label: "Market cap",
      value: cap !== null ? money(cap) : "—",
      gloss: cap !== null ? "Shares × live price. Still worth more than most countries’ GDP." : null,
    },
    {
      label: "P/E (TTM)",
      value: f?.peTTM != null ? f.peTTM.toFixed(1) : "—",
      gloss: f?.peTTM != null ? `Buyers pay $${f.peTTM.toFixed(0)} for every $1 of yearly profit.` : null,
    },
    {
      label: "Beta",
      value: f?.beta != null ? f.beta.toFixed(2) : "—",
      gloss:
        f?.beta != null
          ? `Swings ~${f.beta.toFixed(1)}× as hard as the market.${f.beta > 1.5 ? " Hold on to your jacket." : ""}`
          : null,
    },
  ];

  return (
    <dl className="market__stat-list">
      {rows.map((r) => (
        <div key={r.label} className="market__stat">
          <dt className="market__stat-label">{r.label}</dt>
          <dd className="market__stat-value">{r.value}</dd>
          {r.gloss && <dd className="market__stat-gloss">{r.gloss}</dd>}
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ chart */

const VW = 1000;
const VH = 400;

/** About `count` round-numbered gridlines between lo and hi. */
function niceTicks(lo: number, hi: number, count: number) {
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  return ticks;
}

interface XTick {
  x: number;
  label: string;
  minor: boolean;
}

function xTicks(points: Point[], range: RangeKey, fx: (i: number) => number): XTick[] {
  const out: XTick[] = [];
  let prevKey = "";
  let count = 0;
  points.forEach((p, i) => {
    let key: string;
    let label: string;
    if (range === "1D") {
      const h = Number(fmtHour.format(p.t));
      key = String(h);
      label = `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
    } else if (range === "5D") {
      key = nyDate(p.t);
      label = `${fmtWeekday.format(p.t)} ${fmtDate.format(p.t)}`;
    } else if (range === "1M") {
      // First session of each week (Mondays, or the day after a holiday).
      const d = new Date(`${nyDate(p.t)}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      key = d.toISOString().slice(0, 10);
      label = fmtDay.format(p.t);
    } else {
      key = nyDate(p.t).slice(0, 7);
      label = fmtMonth.format(p.t);
    }
    if (i > 0 && key !== prevKey) {
      const x = fx(i);
      if (x > 0.04 && x < 0.96) out.push({ x, label, minor: range === "1Y" && count++ % 2 === 1 });
    }
    prevKey = key;
  });
  return out;
}

interface Pin {
  num: number;
  id: string;
  i: number;
  x: number;
  row: number;
}

function PriceChart({
  series,
  range,
  rangeLong,
  change,
}: {
  series: Series;
  range: RangeKey;
  rangeLong: string;
  change: number | null;
}) {
  const { points, base, byTime } = series;
  const [hover, setHover] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fillId = `market-fill${useId().replace(/[^\w-]/g, "")}`;

  const geo = useMemo(() => {
    const n = points.length;
    if (n < 2) return null;
    const t0 = points[0].t;
    const tSpan = points[n - 1].t - t0 || 1;
    const fx = (i: number) => (byTime ? (points[i].t - t0) / tSpan : i / (n - 1));

    const prices = points.map((p) => p.price);
    const all = base === null ? prices : [...prices, base];
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    const padY = (hi - lo || hi * 0.01) * 0.08;
    lo -= padY;
    hi += padY;
    const fy = (price: number) => 1 - (price - lo) / (hi - lo);

    const coords = points.map((p, i) => [fx(i) * VW, fy(p.price) * VH] as const);
    const line = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${line} L${coords[n - 1][0].toFixed(1)},${VH} L${coords[0][0].toFixed(1)},${VH} Z`;

    const ticks = niceTicks(lo, hi, 4);

    // A pin goes on the first bar on or after the day it was reported (weekend stories land on Monday).
    const start = nyDate(points[0].t);
    const pins: Pin[] = [];
    MARKET_EVENTS.forEach((e, k) => {
      if (e.date < start) return;
      const i = points.findIndex((p) => nyDate(p.t) >= e.date);
      if (i < 0) return;
      const prev = pins[pins.length - 1];
      const x = fx(i);
      pins.push({ num: k + 1, id: e.id, i, x, row: prev && x - prev.x < 0.06 ? prev.row + 1 : 0 });
    });

    return { fx, fy, line, area, ticks, pins, xs: xTicks(points, range, fx) };
  }, [points, base, byTime, range]);

  if (!geo) {
    return (
      <div className="market__chart market__chart--empty">
        <p>The ticker tape jammed. Try another range.</p>
      </div>
    );
  }

  const up = (change ?? 0) >= 0;
  const color = up ? "var(--up)" : "var(--down)";
  const first = points[0].price;
  const lastP = points[points.length - 1].price;
  const label = `NVDA over ${rangeLong}: ${change === null ? "" : `${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}%, `}from ${usd.format(base ?? first)} to ${usd.format(lastP)}.`;

  const pickAt = (clientX: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    const fr = (clientX - r.left) / r.width;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(geo.fx(i) - fr) < Math.abs(geo.fx(best) - fr)) best = i;
    }
    setHover(best);
  };
  const onMove = (e: PointerEvent) => pickAt(e.clientX);

  const h = hover !== null && hover < points.length ? hover : null;
  const hp = h !== null ? points[h] : null;
  const hx = h !== null ? geo.fx(h) : 0;
  const pinEvents = geo.pins.map((p) => ({ pin: p, event: MARKET_EVENTS.find((e) => e.id === p.id)! }));
  const rows = geo.pins.reduce((m, p) => Math.max(m, p.row + 1), 0);

  return (
    <div className="market__chart" style={{ "--pin-rows": rows } as CSSProperties}>
      <div
        ref={canvasRef}
        className="market__canvas"
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {geo.ticks.map((v) => (
            <line key={v} className="market__grid" x1={0} x2={VW} y1={geo.fy(v) * VH} y2={geo.fy(v) * VH} vectorEffect="non-scaling-stroke" />
          ))}
          {base !== null && (
            <line className="market__base" x1={0} x2={VW} y1={geo.fy(base) * VH} y2={geo.fy(base) * VH} vectorEffect="non-scaling-stroke" />
          )}
          {geo.pins.map((p) => (
            <line
              key={p.id}
              className="market__pin-line"
              x1={p.x * VW}
              x2={p.x * VW}
              y1={0}
              y2={geo.fy(points[p.i].price) * VH}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={geo.area} fill={`url(#${fillId})`} />
          <path d={geo.line} className="market__line" stroke={color} vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="market__axis-y" aria-hidden="true">
          {geo.ticks.map((v) => (
            <span key={v} style={{ top: `${geo.fy(v) * 100}%` }}>
              {Number(v.toFixed(2))}
            </span>
          ))}
        </div>
        <div className="market__axis-x" aria-hidden="true">
          {geo.xs.map((t) => (
            <span key={`${t.x}`} className={t.minor ? "is-minor" : undefined} style={{ left: `${t.x * 100}%` }}>
              {t.label}
            </span>
          ))}
        </div>

        {geo.pins.map((p) => (
          <span
            key={p.id}
            className="market__pin"
            aria-hidden="true"
            style={{ left: `${p.x * 100}%`, "--row": p.row } as CSSProperties}
          >
            {p.num}
          </span>
        ))}
        {geo.pins.map((p) => (
          <span
            key={`${p.id}-dot`}
            className="market__pin-dot"
            aria-hidden="true"
            style={{ left: `${p.x * 100}%`, top: `${geo.fy(points[p.i].price) * 100}%` }}
          />
        ))}

        {hp && (
          <div className="market__hover" aria-hidden="true" style={{ left: `${hx * 100}%` }}>
            <span className="market__hover-dot" style={{ top: `${geo.fy(hp.price) * 100}%`, background: color }} />
            <div className={`market__tip ${hx > 0.75 ? "is-left" : hx < 0.25 ? "is-right" : ""}`}>
              <strong>{usd.format(hp.price)}</strong>
              {base !== null && <span className={dirOf(hp.price - base)}>{pctText(pct(base, hp.price))}</span>}
              <time>
                {series.intraday ? `${range === "1D" ? fmtTime.format(hp.t) : fmtStamp.format(hp.t)} ET` : fmtFull.format(hp.t)}
              </time>
            </div>
          </div>
        )}
      </div>

      <p className="market__legend-base" aria-hidden="true">
        <span /> {series.baseLabel}
        {base !== null && ` ${usd.format(base)}`}
      </p>

      {pinEvents.length > 0 && (
        <ol className="market__pins">
          {pinEvents.map(({ pin, event }) => (
            <li key={pin.id} className="market__pin-item">
              <span className="market__pin-num" aria-hidden="true">
                {pin.num}
              </span>
              <span>
                <time dateTime={event.date}>{fmtIsoDay(event.date)}</time> &middot; {event.label}{" "}
                <span className="market__pin-src">
                  (
                  {event.sources.map((s, i) => (
                    <span key={s.url}>
                      {i > 0 && ", "}
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.outlet}
                      </a>
                    </span>
                  ))}
                  )
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
