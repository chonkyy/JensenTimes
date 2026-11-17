import MarketBoard from "@/components/MarketBoard";
import RevealSection from "@/components/RevealSection";
import { fetchFundamentals } from "@/lib/finnhub";
import { fetchDailyYear, fetchFiveDay, type Intraday } from "@/lib/intraday";
import { pctChange } from "@/lib/market";

async function settle<T>(label: string, p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    console.error(`[market] ${label}`, err);
    return null;
  }
}

/** The headline follows the last month's move. It describes the price, never a cause. */
function headline(month: number | null) {
  if (month === null) return ["The Money", "Pages"];
  if (month <= -10) return ["Shares in the", "Doghouse!"];
  if (month < 0) return ["Stock Takes a", "Tumble!"];
  if (month < 10) return ["Stock Shrugs It", "Off!"];
  return ["Stock Rises", "Above It!"];
}

/** Page 3: the detailed price chart (with the scandal timeline pinned on it) and the numbers. */
export default async function MarketPage() {
  const apiKey = process.env.FINNHUB_API_KEY;
  const [daily, fiveDay, fundamentals] = await Promise.all([
    settle<Intraday>("1y daily", fetchDailyYear()),
    settle<Intraday>("5d", fetchFiveDay()),
    apiKey ? settle("fundamentals", fetchFundamentals(apiKey)) : null,
  ]);
  const [lead, punch] = headline(daily ? pctChange(daily.points, "1M") : null);

  return (
    <RevealSection className="market" aria-labelledby="market-title">
      <header className="market__head">
        <h2 id="market-title" className="market__title">
          {lead} <span>{punch}</span>
        </h2>
      </header>

      <MarketBoard daily={daily?.points ?? null} fiveDay={fiveDay} fundamentals={fundamentals} />

      <p className="poweredby">Powered by Finnhub &amp; Yahoo Finance</p>
    </RevealSection>
  );
}
