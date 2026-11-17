import type { Point } from "./intraday";

export type RangeKey = "1D" | "5D" | "1M" | "6M" | "1Y";
export type PerfKey = "5D" | "1M" | "6M" | "YTD" | "1Y";

const nyDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date in New York as YYYY-MM-DD (sorts as a string). */
export const nyDate = (t: number) => nyDay.format(t);

/** Index of the last bar at or before `t`, or 0 if every bar is later. */
function indexAtOrBefore(bars: Point[], t: number) {
  let i = 0;
  for (let k = 0; k < bars.length && bars[k].t <= t; k++) i = k;
  return i;
}

function monthsBefore(t: number, n: number) {
  const d = new Date(t);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.getTime();
}

/**
 * Index of the bar a change is measured from, in a series of daily closes. 5D is the close five
 * sessions back; 1M/6M is the last close on or before that date; YTD is last year's final close.
 */
export function baseIndex(daily: Point[], key: PerfKey): number | null {
  const n = daily.length;
  if (n < 2) return null;
  const last = daily[n - 1].t;
  switch (key) {
    case "5D":
      return n > 5 ? n - 6 : null;
    case "1M":
      return indexAtOrBefore(daily, monthsBefore(last, 1));
    case "6M":
      return indexAtOrBefore(daily, monthsBefore(last, 6));
    case "1Y":
      return 0;
    case "YTD": {
      const year = nyDate(last).slice(0, 4);
      let i: number | null = null;
      daily.forEach((p, k) => {
        if (nyDate(p.t).slice(0, 4) < year) i = k;
      });
      return i;
    }
  }
}

export const pct = (from: number, to: number) => ((to - from) / from) * 100;

export function pctChange(daily: Point[], key: PerfKey): number | null {
  const i = baseIndex(daily, key);
  return i === null ? null : pct(daily[i].price, daily[daily.length - 1].price);
}

/**
 * Folds the live price into a bar series: it replaces the last bar's close if it's from the same
 * New York day, or is appended if it's newer.
 */
export function withLivePrice(bars: Point[], live: Point | null): Point[] {
  const last = bars[bars.length - 1];
  if (!live || !last) return bars;
  if (nyDate(live.t) === nyDate(last.t)) {
    return live.price === last.price ? bars : [...bars.slice(0, -1), { t: last.t, price: live.price }];
  }
  return live.t > last.t ? [...bars, live] : bars;
}
