# The Jensen Times

*All the News That's Fit to Overclock.*

A satirical tabloid front page built around NVIDIA's live stock price. It is styled as a printed newspaper: a loud cover with Jensen Huang's cutout and a live price, a ribbon of reported scandals, a market page with charts, and a wire page of real headlines. It is satire about real people and not financial advice.

## The four pages

1. **Cover:** masthead, a breaking-news box with the live price and a session sparkline, an odometer-style "affairs" counter, and an animated sticker-slap intro.
2. **Scandal ribbon:** counts of admitted and alleged items, with numbered stamps that open dossier cards.
3. **Market page:** a range chart with scandal pins, a ticker board, and a performance report card.
4. **The wire:** recent company news from Finnhub, with hover previews for linked stories.

On desktop (1024px and up) each section is a full-screen page. On mobile they stack and scroll.

## Tech

Next.js 15 (App Router), React 19 and TypeScript. All styling is hand-written BEM-style CSS in `app/globals.css`. Fonts are Anton and Montserrat.

## Setup

1. Get a free API key at <https://finnhub.io>.
2. `cp .env.local.example .env.local` and paste the key after `FINNHUB_API_KEY=`.
3. `npm install && npm run dev`, then open <http://localhost:3000>.

Other commands: `npm run lint` and `npx tsc --noEmit`. Don't run `npm run build` while the dev server is running, because it overwrites `.next/`.

## How it works

- **Live quote:** `app/api/quote/route.ts` calls Finnhub on the server, so the key never reaches the browser. Responses are cached for 5 seconds, well under the free tier's 60 calls/minute. `components/LiveQuote.tsx` polls it every 5 seconds and pauses while the tab is hidden.
- **Intraday chart:** `app/api/intraday/route.ts` fetches 5-minute bars for the latest session from Yahoo Finance's public (undocumented) chart endpoint, cached for 60 seconds. If Yahoo fails, the chart falls back to the prices seen since the page opened.
- **Market page:** `components/MarketPage.tsx` renders 1-year daily and 5-day 15-minute bars from the same Yahoo endpoint, plus Finnhub's `/stock/metric` and `/stock/profile2` (52-week range, P/E, beta, shares outstanding). Each source fails independently and the UI shows a fallback.
- **Wire:** `components/Headlines.tsx` pulls Finnhub company news, scandal headlines first. `/api/preview` builds Open Graph link previews and only accepts Finnhub news redirect links.
- **Scandals:** `lib/scandals.ts` is the single source of truth for the people, counts, sources and chart pins. Wording stays neutral ("reported", "alleged"), and pins mark when something was reported, never that it moved the stock.
- **Loading:** `PageGate` holds the page behind a gray cover until the quote, chart, fonts, images and previews are loaded, or 12 seconds pass.

## Deploy

Push to GitHub, import the repo in Vercel, and add `FINNHUB_API_KEY` as an environment variable.

## Disclaimer

Satire. Allegations are unproven unless stated. Prices are delayed, headlines are third-party, and nothing here is investment advice. Not affiliated with NVIDIA. Photos in `public/people/` are credited press images and must be replaced with freely licensed ones before any public release.
